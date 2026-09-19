import { apiFetch } from './client'
import type { LocationIn, LocationOut, LocationSuggestionOut, UserOut } from './types'

export function getMyLocation(): Promise<LocationOut> {
  return apiFetch('/me/location', { auth: true })
}

/**
 * 「取得目前位置」按鈕（API.md 4.4）：依連線 IP 推估，**不會存檔**，
 * 拿到的是建議值，要讓使用者確認／微調後再送 putMyLocation。
 *
 * 不用 navigator.geolocation：Cloud Phone 是遠端渲染，
 * 瀏覽器跑在 CloudMosa 機房，就算能呼叫也只會拿到機房座標。
 *
 * geoip_no_public_ip / geoip_not_found / geoip_disabled 都是預期內的失敗，
 * 呼叫端一律退回手動輸入，不要擋住使用者。
 */
export function detectMyLocation(): Promise<LocationSuggestionOut> {
  return apiFetch('/me/location/detect', { method: 'POST', auth: true })
}

/** 整筆取代，沒帶的欄位會被清空；回傳完整更新後的 UserOut（含最新 location）。 */
export function putMyLocation(body: LocationIn): Promise<UserOut> {
  return apiFetch('/me/location', { method: 'PUT', auth: true, body: JSON.stringify(body) })
}

export function deleteMyLocation(): Promise<UserOut> {
  return apiFetch('/me/location', { method: 'DELETE', auth: true })
}
