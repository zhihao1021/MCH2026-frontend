import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ApiErrorNotice } from '../components/ApiErrorNotice'
import { CountdownText } from '../components/CountdownText'
import { Page } from '../components/Page'
import { useToast } from '../components/Toast'
import { requestOtp, verifyOtp } from '../api/auth'
import type { UserRole } from '../api/types'
import { useApiAction } from '../hooks/useApi'
import { useAuth } from '../hooks/useAuth'
import { useT } from '../i18n'

const COUNTRY_CODE = 'TW'

export function LoginOtpPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const phone = searchParams.get('phone')
  const returnTo = searchParams.get('returnTo') ?? '/'
  const initialRetryAfter = Number(searchParams.get('retryAfter') ?? 60)
  // request 當下的註冊狀態；role_required 是保險絲，理論上不該觸發
  const [isRegistering, setIsRegistering] = useState(searchParams.get('isRegistered') === 'false')
  const auth = useAuth()
  const toast = useToast()
  const t = useT()

  const [code, setCode] = useState('')
  const [role, setRole] = useState<UserRole | ''>('')
  const [displayName, setDisplayName] = useState('')
  const [retryAfter, setRetryAfter] = useState(initialRetryAfter)
  const verify = useApiAction((c: string, r?: UserRole, name?: string) =>
    verifyOtp(phone ?? '', c, COUNTRY_CODE, r, name),
  )
  const resend = useApiAction(() => requestOtp(phone ?? '', COUNTRY_CODE))

  useEffect(() => {
    if (phone === null) navigate('/login', { replace: true })
  }, [phone, navigate])

  useEffect(() => {
    // 保險絲：萬一 request 當下判斷的註冊狀態跟 verify 當下不一致，補救而不是卡死
    if (verify.error?.code === 'role_required') setIsRegistering(true)
  }, [verify.error])

  if (phone === null) return null

  const submit = async () => {
    const trimmed = code.trim()
    if (trimmed.length === 0) return
    if (isRegistering && role === '') {
      toast(t('login.otp.toast.needRole'))
      return
    }
    const res = await verify.run(
      trimmed,
      isRegistering ? role || undefined : undefined,
      isRegistering ? displayName.trim() || undefined : undefined,
    )
    if (res !== undefined) {
      auth.login(res.user)
      toast(isRegistering ? t('login.otp.toast.registered') : t('login.otp.toast.loggedIn'))
      navigate(returnTo, { replace: true })
    }
  }

  const handleResend = async () => {
    const res = await resend.run()
    if (res !== undefined) {
      setRetryAfter(res.retry_after)
      setIsRegistering(res.is_registered === false)
      toast(t('login.otp.toast.resent'))
    }
  }

  const activeError = verify.error ?? resend.error

  return (
    <Page
      title={isRegistering ? t('login.otp.registerTitle') : t('login.otp.title')}
      softKeys={{
        center: {
          label: verify.pending
            ? t('login.otp.key.verifying')
            : isRegistering
              ? t('login.otp.key.register')
              : t('common.login'),
          onPress: () => void submit(),
        },
        right: { label: t('common.back') },
      }}
    >
      <div className="form">
        <p className="u-muted">{t('login.otp.sentTo', { phone })}</p>
        <div className="form__field">
          <label className="form__label" htmlFor="otp">
            {t('login.otp.code')}
          </label>
          <input
            id="otp"
            className="form__input"
            type="text"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>

        {isRegistering && (
          <>
            <div className="form__field">
              <label className="form__label" htmlFor="role">
                {t('login.otp.role')}
              </label>
              <select
                id="role"
                className="form__input"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
              >
                <option value="" disabled>
                  {t('login.otp.role.placeholder')}
                </option>
                <option value="consumer">{t('login.otp.role.consumer')}</option>
                <option value="farmer">{t('login.otp.role.farmer')}</option>
                <option value="trader">{t('login.otp.role.trader')}</option>
              </select>
              <p className="form__hint">{t('login.otp.role.hint')}</p>
            </div>
            <div className="form__field">
              <label className="form__label" htmlFor="displayName">
                {t('login.otp.displayName')}
              </label>
              <input
                id="displayName"
                className="form__input"
                type="text"
                placeholder={t('login.otp.displayNamePlaceholder')}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
          </>
        )}

        {retryAfter > 0 ? (
          <CountdownText key={retryAfter} seconds={retryAfter} onComplete={() => setRetryAfter(0)} />
        ) : (
          <button type="button" className="form__hint" onClick={() => void handleResend()}>
            {resend.pending ? t('login.key.sending') : t('login.otp.resend')}
          </button>
        )}
        {activeError !== null && <ApiErrorNotice error={activeError} />}
      </div>
    </Page>
  )
}
