import type { ProductCategory, QuoteStatus, UserRole } from '../api/types'

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  vegetable: '蔬菜',
  fruit: '水果',
  flower: '花卉',
  grain: '穀物',
  livestock: '畜牧',
  fishery: '漁產',
  other: '其他',
}

export function categoryLabel(category: ProductCategory): string {
  return CATEGORY_LABELS[category]
}

const ROLE_LABELS: Record<UserRole, string> = {
  consumer: '消費者',
  farmer: '小農',
  trader: '盤商',
}

export function roleLabel(role: UserRole): string {
  return ROLE_LABELS[role]
}

const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  active: '有效',
  expired: '已過期',
  withdrawn: '已下架',
  hidden: '已隱藏',
}

export function quoteStatusLabel(status: QuoteStatus): string {
  return QUOTE_STATUS_LABELS[status]
}
