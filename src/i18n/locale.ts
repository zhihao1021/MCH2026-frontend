/**
 * 語系的執行期狀態。
 *
 * 刻意放在 React 之外：`Accept-Language` 標頭（api/client.ts）與
 * `Intl.NumberFormat`（api/decimal.ts）都不在元件裡，而且第一支 API 請求
 * 可能比 Provider 的 effect 還早發出——子元件的 effect 本來就跑在父層之前。
 * 所以初始值直接從 localStorage 讀，Provider 只負責在切換時同步過來。
 */

import { readJSON, writeJSON } from '../lib/storage'

export type Locale = 'en' | 'zh-Hant'

export const LOCALES: Locale[] = ['en', 'zh-Hant']

/** 預設英文：這個 widget 面向的是多國市場，中文是使用者自己選的。 */
export const DEFAULT_LOCALE: Locale = 'en'

const STORAGE_KEY = 'locale'

function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'zh-Hant'
}

function readStoredLocale(): Locale {
  const stored: unknown = readJSON<unknown>(STORAGE_KEY, DEFAULT_LOCALE)
  return isLocale(stored) ? stored : DEFAULT_LOCALE
}

let current: Locale = readStoredLocale()

export function getLocale(): Locale {
  return current
}

/** 只有 I18nProvider 該呼叫：先改執行期的值，再觸發重繪，畫面才不會用到舊語系。 */
export function setRuntimeLocale(locale: Locale): void {
  current = locale
  writeJSON(STORAGE_KEY, locale)
}

/** 給 Intl 用的 BCP 47 標籤。 */
export function intlLocale(locale: Locale = current): string {
  return locale === 'zh-Hant' ? 'zh-Hant' : 'en'
}
