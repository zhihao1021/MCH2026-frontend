/** 翻頁式清單每頁固定 5 筆：編號 1-5 跟數字鍵跳號範圍一致，且 5 列剛好平分 QVGA 的內容區。 */
export const PAGE_SIZE = 5

export function pageCountOf(total: number): number {
  return Math.max(1, Math.ceil(total / PAGE_SIZE))
}
