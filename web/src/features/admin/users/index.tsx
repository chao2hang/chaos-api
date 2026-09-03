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
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AdminPage } from '@/components/admin/admin-page'
import { Button } from '@chaos_team/chaos-ui'

import { fetchUsers, getUserGroups } from './api'
import { UserFormDialog } from './components/user-form-dialog'
import { UserQuotaDialog } from './components/user-quota-dialog'
import { UsersFilterBar } from './components/users-filter-bar'
import { UsersTable } from './components/users-table'
import { USERS_QUERY_KEY } from './constants'
import { buildUserListRequest } from './lib/query-params'
import type { User, UserFilters } from './types'

const routeApi = getRouteApi('/_authenticated/admin/users/')

type FilterPatch = {
  filter?: string
  status?: ('1' | '2')[]
  role?: ('1' | '10' | '100')[]
  group?: string
}

export function AdminUsers() {
  const { t } = useTranslation()
  const search = routeApi.useSearch()
  const navigate = routeApi.useNavigate()
  const queryClient = useQueryClient()

  const [formOpen, setFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [quotaUser, setQuotaUser] = useState<User | null>(null)

  const filters: UserFilters = useMemo(
    () => ({
      page: search.page ?? 1,
      pageSize: search.pageSize ?? 20,
      keyword: search.filter ?? '',
      status: search.status ?? [],
      role: search.role ?? [],
      group: search.group ?? '',
    }),
    [search]
  )

  const request = useMemo(() => buildUserListRequest(filters), [filters])

  const usersQuery = useQuery({
    queryKey: [...USERS_QUERY_KEY, request],
    queryFn: () => fetchUsers(request),
  })

  const groupsQuery = useQuery({
    queryKey: [...USERS_QUERY_KEY, 'groups'],
    queryFn: getUserGroups,
  })

  const invalidateUsers = () => {
    void queryClient.invalidateQueries({ queryKey: [...USERS_QUERY_KEY] })
  }

  const patchSearch = (patch: FilterPatch) => {
    void navigate({
      search: (prev) => ({ ...prev, page: undefined, ...patch }),
    })
  }

  const handlePageChange = (page: number, pageSize: number) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        page: page > 1 ? page : undefined,
        pageSize,
      }),
    })
  }

  const items = usersQuery.data?.data?.items ?? []
  const total = usersQuery.data?.data?.total ?? 0

  return (
    <>
      <AdminPage
        title={t('Users')}
        description={t('Manage users, roles, groups and quota.')}
        actions={
          <Button
            icon={<Plus className='size-4' />}
            onClick={() => {
              setEditingUser(null)
              setFormOpen(true)
            }}
          >
            {t('Create user')}
          </Button>
        }
      >
        <UsersFilterBar
          keyword={filters.keyword}
          status={filters.status[0] ?? ''}
          role={filters.role[0] ?? ''}
          group={filters.group}
          groupOptions={groupsQuery.data?.data ?? []}
          onFilterChange={patchSearch}
        />
        <UsersTable
          items={items}
          loading={usersQuery.isPending}
          total={total}
          page={filters.page}
          pageSize={filters.pageSize}
          onPageChange={handlePageChange}
          onEdit={(user) => {
            setEditingUser(user)
            setFormOpen(true)
          }}
          onQuota={(user) => setQuotaUser(user)}
        />
      </AdminPage>
      <UserFormDialog
        open={formOpen}
        user={editingUser}
        groups={groupsQuery.data?.data ?? []}
        onOpenChange={setFormOpen}
        onSaved={() => {
          setFormOpen(false)
          invalidateUsers()
        }}
      />
      {quotaUser !== null && (
        <UserQuotaDialog
          user={quotaUser}
          onOpenChange={(open) => {
            if (!open) setQuotaUser(null)
          }}
          onSaved={() => {
            setQuotaUser(null)
            invalidateUsers()
          }}
        />
      )}
    </>
  )
}
