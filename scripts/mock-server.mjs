// 本機開發用的假後端，對齊 API.md 的合約。純 Node 內建 http，不加任何依賴。
// 啟動：npm run mock（預設監聽 127.0.0.1:8000，與 .env.development 的
// VITE_API_BASE_URL 一致）。資料為記憶體內的種子資料，重啟就重置。
import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'

const PORT = 8000
const OTP_TTL_MS = 5 * 60 * 1000
const OTP_RETRY_AFTER_SECONDS = 60
const ACCESS_TTL_SECONDS = 43199

// ---- 種子資料 ----

// 對齊目前實際後端（見 .env.development 指向的服務）GET /v1/products 的
// 種子資料，讓 mock server 與真後端可以互換測試，不必改前端任何一行程式碼。
const PRODUCTS = [
  { id: 'prod-cabbage', slug: 'cabbage', names: { 'zh-Hant': '高麗菜' }, category: 'vegetable', default_unit: 'kg', image_url: null, popularity: 100 },
  { id: 'prod-egg', slug: 'egg', names: { 'zh-Hant': '雞蛋' }, category: 'livestock', default_unit: 'kg', image_url: null, popularity: 95 },
  { id: 'prod-tomato', slug: 'tomato', names: { 'zh-Hant': '番茄' }, category: 'vegetable', default_unit: 'kg', image_url: null, popularity: 93 },
  { id: 'prod-rice', slug: 'rice', names: { 'zh-Hant': '白米' }, category: 'grain', default_unit: 'kg', image_url: null, popularity: 99 },
  { id: 'prod-banana', slug: 'banana', names: { 'zh-Hant': '香蕉' }, category: 'fruit', default_unit: 'kg', image_url: null, popularity: 90 },
  { id: 'prod-green-onion', slug: 'green-onion', names: { 'zh-Hant': '青蔥' }, category: 'vegetable', default_unit: 'kg', image_url: null, popularity: 70 },
  { id: 'prod-onion', slug: 'onion', names: { 'zh-Hant': '洋蔥' }, category: 'vegetable', default_unit: 'kg', image_url: null, popularity: 72 },
  { id: 'prod-pineapple', slug: 'pineapple', names: { 'zh-Hant': '鳳梨' }, category: 'fruit', default_unit: 'kg', image_url: null, popularity: 80 },
  { id: 'prod-napa-cabbage', slug: 'napa-cabbage', names: { 'zh-Hant': '大白菜' }, category: 'vegetable', default_unit: 'kg', image_url: null, popularity: 76 },
  { id: 'prod-mango', slug: 'mango', names: { 'zh-Hant': '芒果' }, category: 'fruit', default_unit: 'kg', image_url: null, popularity: 88 },
  { id: 'prod-potato', slug: 'potato', names: { 'zh-Hant': '馬鈴薯' }, category: 'vegetable', default_unit: 'kg', image_url: null, popularity: 74 },
  { id: 'prod-apple', slug: 'apple', names: { 'zh-Hant': '蘋果' }, category: 'fruit', default_unit: 'kg', image_url: null, popularity: 82 },
  { id: 'prod-white-radish', slug: 'white-radish', names: { 'zh-Hant': '白蘿蔔' }, category: 'vegetable', default_unit: 'kg', image_url: null, popularity: 68 },
  { id: 'prod-carrot', slug: 'carrot', names: { 'zh-Hant': '紅蘿蔔' }, category: 'vegetable', default_unit: 'kg', image_url: null, popularity: 66 },
  { id: 'prod-watermelon', slug: 'watermelon', names: { 'zh-Hant': '西瓜' }, category: 'fruit', default_unit: 'kg', image_url: null, popularity: 85 },
  { id: 'prod-guava', slug: 'guava', names: { 'zh-Hant': '芭樂' }, category: 'fruit', default_unit: 'kg', image_url: null, popularity: 62 },
  { id: 'prod-cucumber', slug: 'cucumber', names: { 'zh-Hant': '小黃瓜' }, category: 'vegetable', default_unit: 'kg', image_url: null, popularity: 64 },
  { id: 'prod-spinach', slug: 'spinach', names: { 'zh-Hant': '菠菜' }, category: 'vegetable', default_unit: 'kg', image_url: null, popularity: 60 },
  { id: 'prod-wax-apple', slug: 'wax-apple', names: { 'zh-Hant': '蓮霧' }, category: 'fruit', default_unit: 'kg', image_url: null, popularity: 58 },
  { id: 'prod-papaya', slug: 'papaya', names: { 'zh-Hant': '木瓜' }, category: 'fruit', default_unit: 'kg', image_url: null, popularity: 78 },
]

const MARKETS = [
  { id: 'mkt-1', external_id: 'DM01', name: '示範第一市場', name_en: null, country_code: 'TW', region: '台北市', timezone: 'Asia/Taipei', latitude: null, longitude: null, source_key: 'demo_mock' },
  { id: 'mkt-2', external_id: 'DM02', name: '示範第二市場', name_en: null, country_code: 'TW', region: '台中市', timezone: 'Asia/Taipei', latitude: null, longitude: null, source_key: 'demo_mock' },
]

// 對齊真後端 GET /v1/geo/countries/TW/subdivisions 的種子資料
const TW_SUBDIVISIONS = [
  { code: 'TW-CHA', name: '彰化縣', name_en: 'Changhua' },
  { code: 'TW-CYI', name: '嘉義市', name_en: 'Chiayi City' },
  { code: 'TW-CYQ', name: '嘉義縣', name_en: 'Chiayi County' },
  { code: 'TW-HSQ', name: '新竹縣', name_en: 'Hsinchu County' },
  { code: 'TW-HSZ', name: '新竹市', name_en: 'Hsinchu City' },
  { code: 'TW-HUA', name: '花蓮縣', name_en: 'Hualien' },
  { code: 'TW-ILA', name: '宜蘭縣', name_en: 'Yilan' },
  { code: 'TW-KEE', name: '基隆市', name_en: 'Keelung' },
  { code: 'TW-KHH', name: '高雄市', name_en: 'Kaohsiung' },
  { code: 'TW-KIN', name: '金門縣', name_en: 'Kinmen' },
  { code: 'TW-LIE', name: '連江縣', name_en: 'Lienchiang' },
  { code: 'TW-MIA', name: '苗栗縣', name_en: 'Miaoli' },
  { code: 'TW-NAN', name: '南投縣', name_en: 'Nantou' },
  { code: 'TW-NWT', name: '新北市', name_en: 'New Taipei' },
  { code: 'TW-PEN', name: '澎湖縣', name_en: 'Penghu' },
  { code: 'TW-PIF', name: '屏東縣', name_en: 'Pingtung' },
  { code: 'TW-TAO', name: '桃園市', name_en: 'Taoyuan' },
  { code: 'TW-TNN', name: '台南市', name_en: 'Tainan' },
  { code: 'TW-TPE', name: '台北市', name_en: 'Taipei' },
  { code: 'TW-TTT', name: '台東縣', name_en: 'Taitung' },
  { code: 'TW-TXG', name: '台中市', name_en: 'Taichung' },
  { code: 'TW-YUN', name: '雲林縣', name_en: 'Yunlin' },
]

const COUNTRIES = [
  {
    code: 'TW',
    name: '臺灣',
    name_en: 'Taiwan',
    dialing_code: '886',
    currency: 'TWD',
    default_locale: 'zh-Hant',
    default_timezone: 'Asia/Taipei',
    unit_system: 'metric',
    subdivision_label: '縣市',
    postal_code_example: '100',
    has_subdivision_data: true,
  },
]

const SOURCES = [
  {
    key: 'demo_mock',
    name: 'Demo Mock Market',
    country_code: 'TW',
    currency: 'TWD',
    timezone: 'Asia/Taipei',
    version: '1.0.0',
    description: '離線開發與測試用的假資料來源',
    homepage_url: null,
    license: 'MIT',
    schedule: '*/30 * * * *',
    installed: true,
    enabled: true,
    last_run_at: new Date().toISOString(),
    last_success_at: new Date().toISOString(),
    last_error: null,
  },
]

// ---- 登入 / 使用者（記憶體內，重啟就重置） ----

const otpStore = new Map() // normalized phone -> { code, expiresAt, retryAvailableAt, attempts }
const usersByPhone = new Map() // normalized phone -> UserOut
const accessTokens = new Map() // token -> { userId, expiresAt }
const refreshTokens = new Map() // token -> { userId }

function normalizePhone(phone, countryCode) {
  if (phone.startsWith('+')) return phone
  if (countryCode === 'TW' && phone.startsWith('0')) return `+886${phone.slice(1)}`
  return phone
}

function maskPhone(phone) {
  if (phone.length <= 6) return phone
  return `${phone.slice(0, 4)}***${phone.slice(-3)}`
}

function findCountry(code) {
  return COUNTRIES.find((c) => c.code === code)
}

function findSubdivision(countryCode, subdivisionCode) {
  if (countryCode !== 'TW' || !subdivisionCode) return undefined
  return TW_SUBDIVISIONS.find((s) => s.code === subdivisionCode)
}

function formatLocation(countryName, subdivisionName, locality) {
  return [countryName, subdivisionName, locality].filter(Boolean).join(' ')
}

function buildLocation(countryCode, overrides = {}) {
  const country = findCountry(countryCode) ?? COUNTRIES[0]
  const subdivision = findSubdivision(country.code, overrides.subdivision_code)
  const countryName = country.name
  const subdivisionName = subdivision?.name ?? null
  const locality = overrides.locality ?? null
  return {
    country_code: country.code,
    country_name: countryName,
    subdivision_code: subdivision?.code ?? null,
    subdivision_name: subdivisionName,
    locality,
    address_line: overrides.address_line ?? null,
    postal_code: overrides.postal_code ?? null,
    latitude: overrides.latitude ?? null,
    longitude: overrides.longitude ?? null,
    timezone: overrides.timezone ?? country.default_timezone,
    visibility: overrides.visibility ?? 'region',
    updated_at: overrides.hasData ? new Date().toISOString() : null,
    formatted: formatLocation(countryName, subdivisionName, locality),
  }
}

function issueTokens(user) {
  const accessToken = `access-${randomUUID()}`
  const refreshToken = `refresh-${randomUUID()}`
  accessTokens.set(accessToken, { userId: user.id, expiresAt: Date.now() + ACCESS_TTL_SECONDS * 1000 })
  refreshTokens.set(refreshToken, { userId: user.id })
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TTL_SECONDS,
  }
}

function findUserById(userId) {
  for (const user of usersByPhone.values()) {
    if (user.id === userId) return user
  }
  return undefined
}

function userFromAuthHeader(req) {
  const header = req.headers.authorization
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null
  const entry = accessTokens.get(header.slice('Bearer '.length))
  if (!entry || entry.expiresAt < Date.now()) return null
  return findUserById(entry.userId) ?? null
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => {
      try {
        resolve(data.length > 0 ? JSON.parse(data) : {})
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })
}

const CATEGORY_BASE_PRICE = {
  vegetable: 25,
  fruit: 55,
  grain: 30,
  flower: 60,
  livestock: 180,
  fishery: 120,
  other: 40,
}

// ---- 確定性亂數（同樣輸入永遠拿到同樣的價格序列，方便截圖/開發） ----

function seedFromString(str) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822519)
    h = Math.imul(h ^ (h >>> 13), 3266489917)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
}

function dateNDaysAgo(n) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

function round2(n) {
  return Math.round(n * 100) / 100
}

/** 對一個 (product, market) 組合，產生過去 `days` 天的價格隨機漫步序列。 */
function generateSeries(product, market, days) {
  const rand = seedFromString(`${product.slug}:${market.id}`)
  const base = CATEGORY_BASE_PRICE[product.category] ?? 30
  let avg = base * (0.85 + rand() * 0.3)
  const points = []
  for (let i = days - 1; i >= 0; i--) {
    avg = Math.max(base * 0.4, avg + (rand() - 0.5) * base * 0.06)
    const spread = avg * (0.1 + rand() * 0.15)
    points.push({
      d: dateNDaysAgo(i),
      avg: round2(avg),
      high: round2(avg + spread),
      low: round2(Math.max(0.1, avg - spread)),
      vol: round2(500 + rand() * 1500),
    })
  }
  return points
}

function officialPriceOut(product, market, point) {
  return {
    market_id: market.id,
    market_name: market.name,
    region: market.region,
    country_code: market.country_code,
    source_key: market.source_key,
    trade_date: point.d,
    currency: 'TWD',
    unit: product.default_unit,
    grade: null,
    price_avg: point.avg.toFixed(2),
    price_high: point.high.toFixed(2),
    price_low: point.low.toFixed(2),
    volume: point.vol.toFixed(3),
    volume_unit: product.default_unit,
  }
}

function resolveProduct(ref) {
  return PRODUCTS.find((p) => p.id === ref || p.slug === ref)
}

function toProductOut(product, locale) {
  const name = product.names[locale] ?? product.names['zh-Hant'] ?? Object.values(product.names)[0]
  return {
    id: product.id,
    slug: product.slug,
    name,
    category: product.category,
    default_unit: product.default_unit,
    image_url: product.image_url,
  }
}

// ---- 民間報價（記憶體內，重啟就重置） ----

const quotesStore = new Map() // id -> 內部報價紀錄（含 contactPhonePublic/seller 等欄位）

function quoteToOut(quote, viewerUserId) {
  const isOwner = viewerUserId !== undefined && viewerUserId === quote.seller.id
  const showFullPhone = isOwner || quote.contactPhonePublic
  return {
    id: quote.id,
    product: quote.product,
    side: quote.side,
    status: quote.status,
    price: quote.price,
    currency: quote.currency,
    unit: quote.unit,
    grade: quote.grade,
    quantity: quote.quantity,
    min_order: quote.min_order,
    country_code: quote.country_code,
    region: quote.region,
    location_text: quote.location_text,
    market_id: quote.market_id,
    note: quote.note,
    seller: {
      id: quote.seller.id,
      display_name: quote.seller.display_name,
      business_name: quote.seller.business_name,
      role: quote.seller.role,
      region: quote.seller.region,
      phone: showFullPhone ? quote.seller.phone : maskPhone(quote.seller.phone),
      phone_is_masked: !showFullPhone,
    },
    created_at: quote.created_at,
    valid_until: quote.valid_until,
  }
}

/** overview.quotes 摘要：對真正存在的有效報價即時聚合，不是假資料。 */
function computeQuotesSummary(product) {
  const active = [...quotesStore.values()].filter(
    (q) => q.status === 'active' && q.product.id === product.id,
  )
  if (active.length === 0) {
    // 對齊真後端實測行為：count 為 0 時 currency/unit 也是 null
    return { count: 0, price_min: null, price_max: null, price_avg: null, currency: null, unit: null }
  }
  const prices = active.map((q) => Number(q.price))
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length
  return {
    count: active.length,
    price_min: round2(min).toFixed(2),
    price_max: round2(max).toFixed(2),
    price_avg: round2(avg).toFixed(2),
    currency: active[0].currency,
    unit: active[0].unit,
  }
}

// ---- HTTP 工具 ----

function sendJson(res, status, body) {
  const text = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
  })
  res.end(text)
}

function sendError(res, status, code, message, details) {
  sendJson(res, status, { error: { code, message, ...(details !== undefined ? { details } : {}) } })
}

function paginate(items, url) {
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? 20)))
  const offset = Math.max(0, Number(url.searchParams.get('offset') ?? 0))
  const page = items.slice(offset, offset + limit)
  return { items: page, total: items.length, limit, offset, has_more: offset + page.length < items.length }
}

const server = createServer((req, res) => {
  void handleRequest(req, res)
})

async function handleRequest(req, res) {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  const path = url.pathname
  const locale = url.searchParams.get('locale') ?? 'zh-Hant'

  // ---- 登入 / 使用者 ----

  if (req.method === 'POST' && path === '/v1/auth/otp/request') {
    const body = await readBody(req)
    const phone = normalizePhone(String(body.phone ?? ''), body.country_code)
    const code = '123456' // mock 固定驗證碼，方便開發時直接看 debug_code 帶入
    const expiresAt = Date.now() + OTP_TTL_MS
    otpStore.set(phone, {
      code,
      expiresAt,
      retryAvailableAt: Date.now() + OTP_RETRY_AFTER_SECONDS * 1000,
      attempts: 0,
    })
    sendJson(res, 202, {
      phone: maskPhone(phone),
      expires_at: new Date(expiresAt).toISOString(),
      retry_after: OTP_RETRY_AFTER_SECONDS,
      is_registered: usersByPhone.has(phone),
      debug_code: code,
    })
    return
  }

  if (req.method === 'POST' && path === '/v1/auth/otp/verify') {
    const body = await readBody(req)
    const phone = normalizePhone(String(body.phone ?? ''), body.country_code)
    const entry = otpStore.get(phone)
    if (!entry) return sendError(res, 401, 'otp_not_found', '尚未索取驗證碼')
    if (entry.expiresAt < Date.now()) return sendError(res, 401, 'otp_expired', '驗證碼已過期')
    if (entry.code !== body.code) {
      entry.attempts += 1
      return sendError(res, 401, 'otp_invalid', '驗證碼錯誤', { attempts_remaining: Math.max(0, 5 - entry.attempts) })
    }

    let user = usersByPhone.get(phone)
    const isNewUser = user === undefined
    if (isNewUser) {
      // role_required 這個檢查刻意排在驗證碼比對「之後」但消耗「之前」，
      // 補上 role 用同一組碼直接重試即可，不用重新收簡訊
      if (body.role === undefined) return sendError(res, 400, 'role_required', '註冊時必須選擇身分：consumer（消費者）/ farmer（小農）/ trader（盤商）')
      const countryCode = body.country_code ?? 'TW'
      user = {
        id: randomUUID(),
        phone,
        role: body.role,
        display_name: body.display_name ?? null,
        business_name: null,
        bio: null,
        avatar_url: null,
        website_url: null,
        country_code: countryCode,
        locale: 'zh-Hant',
        preferred_currency: null,
        unit_system: null,
        currency: findCountry(countryCode)?.currency ?? 'TWD',
        effective_unit_system: findCountry(countryCode)?.unit_system ?? 'metric',
        timezone: null,
        location: buildLocation(countryCode),
        has_location: false,
        contact_phone_public: true,
        is_active: true,
        can_quote: body.role === 'farmer' || body.role === 'trader',
        created_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
      }
      usersByPhone.set(phone, user)
    } else {
      user.last_login_at = new Date().toISOString()
    }
    otpStore.delete(phone)
    sendJson(res, 200, { ...issueTokens(user), user, is_new_user: isNewUser })
    return
  }

  if (req.method === 'POST' && path === '/v1/auth/refresh') {
    const body = await readBody(req)
    const entry = refreshTokens.get(body.refresh_token)
    if (!entry) return sendError(res, 401, 'invalid_refresh_token', 'refresh token 無效')
    refreshTokens.delete(body.refresh_token) // 旋轉：舊的立刻作廢
    const user = findUserById(entry.userId)
    if (!user) return sendError(res, 401, 'invalid_refresh_token', 'refresh token 無效')
    sendJson(res, 200, { ...issueTokens(user), user })
    return
  }

  if (req.method === 'POST' && path === '/v1/auth/logout') {
    const body = await readBody(req)
    if (typeof body.refresh_token === 'string') refreshTokens.delete(body.refresh_token)
    sendJson(res, 200, { ok: true, message: '已登出' })
    return
  }

  if (path === '/v1/me' && (req.method === 'GET' || req.method === 'PATCH')) {
    const user = userFromAuthHeader(req)
    if (!user) return sendError(res, 401, 'invalid_token', 'access token 無效或已過期')
    if (req.method === 'PATCH') {
      const body = await readBody(req)
      // role 不接受：身分在註冊時綁定，之後不可自行更改
      if (body.role !== undefined) {
        return sendError(res, 422, 'validation_error', 'Request validation failed', {
          fields: [{ loc: ['body', 'role'], msg: 'Extra inputs are not permitted' }],
        })
      }
      const editable = ['display_name', 'business_name', 'bio', 'avatar_url', 'website_url', 'locale', 'preferred_currency', 'unit_system', 'contact_phone_public']
      for (const field of editable) {
        if (body[field] !== undefined) user[field] = body[field]
      }
    }
    sendJson(res, 200, user)
    return
  }

  // ---- 位置 ----

  if (path === '/v1/me/location') {
    const user = userFromAuthHeader(req)
    if (!user) return sendError(res, 401, 'invalid_token', 'access token 無效或已過期')

    if (req.method === 'GET') {
      sendJson(res, 200, user.location)
      return
    }
    if (req.method === 'PUT') {
      const body = await readBody(req)
      if (typeof body.country_code !== 'string') {
        return sendError(res, 422, 'validation_error', 'Request validation failed', {
          fields: [{ loc: ['body', 'country_code'], msg: 'Field required' }],
        })
      }
      user.location = buildLocation(body.country_code, { ...body, hasData: true })
      user.has_location = true
      sendJson(res, 200, user)
      return
    }
    if (req.method === 'DELETE') {
      user.location = buildLocation(user.country_code)
      user.has_location = false
      sendJson(res, 200, user)
      return
    }
  }

  // ---- 地理資料 ----

  if (path === '/v1/geo/countries') {
    sendJson(res, 200, COUNTRIES)
    return
  }

  let geoMatch = path.match(/^\/v1\/geo\/countries\/([^/]+)\/subdivisions$/)
  if (geoMatch) {
    const country = findCountry(decodeURIComponent(geoMatch[1]).toUpperCase())
    sendJson(res, 200, country?.code === 'TW' ? TW_SUBDIVISIONS : [])
    return
  }

  geoMatch = path.match(/^\/v1\/geo\/countries\/([^/]+)$/)
  if (geoMatch) {
    const country = findCountry(decodeURIComponent(geoMatch[1]).toUpperCase())
    if (!country) return sendError(res, 404, 'not_found', '找不到此國家')
    sendJson(res, 200, country)
    return
  }

  // GET /v1/markets/regions
  if (path === '/v1/markets/regions') {
    const countryCode = url.searchParams.get('country_code')
    const counts = new Map()
    for (const mk of MARKETS) {
      if (countryCode && mk.country_code !== countryCode) continue
      if (!mk.region) continue
      counts.set(mk.region, (counts.get(mk.region) ?? 0) + 1)
    }
    const regions = [...counts.entries()]
      .map(([region, market_count]) => ({ region, market_count }))
      .sort((a, b) => b.market_count - a.market_count)
    sendJson(res, 200, regions)
    return
  }

  // ---- 民間報價 ----

  if (req.method === 'GET' && path === '/v1/me/quotes') {
    const user = userFromAuthHeader(req)
    if (!user) return sendError(res, 401, 'invalid_token', 'access token 無效或已過期')
    const list = [...quotesStore.values()]
      .filter((q) => q.seller.id === user.id)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    const page = paginate(list, url)
    sendJson(res, 200, { ...page, items: page.items.map((q) => quoteToOut(q, user.id)) })
    return
  }

  if (req.method === 'POST' && path === '/v1/quotes') {
    const user = userFromAuthHeader(req)
    if (!user) return sendError(res, 401, 'invalid_token', 'access token 無效或已過期')
    if (user.role !== 'farmer' && user.role !== 'trader') {
      return sendError(res, 403, 'role_cannot_quote', '身分不是小農/盤商，不能報價')
    }
    const body = await readBody(req)
    const product = resolveProduct(body.product_id)
    if (!product) return sendError(res, 404, 'product_not_found', '找不到此品項')
    const activeCount = [...quotesStore.values()].filter(
      (q) => q.seller.id === user.id && q.status === 'active',
    ).length
    if (activeCount >= 50) return sendError(res, 409, 'quote_limit_reached', '有效報價數已達上限')

    const id = randomUUID()
    const now = new Date()
    const validHours = body.valid_hours ?? 48
    const quote = {
      id,
      product: toProductOut(product, locale),
      side: body.side ?? 'sell',
      status: 'active',
      price: String(body.price),
      currency: body.currency ?? 'TWD',
      unit: body.unit ?? product.default_unit,
      grade: body.grade ?? null,
      quantity: body.quantity ?? null,
      min_order: body.min_order ?? null,
      country_code: body.country_code ?? user.country_code ?? 'TW',
      region: body.region ?? user.location?.subdivision_name ?? null,
      location_text: body.location_text ?? null,
      market_id: body.market_id ?? null,
      note: body.note ?? null,
      contactPhonePublic: body.contact_phone_public ?? user.contact_phone_public ?? true,
      seller: {
        id: user.id,
        display_name: user.display_name,
        business_name: user.business_name,
        role: user.role,
        region: user.location?.subdivision_name ?? null,
        phone: user.phone,
      },
      created_at: now.toISOString(),
      valid_until: validHours === 0 ? null : new Date(now.getTime() + validHours * 3_600_000).toISOString(),
    }
    quotesStore.set(id, quote)
    sendJson(res, 201, quoteToOut(quote, user.id))
    return
  }

  if (req.method === 'GET' && path === '/v1/quotes') {
    const viewer = userFromAuthHeader(req)
    let list = [...quotesStore.values()].filter((q) => q.status === 'active')
    const productId = url.searchParams.get('product_id')
    const side = url.searchParams.get('side')
    const role = url.searchParams.get('role')
    const countryCode = url.searchParams.get('country_code')
    const region = url.searchParams.get('region')
    const marketId = url.searchParams.get('market_id')
    if (productId) list = list.filter((q) => q.product.id === productId)
    if (side) list = list.filter((q) => q.side === side)
    if (role) list = list.filter((q) => q.seller.role === role)
    if (countryCode) list = list.filter((q) => q.country_code === countryCode)
    if (region) list = list.filter((q) => q.region === region)
    if (marketId) list = list.filter((q) => q.market_id === marketId)
    list.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    const page = paginate(list, url)
    sendJson(res, 200, { ...page, items: page.items.map((q) => quoteToOut(q, viewer?.id)) })
    return
  }

  const quoteMatch = path.match(/^\/v1\/quotes\/([^/]+)$/)
  if (quoteMatch) {
    const quote = quotesStore.get(decodeURIComponent(quoteMatch[1]))
    if (!quote) return sendError(res, 404, 'quote_not_found', '找不到此報價')

    if (req.method === 'GET') {
      const viewer = userFromAuthHeader(req)
      sendJson(res, 200, quoteToOut(quote, viewer?.id))
      return
    }

    if (req.method === 'PATCH' || req.method === 'DELETE') {
      const user = userFromAuthHeader(req)
      if (!user) return sendError(res, 401, 'invalid_token', 'access token 無效或已過期')
      if (quote.seller.id !== user.id) return sendError(res, 403, 'not_quote_owner', '只能修改自己的報價')

      if (req.method === 'DELETE') {
        quote.status = 'withdrawn'
        sendJson(res, 200, quoteToOut(quote, user.id))
        return
      }

      const body = await readBody(req)
      const reactivating = body.valid_hours !== undefined
      if ((quote.status === 'withdrawn' || quote.status === 'hidden') && !reactivating) {
        return sendError(res, 409, 'quote_not_editable', '已下架的報價不可修改')
      }
      const editable = [
        'price', 'unit', 'grade', 'quantity', 'min_order', 'market_id',
        'region', 'location_text', 'latitude', 'longitude', 'note',
      ]
      for (const field of editable) {
        if (body[field] !== undefined) quote[field] = body[field]
      }
      if (body.contact_phone_public !== undefined) quote.contactPhonePublic = body.contact_phone_public
      if (reactivating) {
        quote.status = 'active'
        quote.valid_until =
          body.valid_hours === 0 ? null : new Date(Date.now() + body.valid_hours * 3_600_000).toISOString()
      }
      sendJson(res, 200, quoteToOut(quote, user.id))
      return
    }
  }

  if (req.method !== 'GET') {
    sendError(res, 405, 'method_not_allowed', '此路徑目前只支援 GET')
    return
  }

  if (path === '/healthz') {
    sendJson(res, 200, {
      status: 'ok',
      environment: 'development',
      version: '0.1.0',
      database: 'ok',
      extensions_loaded: 1,
      extensions_failed: 0,
    })
    return
  }

  // GET /v1/products
  if (path === '/v1/products') {
    const q = url.searchParams.get('q')?.toLowerCase()
    const category = url.searchParams.get('category')
    let list = PRODUCTS.slice().sort((a, b) => b.popularity - a.popularity)
    if (category) list = list.filter((p) => p.category === category)
    if (q) {
      list = list.filter((p) =>
        Object.values(p.names).some((name) => name.toLowerCase().includes(q)) ||
        p.slug.includes(q),
      )
    }
    const page = paginate(list, url)
    sendJson(res, 200, { ...page, items: page.items.map((p) => toProductOut(p, locale)) })
    return
  }

  // GET /v1/products/{ref}/overview
  let m = path.match(/^\/v1\/products\/([^/]+)\/overview$/)
  if (m) {
    const product = resolveProduct(decodeURIComponent(m[1]))
    if (!product) return sendError(res, 404, 'product_not_found', '找不到此品項')
    const days = Math.min(365, Math.max(2, Number(url.searchParams.get('days') ?? 14)))
    const marketsLimit = Math.min(50, Math.max(1, Number(url.searchParams.get('markets_limit') ?? 10)))
    const countryCode = url.searchParams.get('country_code')
    const markets = MARKETS.filter((mk) => !countryCode || mk.country_code === countryCode).slice(0, marketsLimit)

    const official = markets.map((mk) => {
      const series = generateSeries(product, mk, days)
      return officialPriceOut(product, mk, series[series.length - 1])
    })

    let officialSeries = null
    if (markets.length > 0) {
      const perMarketSeries = markets.map((mk) => generateSeries(product, mk, days))
      const points = perMarketSeries[0].map((_, i) => {
        const dayPoints = perMarketSeries.map((s) => s[i])
        const avg = dayPoints.reduce((sum, p) => sum + p.avg, 0) / dayPoints.length
        const high = Math.max(...dayPoints.map((p) => p.high))
        const low = Math.min(...dayPoints.map((p) => p.low))
        const vol = dayPoints.reduce((sum, p) => sum + p.vol, 0)
        return { d: dayPoints[0].d, avg: round2(avg).toFixed(2), high: round2(high).toFixed(2), low: round2(low).toFixed(2), vol: round2(vol).toFixed(3) }
      })
      const last = points[points.length - 1]
      const prev = points[points.length - 2]
      const changePct = prev ? round2(((Number(last.avg) - Number(prev.avg)) / Number(prev.avg)) * 100) : null
      officialSeries = { product_id: product.id, market_id: null, currency: 'TWD', unit: product.default_unit, change_pct: changePct, points }
    }

    sendJson(res, 200, {
      product: toProductOut(product, locale),
      image: null,
      official,
      official_series: officialSeries,
      quotes: computeQuotesSummary(product),
      updated_at: new Date().toISOString(),
    })
    return
  }

  // GET /v1/products/{ref}/prices/official
  m = path.match(/^\/v1\/products\/([^/]+)\/prices\/official$/)
  if (m) {
    const product = resolveProduct(decodeURIComponent(m[1]))
    if (!product) return sendError(res, 404, 'product_not_found', '找不到此品項')
    const countryCode = url.searchParams.get('country_code')
    const marketId = url.searchParams.get('market_id')
    const markets = MARKETS.filter(
      (mk) => (!countryCode || mk.country_code === countryCode) && (!marketId || mk.id === marketId),
    )
    const items = markets.map((mk) => {
      const series = generateSeries(product, mk, 14)
      return officialPriceOut(product, mk, series[series.length - 1])
    })
    sendJson(res, 200, paginate(items, url))
    return
  }

  // GET /v1/products/{ref}/prices/series
  m = path.match(/^\/v1\/products\/([^/]+)\/prices\/series$/)
  if (m) {
    const product = resolveProduct(decodeURIComponent(m[1]))
    if (!product) return sendError(res, 404, 'product_not_found', '找不到此品項')
    const days = Math.min(365, Math.max(2, Number(url.searchParams.get('days') ?? 30)))
    const marketId = url.searchParams.get('market_id')
    const countryCode = url.searchParams.get('country_code')
    const markets = MARKETS.filter(
      (mk) => (!countryCode || mk.country_code === countryCode) && (!marketId || mk.id === marketId),
    )
    if (markets.length === 0) return sendError(res, 404, 'market_not_found', '找不到此市場')
    const perMarketSeries = markets.map((mk) => generateSeries(product, mk, days))
    const points = perMarketSeries[0].map((_, i) => {
      const dayPoints = perMarketSeries.map((s) => s[i])
      const avg = dayPoints.reduce((sum, p) => sum + p.avg, 0) / dayPoints.length
      const high = Math.max(...dayPoints.map((p) => p.high))
      const low = Math.min(...dayPoints.map((p) => p.low))
      const vol = dayPoints.reduce((sum, p) => sum + p.vol, 0)
      return { d: dayPoints[0].d, avg: round2(avg).toFixed(2), high: round2(high).toFixed(2), low: round2(low).toFixed(2), vol: round2(vol).toFixed(3) }
    })
    const last = points[points.length - 1]
    const prev = points[points.length - 2]
    const changePct = prev ? round2(((Number(last.avg) - Number(prev.avg)) / Number(prev.avg)) * 100) : null
    sendJson(res, 200, {
      product_id: product.id,
      market_id: marketId ?? null,
      currency: 'TWD',
      unit: product.default_unit,
      change_pct: changePct,
      points,
    })
    return
  }

  // GET /v1/products/{ref}/markets
  m = path.match(/^\/v1\/products\/([^/]+)\/markets$/)
  if (m) {
    const product = resolveProduct(decodeURIComponent(m[1]))
    if (!product) return sendError(res, 404, 'product_not_found', '找不到此品項')
    sendJson(res, 200, MARKETS)
    return
  }

  // GET /v1/products/{ref}
  m = path.match(/^\/v1\/products\/([^/]+)$/)
  if (m) {
    const product = resolveProduct(decodeURIComponent(m[1]))
    if (!product) return sendError(res, 404, 'product_not_found', '找不到此品項')
    sendJson(res, 200, {
      ...toProductOut(product, locale),
      names: Object.entries(product.names).map(([l, name], i) => ({ locale: l, name, is_primary: i === 0 })),
      popularity: product.popularity,
      image: null,
    })
    return
  }

  // GET /v1/markets/{id}
  m = path.match(/^\/v1\/markets\/([^/]+)$/)
  if (m) {
    const market = MARKETS.find((mk) => mk.id === decodeURIComponent(m[1]))
    if (!market) return sendError(res, 404, 'market_not_found', '找不到此市場')
    sendJson(res, 200, market)
    return
  }

  // GET /v1/markets
  if (path === '/v1/markets') {
    const countryCode = url.searchParams.get('country_code')
    const region = url.searchParams.get('region')
    const q = url.searchParams.get('q')?.toLowerCase()
    let list = MARKETS.slice()
    if (countryCode) list = list.filter((mk) => mk.country_code === countryCode)
    if (region) list = list.filter((mk) => mk.region === region)
    if (q) list = list.filter((mk) => mk.name.toLowerCase().includes(q) || mk.name_en?.toLowerCase().includes(q))
    sendJson(res, 200, paginate(list, url))
    return
  }

  // GET /v1/sources/{key}
  m = path.match(/^\/v1\/sources\/([^/]+)$/)
  if (m) {
    const source = SOURCES.find((s) => s.key === decodeURIComponent(m[1]))
    if (!source) return sendError(res, 404, 'unknown_source', '找不到此資料來源')
    sendJson(res, 200, source)
    return
  }

  // GET /v1/sources
  if (path === '/v1/sources') {
    sendJson(res, 200, { sources: SOURCES, load_errors: [] })
    return
  }

  sendError(res, 404, 'not_found', '找不到此路徑')
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[mock-server] http://127.0.0.1:${PORT}  (${PRODUCTS.length} products, ${MARKETS.length} markets)`)
})
