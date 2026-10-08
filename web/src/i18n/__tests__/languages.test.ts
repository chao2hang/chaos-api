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

import { convertDetectedLanguage, normalizeInterfaceLanguage } from '../languages'

describe('normalizeInterfaceLanguage', () => {
  test('maps lowercase cached zhTW codes that previously fell back to en', () => {
    expect(normalizeInterfaceLanguage('zhtw')).toBe('zhTW')
    expect(normalizeInterfaceLanguage('zh_tw')).toBe('zhTW')
    expect(normalizeInterfaceLanguage('zh-tw')).toBe('zhTW')
  })

  test('keeps exact camelCase and canonical regional codes stable', () => {
    expect(normalizeInterfaceLanguage('zhTW')).toBe('zhTW')
    expect(normalizeInterfaceLanguage('zh-TW')).toBe('zhTW')
    expect(normalizeInterfaceLanguage('zhTW')).toBe('zhTW')
    expect(normalizeInterfaceLanguage('zhCN')).toBe('zhCN')
    expect(normalizeInterfaceLanguage('zh-CN')).toBe('zhCN')
    expect(normalizeInterfaceLanguage('zh-hans')).toBe('zhCN')
    expect(normalizeInterfaceLanguage('zh-hk')).toBe('zhTW')
    expect(normalizeInterfaceLanguage('zh-mo')).toBe('zhTW')
    expect(normalizeInterfaceLanguage('zh-Hant')).toBe('zhTW')
  })

  test('returns plain supported codes and falls back to en for unknown values', () => {
    expect(normalizeInterfaceLanguage('en')).toBe('en')
    expect(normalizeInterfaceLanguage('fr')).toBe('fr')
    expect(normalizeInterfaceLanguage('ja')).toBe('ja')
    expect(normalizeInterfaceLanguage('de')).toBe('en')
    expect(normalizeInterfaceLanguage('')).toBe('en')
    expect(normalizeInterfaceLanguage(null)).toBe('en')
    expect(normalizeInterfaceLanguage(undefined)).toBe('en')
  })
})

describe('convertDetectedLanguage', () => {
  test('maps lowercase zhtw browser codes to the zhTW interface language', () => {
    expect(convertDetectedLanguage('zhtw')).toBe('zhTW')
  })

  test('maps traditional and simplified Chinese variants', () => {
    expect(convertDetectedLanguage('zh-TW')).toBe('zhTW')
    expect(convertDetectedLanguage('zh_HK')).toBe('zhTW')
    expect(convertDetectedLanguage('zh-Hant-TW')).toBe('zhTW')
    expect(convertDetectedLanguage('zh-CN')).toBe('zhCN')
    expect(convertDetectedLanguage('zh_SG')).toBe('zhCN')
    expect(convertDetectedLanguage('zh')).toBe('zhCN')
  })

  test('returns non-Chinese detected locales unchanged for i18next matching', () => {
    expect(convertDetectedLanguage('fr-FR')).toBe('fr-FR')
    expect(convertDetectedLanguage('en')).toBe('en')
    expect(convertDetectedLanguage('ja')).toBe('ja')
  })
})
