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

import { MOTION_VARIANTS } from '../motion'

describe('MOTION_VARIANTS pageEnter', () => {
  test('never animates to an exact zero blur that blanks Android pages', () => {
    const animate = MOTION_VARIANTS.pageEnter.animate as {
      filter: string
      transitionEnd?: { filter?: string }
    }

    expect(animate.filter).not.toBe('blur(0px)')
    expect(animate.filter).toMatch(/^blur\(0\.\d+px\)$/)
    // The filter is fully released only after the animation finishes.
    expect(animate.transitionEnd?.filter).toBe('none')
  })

  test('keeps the blur transition from the initial state and the exit blur', () => {
    const pageEnter = MOTION_VARIANTS.pageEnter as {
      initial: { filter: string }
      exit: { filter: string }
    }

    expect(pageEnter.initial.filter).toBe('blur(4px)')
    expect(pageEnter.exit.filter).toBe('blur(2px)')
  })
})
