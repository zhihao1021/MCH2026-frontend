/**
 * API 的價格/數量欄位是 Decimal-as-string（例如 "19.20"），小數位數不保證
 * 固定。比較或計算前一律先 parse 成 number，絕不字串比較（見 API.md 2.4）。
 */

import { intlLocale } from '../i18n/locale'

export function parseDecimal(value: string): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export function parseDecimalOrNull(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function formatCurrency(amount: string | number, currency: string): string {
  const n = typeof amount === 'string' ? parseDecimal(amount) : amount
  try {
    return new Intl.NumberFormat(intlLocale(), {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(n)
  } catch {
    return `${n} ${currency}`
  }
}

export function formatQuantity(amount: string, unit: string): string {
  const n = parseDecimal(amount)
  const trimmed = Number.isInteger(n) ? String(n) : n.toFixed(1)
  return `${trimmed} ${unit}`
}
