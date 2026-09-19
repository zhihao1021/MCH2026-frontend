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
      toast('請先選擇身分')
      return
    }
    const res = await verify.run(
      trimmed,
      isRegistering ? role || undefined : undefined,
      isRegistering ? displayName.trim() || undefined : undefined,
    )
    if (res !== undefined) {
      auth.login(res.user)
      toast(isRegistering ? '註冊成功' : '登入成功')
      navigate(returnTo, { replace: true })
    }
  }

  const handleResend = async () => {
    const res = await resend.run()
    if (res !== undefined) {
      setRetryAfter(res.retry_after)
      setIsRegistering(res.is_registered === false)
      toast('已重新發送驗證碼')
    }
  }

  const activeError = verify.error ?? resend.error

  return (
    <Page
      title={isRegistering ? '註冊新帳號' : '輸入驗證碼'}
      softKeys={{
        center: { label: verify.pending ? '處理中…' : isRegistering ? '註冊並登入' : '登入', onPress: () => void submit() },
        right: { label: '返回' },
      }}
    >
      <div className="form">
        <p className="u-muted">已發送驗證碼至 {phone}</p>
        <div className="form__field">
          <label className="form__label" htmlFor="otp">
            驗證碼
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
                身分
              </label>
              <select
                id="role"
                className="form__input"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
              >
                <option value="" disabled>
                  請選擇身分
                </option>
                <option value="consumer">消費者（只能瀏覽）</option>
                <option value="farmer">小農（可報價）</option>
                <option value="trader">盤商（可報價）</option>
              </select>
              <p className="form__hint">身分選定後無法自行更改，請謹慎選擇。</p>
            </div>
            <div className="form__field">
              <label className="form__label" htmlFor="displayName">
                暱稱（選填）
              </label>
              <input
                id="displayName"
                className="form__input"
                type="text"
                placeholder="例如：阿明"
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
            {resend.pending ? '傳送中…' : '重新發送驗證碼'}
          </button>
        )}
        {activeError !== null && <ApiErrorNotice error={activeError} />}
      </div>
    </Page>
  )
}
