import { ListView, type ListItem } from './ListView'
import { Spinner } from './Spinner'

type Props<T extends ListItem> = {
  /** 目前這一頁的項目（最多 PAGE_SIZE 筆），分頁由呼叫端決定是伺服器端還是切陣列。 */
  items: T[]
  pageIndex: number
  pageCount: number
  onPageChange: (next: number) => void
  loading: boolean
  emptyText: string
  loadingLabel?: string
  onSelect: (item: T, index: number) => void
}

/**
 * 「瀏覽所有作物」與「依地區查詢」共用的翻頁式清單版面：
 * 不捲動、下方翻頁列固定高度、剩餘高度由本頁項目平分，左右鍵翻頁。
 */
export function PagedListView<T extends ListItem>({
  items,
  pageIndex,
  pageCount,
  onPageChange,
  loading,
  emptyText,
  loadingLabel,
  onSelect,
}: Props<T>) {
  const goToPage = (next: number): boolean => {
    if (next < 0 || next >= pageCount) return false
    onPageChange(next)
    return true
  }

  return (
    <div className="paged-list">
      <ListView
        key={pageIndex}
        items={items}
        showIndex
        enabled={!loading}
        emptyText={emptyText}
        onHorizontal={(direction) => goToPage(pageIndex + direction)}
        onSelect={onSelect}
      />
      {items.length > 0 && (
        <div className="list__pager">
          {pageIndex > 0 && (
            <span className="list__page-arrow" aria-hidden="true">
              ‹
            </span>
          )}
          <span>
            {pageIndex + 1}/{pageCount}
          </span>
          {pageIndex < pageCount - 1 && (
            <span className="list__page-arrow" aria-hidden="true">
              ›
            </span>
          )}
        </div>
      )}
      {loading && items.length === 0 && <Spinner label={loadingLabel} />}
    </div>
  )
}
