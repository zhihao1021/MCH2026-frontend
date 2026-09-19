import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ApiErrorNotice } from '../components/ApiErrorNotice'
import { Page } from '../components/Page'
import { requestOtp } from '../api/auth'
import { useApiAction } from '../hooks/useApi'
import { useT } from '../i18n'

const COUNTRY_CODE = 'TW'

export function LoginPhonePage() {
  const navigate = useNavigate()
  const t = useT()
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
      title={t('login.title')}
      softKeys={{
        center: {
          label: pending ? t('login.key.sending') : t('login.key.sendCode'),
          onPress: () => void submit(),
        },
        right: { label: t('common.back') },
      }}
    >
      <div className="form">
        <div className="form__field">
          <label className="form__label" htmlFor="phone">
            {t('login.phone')}
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
          <p className="form__hint">{t('login.phone.hint')}</p>
        </div>
        {error !== null && <ApiErrorNotice error={error} />}
      </div>
    </Page>
  )
}
