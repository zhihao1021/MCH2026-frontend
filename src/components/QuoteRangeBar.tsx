import { formatCurrency } from '../api/decimal'

type Props = {
  min: number
  avg: number
  max: number
  currency: string
  unit: string
  count: number
}

/**
 * 使用者提供價格的範圍視覺化。明確不是箱形圖：
 * API 的 quotes 摘要只有 count/min/max/avg，沒有四分位數，
 * 誠實呈現成「min–avg–max 範圍條」，不假裝是統計箱形圖。
 */
export function QuoteRangeBar({ min, avg, max, currency, unit, count }: Props) {
  if (count === 0) {
    return <p className="u-muted">尚無報價</p>
  }

  const span = max - min
  const tickPercent = span > 0 ? ((avg - min) / span) * 100 : 50

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
        平均 {formatCurrency(avg, currency)} / {unit}・根據 {count} 筆報價
      </p>
    </div>
  )
}
