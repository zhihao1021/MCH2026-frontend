import type { CountryOut } from '../api/types'
import type { MessageKey } from '../i18n'
import { readJSON } from './storage'

/**
 * 電話號碼的「結構性」前置檢查。
 *
 * 精確規則（每個國家的號碼長度、可用區碼…）由後端的 libphonenumber 負責（API.md 3.1 的 invalid_phone），
 * 前端只擋明顯打錯的：字元不合法、太短太長、E.164 的國碼對不到任何支援的國家。
 * 不引進 libphonenumber-js：光 metadata 就比整個 widget 還大（README「刻意的取捨」）。
 */

/** 上次登入選的國家，下次進登入頁直接帶入。 */
export const LAST_COUNTRY_KEY = 'login:country'

/** E.164 上限是 15 位數字（含國碼）；下限 7 是保守值，沒有正式規範但比這短的號碼不存在。 */
const E164_MIN_DIGITS = 7
const E164_MAX_DIGITS = 15
/** 本地格式（不含國碼）至少要有幾位才可能是有效號碼。 */
const NATIONAL_MIN_DIGITS = 4

export type PhoneValidation =
  | { ok: true; phone: string; country: CountryOut }
  | { ok: false; message: MessageKey }

/** 去掉使用者習慣加的空白、連字號、括號、點；國際冠碼 00 一律換成 +。 */
export function cleanPhone(raw: string): string {
  const stripped = raw.replace(/[\s\-().]/g, '')
  return stripped.startsWith('00') ? `+${stripped.slice(2)}` : stripped
}

/**
 * 以撥號碼「最長前綴」比對 E.164 號碼屬於哪個國家。
 * 多國共用同一個撥號碼（+1 的美加、+7 的俄哈）時，若 `preferred` 也符合就維持使用者原本選的。
 */
export function matchCountryByE164(
  e164: string,
  countries: CountryOut[],
  preferred?: CountryOut | null,
): CountryOut | null {
  const digits = e164.startsWith('+') ? e164.slice(1) : e164
  if (preferred && digits.startsWith(preferred.dialing_code)) return preferred
  let best: CountryOut | null = null
  for (const country of countries) {
    if (!digits.startsWith(country.dialing_code)) continue
    if (best === null || country.dialing_code.length > best.dialing_code.length) best = country
  }
  return best
}

export function validatePhone(
  raw: string,
  country: CountryOut | null,
  countries: CountryOut[],
): PhoneValidation {
  const phone = cleanPhone(raw)
  if (phone.length === 0) return { ok: false, message: 'errors.phoneRequired' }
  if (!/^\+?\d+$/.test(phone)) return { ok: false, message: 'errors.phoneInvalidChars' }

  if (phone.startsWith('+')) {
    const digits = phone.slice(1)
    if (digits.length < E164_MIN_DIGITS) return { ok: false, message: 'errors.phoneTooShort' }
    if (digits.length > E164_MAX_DIGITS) return { ok: false, message: 'errors.phoneTooLong' }
    const matched = matchCountryByE164(phone, countries, country)
    if (matched === null) return { ok: false, message: 'errors.phoneUnknownDialingCode' }
    return { ok: true, phone, country: matched }
  }

  if (country === null) return { ok: false, message: 'errors.countryRequired' }
  // 本地格式：只估算長度，trunk 0 要不要去掉各國不同（義大利就要保留），交給後端判斷
  const national = phone.startsWith('0') ? phone.slice(1) : phone
  if (national.length < NATIONAL_MIN_DIGITS) return { ok: false, message: 'errors.phoneTooShort' }
  if (country.dialing_code.length + national.length > E164_MAX_DIGITS) {
    return { ok: false, message: 'errors.phoneTooLong' }
  }
  return { ok: true, phone, country }
}

/**
 * 登入頁的預設國家：上次選過的 → 瀏覽器語系的地區碼（zh-TW → TW）→ 清單第一筆。
 * 清單還沒載入（空陣列）時回傳 null。
 */
export function detectDefaultCountry(countries: CountryOut[]): CountryOut | null {
  if (countries.length === 0) return null
  const byCode = (code: string | null | undefined) =>
    code ? (countries.find((c) => c.code === code.toUpperCase()) ?? null) : null

  const last = byCode(readJSON<string | null>(LAST_COUNTRY_KEY, null))
  if (last !== null) return last

  const region = typeof navigator === 'undefined' ? undefined : /-([A-Za-z]{2})\b/.exec(navigator.language)?.[1]
  return byCode(region) ?? countries[0]
}

/** 選擇器的即時過濾：國名、英文名、ISO 國碼、撥號碼（開頭的 + 忽略）都可以打。 */
export function filterCountries(countries: CountryOut[], query: string): CountryOut[] {
  const q = query.trim().replace(/^\+/, '').toLowerCase()
  if (q.length === 0) return countries
  return countries.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.name_en.toLowerCase().includes(q) ||
      c.code.toLowerCase() === q ||
      c.dialing_code.startsWith(q),
  )
}

/** 表單裡顯示的國家標籤：「日本 (+81)」。 */
export function countryLabel(country: CountryOut): string {
  return `${country.name} (+${country.dialing_code})`
}
