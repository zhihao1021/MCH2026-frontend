import type { ApiError } from '../api/client'

function messageFor(error: ApiError): string {
  switch (error.code) {
    case 'network_error':
      return '連線失敗，請檢查網路後重試'
    case 'product_not_found':
      return '找不到這個作物'
    case 'market_not_found':
      return '找不到這個市場'
    case 'validation_error':
      return '輸入資料有誤，請確認後再試一次'
    case 'quote_limit_reached':
      return '有效報價數已達上限，請先下架舊報價'
    case 'role_cannot_quote':
      return '消費者身分無法新增報價。身分在註冊時就已決定、之後無法自行更改，如果選錯了請聯絡客服協助更正'
    case 'quote_not_editable':
      return '已下架的報價無法直接修改'
    case 'not_quote_owner':
      return '只能修改自己的報價'
    case 'role_required':
      return '請先選擇身分（消費者／小農／盤商）再送出，驗證碼仍然有效，不用重新索取'
    case 'otp_invalid':
      return '驗證碼錯誤，請重新輸入'
    case 'otp_expired':
      return '驗證碼已過期，請重新索取'
    case 'otp_not_found':
      return '請先索取驗證碼'
    case 'otp_too_many_attempts':
      return '嘗試次數過多，請重新索取驗證碼'
    case 'otp_cooldown': {
      const retryAfter = (error.details as { retry_after?: number } | undefined)?.retry_after
      return retryAfter ? `請等待 ${retryAfter} 秒後再重新索取` : '請稍候再重新索取驗證碼'
    }
    case 'otp_hourly_limit':
      return '這個號碼今小時索取次數已達上限'
    case 'token_expired':
    case 'invalid_token':
    case 'refresh_token_expired':
    case 'refresh_token_reused':
      return '登入已逾期，請重新登入'
    default:
      return error.message
  }
}

export function ApiErrorNotice({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  return (
    <div className="api-error" role="alert">
      <p>{messageFor(error)}</p>
      {onRetry !== undefined && (
        <button type="button" className="api-error__retry" onClick={onRetry}>
          重試
        </button>
      )}
    </div>
  )
}
