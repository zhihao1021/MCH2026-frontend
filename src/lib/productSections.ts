import type { UserRole } from '../api/types'

export type ProductSectionKey = 'fairPrice' | 'chart' | 'intent' | 'quotes' | 'markets'

/**
 * 多維視角：消費者、盤商、小農各自最關心的資訊不同，用同一組區塊、
 * 只調整順序 — 不重新設計版面，也不用另外拆路由。
 * - 小農（賣方）：先看其他人怎麼報價，再對照官方均價決定怎麼開價。
 * - 盤商：先看各市場行情才能決定去哪收貨，其次才是民間報價與均價。
 * - 消費者／訪客：只在意「現在買貴不貴」，官方均價與走勢優先，
 *   接著是自己人的意向看板（要提期望價就從這裡進），民間報價（生產端）排最後。
 * - 意向看板（需求側訊號）對小農是開團定價的依據，排在自家報價後面；
 *   盤商看的是批發市場，意向看板排最後。
 */
const SECTION_ORDER: Record<UserRole | 'guest', ProductSectionKey[]> = {
  guest: ['fairPrice', 'chart', 'intent', 'quotes', 'markets'],
  consumer: ['fairPrice', 'chart', 'intent', 'markets', 'quotes'],
  farmer: ['quotes', 'intent', 'fairPrice', 'chart', 'markets'],
  trader: ['markets', 'quotes', 'fairPrice', 'chart', 'intent'],
}

export function getSectionOrder(role: UserRole | null): ProductSectionKey[] {
  return SECTION_ORDER[role ?? 'guest']
}
