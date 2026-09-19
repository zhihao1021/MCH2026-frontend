import type { QuoteSide, UserRole } from '../api/types'

/**
 * 報價方向由身分決定，不讓使用者自己選：小農只會賣、盤商只會收，
 * 消費者沒有報價介面（回傳 null）。跟後端 can_quote 的規則一致（API.md 13）。
 */
export function sideForRole(role: UserRole): QuoteSide | null {
  if (role === 'farmer') return 'sell'
  if (role === 'trader') return 'buy'
  return null
}

export function sideLabel(side: QuoteSide): string {
  return side === 'sell' ? '我要賣' : '我要收'
}
