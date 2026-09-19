import { apiFetch, toQuery } from './client'
import type {
  IntentCreateBody,
  IntentOut,
  IntentSummaryOut,
  NotificationOut,
  NotificationResponseBody,
  Page,
  PriceFloorOut,
  ReputationOut,
} from './types'

/**
 * 消費者意向價格（API.md 9）。需求側訊號，跟 quotes.ts 的小農／盤商報價是兩回事：
 * 任何登入者都能提，防刷（底線、冷卻、IQR、信譽、影子封禁、IP 檢核）全在後端。
 * 前端的責任只有兩件：送出前先問底線即時擋、看板只顯示 anchor_price。
 */

/** 輸入框旁邊先打這支：floor_price 為 null 代表沒有官方行情、不設限（API.md 12-15）。 */
export function getIntentFloor(
  ref: string,
  params: { region?: string; countryCode?: string } = {},
): Promise<PriceFloorOut> {
  const query = toQuery({ region: params.region, country_code: params.countryCode })
  return apiFetch(`/products/${encodeURIComponent(ref)}/intents/floor${query}`)
}

/**
 * 同一作物再提交會取代舊的（superseded），不是累加。
 * 可能的錯誤：intent_region_required（400）、intent_cooldown（429，details.retry_after 秒）、
 * intent_below_floor（400，details 帶 floor_price）。
 */
export function createIntent(ref: string, body: IntentCreateBody): Promise<IntentOut> {
  return apiFetch(`/products/${encodeURIComponent(ref)}/intents`, {
    method: 'POST',
    auth: true,
    body: JSON.stringify(body),
  })
}

/** 公開看板。region 省略看全國；區域名稱來自 ISO 行政區（例如「臺北市」）。 */
export function getIntentSummary(
  ref: string,
  params: { region?: string; countryCode?: string } = {},
): Promise<IntentSummaryOut> {
  const query = toQuery({ region: params.region, country_code: params.countryCode })
  return apiFetch(`/products/${encodeURIComponent(ref)}/intents/summary${query}`)
}

export function getMyIntents(
  params: { includeHistory?: boolean; limit?: number; offset?: number } = {},
): Promise<Page<IntentOut>> {
  const query = toQuery({
    include_history: params.includeHistory,
    limit: params.limit,
    offset: params.offset,
  })
  return apiFetch(`/me/intents${query}`, { auth: true })
}

export function withdrawIntent(id: string): Promise<IntentOut> {
  return apiFetch(`/me/intents/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true })
}

export function getMyReputation(): Promise<ReputationOut> {
  return apiFetch('/me/reputation', { auth: true })
}

export function listNotifications(
  params: { limit?: number; offset?: number } = {},
): Promise<Page<NotificationOut>> {
  return apiFetch(`/me/notifications${toQuery(params)}`, { auth: true })
}

/**
 * 使用者一開啟通知就要打（clicked:false），點「前往購買」再打一次（clicked:true）。
 * 漏打會讓後端把人判成「幽靈需求」扣信譽（API.md 12-16）。
 */
export function respondNotification(id: string, body: NotificationResponseBody): Promise<NotificationOut> {
  return apiFetch(`/me/notifications/${encodeURIComponent(id)}/respond`, {
    method: 'POST',
    auth: true,
    body: JSON.stringify(body),
  })
}
