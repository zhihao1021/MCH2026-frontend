import { apiFetch, toQuery } from './client'
import type { CreateQuoteBody, Page, PatchQuoteBody, QuoteOut, QuoteSide, UserRole } from './types'

export function listQuotes(params: {
  productId?: string
  side?: QuoteSide
  role?: UserRole
  countryCode?: string
  region?: string
  marketId?: string
  limit?: number
  offset?: number
} = {}): Promise<Page<QuoteOut>> {
  const query = toQuery({
    product_id: params.productId,
    side: params.side,
    role: params.role,
    country_code: params.countryCode,
    region: params.region,
    market_id: params.marketId,
    limit: params.limit,
    offset: params.offset,
  })
  return apiFetch(`/quotes${query}`)
}

export function createQuote(body: CreateQuoteBody): Promise<QuoteOut> {
  return apiFetch('/quotes', { method: 'POST', auth: true, body: JSON.stringify(body) })
}

export function getQuote(id: string): Promise<QuoteOut> {
  return apiFetch(`/quotes/${encodeURIComponent(id)}`)
}

export function patchQuote(id: string, body: PatchQuoteBody): Promise<QuoteOut> {
  return apiFetch(`/quotes/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify(body),
  })
}

export function deleteQuote(id: string): Promise<QuoteOut> {
  return apiFetch(`/quotes/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true })
}

export function getMyQuotes(params: { limit?: number; offset?: number } = {}): Promise<Page<QuoteOut>> {
  return apiFetch(`/me/quotes${toQuery(params)}`, { auth: true })
}
