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
  invalid_phone: 'errors.phoneInvalid',
  unsupported_country: 'errors.unsupportedCountry',
  favorite_not_found: 'errors.favoriteNotFound',
  favorite_limit_reached: 'errors.favoriteLimit',
  token_expired: 'errors.sessionExpired',
  invalid_token: 'errors.sessionExpired',
  refresh_token_expired: 'errors.sessionExpired',
  refresh_token_reused: 'errors.sessionExpired',
  intent_region_required: 'errors.intentRegionRequired',
  intent_not_found: 'errors.intentNotFound',
  not_intent_owner: 'errors.notIntentOwner',
  notification_not_found: 'errors.notificationNotFound',
  not_notification_owner: 'errors.notNotificationOwner',
}

/** 429 的 retry_after 是秒數；意向價冷卻期以天計（預設 7 天），換算成天再顯示，秒數對使用者沒意義。 */
function retryAfterDays(error: ApiError): number | null {
  const seconds = (error.details as { retry_after?: number } | undefined)?.retry_after
  return typeof seconds === 'number' && seconds > 0 ? Math.max(1, Math.ceil(seconds / 86_400)) : null
}

function messageFor(t: Translate, error: ApiError): string {
  if (error.code === 'otp_cooldown') {
    const retryAfter = (error.details as { retry_after?: number } | undefined)?.retry_after
    return retryAfter
      ? t('errors.otpCooldown', { count: retryAfter })
      : t('errors.otpCooldownGeneric')
  }
  if (error.code === 'intent_cooldown') {
    const days = retryAfterDays(error)
    return days === null ? t('errors.intentCooldownGeneric') : t('errors.intentCooldown', { count: days })
  }
  if (error.code === 'intent_below_floor') {
    // details 帶 floor_price，後端 message 已含提示語；有底線價就把數字講出來
    const floor = (error.details as { floor_price?: string } | undefined)?.floor_price
    return floor === undefined ? t('errors.intentBelowFloor') : t('errors.intentBelowFloorWithPrice', { price: floor })
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
