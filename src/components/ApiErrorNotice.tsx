import type { ApiError } from '../api/client'
import { useT, type MessageKey, type Translate } from '../i18n'

/** 後端錯誤碼 → 使用者看得懂的訊息；沒對應的就顯示後端原本的 message。 */
const MESSAGES: Record<string, MessageKey> = {
  network_error: 'errors.network',
  unknown_error: 'errors.unknown',
  product_not_found: 'errors.productNotFound',
  market_not_found: 'errors.marketNotFound',
  user_not_found: 'errors.userNotFound',
  validation_error: 'errors.validation',
  quote_limit_reached: 'errors.quoteLimit',
  role_cannot_quote: 'errors.roleCannotQuote',
  quote_not_editable: 'errors.quoteNotEditable',
  not_quote_owner: 'errors.notQuoteOwner',
  role_required: 'errors.roleRequired',
  otp_invalid: 'errors.otpInvalid',
  otp_expired: 'errors.otpExpired',
  otp_not_found: 'errors.otpNotFound',
  otp_too_many_attempts: 'errors.otpTooManyAttempts',
  otp_hourly_limit: 'errors.otpHourlyLimit',
  favorite_not_found: 'errors.favoriteNotFound',
  favorite_limit_reached: 'errors.favoriteLimit',
  token_expired: 'errors.sessionExpired',
  invalid_token: 'errors.sessionExpired',
  refresh_token_expired: 'errors.sessionExpired',
  refresh_token_reused: 'errors.sessionExpired',
}

function messageFor(t: Translate, error: ApiError): string {
  if (error.code === 'otp_cooldown') {
    const retryAfter = (error.details as { retry_after?: number } | undefined)?.retry_after
    return retryAfter
      ? t('errors.otpCooldown', { count: retryAfter })
      : t('errors.otpCooldownGeneric')
  }
  const key = MESSAGES[error.code]
  // 後端的 message 是中文的，沒對應到 key 時至少還有東西可看
  return key === undefined ? error.message : t(key)
}

export function ApiErrorNotice({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  const t = useT()

  return (
    <div className="api-error" role="alert">
      <p>{messageFor(t, error)}</p>
      {onRetry !== undefined && (
        <button type="button" className="api-error__retry" onClick={onRetry}>
          {t('common.retry')}
        </button>
      )}
    </div>
  )
}
