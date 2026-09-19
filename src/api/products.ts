import { apiFetch, toQuery } from './client'
import type {
  MarketOut,
  OfficialPriceOut,
  OfficialSeries,
  Page,
  ProductCategory,
  ProductDetailOut,
  ProductOut,
  OverviewOut,
} from './types'

export function listProducts(params: {
  q?: string
  category?: ProductCategory
  locale?: string
  limit?: number
  offset?: number
} = {}): Promise<Page<ProductOut>> {
  return apiFetch(`/products${toQuery(params)}`)
}

export function getProduct(ref: string): Promise<ProductDetailOut> {
  return apiFetch(`/products/${encodeURIComponent(ref)}`)
}

/** 詳情頁請打這支：一次拿齊官方價、走勢、報價摘要（API.md 10.1）。 */
export function getProductOverview(
  ref: string,
  params: { days?: number; countryCode?: string; marketsLimit?: number } = {},
): Promise<OverviewOut> {
  const query = toQuery({
    days: params.days,
    country_code: params.countryCode,
    markets_limit: params.marketsLimit,
  })
  return apiFetch(`/products/${encodeURIComponent(ref)}/overview${query}`)
}

export function getOfficialPrices(
  ref: string,
  params: { countryCode?: string; marketId?: string; maxAgeDays?: number; limit?: number; offset?: number } = {},
): Promise<Page<OfficialPriceOut>> {
  const query = toQuery({
    country_code: params.countryCode,
    market_id: params.marketId,
    max_age_days: params.maxAgeDays,
    limit: params.limit,
    offset: params.offset,
  })
  return apiFetch(`/products/${encodeURIComponent(ref)}/prices/official${query}`)
}

export function getPriceSeries(
  ref: string,
  params: { days?: number; marketId?: string; countryCode?: string } = {},
): Promise<OfficialSeries> {
  const query = toQuery({
    days: params.days,
    market_id: params.marketId,
    country_code: params.countryCode,
  })
  return apiFetch(`/products/${encodeURIComponent(ref)}/prices/series${query}`)
}

export function getMarketsForProduct(ref: string): Promise<MarketOut[]> {
  return apiFetch(`/products/${encodeURIComponent(ref)}/markets`)
}
