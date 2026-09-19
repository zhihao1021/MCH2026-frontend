import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ApiErrorNotice } from '../components/ApiErrorNotice'
import { Page } from '../components/Page'
import { requestOtp } from '../api/auth'
import { useApiAction } from '../hooks/useApi'

const COUNTRY_CODE = 'TW'

export function LoginPhonePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('returnTo') ?? '/'
  const [phone, setPhone] = useState('')
  const { run, pending, error } = useApiAction(requestOtp)

  const submit = async () => {
    const trimmed = phone.trim()
    if (trimmed.length === 0) return
    const res = await run(trimmed, COUNTRY_CODE)
    if (res !== undefined) {
      navigate(
        `/login/otp?phone=${encodeURIComponent(trimmed)}&returnTo=${encodeURIComponent(returnTo)}` +
          `&retryAfter=${res.retry_after}&isRegistered=${res.is_registered}`,
      )
    }
  }

  return (
    <Page
      title="登入"
      softKeys={{
        center: { label: pending ? '傳送中…' : '取得驗證碼', onPress: () => void submit() },
        right: { label: '返回' },
      }}
    >
      <div className="form">
        <div className="form__field">
          <label className="form__label" htmlFor="phone">
            手機號碼
          </label>
          <input
            id="phone"
            className="form__input"
            type="tel"
            inputMode="tel"
            placeholder="0912345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <p className="form__hint">將以簡訊發送驗證碼（目前僅支援台灣門號）</p>
        </div>
        {error !== null && <ApiErrorNotice error={error} />}
      </div>
    </Page>
  )
}
