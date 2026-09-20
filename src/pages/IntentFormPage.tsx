import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiErrorNotice } from '../components/ApiErrorNotice'
import { IntentGauge } from '../components/IntentGauge'
import { Page } from '../components/Page'
import { Spinner } from '../components/Spinner'
import { useToast } from '../components/Toast'
import { formatCurrency, parseDecimalOrNull } from '../api/decimal'
import { createIntent, getIntentFloor, getIntentSummary } from '../api/intents'
import { getProduct } from '../api/products'
import type { IntentSummaryOut, PriceFloorOut, ProductDetailOut } from '../api/types'
import { useApi, useApiAction } from '../hooks/useApi'
import { useAuth } from '../hooks/useAuth'
import { useT } from '../i18n'

type FormData = {
  product: ProductDetailOut
  floor: PriceFloorOut
  /** 看板抓不到不該擋住輸入，退成 null 只是儀表上少一個刻度。 */
  summary: IntentSummaryOut | null
}

async function loadForm(ref: string, region: string | undefined): Promise<FormData> {
  const [product, floor, summary] = await Promise.all([
    getProduct(ref),
    // 底線依使用者所在區域的行情推算，該區沒資料後端會自己退回全國（API.md 9.1）
    getIntentFloor(ref, { region }),
    getIntentSummary(ref, { region }).catch(() => null),
  ])
  return { product, floor, summary }
}

/**
 * 消費者期望價（意向價）表單（API.md 9.2）。任何登入者都能提，不看 can_quote。
 * 送出前先問 /intents/floor 即時擋下低於底線的出價（API.md 12-15）；
 * 冷卻期、離群、信譽、影子封禁全在後端，這裡只負責把後端的錯誤講清楚。
 */
export function IntentFormPage() {
  const { ref } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const auth = useAuth()
  const t = useT()

  const returnTo = `/products/${encodeURIComponent(ref ?? '')}/intent`
  const region = auth.user?.location.subdivision_name ?? undefined
  // 小農是供給端，意向價是需求側訊號：讓小農自己提意向價等於自己跟自己喊價，
  // 所以這裡刻意擋掉——小農仍能在作物頁「看」意向看板，只是不能提交（見 productSections.ts）
  const isFarmer = auth.user?.role === 'farmer'

  // auth 還在載時不打：底線與看板都要依使用者的行政區查，先打一次再重打只是浪費往返；
  // 小農會被擋下不給提交，也不用白白打這幾支 API
  const authLoading = auth.loading
  const { data, loading, error, reload } = useApi<FormData | null>(
    () => (authLoading || isFarmer ? Promise.resolve(null) : loadForm(ref ?? '', region)),
    [ref, region, authLoading, isFarmer],
  )
  const { run: submitIntent, pending, error: submitError } = useApiAction(createIntent)

  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!auth.loading && auth.user === null) {
      navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`, { replace: true })
    }
  }, [auth.loading, auth.user, navigate, returnTo])

  if (auth.loading || (auth.user !== null && loading && data === null)) {
    return (
      <Page title={t('intentForm.title')} softKeys={{ right: { label: t('common.back') } }}>
        <Spinner />
      </Page>
    )
  }

  if (auth.user === null) return null

  if (isFarmer) {
    return (
      <Page title={t('intentForm.title')} softKeys={{ right: { label: t('common.back') } }}>
        <p className="u-muted">{t('intentForm.blocked.role')}</p>
        <p className="u-muted">{t('intentForm.blocked.roleHint')}</p>
      </Page>
    )
  }

  // 沒填所在地就歸不到任何看板，後端會回 intent_region_required；
  // 與其讓人填完價格才被退，不如一進來就把人帶去個人檔案
  if (region === undefined) {
    return (
      <Page
        title={t('intentForm.title')}
        softKeys={{
          center: { label: t('intentForm.key.setRegion'), onPress: () => navigate('/profile') },
          right: { label: t('common.back') },
        }}
      >
        <p className="u-muted">{t('intentForm.blocked.region')}</p>
        <p className="u-muted">{t('intentForm.blocked.regionHint')}</p>
      </Page>
    )
  }

  if (error !== null) {
    return (
      <Page title={t('intentForm.title')} softKeys={{ right: { label: t('common.back') } }}>
        <ApiErrorNotice error={error} onRetry={reload} />
      </Page>
    )
  }

  if (data === null) return null
  const { product, floor, summary } = data
  const floorPrice = parseDecimalOrNull(floor.floor_price)
  const currency = summary?.currency ?? floor.currency ?? auth.user.currency
  const unit = summary?.unit ?? floor.unit ?? product.default_unit
  const priceNumber = price.trim().length > 0 ? parseDecimalOrNull(price.trim()) : null

  const submit = async () => {
    const trimmedPrice = price.trim()
    if (trimmedPrice.length === 0) {
      toast(t('quoteForm.toast.needPrice'))
      return
    }
    const n = Number(trimmedPrice)
    if (!(n > 0)) {
      toast(t('quoteForm.toast.pricePositive'))
      return
    }
    // 前端硬阻斷（PRD 1.2）：低於底線不送，提示語以後端 hint 為準
    if (floorPrice !== null && n < floorPrice) {
      toast(floor.hint ?? t('intentForm.toast.belowFloor'))
      return
    }
    const trimmedQuantity = quantity.trim()
    if (trimmedQuantity.length > 0 && !(Number(trimmedQuantity) > 0)) {
      toast(t('quoteForm.toast.quantityPositive'))
      return
    }
    const result = await submitIntent(ref ?? '', {
      price: trimmedPrice,
      quantity: trimmedQuantity.length > 0 ? trimmedQuantity : undefined,
      note: note.trim().length > 0 ? note.trim() : undefined,
    })
    if (result !== undefined) {
      // 就算 excluded_reason 有值（影子封禁、機房 IP）也只說「已送出」：
      // 讓對方以為成功了才不會立刻換帳號重來（API.md 9.2）
      toast(t('intentForm.toast.submitted'))
      navigate(`/products/${encodeURIComponent(ref ?? '')}?screen=intent`, { replace: true })
    }
  }

  return (
    <Page
      title={t('intentForm.titleFor', { product: product.name })}
      softKeys={{
        center: {
          label: pending ? t('common.submitting') : t('common.submit'),
          onPress: () => void submit(),
        },
        right: { label: t('common.back') },
      }}
    >
      <div className="form">
        <div className="form__field">
          <label className="form__label" htmlFor="price">
            {t('intentForm.price', { unit })}
          </label>
          <input
            id="price"
            className="form__input"
            type="number"
            inputMode="decimal"
            min={floorPrice ?? 0.01}
            step="0.01"
            placeholder={t('quoteForm.pricePlaceholder')}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <IntentGauge price={priceNumber} floor={floor} summary={summary} />
          {floorPrice !== null && (
            <p className={priceNumber !== null && priceNumber < floorPrice ? 'form__error' : 'form__hint'}>
              {t('intentForm.floorLine', {
                price: formatCurrency(floorPrice, currency),
                unit,
                days: floor.sample_days,
              })}
            </p>
          )}
        </div>

        <div className="form__field">
          <label className="form__label" htmlFor="quantity">
            {t('intentForm.quantity', { unit })}
          </label>
          <input
            id="quantity"
            className="form__input"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            placeholder={t('intentForm.quantityPlaceholder')}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>

        <div className="form__field">
          <label className="form__label" htmlFor="note">
            {t('quoteForm.note')}
          </label>
          <input
            id="note"
            className="form__input"
            type="text"
            placeholder={t('intentForm.notePlaceholder')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <p className="form__hint">{t('intentForm.hint', { region })}</p>
        <p className="form__hint">{floor.hint ?? t('intentForm.nudge')}</p>

        {submitError !== null && <ApiErrorNotice error={submitError} />}
      </div>
    </Page>
  )
}
