import { formatCurrency, formatQuantity, parseDecimalOrNull } from '../api/decimal'
import type { IntentExclusion, IntentSummaryOut } from '../api/types'
import { useT } from '../i18n'

type Props = {
  summary: IntentSummaryOut
}

const REASON_ORDER: IntentExclusion[] = [
  'outlier',
  'below_floor',
  'non_local',
  'untrusted_ip',
  'shadowed',
  'zero_weight',
]

/**
 * 區域意向看板（API.md 9.3）。只顯示 anchor_price（信譽加權中位數）與需求總量——
 * 那兩個數字才是對產地有意義的訊號。範圍條：兩端是有效樣本的最小／最大，
 * 深色帶是 Q1～Q3，刻度是錨點。被排除的筆數與理由要講出來，看板公信力來自透明。
 */
export function IntentBoard({ summary }: Props) {
  const t = useT()
  const anchor = parseDecimalOrNull(summary.anchor_price)
  const currency = summary.currency ?? 'TWD'
  const unit = summary.unit ?? summary.product.default_unit

  if (anchor === null || summary.sample_count === 0) {
    return (
      <p className="u-muted">
        {summary.submitted_count === 0 ? t('intentBoard.none') : t('intentBoard.allExcluded')}
      </p>
    )
  }

  // 範圍條只畫 IQR 容許區間內的部分：min/max 是全部樣本的極值，一筆 15 倍的極端值
  // 會把錨點和 Q1～Q3 帶擠到最左邊，看板就失去意義（實測後端的 max_price 會含離群值）
  const rawMin = parseDecimalOrNull(summary.min_price) ?? anchor
  const rawMax = parseDecimalOrNull(summary.max_price) ?? anchor
  const lower = parseDecimalOrNull(summary.lower_bound)
  const upper = parseDecimalOrNull(summary.upper_bound)
  const min = lower === null ? rawMin : Math.max(rawMin, lower)
  const max = upper === null ? rawMax : Math.min(rawMax, upper)
  const q1 = parseDecimalOrNull(summary.q1)
  const q3 = parseDecimalOrNull(summary.q3)
  const span = max - min
  const pct = (v: number) => (span > 0 ? Math.min(100, Math.max(0, ((v - min) / span) * 100)) : 50)

  const excluded = REASON_ORDER.filter((r) => (summary.exclusions[r] ?? 0) > 0)
    .map((r) => `${t(`intentExclusion.${r}`)} ${summary.exclusions[r]}`)
    .join('・')

  return (
    <div className="intent-board">
      <p className="intent-board__anchor">
        {formatCurrency(anchor, currency)} / {unit}
      </p>
      <p className="intent-board__caption">
        {t(summary.sample_count === 1 ? 'intentBoard.anchor.one' : 'intentBoard.anchor.other', {
          count: summary.sample_count,
        })}
      </p>
      <div className="range-bar">
        <div className="range-bar__labels">
          <span>{formatCurrency(min, currency)}</span>
          <span>{formatCurrency(max, currency)}</span>
        </div>
        <div className="range-bar__track">
          <div className="range-bar__fill" />
          {q1 !== null && q3 !== null && (
            <div className="range-bar__band" style={{ left: `${pct(q1)}%`, width: `${pct(q3) - pct(q1)}%` }} />
          )}
          <div className="range-bar__tick" style={{ left: `${pct(anchor)}%` }} />
        </div>
      </div>
      {summary.demand_quantity !== null && (
        <p className="intent-board__caption">
          {t('intentBoard.demand', {
            quantity: formatQuantity(summary.demand_quantity, unit),
            count: summary.demand_respondents,
          })}
        </p>
      )}
      {summary.excluded_count > 0 && (
        <p className="intent-board__caption u-muted">
          {t('intentBoard.excluded', { count: summary.excluded_count, reasons: excluded })}
        </p>
      )}
    </div>
  )
}
