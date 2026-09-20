/**
 * 語系的執行期狀態。
 *
 * 刻意放在 React 之外：`Accept-Language` 標頭（api/client.ts）與
 * `Intl.NumberFormat`（api/decimal.ts）都不在元件裡，而且第一支 API 請求
 * 可能比 Provider 的 effect 還早發出——子元件的 effect 本來就跑在父層之前。
 * 所以初始值直接從 localStorage 讀（或依瀏覽器語系偵測），Provider 只負責在切換時同步過來。
 */

import { readJSON, writeJSON } from '../lib/storage'

// 目前只做完這 5 種；vi / id / ms / es / fr / pt / de 待補，補的時候照這份檔案同樣的模式
// （Locale 聯集、LOCALES、LOCALE_META、index.tsx 的 LOADERS、matchLocale 的特殊規則）加回去即可。
export type Locale = 'en' | 'zh-Hant' | 'zh-Hans' | 'ja' | 'th'

export const LOCALES: Locale[] = ['en', 'zh-Hant', 'zh-Hans', 'ja', 'th']

/** 預設英文：這個 widget 面向的是多國市場，其他語言都是使用者自己選的。 */
export const DEFAULT_LOCALE: Locale = 'en'

/** 每種語言在選單裡顯示自己的名字（endonym），跟目前介面語系無關，所以不放進字典。 */
const LOCALE_META: Record<Locale, { endonym: string }> = {
  en: { endonym: 'English' },
  'zh-Hant': { endonym: '中文（繁體）' },
  'zh-Hans': { endonym: '中文（简体）' },
  ja: { endonym: '日本語' },
  th: { endonym: 'ไทย' },
}

/** 語言選單、toast 裡顯示的語言名稱：一律用該語言自己的寫法，不需要翻譯。 */
export function localeName(locale: Locale): string {
  return LOCALE_META[locale].endonym
}

const STORAGE_KEY = 'locale'

function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as string[]).includes(value)
}

/**
 * 把一個 BCP 47 語言標籤（`navigator.language` 或後端 `CountryOut.default_locale`）
 * 對應到我們支援的語系；對不到就回傳 null。
 *
 * 中文特別處理：`zh-TW` / `zh-HK` / `zh-MO` / `zh-Hant*` 算繁體，
 * 其餘 `zh` / `zh-CN` / `zh-SG` / `zh-Hans*` 算簡體。
 */
export function matchLocale(tag: string | null | undefined): Locale | null {
  if (!tag) return null
  const lower = tag.toLowerCase()

  if (lower.startsWith('zh')) {
    if (/^zh-(tw|hk|mo)\b/.test(lower) || lower.startsWith('zh-hant')) return 'zh-Hant'
    return 'zh-Hans'
  }

  // 其餘語言只比對主要子標籤（pt-BR → pt、es-419 → es…）
  const primary = lower.split('-')[0]
  return LOCALES.find((l) => l !== 'zh-Hant' && l !== 'zh-Hans' && l === primary) ?? null
}

function readStoredLocale(): Locale | null {
  const stored: unknown = readJSON<unknown>(STORAGE_KEY, null)
  return isLocale(stored) ? stored : null
}

/** 使用者是否曾在語言選單裡明確選過語言（跟自動偵測到的區分開）。 */
export function hasUserChosenLocale(): boolean {
  return readStoredLocale() !== null
}

/** 初始語系：使用者選過的 → 瀏覽器語系依序比對 → 預設英文。 */
function detectInitialLocale(): Locale {
  const stored = readStoredLocale()
  if (stored !== null) return stored

  if (typeof navigator !== 'undefined') {
    const candidates = navigator.languages ?? [navigator.language]
    for (const tag of candidates) {
      const matched = matchLocale(tag)
      if (matched !== null) return matched
    }
  }
  return DEFAULT_LOCALE
}

let current: Locale = detectInitialLocale()

export function getLocale(): Locale {
  return current
}

/**
 * 只有 I18nProvider 該呼叫：先改執行期的值，再觸發重繪，畫面才不會用到舊語系。
 * `persist: false` 用在「依國家自動建議切換」——不算使用者明確選過，之後仍可被瀏覽器語系覆蓋。
 */
export function setRuntimeLocale(locale: Locale, options: { persist?: boolean } = {}): void {
  current = locale
  if (options.persist ?? true) writeJSON(STORAGE_KEY, locale)
}

/** 給 Intl 用的 BCP 47 標籤：我們的 Locale 值都已經是合法標籤。 */
export function intlLocale(locale: Locale = current): string {
  return locale
}

/**
 * 國家／行政區資料（API.md 6.1、6.3）只有 `name`（當地語言，通常是中文）跟
 * `name_en` 兩種名稱可選，不像作物名稱是後端依 Accept-Language 解析好的。
 * 介面語系是英文就用 `name_en`，其餘語系（含日文、泰文）目前只能退回 `name`——
 * 這正是「英文版出現中文」這類回報的根源：呼叫端如果直接印 `name` 就永遠是中文。
 */
export function localizedGeoName(locale: Locale, name: string, nameEn: string): string {
  return locale === 'en' ? nameEn : name
}
