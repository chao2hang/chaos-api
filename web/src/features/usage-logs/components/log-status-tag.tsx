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
import { Tag } from '@chaos_team/chaos-ui'
import { useTranslation } from 'react-i18next'

import { LOG_STATUS_TAG_COLORS } from '../constants'

type LogStatusTagProps = {
  status: string
}

/** Tag cell for drawing / task log statuses (SUCCESS, FAILURE, …). */
export function LogStatusTag(props: LogStatusTagProps) {
  const { t } = useTranslation()
  const status = props.status || 'UNKNOWN'
  const color = LOG_STATUS_TAG_COLORS[status] ?? 'default'
  return <Tag color={color}>{t(status)}</Tag>
}
