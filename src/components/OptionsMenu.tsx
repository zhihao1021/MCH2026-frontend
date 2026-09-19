import { useCallback, useState, type ReactNode } from 'react'
import { useListNav } from '../hooks/useListNav'
import { useT } from '../i18n'
import { useSoftKeys } from '../hooks/useSoftKeys'
import { MarqueeText } from './MarqueeText'

export type OptionItem = {
  id: string
  label: string
  disabled?: boolean
  onSelect: () => void
}

/**
 * LSK 叫出的選項選單（功能機的「Options」）。
 *
 * 用法：
 *   const menu = useOptionsMenu('選項', items)
 *   <Page softKeys={{ left: { label: '選項', onPress: menu.open }, ... }}>
 *     {menu.element}
 *   </Page>
 */
export function useOptionsMenu(title: string, items: OptionItem[]) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  return {
    open: useCallback(() => setOpen(true), []),
    close,
    isOpen: open,
    element: open ? <OptionsMenu title={title} items={items} onClose={close} /> : null,
  }
}

function OptionsMenu({
  title,
  items,
  onClose,
}: {
  title: string
  items: OptionItem[]
  onClose: () => void
}) {
  const t = useT()
  const { itemProps } = useListNav({
    count: items.length,
    onSelect: (i) => {
      const item = items[i]
      if (item.disabled === true) return
      onClose()
      item.onSelect()
    },
  })

  // 選單開啟期間覆寫軟鍵（堆疊最上層），關閉後自動還原頁面原本的設定
  useSoftKeys({
    left: { label: t('common.close'), onPress: onClose },
    center: { label: t('common.select') },
    right: { label: t('common.cancel'), onPress: onClose },
  })

  return (
    <div className="menu" role="dialog" aria-modal="true" aria-label={title}>
      <div className="menu__panel">
        <div className="menu__title">{title}</div>
        <ul role="listbox">
          {items.map((item, i) => {
            const { ref, ...rest } = itemProps(i)
            return (
              <li key={item.id} role="option" ref={ref} {...rest}>
                <MarqueeText text={item.label} className={item.disabled === true ? 'u-muted' : undefined} />
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

/** 需要自行控制開關時可直接用這個元件。 */
export function OptionsMenuOverlay(props: {
  title: string
  items: OptionItem[]
  onClose: () => void
}): ReactNode {
  return <OptionsMenu {...props} />
}
