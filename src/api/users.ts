import { apiFetch, toQuery } from './client'
import type { Page, PublicUserOut, QuoteOut } from './types'

export function getPublicUser(id: string): Promise<PublicUserOut> {
  return apiFetch(`/users/${encodeURIComponent(id)}`)
}

export function getPublicUserQuotes(
  id: string,
  params: { limit?: number; offset?: number } = {},
): Promise<Page<QuoteOut>> {
  return apiFetch(`/users/${encodeURIComponent(id)}/quotes${toQuery(params)}`)
}
