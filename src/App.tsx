import { RouterProvider } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import { AuthProvider } from './hooks/useAuth'
import { FavoritesProvider } from './hooks/useFavorites'
import { KeypadProvider } from './hooks/useKeypad'
import { SoftKeyProvider } from './hooks/useSoftKeys'
import { I18nProvider } from './i18n'
import { router } from './routes'
import './styles/main.scss'

/**
 * Provider 順序有意義：
 *   I18nProvider    ─ 語系（最外層：所有畫面文字都要）
 *   KeypadProvider  ─ 全域按鍵派送（先註冊 = 最低優先權）
 *   SoftKeyProvider ─ 軟鍵堆疊，並把 LSK/Enter 接到按鍵派送的最底層
 *   ToastProvider   ─ 需要蓋在所有頁面之上
 *   AuthProvider    ─ 可能需要 useToast（登入逾時提示），放在 ToastProvider 之內
 *   FavoritesProvider ─ 收藏清單跟著登入狀態走，必須在 AuthProvider 之內
 *   RouterProvider  ─ 依 hash 決定畫面
 */
export function App() {
  return (
    <I18nProvider>
      <KeypadProvider>
        <SoftKeyProvider>
          <ToastProvider>
            <AuthProvider>
              <FavoritesProvider>
                <RouterProvider router={router} />
              </FavoritesProvider>
            </AuthProvider>
          </ToastProvider>
        </SoftKeyProvider>
      </KeypadProvider>
    </I18nProvider>
  )
}
