import { apiFetch, toQuery } from './client'
import type {
  CreateRetailReportBody,
  Page,
  RetailPriceSpreadOut,
  RetailPriceSummaryOut,
  RetailReportOut,
} from './types'

/**
 * 消費者回報的超市零售價（API.md 10）。跟 quotes.ts 的小農／盤商報價（要約）、
 * intents.ts 的消費者意向價（願付價）都不是同一件事：這裡回報的是「觀察到的
 * 實際售價」，任何登入者都能回報，不需要小農／盤商身分，單筆回報也是公開的
 * （意向價相反，只給聚合值）。
 */

/**
 * 回報我看到的價格。照標籤填 `observed_price`／`pack_size`，不要自己換算成
 * 每單位價格，後端會算出 `unit_price`（API.md 10.2）。
 *
 * 可能的錯誤：retail_observation_future（400）、retail_observation_too_old（400，
 * details.max_age_days）、retail_store_cooldown（429，details.retry_after 秒；
 * 冷卻期綁在「同一人 × 同一作物 × 同一店家」，不同店家不受影響）。
 */
export function createRetailReport(ref: string, body: CreateRetailReportBody): Promise<RetailReportOut> {
  return apiFetch(`/products/${encodeURIComponent(ref)}/retail-prices`, {
    method: 'POST',
    auth: true,
    body: JSON.stringify(body),
  })
}

/** 近期回報清單（公開）。跟看板相反，這支預設把特價也全收。 */
export function listRetailReports(
  ref: string,
  params: {
    region?: string
    subdivisionCode?: string
    countryCode?: string
    storeType?: string
    days?: number
    includePromotions?: boolean
    limit?: number
    offset?: number
  } = {},
): Promise<Page<RetailReportOut>> {
  const query = toQuery({
    region: params.region,
    subdivision_code: params.subdivisionCode,
    country_code: params.countryCode,
    store_type: params.storeType,
    days: params.days,
    include_promotions: params.includePromotions,
    limit: params.limit,
    offset: params.offset,
  })
  return apiFetch(`/products/${encodeURIComponent(ref)}/retail-prices${query}`)
}

/** 零售價看板（公開）。要顯示的數字是 typical_price，並務必秀出 by_store_type。 */
export function getRetailPriceSummary(
  ref: string,
  params: {
    region?: string
    subdivisionCode?: string
    countryCode?: string
    days?: number
    includePromotions?: boolean
  } = {},
): Promise<RetailPriceSummaryOut> {
  const query = toQuery({
    region: params.region,
    subdivision_code: params.subdivisionCode,
    country_code: params.countryCode,
    days: params.days,
    include_promotions: params.includePromotions,
  })
  return apiFetch(`/products/${encodeURIComponent(ref)}/retail-prices/summary${query}`)
}

/** 產銷價差（公開）：零售看板對照同期官方批發行情。wholesale_source 為 null 時 spread 也是 null。 */
export function getRetailPriceSpread(
  ref: string,
  params: { region?: string; subdivisionCode?: string; countryCode?: string } = {},
): Promise<RetailPriceSpreadOut> {
  const query = toQuery({
    region: params.region,
    subdivision_code: params.subdivisionCode,
    country_code: params.countryCode,
  })
  return apiFetch(`/products/${encodeURIComponent(ref)}/retail-prices/spread${query}`)
}

/** 我回報過的：只有這裡（和清單裡自己那幾筆）看得到 excluded_reason。 */
export function getMyRetailReports(
  params: { includeWithdrawn?: boolean; limit?: number; offset?: number } = {},
): Promise<Page<RetailReportOut>> {
  const query = toQuery({
    include_withdrawn: params.includeWithdrawn,
    limit: params.limit,
    offset: params.offset,
  })
  return apiFetch(`/me/retail-prices${query}`, { auth: true })
}

export function withdrawRetailReport(id: string): Promise<RetailReportOut> {
  return apiFetch(`/me/retail-prices/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true })
}
