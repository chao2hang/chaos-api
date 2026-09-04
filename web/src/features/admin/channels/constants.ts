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

/**
 * Focused list of the most common channel types, mirroring the backend IDs
 * in `constant/channel.go`. Labels are brand names and are not translated.
 */
export interface ChannelTypeOption {
  value: string
  label: string
}

export const CHANNEL_TYPES: ChannelTypeOption[] = [
  { value: '1', label: 'OpenAI' },
  { value: '3', label: 'Azure' },
  { value: '4', label: 'Ollama' },
  { value: '8', label: 'Custom' },
  { value: '14', label: 'Anthropic' },
  { value: '15', label: 'Baidu' },
  { value: '16', label: 'Zhipu' },
  { value: '17', label: 'Ali' },
  { value: '19', label: '360' },
  { value: '20', label: 'OpenRouter' },
  { value: '24', label: 'Gemini' },
  { value: '25', label: 'Moonshot' },
  { value: '27', label: 'Perplexity' },
  { value: '31', label: 'Yi' },
  { value: '33', label: 'AWS' },
  { value: '34', label: 'Cohere' },
  { value: '35', label: 'MiniMax' },
  { value: '38', label: 'Jina' },
  { value: '40', label: 'SiliconFlow' },
  { value: '41', label: 'Vertex AI' },
  { value: '42', label: 'Mistral' },
  { value: '43', label: 'DeepSeek' },
  { value: '45', label: 'VolcEngine' },
  { value: '48', label: 'xAI' },
  { value: '49', label: 'Coze' },
  { value: '56', label: 'Replicate' },
  { value: '57', label: 'Codex' },
  { value: '58', label: 'Advanced Custom' },
]

/** Map of channel type id (as string) to its display label. */
export const CHANNEL_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  CHANNEL_TYPES.map((option) => [option.value, option.label])
)

/** Look up a channel type label; falls back to the raw id when unknown. */
export function getChannelTypeLabel(type: number): string {
  return CHANNEL_TYPE_LABELS[String(type)] ?? String(type)
}

export interface ChannelStatusMeta {
  labelKey: string
  color: string
}

/** Display metadata per channel status (1 enabled / 2 disabled / 3 auto). */
export const CHANNEL_STATUS_META: Record<number, ChannelStatusMeta> = {
  1: { labelKey: 'Enabled', color: 'green' },
  2: { labelKey: 'Disabled', color: 'gray' },
  3: { labelKey: 'Auto Disabled', color: 'red' },
}

/** Status filter values accepted by the list endpoint. */
export const STATUS_FILTER_VALUES = ['enabled', 'disabled'] as const

/**
 * Domestic coding-plan channel presets, rendered as a "Coding Plan" group
 * inside the Type menu. Selecting one sets the channel type (mirroring backend
 * IDs in `constant/channel.go`), the `base_url` plan key (mirroring
 * `constant.ChannelSpecialBases`) and the recommended model list.
 */
export interface CodingPlanTypeOption {
  /** Backend channel type id (as string). */
  type: string
  /** Plan key written into the channel `base_url` field. */
  planBase: string
  /** i18n key for the display label. */
  labelKey: string
  /** Comma-separated recommended models; empty means "do not touch models". */
  models: string
}

export const CODING_PLAN_TYPES: CodingPlanTypeOption[] = [
  {
    type: '26',
    planBase: 'glm-coding-plan',
    labelKey: 'glm-coding-plan (Zhipu GLM Coding Plan)',
    models: 'glm-5.3,glm-5.3-flash',
  },
  {
    type: '26',
    planBase: 'glm-coding-plan-international',
    labelKey: 'glm-coding-plan-international (Zhipu GLM Coding Plan Intl)',
    models: 'glm-5.3,glm-5.3-flash',
  },
  {
    type: '25',
    planBase: 'kimi-api-platform',
    labelKey: 'kimi-api-platform (Kimi Open Platform)',
    models: 'kimi-k3,kimi-k2.7-code,kimi-k2.7-code-highspeed,kimi-k2.6',
  },
  {
    type: '35',
    planBase: 'minimax-coding-plan',
    labelKey: 'minimax-coding-plan (MiniMax Token Plan)',
    models: 'MiniMax-M3',
  },
  {
    type: '17',
    planBase: 'bailian-coding-plan',
    labelKey: 'bailian-coding-plan (Alibaba Bailian Coding Plan)',
    models:
      'qwen3.7-plus,qwen3.6-plus,qwen3.5-plus,qwen3-coder-next,qwen3-coder-plus,kimi-k2.5,glm-5,MiniMax-M2.5',
  },
  {
    type: '45',
    planBase: 'doubao-coding-plan',
    labelKey: 'doubao-coding-plan (Volcengine Ark Coding Plan)',
    models: '',
  },
]
