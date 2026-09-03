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
import type { Channel } from '@/features/admin/channels/types'
import { getTrafficDistribution } from '@/features/dashboard/api'
import { fetchUsageLogs } from '@/features/usage-logs/api'
import type { UsageLog } from '@/features/usage-logs/types'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

type ChartTab = 'volume' | 'latency' | 'errors'

interface BarData {
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

  // Upstream node status
  const channelsQuery = useQuery({
    queryKey: ['admin-dashboard-channels'],
    queryFn: () =>
      getChannelList({
        path: '/api/channel',
        params: { p: 0, page_size: 5 },
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

  const channelItems: Channel[] = channelsQuery.data?.data?.items || []
  const recentLogs: UsageLog[] = logsQuery.data?.items || []

  // Dynamic real data bars for Traffic Distribution
  const points = trafficQuery.data?.points || []

  const bars: BarData[] = useMemo(() => {
    if (points.length === 0) {
      return Array.from({ length: 12 }, () => ({
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
        return { height, label, active }
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
        return { height, label, active }
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
      return { height, label, active }
    })
  }, [points, activeTab])

  const timeAxisLabels = useMemo(() => {
    if (points.length === 12) {
      return [
        points[0]?.time_label || '00:00',
        points[2]?.time_label || '04:00',
        points[4]?.time_label || '08:00',
        points[6]?.time_label || '12:00',
        points[8]?.time_label || '16:00',
        points[10]?.time_label || '20:00',
        'NOW',
      ]
    }
    return ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', 'NOW']
  }, [points])

  const total24hRequests =
    trafficQuery.data != null
      ? trafficQuery.data.total_requests >= 1000
        ? `${(trafficQuery.data.total_requests / 1000).toFixed(1)}k`
        : `${trafficQuery.data.total_requests}`
      : logsQuery.data?.total
        ? `${logsQuery.data.total}`
        : '0'

  const avg24hLatency =
    trafficQuery.data != null
      ? trafficQuery.data.avg_latency
      : recentLogs.length > 0
        ? Math.round(
            recentLogs.reduce(
              (acc: number, log: UsageLog) => acc + (log.use_time || 0),
              0
            ) / recentLogs.length
          )
        : 0

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
            {bars.map((bar, idx) => (
              <div
                key={idx}
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
            {timeAxisLabels.map((lbl, idx) => (
              <span key={idx}>{lbl}</span>
            ))}
          </div>
        </div>

        {/* 侧边状态：硬核节点列表 */}
        <div className="lg:col-span-1 border-t border-zinc-800 pt-6">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400 mb-6 mono">
            {t('Node Status')}
          </h3>
          <div className="space-y-4">
            {channelItems.length > 0 ? (
              channelItems.map((channel: Channel) => {
                const isEnabled = channel.status === 1
                const isAutoDisabled = channel.status === 3
                return (
                  <div
                    key={channel.id}
                    className="flex justify-between items-center border-b border-zinc-900 pb-2"
                  >
                    <span className="text-xs mono truncate max-w-[140px] text-zinc-300">
                      {channel.name}
                    </span>
                    <span
                      className={cn(
                        'status-tag',
                        isEnabled && 'text-emerald-500',
                        isAutoDisabled && 'text-red-500',
                        !isEnabled && !isAutoDisabled && 'text-zinc-500'
                      )}
                    >
                      {isEnabled
                        ? t('Active')
                        : isAutoDisabled
                          ? t('Down')
                          : t('Disabled')}
                    </span>
                  </div>
                )
              })
            ) : (
              <>
                <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                  <span className="text-xs mono text-zinc-300">US-EAST-1</span>
                  <span className="status-tag text-emerald-500">{t('Active')}</span>
                </div>
                <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                  <span className="text-xs mono text-zinc-300">HK-GCP-02</span>
                  <span className="status-tag text-emerald-500">{t('Active')}</span>
                </div>
                <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                  <span className="text-xs mono text-zinc-300">EU-WEST-1</span>
                  <span className="status-tag text-red-500">{t('Down')}</span>
                </div>
              </>
            )}
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
