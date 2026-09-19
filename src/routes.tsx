import { createHashRouter } from 'react-router-dom'
import { AboutPage } from './pages/AboutPage'
import { CropPickerPage } from './pages/CropPickerPage'
import { FavoritesPage } from './pages/FavoritesPage'
import { HomePage } from './pages/HomePage'
import { LoginOtpPage } from './pages/LoginOtpPage'
import { LoginPhonePage } from './pages/LoginPhonePage'
import { MyQuotesPage } from './pages/MyQuotesPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { ProductListPage } from './pages/ProductListPage'
import { ProfilePage } from './pages/ProfilePage'
import { QuoteFormPage } from './pages/QuoteFormPage'
import { RegionPickerPage } from './pages/RegionPickerPage'
import { SeasonPickerPage } from './pages/SeasonPickerPage'
import { SettingsPage } from './pages/SettingsPage'
import { UserProfilePage } from './pages/UserProfilePage'

/**
 * 用 hash router 而非 browser router 的理由：
 * 1. Cloud Phone widget 只會從後台登記的那一個 URL 進入，不需要 deep link。
 * 2. 純靜態託管即可，不必設定 SPA rewrite。
 * 3. RSK 的預設行為是 history.back()，hash 一樣會產生歷史紀錄，
 *    所以「右軟鍵回上一頁」不需要任何額外程式碼——地區/季節/作物精靈的
 *    每一步都是獨立路由，也是為了讓這個免費的返回行為直接生效。
 */
export const router = createHashRouter([
  { path: '/', element: <HomePage /> },
  { path: '/wizard/region', element: <RegionPickerPage /> },
  { path: '/wizard/season', element: <SeasonPickerPage /> },
  { path: '/wizard/crop', element: <CropPickerPage /> },
  { path: '/products', element: <ProductListPage /> },
  { path: '/products/:ref', element: <ProductDetailPage /> },
  { path: '/products/:ref/quote', element: <QuoteFormPage /> },
  { path: '/quotes/mine', element: <MyQuotesPage /> },
  { path: '/favorites', element: <FavoritesPage /> },
  { path: '/users/:id', element: <UserProfilePage /> },
  { path: '/profile', element: <ProfilePage /> },
  { path: '/login', element: <LoginPhonePage /> },
  { path: '/login/otp', element: <LoginOtpPage /> },
  { path: '/settings', element: <SettingsPage /> },
  { path: '/about', element: <AboutPage /> },
  { path: '*', element: <NotFoundPage /> },
])
