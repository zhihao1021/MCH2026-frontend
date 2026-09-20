import { useRef, type ReactNode } from 'react'
import { useKeypad } from '../hooks/useKeypad'

/** 沒有觸控、也沒有滾輪，一次捲一小段方便用 D-pad 一步步看完。 */
const SCROLL_STEP = 32

export type DeckScreen = {
  /** 翻頁列上顯示的短標籤，例如「報價」。 */
  label: string
  body: ReactNode
}

type Props = {
  screens: DeckScreen[]
  index: number
  onIndexChange: (next: number) => void
  /** 彈窗開啟時傳 false，否則左右鍵會穿透彈窗翻到後面的幕。 */
  enabled?: boolean
}

/**
 * 翻頁式內容頁：左右鍵在「幕」之間切換，下方翻頁列固定高度。
 * 幕裡若有清單，包在 .deck__list 裡讓列平分剩餘高度（見 _deck.scss）。
 * 幕內清單的 Up/Down/Enter 仍由 ListView 自己處理，會比這裡先攔到鍵。
 *
 * 每一幕的高度都是照內容量「算好塞得下」寫死的，但實際行數會隨資料與語系跑掉
 * （地圖的路線附註、意向看板的排除理由都不是固定行數）。算錯的時候與其把最後
 * 幾行文字用 overflow:hidden 吃掉又沒有觸控或滾輪救援，不如讓沒有清單可攔截
 * Up/Down 的幕退而求其次：自己用 D-pad 把捲出去的內容捲回來。
 */
export function Deck({ screens, index, onIndexChange, enabled = true }: Props) {
  const count = screens.length
  const current = Math.min(index, count - 1)
  const screenRef = useRef<HTMLDivElement>(null)

  useKeypad((key) => {
    if (key === 'Left' && current > 0) {
      onIndexChange(current - 1)
      return true
    }
    if (key === 'Right' && current < count - 1) {
      onIndexChange(current + 1)
      return true
    }
    if (key === 'Up' || key === 'Down') {
      const el = screenRef.current
      if (el === null || el.scrollHeight <= el.clientHeight) return
      el.scrollBy({ top: key === 'Down' ? SCROLL_STEP : -SCROLL_STEP })
      return true
    }
  }, enabled)

  return (
    <div className="deck">
      <div className="deck__screen" key={current} ref={screenRef}>
        {screens[current]?.body}
      </div>
      <div className="list__pager">
        {current > 0 && (
          <span className="list__page-arrow" aria-hidden="true">
            ‹
          </span>
        )}
        <span>
          {screens[current]?.label} {current + 1}/{count}
        </span>
        {current < count - 1 && (
          <span className="list__page-arrow" aria-hidden="true">
            ›
          </span>
        )}
      </div>
    </div>
  )
}
