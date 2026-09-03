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

import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { ChannelsPage } from '@/features/admin/channels'
import type { ChannelsSearch } from '@/features/admin/channels/types'

const channelsSearchSchema = z.object({
  page: z.number().catch(1),
  pageSize: z.number().catch(10),
  filter: z.string().catch(''),
  status: z.array(z.string()).catch([]),
  type: z.array(z.string()).catch([]),
  group: z.string().catch(''),
})

export const Route = createFileRoute('/_authenticated/admin/channels/')({
  validateSearch: channelsSearchSchema,
  component: ChannelsRoute,
})

function ChannelsRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const handleFilterChange = (patch: Partial<ChannelsSearch>) => {
    void navigate({
      search: (prev) => {
        const next = { ...prev, ...patch }
        if (!('page' in patch)) {
          next.page = 1
        }
        return next
      },
    })
  }

  return <ChannelsPage search={search} onFilterChange={handleFilterChange} />
}
