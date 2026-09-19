import { RouterProvider } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import { AuthProvider } from './hooks/useAuth'
import { KeypadProvider } from './hooks/useKeypad'
import { SoftKeyProvider } from './hooks/useSoftKeys'
import { router } from './routes'
import './styles/main.scss'

/**
 * Provider 順序有意義：
 *   KeypadProvider  ─ 全域按鍵派送（最外層，先註冊 = 最低優先權）
 *   SoftKeyProvider ─ 軟鍵堆疊，並把 LSK/Enter 接到按鍵派送的最底層
 *   ToastProvider   ─ 需要蓋在所有頁面之上
 *   AuthProvider    ─ 可能需要 useToast（登入逾時提示），放在 ToastProvider 之內
 *   RouterProvider  ─ 依 hash 決定畫面
 */
export function App() {
  return (
    <KeypadProvider>
      <SoftKeyProvider>
        <ToastProvider>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </ToastProvider>
      </SoftKeyProvider>
    </KeypadProvider>
  )
}
