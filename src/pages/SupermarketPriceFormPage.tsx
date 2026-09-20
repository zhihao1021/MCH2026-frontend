import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiErrorNotice } from '../components/ApiErrorNotice'
import { Page } from '../components/Page'
import { Spinner } from '../components/Spinner'
import { useToast } from '../components/Toast'
import { createRetailReport } from '../api/retailPrices'
import { getProduct } from '../api/products'
import { STORE_TYPES } from '../api/types'
import { useApi, useApiAction } from '../hooks/useApi'
import { useAuth } from '../hooks/useAuth'
import { useT } from '../i18n'
import { storeTypeLabel } from '../lib/labels'

/** 今天的日期，YYYY-MM-DD——`observed_on` 省略時後端也是用這個，但先帶入讓使用者能改前幾天。 */
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * 消費者回報看到的超市零售價（API.md 10.2）。跟小農的「我要賣」報價（§8）、
 * 消費者的期望價（§9）都不是同一件事：這裡回報的是「觀察到的實際售價」，
 * 任何登入者都能回報，不需要小農／盤商身分。
 */
export function SupermarketPriceFormPage() {
  const { ref } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const auth = useAuth()
  const t = useT()

  const { data: product, loading: productLoading, error: productError, reload } = useApi(
    () => getProduct(ref ?? ''),
    [ref],
  )
  const { run: submitReport, pending, error: submitError } = useApiAction(createRetailReport)

  const [price, setPrice] = useState('')
  const [packSize, setPackSize] = useState('')
  const [storeName, setStoreName] = useState('')
  const [storeType, setStoreType] = useState<(typeof STORE_TYPES)[number]>('supermarket')
  const [storeBranch, setStoreBranch] = useState('')
  const [observedOn, setObservedOn] = useState(today)
  const [isPromotion, setIsPromotion] = useState(false)
  const [note, setNote] = useState('')

  const returnTo = `/products/${encodeURIComponent(ref ?? '')}/supermarket-price`

  useEffect(() => {
    if (!auth.loading && auth.user === null) {
      navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`, { replace: true })
    }
  }, [auth.loading, auth.user, navigate, returnTo])

  if (auth.loading || (auth.user !== null && productLoading)) {
    return (
      <Page title={t('supermarketPrice.title')} softKeys={{ right: { label: t('common.back') } }}>
        <Spinner />
      </Page>
    )
  }

  if (auth.user === null) return null

  if (productError !== null) {
    return (
      <Page title={t('supermarketPrice.title')} softKeys={{ right: { label: t('common.back') } }}>
        <ApiErrorNotice error={productError} onRetry={reload} />
      </Page>
    )
  }

  if (product === null) return null

  const submit = async () => {
    const trimmedPrice = price.trim()
    if (trimmedPrice.length === 0) {
      toast(t('quoteForm.toast.needPrice'))
      return
    }
    if (!(Number(trimmedPrice) > 0)) {
      toast(t('quoteForm.toast.pricePositive'))
      return
    }
    if (storeName.trim().length === 0) {
      toast(t('supermarketPrice.toast.needStore'))
      return
    }
    const trimmedPackSize = packSize.trim()
    if (trimmedPackSize.length > 0 && !(Number(trimmedPackSize) > 0)) {
      toast(t('supermarketPrice.toast.packSizePositive'))
      return
    }
    const result = await submitReport(ref ?? '', {
      observed_price: trimmedPrice,
      store_name: storeName.trim(),
      store_type: storeType,
      store_branch: storeBranch.trim().length > 0 ? storeBranch.trim() : undefined,
      pack_size: trimmedPackSize.length > 0 ? trimmedPackSize : undefined,
      observed_on: observedOn.length > 0 ? observedOn : undefined,
      is_promotion: isPromotion,
      note: note.trim().length > 0 ? note.trim() : undefined,
    })
    if (result !== undefined) {
      toast(t('supermarketPrice.toast.submitted'))
      navigate(`/products/${encodeURIComponent(ref ?? '')}`, { replace: true })
    }
  }

  return (
    <Page
      title={t('supermarketPrice.titleFor', { product: product.name })}
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
            {t('supermarketPrice.price', { unit: product.default_unit })}
          </label>
          <input
            id="price"
            className="form__input"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            placeholder={t('quoteForm.pricePlaceholder')}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>

        <div className="form__field">
          <label className="form__label" htmlFor="packSize">
            {t('supermarketPrice.packSize', { unit: product.default_unit })}
          </label>
          <input
            id="packSize"
            className="form__input"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            placeholder={t('supermarketPrice.packSizePlaceholder')}
            value={packSize}
            onChange={(e) => setPackSize(e.target.value)}
          />
          <p className="form__hint">{t('supermarketPrice.packSizeHint')}</p>
        </div>

        <div className="form__field">
          <label className="form__label" htmlFor="storeName">
            {t('supermarketPrice.store')}
          </label>
          <input
            id="storeName"
            className="form__input"
            type="text"
            placeholder={t('supermarketPrice.storePlaceholder')}
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
          />
        </div>

        <div className="form__field">
          <label className="form__label" htmlFor="storeType">
            {t('supermarketPrice.storeType')}
          </label>
          <select
            id="storeType"
            className="form__input"
            value={storeType}
            onChange={(e) => setStoreType(e.target.value as (typeof STORE_TYPES)[number])}
          >
            {STORE_TYPES.map((type) => (
              <option key={type} value={type}>
                {storeTypeLabel(t, type)}
              </option>
            ))}
          </select>
        </div>

        <div className="form__field">
          <label className="form__label" htmlFor="storeBranch">
            {t('supermarketPrice.storeBranch')}
          </label>
          <input
            id="storeBranch"
            className="form__input"
            type="text"
            placeholder={t('supermarketPrice.storeBranchPlaceholder')}
            value={storeBranch}
            onChange={(e) => setStoreBranch(e.target.value)}
          />
        </div>

        <div className="form__field">
          <label className="form__label" htmlFor="observedOn">
            {t('supermarketPrice.observedOn')}
          </label>
          <input
            id="observedOn"
            className="form__input"
            type="date"
            max={today()}
            value={observedOn}
            onChange={(e) => setObservedOn(e.target.value)}
          />
        </div>

        <div className="form__field">
          <label className="form__checkbox">
            <input
              type="checkbox"
              checked={isPromotion}
              onChange={(e) => setIsPromotion(e.target.checked)}
            />
            {t('supermarketPrice.isPromotion')}
          </label>
          <p className="form__hint">{t('supermarketPrice.isPromotionHint')}</p>
        </div>

        <div className="form__field">
          <label className="form__label" htmlFor="note">
            {t('quoteForm.note')}
          </label>
          <input
            id="note"
            className="form__input"
            type="text"
            placeholder={t('quoteForm.notePlaceholder')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <p className="form__hint">{t('supermarketPrice.hint')}</p>

        {submitError !== null && <ApiErrorNotice error={submitError} />}
      </div>
    </Page>
  )
}
