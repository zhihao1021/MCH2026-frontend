import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { isLoggedIn as hasTokens, logout as apiLogout } from '../api/auth'
import { getMe } from '../api/me'
import type { UserOut } from '../api/types'

type AuthApi = {
  user: UserOut | null
  loading: boolean
  /** OTP 驗證成功後呼叫，直接寫入 user，不用再多打一次 GET /v1/me。 */
  login: (user: UserOut) => void
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthCtx = createContext<AuthApi | null>(null)

/**
 * 訪客（沒有 token）完全不打任何 API，掛載即完成、user 為 null，
 * 維持「未登入也能完整瀏覽」的零成本原則。
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    if (!hasTokens()) {
      setUser(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setUser(await getMe())
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshUser()
  }, [refreshUser])

  const login = useCallback((nextUser: UserOut) => {
    setUser(nextUser)
  }, [])

  const logout = useCallback(async () => {
    await apiLogout()
    setUser(null)
  }, [])

  const api = useMemo<AuthApi>(
    () => ({ user, loading, login, logout, refreshUser }),
    [user, loading, login, logout, refreshUser],
  )

  return <AuthCtx.Provider value={api}>{children}</AuthCtx.Provider>
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthCtx)
  if (ctx === null) throw new Error('useAuth 必須在 <AuthProvider> 內使用')
  return ctx
}
