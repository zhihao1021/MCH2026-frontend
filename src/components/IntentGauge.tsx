import { formatCurrency, parseDecimalOrNull } from '../api/decimal'
import type { IntentSummaryOut, PriceFloorOut } from '../api/types'
import { useT } from '../i18n'

/** 與後端信譽模型的共識區間一致（中位數 ±15%，API.md 9.4），畫面上的「合理區間」才是同一件事。 */
const CONSENSUS_BAND = 0.15

export type GaugeZone = 'invalid' | 'low' | 'fair' | 'high' | 'unknown'

/**
 * 輸入價落在哪一區。參考值優先用看板錨點（真的有人在這個價位表態），
 * 沒有意向樣本才退回底線端點給的官方中位數。
 */
function classifyPrice(price: number | null, floor: number | null, reference: number | null): GaugeZone {
  if (price === null || !Number.isFinite(price)) return 'unknown'
  if (floor !== null && price < floor) return 'invalid'
  if (reference === null || reference <= 0) return floor === null ? 'unknown' : 'fair'
  if (price < reference * (1 - CONSENSUS_BAND)) return 'low'
  if (price > reference * (1 + CONSENSUS_BAND)) return 'high'
  return 'fair'
}

type Props = {
  /** 使用者正在輸入的價格；還沒輸入或不是數字時為 null。 */
  price: number | null
  floor: PriceFloorOut | null
  summary: IntentSummaryOut | null
}

/**
 * 「市場供需現實度」儀表（PRD 4.3）。一條刻度尺：左邊紅色是低於產地成本的無效區，
 * 中間是共識 ±15%，游標是使用者現在打的數字。功能機沒有 hover，
 * 所以每個刻度的數字直接寫在下面，不靠互動揭露。
 */
export function IntentGauge({ price, floor, summary }: Props) {
  const t = useT()
  const floorPrice = parseDecimalOrNull(floor?.floor_price)
  const official = parseDecimalOrNull(floor?.reference_price)
  const anchor = parseDecimalOrNull(summary?.anchor_price)
  const reference = anchor ?? official
  const currency = summary?.currency ?? floor?.currency ?? 'TWD'
  const unit = summary?.unit ?? floor?.unit ?? ''
  const zone = classifyPrice(price, floorPrice, reference)

  const refForScale = reference ?? floorPrice
  if (refForScale === null) {
    return <p className="form__hint">{t('gauge.noData')}</p>
  }
  // 尺的範圍：參考值的 1.6 倍或輸入值的 1.1 倍取大者，游標不會跑出尺外
  const scaleMax = Math.max(refForScale * 1.6, price !== null ? price * 1.1 : 0, floorPrice ?? 0)
  const pct = (v: number) => Math.min(100, Math.max(0, (v / scaleMax) * 100))

  return (
    <div className={`gauge gauge--${zone}`} role="img" aria-label={t('gauge.aria')}>
      <div className="gauge__track">
        {floorPrice !== null && <div className="gauge__invalid" style={{ width: `${pct(floorPrice)}%` }} />}
        {reference !== null && (
          <div
            className="gauge__fair"
            style={{
              left: `${pct(reference * (1 - CONSENSUS_BAND))}%`,
              width: `${pct(reference * (1 + CONSENSUS_BAND)) - pct(reference * (1 - CONSENSUS_BAND))}%`,
            }}
          />
        )}
        {official !== null && (
          <div className="gauge__mark gauge__mark--official" style={{ left: `${pct(official)}%` }} />
        )}
        {anchor !== null && <div className="gauge__mark gauge__mark--anchor" style={{ left: `${pct(anchor)}%` }} />}
        {price !== null && Number.isFinite(price) && (
          <div className="gauge__cursor" style={{ left: `${pct(price)}%` }} />
        )}
      </div>
      <ul className="gauge__legend">
        {floorPrice !== null && (
          <li>
            <span className="gauge__dot gauge__dot--invalid" />
            {t('gauge.floor', { price: formatCurrency(floorPrice, currency), unit })}
          </li>
        )}
        {official !== null && (
          <li>
            <span className="gauge__dot gauge__dot--official" />
            {t('gauge.official', { price: formatCurrency(official, currency), unit })}
          </li>
        )}
        {anchor !== null && (
          <li>
            <span className="gauge__dot gauge__dot--anchor" />
            {t('gauge.anchor', { price: formatCurrency(anchor, currency), unit })}
          </li>
        )}
      </ul>
      <p className="gauge__status">{t(`gauge.zone.${zone}`)}</p>
    </div>
  )
}
