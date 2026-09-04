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
// ============================================================================
// Core Types
// ============================================================================

export type SystemInstanceStatus = 'online' | 'stale'

/** Heartbeat payload reported by each node (see service.SystemInstanceInfo). */
export type SystemInstanceInfo = {
  schema_version?: number
  node?: {
    name?: string
    source?: string
    manually_configured?: boolean
    should_configure_manually?: boolean
  }
  role?: {
    is_master?: boolean
  }
  runtime?: {
    version?: string
    goos?: string
    goarch?: string
    started_at?: number
  }
  host?: {
    hostname?: string
  }
  resources?: {
    cpu?: { usage_percent?: number }
    memory?: { usage_percent?: number }
    storage?: {
      total_bytes?: number
      used_bytes?: number
      free_bytes?: number
      used_percent?: number
    }
  }
}

export type SystemInstance = {
  node_name: string
  status: SystemInstanceStatus
  stale_after_seconds: number
  started_at: number
  last_seen_at: number
  info?: SystemInstanceInfo
}

// ============================================================================
// API Envelope Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
}

export type SystemInstanceListResponse = ApiResponse<SystemInstance[]>

export type SystemInstanceDeleteResponse = ApiResponse<{
  deleted_count: number
}>
