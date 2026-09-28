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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PlusIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { AdminPage } from '@/components/admin/admin-page'

import { getChannelGroups, getChannelList, batchSetChannelTag, setTagChannels } from './api'
import { BatchToolbar } from './components/batch-toolbar'
import { ChannelDialog } from './components/channel-dialog'
import { ChannelFilterBar } from './components/channel-filter-bar'
import { ChannelsTable } from './components/channels-table'
import { ChannelsOpsMenu } from './components/channels-ops-menu'
import { CodexUsageDialog } from './components/codex-usage-dialog'
import { MultiKeyDialog } from './components/multi-key-dialog'
import { OllamaDialog } from './components/ollama-dialog'
import { UpstreamUpdatesDialog } from './components/upstream-updates-dialog'
import { useChannelActions } from './hooks/use-channel-actions'
import {
  buildChannelListQuery,
  type ChannelListFilters,
} from './lib/query'
import type { Channel, ChannelsSearch } from './types'

export interface ChannelsPageProps {
  search: ChannelsSearch
  onFilterChange: (patch: Partial<ChannelsSearch>) => void
}

/** Admin "Channels" page: paginated list with filters, CRUD and batch ops. */
export function ChannelsPage(props: ChannelsPageProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const filters: ChannelListFilters = {
    page: props.search.page,
    pageSize: props.search.pageSize,
    keyword: props.search.filter,
    status: props.search.status,
    type: props.search.type,
    group: props.search.group,
    tagMode: props.search.tag_mode,
  }
  const listQuery = useMemo(
    () => buildChannelListQuery(filters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.search]
  )

  const channelsQuery = useQuery({
    queryKey: ['admin', 'channels', 'list', listQuery],
    queryFn: () => getChannelList(listQuery),
  })
  const groupsQuery = useQuery({
    queryKey: ['admin', 'channels', 'groups'],
    queryFn: getChannelGroups,
  })

  const items: Channel[] = channelsQuery.data?.data?.items ?? []
  const total = channelsQuery.data?.data?.total ?? 0
  const groups: string[] = groupsQuery.data?.data ?? []

  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Channel | null>(null)
  const [keysChannel, setKeysChannel] = useState<Channel | null>(null)
  const [codexChannel, setCodexChannel] = useState<Channel | null>(null)
  const [ollamaChannel, setOllamaChannel] = useState<Channel | null>(null)
  const [updatesChannel, setUpdatesChannel] = useState<Channel | null>(null)

  const actions = useChannelActions({ onBatchDone: () => setSelectedIds([]) })
  const actionPending =
    actions.toggleStatus.isPending ||
    actions.test.isPending ||
    actions.copy.isPending ||
    actions.queryBalance.isPending ||
    actions.remove.isPending ||
    actions.batchStatus.isPending ||
    actions.batchDelete.isPending

  const batchTag = useMutation({
    mutationFn: (input: { ids: number[]; tag: string }) =>
      batchSetChannelTag(input.ids, input.tag),
    onSuccess: (res) => {
      if (!res.success) {
        toast.error(res.message || t('Failed to set channel tag'))
        return
      }
      toast.success(t('Channel tag updated'))
      void queryClient.invalidateQueries({ queryKey: ['admin', 'channels'] })
      setSelectedIds([])
    },
  })

  const tagStatus = useMutation({
    mutationFn: (input: { tag: string; status: number }) =>
      setTagChannels(input.tag, input.status),
    onSuccess: (res) => {
      if (!res.success) {
        toast.error(res.message || t('Failed to update tag channels'))
        return
      }
      toast.success(t('Tag channels updated'))
      void queryClient.invalidateQueries({ queryKey: ['admin', 'channels'] })
    },
  })

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (channel: Channel) => {
    setEditing(channel)
    setDialogOpen(true)
  }

  const toggleChannelStatus = (channel: Channel) => {
    actions.toggleStatus.mutate({
      id: channel.id,
      status: channel.status === 1 ? 2 : 1,
    })
  }

  return (
    <AdminPage
      title={t('Channels')}
      description={t('Manage upstream provider channels.')}
      actions={
        <div className='flex items-center gap-2'>
          <ChannelsOpsMenu />
          <button
            type="button"
            onClick={openCreate}
            className="btn-industrial-primary mono text-xs cursor-pointer"
          >
            <PlusIcon className="size-3.5" />
            {t('Create channel')}
          </button>
        </div>
      }
    >
      <ChannelFilterBar
        keyword={props.search.filter}
        status={props.search.status}
        type={props.search.type}
        group={props.search.group}
        groups={groups}
        tagMode={props.search.tag_mode}
        onFilterChange={props.onFilterChange}
      />
      {!props.search.tag_mode && (
        <BatchToolbar
          selectedIds={selectedIds}
          disabled={actionPending}
          onClear={() => setSelectedIds([])}
          onBatchStatus={(ids, status) => actions.batchStatus.mutate({ ids, status })}
          onBatchDelete={(ids) => actions.batchDelete.mutate(ids)}
          onBatchTag={(ids, tag) => batchTag.mutate({ ids, tag })}
        />
      )}
      <ChannelsTable
        data={items}
        total={total}
        page={props.search.page}
        pageSize={props.search.pageSize}
        loading={channelsQuery.isPending}
        actionPending={actionPending}
        tagMode={props.search.tag_mode}
        onTagStatus={(tag, status) => tagStatus.mutate({ tag, status })}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onPageChange={(page, pageSize) => {
          setSelectedIds([])
          props.onFilterChange({ page, pageSize })
        }}
        onEdit={openEdit}
        onToggleStatus={toggleChannelStatus}
        onTest={(channel) => actions.test.mutate(channel.id)}
        onCopy={(channel) => actions.copy.mutate(channel.id)}
        onDelete={(channel) => actions.remove.mutate(channel.id)}
        onQueryBalance={(channel) => actions.queryBalance.mutate(channel)}
        onManageKeys={setKeysChannel}
        onCodexUsage={setCodexChannel}
        onOllamaModels={setOllamaChannel}
        onUpstreamUpdates={setUpdatesChannel}
      />
      <ChannelDialog
        open={dialogOpen}
        channel={editing}
        groups={groups}
        onOpenChange={setDialogOpen}
      />
      <MultiKeyDialog
        channel={keysChannel}
        onOpenChange={(open) => setKeysChannel(open ? keysChannel : null)}
      />
      <CodexUsageDialog
        channel={codexChannel}
        onOpenChange={(open) => setCodexChannel(open ? codexChannel : null)}
      />
      <OllamaDialog
        channel={ollamaChannel}
        onOpenChange={(open) => setOllamaChannel(open ? ollamaChannel : null)}
      />
      <UpstreamUpdatesDialog
        channel={updatesChannel}
        onOpenChange={(open) => setUpdatesChannel(open ? updatesChannel : null)}
      />
    </AdminPage>
  )
}
