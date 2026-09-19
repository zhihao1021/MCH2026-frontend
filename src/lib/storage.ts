/**
 * localStorage 薄封裝。
 * Cloud Phone 支援 localStorage，但 widget 無法離線運作，
 * 這裡只拿來存偏好設定這類可有可無的資料，任何錯誤都吞掉。
 */

const PREFIX = 'mch2026:'

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* 容量滿或被停用時忽略 */
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    /* ignore */
  }
}
