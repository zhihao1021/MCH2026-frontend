import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiErrorNotice } from '../components/ApiErrorNotice'
import { Page } from '../components/Page'
import { Spinner } from '../components/Spinner'
import { useToast } from '../components/Toast'
import { createQuote } from '../api/quotes'
import { getProduct } from '../api/products'
import { useApi, useApiAction } from '../hooks/useApi'
import { useAuth } from '../hooks/useAuth'
import { useT } from '../i18n'
import { roleLabel } from '../lib/labels'
import { sideForRole, sideLabel } from '../lib/quoteSide'

export function QuoteFormPage() {
  const { ref } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const auth = useAuth()
  const t = useT()

  const { data: product, loading: productLoading, error: productError, reload } = useApi(
    () => getProduct(ref ?? ''),
    [ref],
  )
  const { run: submitQuote, pending, error: submitError } = useApiAction(createQuote)

  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')

  const returnTo = `/products/${encodeURIComponent(ref ?? '')}/quote`

  useEffect(() => {
    if (!auth.loading && auth.user === null) {
      navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`, { replace: true })
    }
  }, [auth.loading, auth.user, navigate, returnTo])

  if (auth.loading || (auth.user !== null && productLoading)) {
    return (
      <Page title={t('quoteForm.title')} softKeys={{ right: { label: t('common.back') } }}>
        <Spinner />
      </Page>
    )
  }

  if (auth.user === null) return null

  // 買／賣由身分決定：小農賣、盤商收。用 can_quote 擋消費者而不是自己判斷 role：
  // 後端已經算好，身分註冊後不能改，整個 session 內都穩定（API.md 13）
  const side = sideForRole(auth.user.role)
  if (auth.user.can_quote === false || side === null) {
    return (
      <Page title={t('quoteForm.title')} softKeys={{ right: { label: t('common.back') } }}>
        <p className="u-muted">{t('quoteForm.blocked.role')}</p>
        <p className="u-muted">{t('quoteForm.blocked.hint')}</p>
      </Page>
    )
  }

  if (productError !== null) {
    return (
      <Page title={t('quoteForm.title')} softKeys={{ right: { label: t('common.back') } }}>
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
    // 對齊 API.md：price / quantity 都必須 > 0，負數或 0 在前端就先擋掉
    if (!(Number(trimmedPrice) > 0)) {
      toast(t('quoteForm.toast.pricePositive'))
      return
    }
    const trimmedQuantity = quantity.trim()
    if (trimmedQuantity.length > 0 && !(Number(trimmedQuantity) > 0)) {
      toast(t('quoteForm.toast.quantityPositive'))
      return
    }
    const result = await submitQuote({
      product_id: product.id,
      price: trimmedPrice,
      side,
      quantity: trimmedQuantity.length > 0 ? trimmedQuantity : undefined,
      note: note.trim().length > 0 ? note.trim() : undefined,
    })
    if (result !== undefined) {
      toast(t('quoteForm.toast.submitted'))
      navigate(`/products/${encodeURIComponent(ref ?? '')}`, { replace: true })
    }
  }

  return (
    <Page
      title={t('quoteForm.titleFor', { product: product.name })}
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
          <span className="form__label">{t('quoteForm.side')}</span>
          <p className="form__static">
            {sideLabel(t, side)}
            <span className="u-muted">（{roleLabel(t, auth.user.role)}）</span>
          </p>
        </div>

        <div className="form__field">
          <label className="form__label" htmlFor="price">
            {t('quoteForm.price', { unit: product.default_unit })}
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
          <label className="form__label" htmlFor="quantity">
            {t('quoteForm.quantity', { unit: product.default_unit })}
          </label>
          <input
            id="quantity"
            className="form__input"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            placeholder={t('quoteForm.quantityPlaceholder')}
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
            placeholder={t('quoteForm.notePlaceholder')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <p className="form__hint">{t('quoteForm.hint')}</p>

        {submitError !== null && <ApiErrorNotice error={submitError} />}
      </div>
    </Page>
  )
}
