import { useCallback, useEffect, useRef, useState } from 'react'
import { digitOf } from '../lib/keys'
import { useKeypad } from './useKeypad'

type Options = {
  /** 清單長度。變動時焦點會自動夾回合法範圍。 */
  count: number
  /** 按下 Enter（或點選）時觸發。 */
  onSelect?: (index: number) => void
  /** 左右鍵行為，預設不處理（留給頁籤或水平清單）。 */
  onHorizontal?: (direction: -1 | 1, index: number) => boolean | void
  /** 走到頭尾時是否繞回，預設 true（功能機慣例）。 */
  loop?: boolean
  /** 數字鍵 1-9 直接跳到第 n 項，預設開啟。 */
  digitJump?: boolean
  enabled?: boolean
}

type ItemProps = {
  ref: (el: HTMLElement | null) => void
  className: string
  tabIndex: -1
  'aria-selected': boolean
  onClick: () => void
}

/**
 * D-pad 垂直清單導覽：維護焦點索引、捲動到可視範圍、處理 Enter 選取。
 *
 * 焦點以 roving index 表示，不依賴瀏覽器 focus，
 * 因為 Cloud Phone 的捲動與焦點行為在遠端渲染下較不穩定。
 */
export function useListNav({
  count,
  onSelect,
  onHorizontal,
  loop = true,
  digitJump = true,
  enabled = true,
}: Options) {
  const [index, setIndex] = useState(0)
  const itemsRef = useRef<(HTMLElement | null)[]>([])

  // 資料變短時直接在 render 階段夾回範圍，不需要額外 setState
  const clamped = count === 0 ? 0 : Math.min(index, count - 1)

  const move = useCallback(
    (delta: number) => {
      setIndex((current) => {
        if (count === 0) return 0
        const next = current + delta
        if (next < 0) return loop ? count - 1 : 0
        if (next >= count) return loop ? 0 : count - 1
        return next
      })
    },
    [count, loop],
  )

  useKeypad((key) => {
    if (count === 0) return
    switch (key) {
      case 'Up':
        move(-1)
        return true
      case 'Down':
        move(1)
        return true
      case 'Left':
        return onHorizontal?.(-1, clamped) === true
      case 'Right':
        return onHorizontal?.(1, clamped) === true
      case 'Enter':
        if (onSelect === undefined) return
        onSelect(clamped)
        return true
      default: {
        if (!digitJump) return
        const digit = digitOf(key)
        if (digit === null || digit === 0) return
        if (digit > count) return
        setIndex(digit - 1)
        return true
      }
    }
  }, enabled)

  // 讓目前選取項保持在可視範圍內
  useEffect(() => {
    itemsRef.current[clamped]?.scrollIntoView({ block: 'nearest' })
  }, [clamped])

  const itemProps = useCallback(
    (i: number, baseClass = 'list__item'): ItemProps => ({
      ref: (el) => {
        itemsRef.current[i] = el
      },
      className: i === clamped ? `${baseClass} is-focused` : baseClass,
      tabIndex: -1,
      'aria-selected': i === clamped,
      onClick: () => {
        setIndex(i)
        onSelect?.(i)
      },
    }),
    [clamped, onSelect],
  )

  return { index: clamped, setIndex, itemProps }
}
