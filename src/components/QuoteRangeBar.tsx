import { formatCurrency } from '../api/decimal'
import { useT } from '../i18n'

type Props = {
  min: number
  avg: number
  max: number
  currency: string
  unit: string
  count: number
  /** 目前在下方清單聚焦的那筆報價的價格；沒有聚焦目標時退回平均價（參考 IntentGauge 的游標做法）。 */
  selected?: number | null
}

/**
 * 使用者提供價格的範圍視覺化。明確不是箱形圖：
 * API 的 quotes 摘要只有 count/min/max/avg，沒有四分位數，
 * 誠實呈現成「min–max 範圍條」，不假裝是統計箱形圖。
 * 範圍（min/max、範圍條本身）永遠是全部報價的統計值，不隨清單選取而變；
 * 只有刻度（黑線標記）會跟著下方清單目前聚焦的那一筆移動，讓人看得出這筆報價落在哪裡。
 */
export function QuoteRangeBar({ min, avg, max, currency, unit, count, selected = null }: Props) {
  const t = useT()

  if (count === 0) {
    return <p className="u-muted">{t('quoteRange.none')}</p>
  }

  const span = max - min
  const tickPrice = selected ?? avg
  const tickPercent = span > 0 ? Math.min(100, Math.max(0, ((tickPrice - min) / span) * 100)) : 50

  return (
    <div className="range-bar">
      <div className="range-bar__labels">
        <span>{formatCurrency(min, currency)}</span>
        <span>{formatCurrency(max, currency)}</span>
      </div>
      <div className="range-bar__track">
        <div className="range-bar__fill" />
        <div className="range-bar__tick" style={{ left: `${tickPercent}%` }} />
      </div>
      <p className="range-bar__caption">
        {t(count === 1 ? 'quoteRange.caption.one' : 'quoteRange.caption.other', {
          price: formatCurrency(avg, currency),
          unit,
          count,
        })}
      </p>
    </div>
  )
}
