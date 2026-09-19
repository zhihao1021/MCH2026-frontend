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
import { roleLabel } from '../lib/labels'
import { sideForRole, sideLabel } from '../lib/quoteSide'

export function QuoteFormPage() {
  const { ref } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const auth = useAuth()

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
      <Page title="新增報價" softKeys={{ right: { label: '返回' } }}>
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
      <Page title="新增報價" softKeys={{ right: { label: '返回' } }}>
        <p className="u-muted">目前身分是消費者，無法新增報價。</p>
        <p className="u-muted">身分在註冊時就已決定，如需更正請聯絡客服協助處理。</p>
      </Page>
    )
  }

  if (productError !== null) {
    return (
      <Page title="新增報價" softKeys={{ right: { label: '返回' } }}>
        <ApiErrorNotice error={productError} onRetry={reload} />
      </Page>
    )
  }

  if (product === null) return null

  const submit = async () => {
    const trimmedPrice = price.trim()
    if (trimmedPrice.length === 0) {
      toast('請先輸入價格')
      return
    }
    // 對齊 API.md：price / quantity 都必須 > 0，負數或 0 在前端就先擋掉
    if (!(Number(trimmedPrice) > 0)) {
      toast('價格必須大於 0')
      return
    }
    const trimmedQuantity = quantity.trim()
    if (trimmedQuantity.length > 0 && !(Number(trimmedQuantity) > 0)) {
      toast('數量必須大於 0')
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
      toast('已送出報價')
      navigate(`/products/${encodeURIComponent(ref ?? '')}`, { replace: true })
    }
  }

  return (
    <Page
      title={`為 ${product.name} 報價`}
      softKeys={{
        center: { label: pending ? '送出中…' : '送出', onPress: () => void submit() },
        right: { label: '返回' },
      }}
    >
      <div className="form">
        <div className="form__field">
          <span className="form__label">報價方向</span>
          <p className="form__static">
            {sideLabel(side)}
            <span className="u-muted">（{roleLabel(auth.user.role)}）</span>
          </p>
        </div>

        <div className="form__field">
          <label className="form__label" htmlFor="price">
            價格（每 {product.default_unit}）
          </label>
          <input
            id="price"
            className="form__input"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            placeholder="例如 33.5"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>

        <div className="form__field">
          <label className="form__label" htmlFor="quantity">
            數量（{product.default_unit}，選填）
          </label>
          <input
            id="quantity"
            className="form__input"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            placeholder="選填"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>

        <div className="form__field">
          <label className="form__label" htmlFor="note">
            備註（選填）
          </label>
          <input
            id="note"
            className="form__input"
            type="text"
            placeholder="例如：今日現採"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <p className="form__hint">報價預設 48 小時後自動失效，可在「我的報價」續期或下架。</p>

        {submitError !== null && <ApiErrorNotice error={submitError} />}
      </div>
    </Page>
  )
}
