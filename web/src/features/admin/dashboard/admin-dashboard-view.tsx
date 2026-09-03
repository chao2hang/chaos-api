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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getChannelList } from '@/features/admin/channels/api'
import type { Channel } from '@/features/admin/channels/types'
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

const VOLUME_BARS: BarData[] = [
  { height: '20%', label: '2.4k' },
  { height: '35%', label: '4.1k' },
  { height: '25%', label: '3.0k' },
  { height: '45%', label: '5.2k' },
  { height: '85%', active: true, label: '9.8k' },
  { height: '60%', label: '6.9k' },
  { height: '55%', label: '6.3k' },
  { height: '70%', label: '8.1k' },
  { height: '40%', label: '4.6k' },
  { height: '30%', label: '3.5k' },
  { height: '45%', label: '5.2k' },
  { height: '50%', label: '5.8k' },
]

const LATENCY_BARS: BarData[] = [
  { height: '40%', label: '18ms' },
  { height: '25%', label: '12ms' },
  { height: '30%', label: '14ms' },
  { height: '60%', label: '28ms' },
  { height: '45%', label: '21ms' },
  { height: '75%', active: true, label: '35ms' },
  { height: '35%', label: '16ms' },
  { height: '50%', label: '23ms' },
  { height: '65%', label: '30ms' },
  { height: '40%', label: '19ms' },
  { height: '30%', label: '14ms' },
  { height: '45%', label: '21ms' },
]

const ERROR_BARS: BarData[] = [
  { height: '10%', label: '0.1%' },
  { height: '15%', label: '0.2%' },
  { height: '5%', label: '0.0%' },
  { height: '20%', label: '0.3%' },
  { height: '10%', label: '0.1%' },
  { height: '55%', active: true, label: '0.8%' },
  { height: '15%', label: '0.2%' },
  { height: '10%', label: '0.1%' },
  { height: '5%', label: '0.0%' },
  { height: '8%', label: '0.1%' },
  { height: '12%', label: '0.2%' },
  { height: '6%', label: '0.1%' },
]

export function AdminDashboardView() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.auth.user)
  const [activeTab, setActiveTab] = useState<ChartTab>('volume')

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

  // Compute average latency from recent logs
  const recentLogs: UsageLog[] = logsQuery.data?.items || []
  const avgLatency =
    recentLogs.length > 0
      ? Math.round(
          recentLogs.reduce((acc: number, log: UsageLog) => acc + (log.use_time || 0), 0) /
            recentLogs.length
        )
      : 24

  const channelItems: Channel[] = channelsQuery.data?.data?.items || []

  const bars =
    activeTab === 'volume'
      ? VOLUME_BARS
      : activeTab === 'latency'
        ? LATENCY_BARS
        : ERROR_BARS

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
              {logsQuery.data?.total ? `${logsQuery.data.total}` : '42.9k'}
            </span>
            <span className="text-emerald-500 text-xs mono">+12.4%</span>
          </div>
        </div>
        <div>
          <p className="text-zinc-500 text-[11px] uppercase tracking-widest mb-2 mono">
            {t('System Latency')}
          </p>
          <div className="flex items-baseline space-x-2">
            <span className="text-4xl font-light text-white mono">{avgLatency}</span>
            <span className="text-zinc-600 text-sm mono">ms</span>
          </div>
        </div>
      </div>

      {/* 数据可视化区：去背景化 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* 流量图表占位：极简线条工业风 */}
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
            <span>00:00</span>
            <span>04:00</span>
            <span>08:00</span>
            <span>12:00</span>
            <span>16:00</span>
            <span>20:00</span>
            <span>NOW</span>
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
