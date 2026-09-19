import { useEffect, type ReactNode } from 'react'
import { useListNav } from '../hooks/useListNav'

export type ListItem = {
  id: string
  title: string
  subtitle?: string
  trailing?: ReactNode
}

type Props<T extends ListItem> = {
  items: T[]
  onSelect?: (item: T, index: number) => void
  /** 焦點改變時通知，方便同步軟鍵標籤或標題列的 n/總數。 */
  onFocusChange?: (item: T | undefined, index: number) => void
  emptyText?: string
  enabled?: boolean
}

/**
 * D-pad 垂直清單。整頁清單請搭配 <Page flush>。
 */
export function ListView<T extends ListItem>({
  items,
  onSelect,
  onFocusChange,
  emptyText = '沒有項目',
  enabled = true,
}: Props<T>) {
  const { index, itemProps } = useListNav({
    count: items.length,
    enabled,
    onSelect: (i) => onSelect?.(items[i], i),
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
            <div className="list__item-body">
              <div className="list__item-title u-truncate">{item.title}</div>
              {item.subtitle !== undefined && (
                <div className="u-muted u-truncate">{item.subtitle}</div>
              )}
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
