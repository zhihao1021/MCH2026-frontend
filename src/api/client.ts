import type { ApiErrorBody } from './types'
// 這裡跟 auth.ts 互相 import（auth.ts 的 otp/refresh/logout 呼叫也要用 apiFetch）。
// 兩邊都只在函式內使用對方的匯出，不在模組頂層立即呼叫，ESM 的循環匯入可以安全處理。
import { clearTokens, getAccessToken, refreshTokens } from './auth'
import { getLocale } from '../i18n/locale'

const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

export class ApiError extends Error {
  status: number
  code: string
  details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

/** 401 且 refresh 失敗（或沒登入）時丟這個，呼叫端可以導去 /login。 */
export class AuthExpiredError extends Error {}

async function rawFetch(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`${BASE_URL}/v1${path}`, init)
  } catch {
    throw new ApiError(0, 'network_error', '連線失敗，請檢查網路')
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T

  const text = await response.text()
  const body: unknown = text.length > 0 ? JSON.parse(text) : undefined

  if (!response.ok) {
    const errorBody = body as ApiErrorBody | undefined
    throw new ApiError(
      response.status,
      errorBody?.error.code ?? 'unknown_error',
      errorBody?.error.message ?? '發生錯誤',
      errorBody?.error.details,
    )
  }

  return body as T
}

/**
 * 薄薄的 fetch 封裝：組 base URL、統一解析 API.md 2.1 的錯誤形狀。
 * `auth: true` 時帶 access token；401 時嘗試 refresh 一次再重試，
 * refresh 失敗（或根本沒登入）就丟 AuthExpiredError 讓呼叫端導去 /login。
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { auth?: boolean },
): Promise<T> {
  const { auth = false, headers, ...rest } = init ?? {}
  const locale = getLocale()
  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    // 品項名稱的語系由後端解析（API.md 2.3）：帶標頭就不必每支 API 都塞 ?locale=
    // 明確加 en 當退回選項：後端找不到目前語系的品項名稱時退英文，而不是任意語系
    'Accept-Language': locale === 'en' ? 'en' : `${locale}, en;q=0.8`,
    ...(headers as Record<string, string> | undefined),
  }

  if (auth) {
    const token = getAccessToken()
    if (token === null) throw new AuthExpiredError('尚未登入')
    baseHeaders.Authorization = `Bearer ${token}`
  }

  const response = await rawFetch(path, { ...rest, headers: baseHeaders })

  if (auth && response.status === 401) {
    try {
      await refreshTokens()
    } catch {
      throw new AuthExpiredError('登入已逾期')
    }
    const retryToken = getAccessToken()
    if (retryToken === null) {
      clearTokens()
      throw new AuthExpiredError('登入已逾期')
    }
    const retryResponse = await rawFetch(path, {
      ...rest,
      headers: { ...baseHeaders, Authorization: `Bearer ${retryToken}` },
    })
    return parseResponse<T>(retryResponse)
  }

  return parseResponse<T>(response)
}

export function toQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value))
  }
  const qs = search.toString()
  return qs.length > 0 ? `?${qs}` : ''
}
