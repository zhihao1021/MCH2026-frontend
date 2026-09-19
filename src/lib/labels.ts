import type { IntentExclusion, IntentStatus, ProductCategory, QuoteStatus, UserRole } from '../api/types'
import type { Translate } from '../i18n'

/**
 * 列舉值 → 畫面文字。字串本身放在 i18n 字典裡，這裡只負責組 key，
 * 所以這些函式仍然是純函式、不碰 React。
 */
export function categoryLabel(t: Translate, category: ProductCategory): string {
  return t(`categories.${category}`)
}

export function roleLabel(t: Translate, role: UserRole): string {
  return t(`roles.${role}`)
}

export function quoteStatusLabel(t: Translate, status: QuoteStatus): string {
  return t(`quoteStatus.${status}`)
}

export function intentStatusLabel(t: Translate, status: IntentStatus): string {
  return t(`intentStatus.${status}`)
}

/**
 * 沒被計入看板的原因。只翻譯使用者「能改善」的那幾種；
 * shadowed / zero_weight 回 null，畫面上看起來跟有計入一樣——影子封禁的重點就是對方不知道（API.md 9.4）。
 */
export function intentExclusionLabel(t: Translate, reason: IntentExclusion | null): string | null {
  if (reason === null || reason === 'shadowed' || reason === 'zero_weight') return null
  return t(`intentExclusion.${reason}`)
}
