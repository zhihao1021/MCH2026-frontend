import { apiFetch } from './client'
import { readJSON, removeKey, writeJSON } from '../lib/storage'
import type { AuthResponse, AuthTokens, OtpRequestResponse, UserRole } from './types'

type StoredTokens = {
  accessToken: string
  refreshToken: string
  /** epoch ms，掛載時用來判斷要不要跳過一次無謂的 401 往返。 */
  accessTokenExpiresAt: number
}

const STORAGE_KEY = 'auth:tokens'

// 模組層快取，讓同分頁內的同步讀取（例如 client.ts 組 header）不用等 storage I/O。
let cached: StoredTokens | null = readJSON<StoredTokens | null>(STORAGE_KEY, null)

function persist(tokens: StoredTokens | null): void {
  cached = tokens
  if (tokens === null) {
    removeKey(STORAGE_KEY)
  } else {
    writeJSON(STORAGE_KEY, tokens)
  }
}

export function getAccessToken(): string | null {
  return cached?.accessToken ?? null
}

export function getRefreshToken(): string | null {
  return cached?.refreshToken ?? null
}

export function isLoggedIn(): boolean {
  return cached !== null
}

export function setTokens(tokens: AuthTokens): void {
  persist({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    accessTokenExpiresAt: Date.now() + tokens.expires_in * 1000,
  })
}

export function clearTokens(): void {
  persist(null)
}

export function requestOtp(phone: string, countryCode?: string): Promise<OtpRequestResponse> {
  return apiFetch('/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify({ phone, country_code: countryCode }),
  })
}

export async function verifyOtp(
  phone: string,
  code: string,
  countryCode?: string,
  role?: UserRole,
  displayName?: string,
): Promise<AuthResponse> {
  const res = await apiFetch<AuthResponse>('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({
      phone,
      code,
      country_code: countryCode,
      role,
      display_name: displayName,
    }),
  })
  setTokens(res)
  return res
}

// 同時呼叫 refreshTokens() 時共用同一個 in-flight promise，避免併發重複換發
// （refresh token 每次使用都會旋轉，重複送出第二次一定會被判成 reuse）。
let refreshPromise: Promise<AuthResponse> | null = null

export function refreshTokens(): Promise<AuthResponse> {
  const refreshToken = getRefreshToken()
  if (refreshToken === null) return Promise.reject(new Error('no refresh token'))

  if (refreshPromise === null) {
    refreshPromise = apiFetch<AuthResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
      .then((res) => {
        setTokens(res)
        return res
      })
      .catch((err: unknown) => {
        clearTokens()
        throw err
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

export async function logout(allDevices = false): Promise<void> {
  const accessToken = getAccessToken()
  const refreshToken = getRefreshToken()
  clearTokens()
  if (refreshToken === null) return
  try {
    // 手動帶 header，不走 apiFetch 的 auth:true（本機 token 已經清了，
    // 那條路會直接判定成尚未登入，連呼叫都不會送出）
    await apiFetch('/auth/logout', {
      method: 'POST',
      headers: accessToken !== null ? { Authorization: `Bearer ${accessToken}` } : undefined,
      body: JSON.stringify({ refresh_token: refreshToken, all_devices: allDevices }),
    })
  } catch {
    // 本機 token 已經清了，伺服器端登出失敗不影響使用者體驗
  }
}
