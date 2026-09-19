import { apiFetch, toQuery } from './client'
import type { MarketOut, Page, RegionSummary } from './types'

export function listMarkets(params: {
  countryCode?: string
  region?: string
  sourceKey?: string
  q?: string
  limit?: number
  offset?: number
} = {}): Promise<Page<MarketOut>> {
  const query = toQuery({
    country_code: params.countryCode,
    region: params.region,
    source_key: params.sourceKey,
    q: params.q,
    limit: params.limit,
    offset: params.offset,
  })
  return apiFetch(`/markets${query}`)
}

export function getMarket(id: string): Promise<MarketOut> {
  return apiFetch(`/markets/${encodeURIComponent(id)}`)
}

/** 給地區選單用：有市場資料的縣市與各自市場數，依市場數由多到少排序。 */
export function getMarketRegions(countryCode?: string): Promise<RegionSummary[]> {
  return apiFetch(`/markets/regions${toQuery({ country_code: countryCode })}`)
}
