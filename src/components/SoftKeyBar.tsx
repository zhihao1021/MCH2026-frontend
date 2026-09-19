import { useCurrentSoftKeys } from '../hooks/useSoftKeys'

/**
 * 螢幕底部的軟鍵提示列。
 * 功能機沒有觸控，使用者只能靠這排文字知道三顆鍵現在的功能，
 * 所以每一頁都應該把三個位置填滿（沒有動作就留空字串）。
 */
export function SoftKeyBar() {
  const { left, center, right } = useCurrentSoftKeys()

  return (
    <div className="app__softkeys" role="toolbar" aria-label="soft keys">
      <span className="app__softkey app__softkey--left">{left?.label ?? ''}</span>
      <span
        className={
          center?.label !== undefined && center.label.length > 0
            ? 'app__softkey app__softkey--center app__softkey--center-filled'
            : 'app__softkey app__softkey--center'
        }
      >
        {center?.label ?? ''}
      </span>
      <span className="app__softkey app__softkey--right">{right?.label ?? ''}</span>
    </div>
  )
}
