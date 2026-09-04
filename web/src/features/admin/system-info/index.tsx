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
import { Popconfirm } from '@chaos_team/chaos-ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { AdminPage } from '@/components/admin/admin-page'
import { cn } from '@/lib/utils'

import {
  deleteStaleSystemInstance,
  deleteStaleSystemInstances,
  listSystemInstances,
} from './api'
import { InstancesSummaryCards } from './components/instances-summary-cards'
import { SystemInstancesTable } from './components/system-instances-table'
import {
  DEFAULT_STALE_AFTER_SECONDS,
  INSTANCE_POLL_INTERVAL_MS,
  INSTANCE_STALE_TIME_MS,
  SUCCESS_MESSAGES,
  SYSTEM_INFO_QUERY_KEY,
} from './constants'

/** Admin "System Info" page: cluster instances, heartbeats and usage. */
export function AdminSystemInfo() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const instancesQuery = useQuery({
    queryKey: [...SYSTEM_INFO_QUERY_KEY, 'instances'],
    queryFn: listSystemInstances,
    staleTime: INSTANCE_STALE_TIME_MS,
    refetchInterval: INSTANCE_POLL_INTERVAL_MS,
    retry: false,
  })

  const loadFailed =
    instancesQuery.isError || instancesQuery.data?.success === false
  const instances = useMemo(
    () =>
      instancesQuery.data?.success ? (instancesQuery.data.data ?? []) : [],
    [instancesQuery.data]
  )

  const invalidateInstances = () => {
    void queryClient.invalidateQueries({ queryKey: [...SYSTEM_INFO_QUERY_KEY] })
  }

  const deleteStaleInstanceMutation = useMutation({
    mutationFn: deleteStaleSystemInstance,
    onSuccess: (res) => {
      if (res.success) {
        toast.success(t(SUCCESS_MESSAGES.STALE_INSTANCE_DELETED))
      }
      invalidateInstances()
    },
  })

  const deleteStaleInstancesMutation = useMutation({
    mutationFn: deleteStaleSystemInstances,
    onSuccess: (res) => {
      if (res.success) {
        toast.success(
          t(SUCCESS_MESSAGES.STALE_INSTANCES_DELETED, {
            count: res.data?.deleted_count ?? 0,
          })
        )
      }
      invalidateInstances()
    },
  })

  const onlineCount = instances.filter(
    (instance) => instance.status === 'online'
  ).length
  const staleCount = instances.length - onlineCount
  const staleAfterSeconds =
    instances[0]?.stale_after_seconds ?? DEFAULT_STALE_AFTER_SECONDS

  const loading = instancesQuery.isPending
  const refreshing = instancesQuery.isFetching && !loading
  const deleting =
    deleteStaleInstanceMutation.isPending ||
    deleteStaleInstancesMutation.isPending

  return (
    <AdminPage
      title={t('System Info')}
      description={t(
        'Inspect cluster instances, heartbeats, and resource usage.'
      )}
      actions={
        <>
          <span className='mono text-xs text-zinc-500' aria-live='polite'>
            {t('Auto-refreshing every {{seconds}}s', {
              seconds: INSTANCE_POLL_INTERVAL_MS / 1000,
            })}
          </span>
          {staleCount > 0 && (
            <Popconfirm
              title={t('Delete all stale')}
              description={t(
                'Delete {{count}} stale instance records? Online instances will not be deleted.',
                { count: staleCount }
              )}
              okText={t('Delete')}
              cancelText={t('Cancel')}
              okVariant='destructive'
              onConfirm={() => deleteStaleInstancesMutation.mutate()}
            >
              <button
                type='button'
                disabled={deleting}
                className='btn-industrial-danger mono cursor-pointer text-xs disabled:cursor-not-allowed disabled:opacity-30'
              >
                {deleteStaleInstancesMutation.isPending ? (
                  <Loader2
                    className='size-3.5 animate-spin'
                    aria-hidden='true'
                  />
                ) : (
                  <Trash2 className='size-3.5' aria-hidden='true' />
                )}
                {t('Delete all stale')}
              </button>
            </Popconfirm>
          )}
          <button
            type='button'
            onClick={() => void instancesQuery.refetch()}
            disabled={instancesQuery.isFetching}
            className='btn-industrial-secondary mono cursor-pointer text-xs disabled:cursor-not-allowed disabled:opacity-30'
          >
            <RefreshCw
              className={cn('size-3.5', refreshing && 'animate-spin')}
              aria-hidden='true'
            />
            {refreshing ? t('Refreshing...') : t('Refresh')}
          </button>
        </>
      }
    >
      <InstancesSummaryCards
        loading={loading}
        onlineCount={onlineCount}
        totalCount={instances.length}
        staleCount={staleCount}
        staleAfterSeconds={staleAfterSeconds}
      />
      <SystemInstancesTable
        instances={instances}
        loading={loading}
        error={loadFailed}
        deleting={deleting}
        deletingNodeName={
          deleteStaleInstanceMutation.isPending
            ? deleteStaleInstanceMutation.variables
            : null
        }
        onRetry={() => {
          void instancesQuery.refetch()
        }}
        onDeleteStale={(instance) => {
          deleteStaleInstanceMutation.mutate(instance.node_name)
        }}
      />
    </AdminPage>
  )
}
