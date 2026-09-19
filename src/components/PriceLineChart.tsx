import { formatCurrency } from '../api/decimal'
import { MarqueeText } from './MarqueeText'

export type ChartPoint = {
  d: string
  avg: number
  high?: number
  low?: number
}

type Props = {
  points: ChartPoint[]
  width?: number
  height?: number
  currency: string
  unit: string
  changePct?: number | null
}

const PAD_X = 4
const PAD_Y = 6

/**
 * 手刻 inline SVG 折線圖，不用圖表庫。遠端渲染下每一幀都是頻寬成本，
 * 所以這裡是靜態圖（掛載時最多一次 opacity 淡入），沒有連續動畫。
 */
export function PriceLineChart({ points, width = 200, height = 80, currency, unit, changePct }: Props) {
  if (points.length === 0) {
    return <p className="u-muted">尚無走勢資料</p>
  }

  const values = points.flatMap((p) => [p.avg, p.high ?? p.avg, p.low ?? p.avg])
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const innerW = width - PAD_X * 2
  const innerH = height - PAD_Y * 2

  const x = (i: number) => (points.length === 1 ? PAD_X : PAD_X + (i / (points.length - 1)) * innerW)
  const y = (v: number) => PAD_Y + innerH - ((v - min) / range) * innerH

  const linePoints = points.map((p, i) => `${x(i)},${y(p.avg)}`).join(' ')
  // 面積填色沿用折線的座標，收尾拉回底邊即可，純靜態形狀，不佔額外網路成本
  const areaPoints = `${x(0)},${height - PAD_Y} ${linePoints} ${x(points.length - 1)},${height - PAD_Y}`
  const first = points[0]
  const last = points[points.length - 1]
  const gridLines = [0, 0.5, 1]

  return (
    <div className="chart">
      <svg className="chart__svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="歷史價格走勢圖">
        {gridLines.map((t) => (
          <line
            key={t}
            className="chart__gridline"
            x1={PAD_X}
            x2={width - PAD_X}
            y1={PAD_Y + innerH * t}
            y2={PAD_Y + innerH * t}
          />
        ))}
        <polygon className="chart__area" points={areaPoints} />
        <polyline className="chart__line" points={linePoints} fill="none" />
        <circle className="chart__dot" cx={x(0)} cy={y(first.avg)} r={2} />
        <circle className="chart__dot" cx={x(points.length - 1)} cy={y(last.avg)} r={2} />
      </svg>
      <div className="chart__footer">
        <MarqueeText text={`${first.d} ~ ${last.d}`} className="u-muted" />
        <span>{formatCurrency(last.avg, currency)} / {unit}</span>
      </div>
      {changePct !== undefined && changePct !== null && (
        <div className={changePct >= 0 ? 'chart__change chart__change--up' : 'chart__change chart__change--down'}>
          {changePct >= 0 ? '▲' : '▼'} {Math.abs(changePct).toFixed(1)}%
        </div>
      )}
    </div>
  )
}
