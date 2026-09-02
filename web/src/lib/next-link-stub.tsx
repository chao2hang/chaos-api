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
import type { ComponentProps } from 'react'

/**
 * Build-time stub for `next/link`, which `@chaos_team/chaos-ui/layout`
 * imports at module scope for its optional Next.js adapter.
 *
 * This app always passes its own `linkComponent` (TanStack Router Link)
 * to chaos-ui layout components, so the Next adapter is never rendered.
 * The alias exists only so bundlers can resolve the import without
 * installing the Next.js framework.
 */
export default function NextLinkStub(props: ComponentProps<'a'>) {
  return <a {...props} />
}
