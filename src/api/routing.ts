/**
 * 車程距離：OSRM（Open Source Routing Machine）的 route 服務。
 *
 * **這不是我們的後端**，所以不走 client.ts 的 apiFetch：base URL、錯誤形狀、
 * 認證方式全都不一樣，硬套只會讓兩邊的約定糊在一起。
 *
 * 預設打 OSRM 的公共測試伺服器，官方明講那是給開發測試用、不保證可用性，
 * 正式營運要自架（或由我們自己的後端代打）並設定 VITE_ROUTING_URL。
 * 路線拿不到不該影響畫面：呼叫端一律退回直線距離。
 */

import type { Coords } from '../lib/distance'

const BASE_URL: string = import.meta.env.VITE_ROUTING_URL ?? 'https://router.project-osrm.org'
// 功能機的網路本來就慢，但等超過這個時間不如先給直線距離
const TIMEOUT_MS = 8000

export type RouteResult = {
  distanceKm: number
  durationSec: number
  /** 簡化後的路線形狀，畫在小地圖上；服務沒給就是空陣列。 */
  path: Coords[]
}

type OsrmRoute = {
  distance: number
  duration: number
  geometry?: { coordinates: [number, number][] }
}

type OsrmResponse = {
  code: string
  routes?: OsrmRoute[]
}

/**
 * 兩點之間的開車路線。找不到路（例如中間隔著海）回 null，
 * 連不上／逾時／服務回錯則丟例外，讓呼叫端可以分開處理這兩件事。
 */
export async function fetchRoute(from: Coords, to: Coords): Promise<RouteResult | null> {
  const pair = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`
  // overview=simplified：只要畫得出形狀的點就好，full 的座標串在功能機上是純浪費
  const url = `${BASE_URL}/route/v1/driving/${pair}?overview=simplified&geometries=geojson&alternatives=false&steps=false`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  let response: Response
  try {
    response = await fetch(url, { signal: controller.signal })
  } catch {
    throw new Error('路線服務連線失敗')
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) throw new Error(`路線服務回應 ${response.status}`)

  const body = (await response.json()) as OsrmResponse
  if (body.code === 'NoRoute') return null
  if (body.code !== 'Ok') throw new Error(`路線服務回應 ${body.code}`)

  const route = body.routes?.[0]
  if (route === undefined) return null

  return {
    distanceKm: route.distance / 1000,
    durationSec: route.duration,
    path: (route.geometry?.coordinates ?? []).map(([longitude, latitude]) => ({ latitude, longitude })),
  }
}
