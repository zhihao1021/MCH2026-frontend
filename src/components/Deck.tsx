import type { ReactNode } from 'react'
import { useKeypad } from '../hooks/useKeypad'

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
 * 翻頁式內容頁：整頁不捲動，左右鍵在「幕」之間切換，下方翻頁列固定高度。
 * 幕裡若有清單，包在 .deck__list 裡讓列平分剩餘高度（見 _deck.scss）。
 * 幕內清單的 Up/Down/Enter 仍由 ListView 自己處理；這裡只攔左右鍵。
 */
export function Deck({ screens, index, onIndexChange, enabled = true }: Props) {
  const count = screens.length
  const current = Math.min(index, count - 1)

  useKeypad((key) => {
    if (key === 'Left' && current > 0) {
      onIndexChange(current - 1)
      return true
    }
    if (key === 'Right' && current < count - 1) {
      onIndexChange(current + 1)
      return true
    }
  }, enabled)

  return (
    <div className="deck">
      <div className="deck__screen" key={current}>
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
