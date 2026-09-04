/*
Copyright (C) 2023-2026 Chaos

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
*/
export {
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from '@chaos_team/chaos-ui/ui'

import { Avatar as AvatarPrimitive } from '@chaos_team/chaos-ui/ui'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

type AvatarProps = ComponentProps<typeof AvatarPrimitive>

/**
 * Avatar with the library's decorative pseudo-element ring removed.
 * chaos-ui draws an `after:` circle border (mix-blend darken/lighten) on
 * every avatar; on non-circular fallbacks it renders as an odd inscribed
 * ring, and on colored initials it adds a stray outline.
 */
function Avatar({ className, ...props }: AvatarProps) {
  return (
    <AvatarPrimitive className={cn(className, 'after:hidden')} {...props} />
  )
}

export { Avatar, type AvatarProps }
