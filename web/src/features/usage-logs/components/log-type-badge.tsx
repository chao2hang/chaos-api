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
import { Badge } from '@chaos_team/chaos-ui'
import { useTranslation } from 'react-i18next'

import { getLogTypeOption, LOG_TYPE_BADGE_VARIANTS } from '../constants'
import type { UsageLog } from '../types'

type LogTypeBadgeProps = {
  log: UsageLog
}

/** Badge cell rendering the log type enum (0-7) with its localized label. */
export function LogTypeBadge(props: LogTypeBadgeProps) {
  const { t } = useTranslation()
  const option = getLogTypeOption(props.log.type)
  const variant = LOG_TYPE_BADGE_VARIANTS[props.log.type] ?? 'outline'
  return (
    <Badge variant={variant}>{t(option?.labelKey ?? 'Unknown')}</Badge>
  )
}
