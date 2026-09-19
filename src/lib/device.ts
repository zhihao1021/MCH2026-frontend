/** 螢幕級距判定與 Cloud Phone client 能力偵測。 */

export type ScreenClass = 'qqvga' | 'qvga' | 'large'

export function getScreenClass(width: number = window.innerWidth): ScreenClass {
  if (width <= 176) return 'qqvga'
  if (width <= 320) return 'qvga'
  return 'large'
}

/**
 * 是否跑在 Cloud Phone client 上。
 * navigator.hasFeature 由 Cloud Phone 注入，桌機瀏覽器沒有。
 */
export function isCloudPhone(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.hasFeature === 'function'
}

/** 安全地詢問 client 能力，桌機開發時一律回 false。 */
export function hasFeature(name: string): boolean {
  try {
    return isCloudPhone() ? Boolean(navigator.hasFeature?.(name)) : false
  } catch {
    return false
  }
}
