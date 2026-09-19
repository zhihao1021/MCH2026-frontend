import { createHashRouter } from 'react-router-dom'
import { AboutPage } from './pages/AboutPage'
import { DetailPage } from './pages/DetailPage'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { SettingsPage } from './pages/SettingsPage'

/**
 * 用 hash router 而非 browser router 的理由：
 * 1. Cloud Phone widget 只會從後台登記的那一個 URL 進入，不需要 deep link。
 * 2. 純靜態託管即可，不必設定 SPA rewrite。
 * 3. RSK 的預設行為是 history.back()，hash 一樣會產生歷史紀錄，
 *    所以「右軟鍵回上一頁」不需要任何額外程式碼。
 */
export const router = createHashRouter([
  { path: '/', element: <HomePage /> },
  { path: '/items/:id', element: <DetailPage /> },
  { path: '/settings', element: <SettingsPage /> },
  { path: '/about', element: <AboutPage /> },
  { path: '*', element: <NotFoundPage /> },
])
