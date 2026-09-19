import { apiFetch } from './client'
import type { LocationIn, LocationOut, UserOut } from './types'

export function getMyLocation(): Promise<LocationOut> {
  return apiFetch('/me/location', { auth: true })
}

/** 整筆取代，沒帶的欄位會被清空；回傳完整更新後的 UserOut（含最新 location）。 */
export function putMyLocation(body: LocationIn): Promise<UserOut> {
  return apiFetch('/me/location', { method: 'PUT', auth: true, body: JSON.stringify(body) })
}

export function deleteMyLocation(): Promise<UserOut> {
  return apiFetch('/me/location', { method: 'DELETE', auth: true })
}
