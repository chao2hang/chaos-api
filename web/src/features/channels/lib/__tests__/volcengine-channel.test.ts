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
import { describe, expect, test } from 'vitest'

import { CHANNEL_TYPES } from '../../constants'
import { getChannelTypeConfig } from '../channel-type-config'
import { getChannelTypeIcon } from '../channel-utils'

describe('VolcEngine channel config', () => {
  const VOLCENGINE_TYPE = 45

  test('registers VolcEngine type metadata and default base URL', () => {
    expect(CHANNEL_TYPES[VOLCENGINE_TYPE]).toBe('VolcEngine')
    expect(getChannelTypeIcon(VOLCENGINE_TYPE)).toBe('Volcengine')

    const config = getChannelTypeConfig(VOLCENGINE_TYPE)
    expect(config.id).toBe(45)
    expect(config.defaultBaseUrl).toBe('https://ark.cn-beijing.volces.com')
    expect(config.hints?.baseUrl).toBe('Default: https://ark.cn-beijing.volces.com')
  })
})
