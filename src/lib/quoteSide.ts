import type { QuoteSide, UserRole } from '../api/types'
import type { Translate } from '../i18n'

/**
 * 報價方向由身分決定，不讓使用者自己選：小農只會賣，
 * 消費者沒有報價介面（回傳 null）。跟後端 can_quote 的規則一致（API.md 13）。
 */
export function sideForRole(role: UserRole): QuoteSide | null {
  if (role === 'farmer') return 'sell'
  return null
}

export function sideLabel(t: Translate, side: QuoteSide): string {
  return t(`quoteSide.${side}`)
}

/** 清單列上的短標籤（賣／收）。 */
export function sideShortLabel(t: Translate, side: QuoteSide): string {
  return t(`quoteSide.short.${side}`)
}
