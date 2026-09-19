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

/**
 * 品項清單。`region` / `countryCode` / `marketId` 是**產地篩選**（API.md 7.1）：
 * 只回「在該地確實有官方行情」的品項，點進去才不會是一片空白。
 * 地區名稱可能跨國撞名，拿得到國碼就一起帶。
 */
export function listProducts(params: {
  q?: string
  category?: ProductCategory
  region?: string
  countryCode?: string
  marketId?: string
  locale?: string
  limit?: number
  offset?: number
} = {}): Promise<Page<ProductOut>> {
  const query = toQuery({
    q: params.q,
    category: params.category,
    region: params.region,
    country_code: params.countryCode,
    market_id: params.marketId,
    locale: params.locale,
    limit: params.limit,
    offset: params.offset,
  })
  return apiFetch(`/products${query}`)
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
