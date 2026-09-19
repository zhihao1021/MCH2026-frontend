/**
 * 對齊 API.md 的型別定義。價格/數量欄位一律是 Decimal-as-string
 * （例如 "19.20"），parse 請用 decimal.ts 的 helper，不要直接當 number 用。
 */

export type Page<T> = {
  items: T[]
  total: number
  limit: number
  offset: number
  has_more: boolean
}

export type ApiErrorBody = {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export type ProductCategory =
  | 'vegetable'
  | 'fruit'
  | 'flower'
  | 'grain'
  | 'livestock'
  | 'fishery'
  | 'other'

export type ProductOut = {
  id: string
  slug: string
  name: string
  category: ProductCategory
  default_unit: string
  image_url: string | null
}

/** 圖片來自 Wikimedia Commons，多數授權要求標示出處，顯示圖片的畫面務必附上這行資訊（見 API.md 2.5）。 */
export type ImageInfo = {
  url: string
  source: string | null
  source_url: string | null
  license: string | null
  author: string | null
}

export type ProductDetailOut = ProductOut & {
  names: { locale: string; name: string; is_primary: boolean }[]
  popularity: number
  image: ImageInfo | null
}

export type OfficialPriceOut = {
  market_id: string
  market_name: string
  region: string
  country_code: string
  source_key: string
  trade_date: string
  currency: string
  unit: string
  grade: string | null
  price_avg: string
  price_high: string
  price_low: string
  volume: string | null
  volume_unit: string | null
}

export type SeriesPoint = {
  d: string
  avg: string
  high: string
  low: string
  vol: string | null
}

export type OfficialSeries = {
  product_id: string
  market_id: string | null
  currency: string
  unit: string
  change_pct: number | null
  points: SeriesPoint[]
}

export type QuotesSummary = {
  count: number
  price_min: string | null
  price_max: string | null
  price_avg: string | null
  // 實測真實後端在 count === 0 時，currency/unit 也會是 null（API.md 範例沒寫出這點）
  currency: string | null
  unit: string | null
}

export type OverviewOut = {
  product: ProductOut
  image: ImageInfo | null
  official: OfficialPriceOut[]
  official_series: OfficialSeries | null
  quotes: QuotesSummary
  updated_at: string
}

export type UserRole = 'consumer' | 'farmer' | 'trader'
export type UnitSystem = 'metric' | 'imperial'
/** 位置公開精細度：exact=精確座標/地址、approximate=大概位置、region=只顯示縣市、private=不公開。 */
export type LocationVisibility = 'exact' | 'approximate' | 'region' | 'private'

export type LocationOut = {
  country_code: string
  country_name: string
  subdivision_code: string | null
  subdivision_name: string | null
  locality: string | null
  address_line: string | null
  postal_code: string | null
  latitude: number | null
  longitude: number | null
  timezone: string | null
  visibility: LocationVisibility
  updated_at: string | null
  /** 後端已組好的可讀字串（例如「臺灣 雲林縣 斗六市」），詳情頁直接顯示即可。 */
  formatted: string
}

export type UserOut = {
  id: string
  phone: string
  role: UserRole
  display_name: string | null
  business_name: string | null
  bio: string | null
  avatar_url: string | null
  website_url: string | null
  country_code: string
  locale: string
  preferred_currency: string | null
  unit_system: UnitSystem | null
  currency: string
  effective_unit_system: UnitSystem
  timezone: string | null
  location: LocationOut
  has_location: boolean
  contact_phone_public: boolean
  is_active: boolean
  can_quote: boolean
  created_at: string
  last_login_at: string | null
}

export type AuthTokens = {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export type AuthResponse = AuthTokens & {
  user: UserOut
  is_new_user?: boolean
}

export type QuoteSide = 'sell' | 'buy'
export type QuoteStatus = 'active' | 'expired' | 'withdrawn' | 'hidden'

export type QuoteSeller = {
  id: string
  display_name: string | null
  business_name: string | null
  role: UserRole
  region: string | null
  phone: string | null
  phone_is_masked: boolean
}

export type QuoteOut = {
  id: string
  product: ProductOut
  side: QuoteSide
  status: QuoteStatus
  price: string
  currency: string
  unit: string
  grade: string | null
  quantity: string | null
  min_order: string | null
  country_code: string
  region: string | null
  location_text: string | null
  market_id: string | null
  note: string | null
  seller: QuoteSeller
  created_at: string
  valid_until: string | null
}

export type MarketOut = {
  id: string
  external_id: string | null
  name: string
  name_en: string | null
  country_code: string
  region: string | null
  timezone: string
  latitude: number | null
  longitude: number | null
  source_key: string | null
}

export type SourceOut = {
  key: string
  name: string
  country_code: string
  currency: string
  timezone: string
  version: string
  description: string
  homepage_url: string | null
  license: string | null
  schedule: string | null
  installed: boolean
  enabled: boolean
  last_run_at: string | null
  last_success_at: string | null
  last_error: string | null
}

export type SourcesResponse = {
  sources: SourceOut[]
  load_errors: { key: string; reason: string; detail?: string }[]
}

/** GET /v1/users/{id}（API.md 5.1）：別人看得到的檔案，不含電話；location 依對方的 visibility 遞減。 */
export type PublicUserOut = {
  id: string
  display_name: string | null
  business_name: string | null
  role: UserRole
  bio: string | null
  avatar_url: string | null
  website_url: string | null
  location: Pick<LocationOut, 'country_code' | 'country_name' | 'subdivision_name' | 'locality' | 'formatted'>
  active_quote_count: number
  member_since: string
}

// ---- 請求 body ----

export type OtpRequestBody = {
  phone: string
  country_code?: string
}

export type OtpRequestResponse = {
  phone: string
  expires_at: string
  retry_after: number
  /** false = 接下來是註冊，verify 必須帶 role；true = 登入，role 會被忽略。 */
  is_registered: boolean
  debug_code: string | null
}

export type OtpVerifyBody = {
  phone: string
  code: string
  country_code?: string
  /** 註冊（is_registered:false）時必填，且之後不能再改；登入時忽略。 */
  role?: UserRole
  display_name?: string
}

/**
 * role 不在這裡：身分在註冊時綁定、之後不可自行更改，送 role 會被後端回 422
 * （未知欄位）。位置也不在這裡，走 PUT /v1/me/location（見 LocationIn）。
 */
export type PatchMeBody = {
  display_name?: string | null
  business_name?: string | null
  bio?: string | null
  avatar_url?: string | null
  website_url?: string | null
  locale?: string | null
  preferred_currency?: string | null
  unit_system?: UnitSystem | null
  contact_phone_public?: boolean | null
}

/** PUT /v1/me/location：整筆取代，沒帶的欄位會被清空，只有 country_code 必填。 */
export type LocationIn = {
  country_code: string
  subdivision_code?: string | null
  locality?: string | null
  address_line?: string | null
  postal_code?: string | null
  latitude?: number | null
  longitude?: number | null
  timezone?: string | null
  visibility?: LocationVisibility
}

export type RegionSummary = {
  region: string
  market_count: number
}

export type CountryOut = {
  code: string
  name: string
  name_en: string
  dialing_code: string
  currency: string
  default_locale: string
  default_timezone: string
  unit_system: UnitSystem
  subdivision_label: string
  postal_code_example: string | null
  has_subdivision_data: boolean
}

export type SubdivisionOut = {
  code: string
  name: string
  name_en: string
}

export type CreateQuoteBody = {
  product_id: string
  price: string
  side?: QuoteSide
  unit?: string
  currency?: string
  grade?: string
  quantity?: string
  min_order?: string
  market_id?: string
  region?: string
  location_text?: string
  latitude?: number
  longitude?: number
  note?: string
  contact_phone_public?: boolean
  valid_hours?: number
}

export type PatchQuoteBody = Partial<
  Omit<CreateQuoteBody, 'product_id' | 'side' | 'currency'>
>
