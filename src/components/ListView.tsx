import { useEffect, type ReactNode } from 'react'
import { useListNav } from '../hooks/useListNav'
import { MarqueeText } from './MarqueeText'

export type ListItem = {
  id: string
  title: string
  subtitle?: string
  trailing?: ReactNode
  /** 有給（即使是 null）就會在列前面留一個縮圖位置；null 顯示預設圖示。 */
  imageUrl?: string | null
}

type Props<T extends ListItem> = {
  items: T[]
  onSelect?: (item: T, index: number) => void
  /** 焦點改變時通知，方便同步軟鍵標籤或標題列的 n/總數。 */
  onFocusChange?: (item: T | undefined, index: number) => void
  /** 左右鍵行為，例如翻頁。回傳 true 代表已處理。 */
  onHorizontal?: (direction: -1 | 1, index: number) => boolean | void
  emptyText?: string
  enabled?: boolean
  /** 掛載時的初始焦點索引，預設 0（例如還原上次選擇）。 */
  initialIndex?: number
  /** 顯示 1-based 編號（呼應數字鍵可直接跳號），例如作物清單。 */
  showIndex?: boolean
}

/**
 * D-pad 垂直清單。整頁清單請搭配 <Page flush>。
 */
export function ListView<T extends ListItem>({
  items,
  onSelect,
  onFocusChange,
  onHorizontal,
  emptyText = '沒有項目',
  enabled = true,
  initialIndex = 0,
  showIndex = false,
}: Props<T>) {
  const { index, itemProps } = useListNav({
    count: items.length,
    enabled,
    initialIndex,
    onSelect: (i) => onSelect?.(items[i], i),
    onHorizontal,
  })

  useEffect(() => {
    // 在 effect 而非 render 期間通知，避免父層在 render 中被更新
    onFocusChange?.(items[index], index)
  }, [index, items, onFocusChange])

  if (items.length === 0) {
    return <p className="list__empty">{emptyText}</p>
  }

  return (
    <ul className="list" role="listbox">
      {items.map((item, i) => {
        const { ref, ...rest } = itemProps(i)
        return (
          <li key={item.id} role="option" ref={ref} {...rest}>
            {showIndex && <span className="list__item-index">{i + 1}</span>}
            {item.imageUrl !== undefined && (
              <span className="list__item-image">
                {item.imageUrl !== null ? (
                  <img src={item.imageUrl} alt="" />
                ) : (
                  <span className="list__item-image-placeholder" aria-hidden="true">
                    🌾
                  </span>
                )}
              </span>
            )}
            <div className="list__item-body">
              <MarqueeText text={item.title} className="list__item-title" />
              {item.subtitle !== undefined && <MarqueeText text={item.subtitle} className="u-muted" />}
            </div>
            {item.trailing !== undefined && (
              <div className="list__item-trailing">{item.trailing}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
