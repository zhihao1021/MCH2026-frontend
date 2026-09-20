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

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'vegetable',
  'fruit',
  'flower',
  'grain',
  'livestock',
  'fishery',
  'other',
]

export function isProductCategory(value: string | null): value is ProductCategory {
  return value !== null && (PRODUCT_CATEGORIES as string[]).includes(value)
}

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

/** 別人看到的座標精度（API.md 4.7）：approximate_1km 是模糊化到小數 2 位、約 1 公里。 */
export type LocationPrecision = 'exact' | 'approximate_1km' | 'hidden'

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

/**
 * 別人看得到的位置（API.md 5.1）：欄位依對方的 visibility 遞減，
 * `precision` 說明座標可信到什麼程度——hidden 時 latitude/longitude 一定是 null。
 */
export type PublicLocation = {
  country_code: string
  country_name: string
  subdivision_code: string | null
  subdivision_name: string | null
  locality: string | null
  address_line: string | null
  latitude: number | null
  longitude: number | null
  precision: LocationPrecision
  formatted: string
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
  location: PublicLocation
  active_quote_count: number
  member_since: string
}

/** 收藏清單附的最新官方價（API.md 4.9）。非產季或該國沒接資料源時整包是 null。 */
export type FavoriteLatest = {
  trade_date: string
  price_avg: string
  currency: string
  unit: string
  /** 聚合到的其中一個市場名稱。 */
  market_name: string | null
  /** 這個價格聚合了幾個市場。 */
  market_count: number
  /** 相對前一個有資料的交易日的漲跌幅（%）；只有一天資料時是 null。 */
  change_pct: number | null
}

export type FavoriteOut = {
  product: ProductOut
  favorited_at: string
  latest: FavoriteLatest | null
}

export type FavoritesResponse = {
  items: FavoriteOut[]
  total: number
  /** 收藏數量上限（目前 30）。 */
  limit: number
  /** 這次的價格是用哪一國的市場算的。 */
  country_code: string
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

/**
 * POST /v1/me/location/detect（API.md 4.4）：依連線 IP 推估的「建議值」，不會存檔。
 * 誤差常達數十公里，`notice` 必須原樣顯示給使用者，避免被當成 GPS 定位。
 */
export type LocationSuggestionOut = {
  country_code: string | null
  country_name: string | null
  subdivision_code: string | null
  subdivision_name: string | null
  locality: string | null
  latitude: number | null
  longitude: number | null
  timezone: string | null
  provider: string
  method: string
  notice: string
}

export type RegionSummary = {
  region: string
  /** 地區名稱可能跨國撞名，要精確比對就得連國碼一起看（API.md 7.9）。 */
  country_code: string
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
  /** 該國對這一級的稱呼（縣市 / Region / State…）。 */
  type?: string
  /** 1 = 一級行政區，2 = 二級。 */
  level?: number
  /** 還有下一級可以往下鑽（用 ?parent= 查）。 */
  has_children?: boolean
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

// ---- 消費者意向價格（API.md 9）----

/** GET /v1/products/{ref}/intents/floor：全部欄位都可能是 null（沒有官方行情時不設限）。 */
export type PriceFloorOut = {
  /** 低於此價會被後端拒絕（intent_below_floor）；null = 不設限。 */
  floor_price: string | null
  /** 推算基準：近 sample_days 日官方行情的中位數。 */
  reference_price: string | null
  currency: string | null
  unit: string | null
  sample_days: number
  /** official_price_proxy:region / :country / :global，或 no_official_data。 */
  source: string
  /** 低於底線時要原樣顯示的提示語。 */
  hint: string | null
}

export type IntentStatus = 'active' | 'superseded' | 'withdrawn'

/** 為什麼沒被計入看板；null 代表有計入。影子封禁的人自己也看得到 shadowed——後端刻意如此，見 API.md 9.2。 */
export type IntentExclusion =
  | 'below_floor'
  | 'outlier'
  | 'shadowed'
  | 'non_local'
  | 'untrusted_ip'
  | 'zero_weight'

export type IntentOut = {
  id: string
  product: ProductOut
  price: string
  quantity: string | null
  currency: string
  unit: string
  country_code: string
  region: string | null
  status: IntentStatus
  excluded_reason: IntentExclusion | null
  /** 提交當下的信譽權重（0.0 ~ 2.0）。 */
  weight: number
  floor_price: string | null
  note: string | null
  created_at: string
}

/**
 * 區域意向看板（API.md 9.3）。刻意沒有算術平均；要顯示的錨點是 anchor_price
 * （信譽加權中位數），median / trimmed_mean 只是對照。全部價格欄位在 sample_count 為 0 時是 null。
 */
export type IntentSummaryOut = {
  product: ProductOut
  region: string | null
  country_code: string | null
  currency: string | null
  unit: string | null
  anchor_price: string | null
  median: string | null
  trimmed_mean: string | null
  q1: string | null
  q3: string | null
  /** IQR 容許區間 [Q1 − 1.5·IQR, Q3 + 1.5·IQR]，區間外視為離群值。 */
  lower_bound: string | null
  upper_bound: string | null
  min_price: string | null
  max_price: string | null
  floor_price: string | null
  /** 需求總量：只加總有填數量的意向；沒人填時為 null。 */
  demand_quantity: string | null
  demand_respondents: number
  /** 納入計算的筆數。 */
  sample_count: number
  /** 總提交筆數，含被排除的。 */
  submitted_count: number
  excluded_count: number
  exclusions: Partial<Record<IntentExclusion, number>>
}

/** GET /v1/me/reputation。回應刻意不含影子封禁狀態（API.md 9.4）。 */
export type ReputationOut = {
  weight: number
  samples: number
  hits: number
  misses: number
  has_verified_purchase: boolean
}

/** 產地開團通知（API.md 9.5）。intent_price 是當初填的意向價，對照 offer_price 看差多少。 */
export type NotificationOut = {
  id: string
  product: ProductOut
  offer_price: string
  currency: string
  unit: string
  intent_price: string | null
  quote_id: string | null
  sent_at: string
  opened_at: string | null
  clicked_at: string | null
}

export type IntentCreateBody = {
  price: string
  quantity?: string
  unit?: string
  currency?: string
  note?: string
}

export type NotificationResponseBody = {
  /** true = 點了「前往購買」；false = 只是看過。 */
  clicked: boolean
}
