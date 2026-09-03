/*
Copyright (C) 2023-2026 Chaos

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

*/

import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getChannelList } from '@/features/admin/channels/api'
import { getTrafficDistribution } from '@/features/dashboard/api'
import { fetchUsageLogs } from '@/features/usage-logs/api'
import type { UsageLog } from '@/features/usage-logs/types'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

type ChartTab = 'volume' | 'latency' | 'errors'

interface BarData {
  key: string
  height: string
  active?: boolean
  label?: string
}

export function AdminDashboardView() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.auth.user)
  const [activeTab, setActiveTab] = useState<ChartTab>('volume')

  // Real 24h traffic distribution aggregated across 12 buckets
  const trafficQuery = useQuery({
    queryKey: ['admin-dashboard-traffic'],
    queryFn: () => getTrafficDistribution({ buckets: 12 }),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  // All channels, aggregated into enabled / disabled / auto-disabled counts.
  const channelsQuery = useQuery({
    queryKey: ['admin-dashboard-channels'],
    queryFn: () =>
      getChannelList({
        path: '/api/channel',
        params: { p: 1, page_size: 1000 },
      }),
    staleTime: 30_000,
  })

  // Live execution logs
  const logsQuery = useQuery({
    queryKey: ['admin-dashboard-logs'],
    queryFn: () => fetchUsageLogs(true, { page: 1, pageSize: 6 }),
    staleTime: 15_000,
  })

  // Balance calculation (default conversion: 500,000 quota = 1 USD)
  const quota = user?.quota ?? 0
  const balanceUsd = (quota / 500000).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const recentLogs: UsageLog[] = useMemo(
    () => logsQuery.data?.items ?? [],
    [logsQuery.data]
  )

  // Aggregate channel statuses: 1 = enabled, 2 = manually disabled, 3 = auto disabled.
  const channelStatusCounts = useMemo(() => {
    const counts = { enabled: 0, disabled: 0, autoDisabled: 0 }
    for (const channel of channelsQuery.data?.data?.items ?? []) {
      if (channel.status === 3) {
        counts.autoDisabled += 1
      } else if (channel.status === 2) {
        counts.disabled += 1
      } else {
        counts.enabled += 1
      }
    }
    return counts
  }, [channelsQuery.data])

  // Dynamic real data bars for Traffic Distribution
  const points = useMemo(
    () => trafficQuery.data?.points ?? [],
    [trafficQuery.data]
  )

  const bars: BarData[] = useMemo(() => {
    if (points.length === 0) {
      return Array.from({ length: 12 }, (_, i) => ({
        key: `slot-${i}`,
        height: '4%',
        label: '0',
      }))
    }

    if (activeTab === 'volume') {
      const maxVal = Math.max(...points.map((p) => p.volume), 0)
      return points.map((p) => {
        const height =
          maxVal > 0 && p.volume > 0
            ? `${Math.max(Math.round((p.volume / maxVal) * 90), 8)}%`
            : '4%'
        const label =
          p.volume >= 1000
            ? `${(p.volume / 1000).toFixed(1)}k`
            : `${p.volume}`
        const active = maxVal > 0 && p.volume === maxVal
        return { key: String(p.timestamp), height, label, active }
      })
    }

    if (activeTab === 'latency') {
      const maxVal = Math.max(...points.map((p) => p.latency), 0)
      return points.map((p) => {
        const height =
          maxVal > 0 && p.latency > 0
            ? `${Math.max(Math.round((p.latency / maxVal) * 90), 8)}%`
            : '4%'
        const label = `${p.latency}ms`
        const active = maxVal > 0 && p.latency === maxVal
        return { key: String(p.timestamp), height, label, active }
      })
    }

    // Tab 'errors'
    const maxErrors = Math.max(...points.map((p) => p.error_count), 0)
    return points.map((p) => {
      const height =
        maxErrors > 0 && p.error_count > 0
          ? `${Math.max(Math.round((p.error_count / maxErrors) * 90), 8)}%`
          : '4%'
      const pct = (p.error_rate * 100).toFixed(1)
      const label = `${pct}% (${p.error_count})`
      const active = p.error_count > 0
      return { key: String(p.timestamp), height, label, active }
    })
  }, [points, activeTab])

  const timeAxisLabels = useMemo(() => {
    if (points.length === 12) {
      const slots = [0, 2, 4, 6, 8, 10]
      return [
        ...slots.map((idx) => ({
          key: String(points[idx]?.timestamp ?? `fallback-${idx}`),
          label: points[idx]?.time_label ?? '00:00',
        })),
        { key: 'now', label: 'NOW' },
      ]
    }
    return [
      ...[0, 1, 2, 3, 4, 5].map((i) => ({
        key: `fallback-${i}`,
        label: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'][i],
      })),
      { key: 'now', label: 'NOW' },
    ]
  }, [points])

  const total24hRequests = useMemo(() => {
    const fromTraffic = trafficQuery.data?.total_requests
    if (fromTraffic != null) {
      return fromTraffic >= 1000
        ? `${(fromTraffic / 1000).toFixed(1)}k`
        : `${fromTraffic}`
    }
    const fromLogs = logsQuery.data?.total
    if (fromLogs != null) {
      return `${fromLogs}`
    }
    return '0'
  }, [trafficQuery.data, logsQuery.data])

  const avg24hLatency = useMemo(() => {
    const fromTraffic = trafficQuery.data?.avg_latency
    if (fromTraffic != null) {
      return fromTraffic
    }
    if (recentLogs.length > 0) {
      const total = recentLogs.reduce(
        (acc: number, log: UsageLog) => acc + (log.use_time || 0),
        0
      )
      return Math.round(total / recentLogs.length)
    }
    return 0
  }, [trafficQuery.data, recentLogs])

  return (
    <div className="space-y-16">
      {/* 核心数据：大字号、细字重 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <div>
          <p className="text-zinc-500 text-[11px] uppercase tracking-widest mb-2 mono">
            {t('Total Balance')}
          </p>
          <div className="flex items-baseline space-x-2">
            <span className="text-4xl font-light text-white mono">{balanceUsd}</span>
            <span className="text-zinc-600 text-sm mono">USD</span>
          </div>
        </div>
        <div>
          <p className="text-zinc-500 text-[11px] uppercase tracking-widest mb-2 mono">
            {t('Requests / 24h')}
          </p>
          <div className="flex items-baseline space-x-2">
            <span className="text-4xl font-light text-white mono">
              {total24hRequests}
            </span>
          </div>
        </div>
        <div>
          <p className="text-zinc-500 text-[11px] uppercase tracking-widest mb-2 mono">
            {t('System Latency')}
          </p>
          <div className="flex items-baseline space-x-2">
            <span className="text-4xl font-light text-white mono">{avg24hLatency}</span>
            <span className="text-zinc-600 text-sm mono">ms</span>
          </div>
        </div>
      </div>

      {/* 数据可视化区：去背景化 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* 流量图表：极简线条工业风（连接真实后端流量统计） */}
        <div className="lg:col-span-3 border-t border-zinc-800 pt-6">
          <div className="flex justify-between items-end mb-8">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400 mono">
              {t('Traffic Distribution')}
            </h3>
            <div className="flex space-x-4 text-[10px] mono text-zinc-500 uppercase">
              <button
                type="button"
                onClick={() => setActiveTab('volume')}
                className={cn(
                  'transition-colors pb-0.5 cursor-pointer',
                  activeTab === 'volume'
                    ? 'text-white border-b border-white'
                    : 'hover:text-zinc-300'
                )}
              >
                {t('Volume')}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('latency')}
                className={cn(
                  'transition-colors pb-0.5 cursor-pointer',
                  activeTab === 'latency'
                    ? 'text-white border-b border-white'
                    : 'hover:text-zinc-300'
                )}
              >
                {t('Latency')}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('errors')}
                className={cn(
                  'transition-colors pb-0.5 cursor-pointer',
                  activeTab === 'errors'
                    ? 'text-white border-b border-white'
                    : 'hover:text-zinc-300'
                )}
              >
                {t('Errors')}
              </button>
            </div>
          </div>
          <div className="h-48 w-full flex items-end space-x-2">
            {bars.map((bar) => (
              <div
                key={bar.key}
                title={bar.label}
                className={cn(
                  'flex-1 transition-all duration-300 cursor-pointer group relative',
                  bar.active ? 'bg-white' : 'bg-zinc-800 hover:bg-zinc-700'
                )}
                style={{ height: bar.height }}
              >
                {bar.label && (
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] mono bg-zinc-900 border border-zinc-700 text-zinc-300 px-1 py-0.5 whitespace-nowrap z-10 pointer-events-none">
                    {bar.label}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[9px] mono text-zinc-600 mt-3 pt-2 border-t border-zinc-900 uppercase">
            {timeAxisLabels.map((item) => (
              <span key={item.key}>{item.label}</span>
            ))}
          </div>
        </div>

        {/* 侧边状态：渠道状态数量 */}
        <div className="lg:col-span-1 border-t border-zinc-800 pt-6">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400 mb-6 mono">
            {t('Channel Status')}
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
              <span className="text-xs mono text-zinc-300">
                {t('Enabled Channels')}
              </span>
              <span className="text-sm mono text-emerald-500 font-bold">
                {channelStatusCounts.enabled}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
              <span className="text-xs mono text-zinc-300">
                {t('Disabled Channels')}
              </span>
              <span className="text-sm mono text-zinc-500 font-bold">
                {channelStatusCounts.disabled}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
              <span className="text-xs mono text-zinc-300">
                {t('Auto Disabled Channels')}
              </span>
              <span className="text-sm mono text-red-500 font-bold">
                {channelStatusCounts.autoDisabled}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 列表区：工业风实时执行日志 */}
      <div className="border-t border-zinc-800 pt-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400 mono">
            {t('Live Execution Log')}
          </h3>
        </div>
        <table className="w-full text-left text-xs mono">
          <thead className="bg-zinc-900 text-zinc-500 uppercase">
            <tr>
              <th className="py-3 px-4 font-medium">{t('Timestamp')}</th>
              <th className="py-3 px-4 font-medium">{t('Method')}</th>
              <th className="py-3 px-4 font-medium">{t('Endpoint')}</th>
              <th className="py-3 px-4 font-medium">{t('Status')}</th>
              <th className="py-3 px-4 font-medium text-right">{t('Cost')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {recentLogs.length > 0 ? (
              recentLogs.map((log: UsageLog) => {
                const timeStr = log.created_at
                  ? dayjs.unix(log.created_at).format('HH:mm:ss.SSS')
                  : '12:44:02.001'
                const costUsd = ((log.quota || 0) / 500000).toFixed(5)
                const isSuccess = log.type !== 5
                return (
                  <tr
                    key={log.id}
                    className="hover:bg-zinc-900/50 transition-colors"
                  >
                    <td className="py-4 px-4 text-zinc-500">{timeStr}</td>
                    <td className="py-4 px-4">
                      <span className="text-blue-400 font-medium">POST</span>
                    </td>
                    <td className="py-4 px-4 text-zinc-300">
                      {log.model_name
                        ? `/v1/models/${log.model_name}`
                        : '/v1/chat/completions'}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={
                          isSuccess ? 'text-emerald-500' : 'text-red-500'
                        }
                      >
                        {isSuccess ? '200 OK' : '500 ERR'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right text-zinc-400">
                      {costUsd}
                    </td>
                  </tr>
                )
              })
            ) : (
              <>
                <tr className="hover:bg-zinc-900/50 transition-colors">
                  <td className="py-4 px-4 text-zinc-500">12:44:02.001</td>
                  <td className="py-4 px-4">
                    <span className="text-blue-400 font-medium">POST</span>
                  </td>
                  <td className="py-4 px-4 text-zinc-300">/v1/chat/completions</td>
                  <td className="py-4 px-4 text-emerald-500">200 OK</td>
                  <td className="py-4 px-4 text-right text-zinc-400">0.00042</td>
                </tr>
                <tr className="hover:bg-zinc-900/50 transition-colors">
                  <td className="py-4 px-4 text-zinc-500">12:43:58.842</td>
                  <td className="py-4 px-4">
                    <span className="text-blue-400 font-medium">POST</span>
                  </td>
                  <td className="py-4 px-4 text-zinc-300">/v1/embeddings</td>
                  <td className="py-4 px-4 text-emerald-500">200 OK</td>
                  <td className="py-4 px-4 text-right text-zinc-400">0.00011</td>
                </tr>
                <tr className="hover:bg-zinc-900/50 transition-colors">
                  <td className="py-4 px-4 text-zinc-500">12:43:45.120</td>
                  <td className="py-4 px-4">
                    <span className="text-zinc-400 font-medium">GET</span>
                  </td>
                  <td className="py-4 px-4 text-zinc-300">/v1/models</td>
                  <td className="py-4 px-4 text-amber-500">401 UNAUTH</td>
                  <td className="py-4 px-4 text-right text-zinc-400">0.00000</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
