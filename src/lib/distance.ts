/**
 * 兩點之間的直線距離與方位。
 *
 * 只做球面 haversine：畫面上最多呈現到 0.1 公里，
 * 橢球體修正（誤差 <0.5%）在功能機的螢幕上看不出差別。
 * 座標本身也可能被對方模糊化到約 1 公里（API.md 4.7 的 approximate），
 * 再精確的公式也沒有意義。
 */

import { intlLocale } from '../i18n/locale'
import type { MessageKey, Translate } from '../i18n'

export type Coords = { latitude: number; longitude: number }

const EARTH_RADIUS_KM = 6371

const toRad = (deg: number): number => (deg * Math.PI) / 180

/** 兩點之間的大圓距離（公里）。 */
export function distanceKm(from: Coords, to: Coords): number {
  const lat1 = toRad(from.latitude)
  const lat2 = toRad(to.latitude)
  const dLat = toRad(to.latitude - from.latitude)
  const dLng = toRad(to.longitude - from.longitude)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** 從 from 看向 to 的初始方位角，0=正北，順時針到 360。 */
export function bearingDeg(from: Coords, to: Coords): number {
  const lat1 = toRad(from.latitude)
  const lat2 = toRad(to.latitude)
  const dLng = toRad(to.longitude - from.longitude)
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

const COMPASS: MessageKey[] = [
  'compass.n', 'compass.nne', 'compass.ne', 'compass.ene',
  'compass.e', 'compass.ese', 'compass.se', 'compass.sse',
  'compass.s', 'compass.ssw', 'compass.sw', 'compass.wsw',
  'compass.w', 'compass.wnw', 'compass.nw', 'compass.nnw',
]

/** 方位角 → 十六方位（N / NNE…，中文為北 / 北北東…）。 */
export function compassLabel(t: Translate, deg: number): string {
  const normalized = ((deg % 360) + 360) % 360
  return t(COMPASS[Math.round(normalized / 22.5) % 16])
}

/**
 * 距離的可讀字串。位數刻意壓到最少：
 * 1 公里內用公尺（取整到 10 公尺），100 公里內留一位小數，再遠就取整數。
 */
export function formatDistance(t: Translate, km: number): string {
  if (km < 0.01) return t('units.lessThan10m')
  // 先取整再判斷要用哪個單位：0.999 公里四捨五入後是 1000 公尺，那要寫成 1.0 公里
  const meters = Math.round(km * 100) * 10
  if (meters < 1000) return t('units.meters', { count: meters })
  if (km < 100) return t('units.kilometers', { count: km.toFixed(1) })
  return t('units.kilometers', { count: Math.round(km).toLocaleString(intlLocale()) })
}

/**
 * 車程時間的可讀字串。功能機畫面窄，一律只給到「約」的程度：
 * 秒數本來就是路況無關的估算值，寫得太精確反而誤導。
 */
export function formatDuration(t: Translate, seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60))
  if (minutes < 60) return t('time.approxMinutes', { count: minutes })
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0
    ? t('time.approxHours', { count: hours })
    : t('time.approxHoursMinutes', { hours, minutes: rest })
}

/** 位置物件（LocationOut / PublicLocation）取出座標；沒有成對座標時回 null。 */
export function coordsOf(
  location: { latitude: number | null; longitude: number | null } | null | undefined,
): Coords | null {
  if (location === null || location === undefined) return null
  const { latitude, longitude } = location
  if (latitude === null || longitude === null) return null
  return { latitude, longitude }
}
