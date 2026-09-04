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
import { api } from '@/lib/http-client'

/** Upstream (basellm llm-metadata) pricing entry for one model. */
export type UpstreamPricingEntry = {
  model_name: string
  vendor_name?: string
  tags?: string
  ratio_model?: number
  ratio_completion?: number
  ratio_cache?: number
  create_cache_ratio?: number
  price_per_m_input?: number
  price_per_m_output?: number
  price_per_m_cache_read?: number
  price_per_m_cache_write?: number
  score?: number
}

export type UpstreamPricingMatchItem = {
  model: string
  exact: boolean
  score: number
  candidates: UpstreamPricingEntry[]
}

export type UpstreamPricingMatchResponse = {
  success: boolean
  message?: string
  data?: {
    items: UpstreamPricingMatchItem[]
    unset_count: number
    matched_count: number
    upstream_count: number
    models_url: string
  }
}

export type UpstreamPricingCatalogResponse = {
  success: boolean
  message?: string
  data?: {
    models: UpstreamPricingEntry[]
    upstream_count: number
    models_url: string
  }
}

export type UpstreamPricingApplyItem = {
  model: string
  upstream_model: string
  fields?: string[]
}

export type UpstreamPricingApplyResponse = {
  success: boolean
  message?: string
  data?: {
    applied: string[]
    applied_count: number
    skipped: Array<{ model: string; reason: string }>
    updated_fields?: Record<string, boolean>
  }
}

export async function matchUpstreamPricing(locale?: string) {
  const res = await api.get<UpstreamPricingMatchResponse>(
    '/api/models/pricing_upstream/match',
    { params: locale ? { locale } : undefined }
  )
  return res.data
}

export async function getUpstreamPricingCatalog(locale?: string) {
  const res = await api.get<UpstreamPricingCatalogResponse>(
    '/api/models/pricing_upstream/catalog',
    { params: locale ? { locale } : undefined }
  )
  return res.data
}

export async function applyUpstreamPricing(items: UpstreamPricingApplyItem[]) {
  const res = await api.post<UpstreamPricingApplyResponse>(
    '/api/models/pricing_upstream/apply',
    { items }
  )
  return res.data
}

export type MatchConfidence = 'exact' | 'high' | 'medium' | 'low' | 'none'

export function getMatchConfidence(score: number): MatchConfidence {
  if (score >= 0.999) return 'exact'
  if (score >= 0.9) return 'high'
  if (score >= 0.75) return 'medium'
  if (score > 0) return 'low'
  return 'none'
}

export function formatUpstreamPriceSummary(entry: UpstreamPricingEntry) {
  const parts: string[] = []
  if (entry.price_per_m_input !== undefined) {
    parts.push(`$${entry.price_per_m_input}/1M in`)
  }
  if (entry.price_per_m_output !== undefined) {
    parts.push(`$${entry.price_per_m_output}/1M out`)
  }
  if (entry.price_per_m_cache_read !== undefined) {
    parts.push(`$${entry.price_per_m_cache_read} cache`)
  }
  return parts.join(' · ')
}

export function formatUpstreamRatioSummary(entry: UpstreamPricingEntry) {
  const parts: string[] = []
  if (entry.ratio_model !== undefined) {
    parts.push(`ratio ${entry.ratio_model}`)
  }
  if (entry.ratio_completion !== undefined) {
    parts.push(`completion ${entry.ratio_completion}`)
  }
  if (entry.ratio_cache !== undefined) {
    parts.push(`cache ${entry.ratio_cache}`)
  }
  if (entry.create_cache_ratio !== undefined) {
    parts.push(`cache write ${entry.create_cache_ratio}`)
  }
  return parts.join(' · ')
}
