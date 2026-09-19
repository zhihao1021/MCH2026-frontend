import { apiFetch, toQuery } from './client'
import type { FavoriteOut, FavoritesResponse } from './types'

/**
 * 收藏的作物（API.md 4.9）。`ref` 可以是品項的 UUID 或 slug。
 *
 * 清單**不分頁**，而且已經附上每個作物的最新價與漲跌——
 * 不要為了價格對每個收藏各打一次 /overview，那是 N 次往返。
 */
export function listFavorites(params: { countryCode?: string; locale?: string } = {}): Promise<FavoritesResponse> {
  const query = toQuery({ country_code: params.countryCode, locale: params.locale })
  return apiFetch(`/me/favorites${query}`, { auth: true })
}

/** 冪等：重複加入不會報錯也不會變兩筆，所以不必先查有沒有收藏過。 */
export function addFavorite(ref: string): Promise<FavoriteOut> {
  return apiFetch(`/me/favorites/${encodeURIComponent(ref)}`, { method: 'PUT', auth: true })
}

/** 成功是 204 No Content；沒收藏過會回 404 favorite_not_found。 */
export function removeFavorite(ref: string): Promise<void> {
  return apiFetch(`/me/favorites/${encodeURIComponent(ref)}`, { method: 'DELETE', auth: true })
}
