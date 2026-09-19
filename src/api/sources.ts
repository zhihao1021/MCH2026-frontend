import { apiFetch } from './client'
import type { SourceOut, SourcesResponse } from './types'

export function listSources(): Promise<SourcesResponse> {
  return apiFetch('/sources')
}

export function getSource(key: string): Promise<SourceOut> {
  return apiFetch(`/sources/${encodeURIComponent(key)}`)
}
