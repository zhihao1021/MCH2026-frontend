import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ApiErrorNotice } from '../components/ApiErrorNotice'
import { Deck, type DeckScreen } from '../components/Deck'
import { FreshnessBadge } from '../components/FreshnessBadge'
import { IntentBoard } from '../components/IntentBoard'
import { ListView, type ListItem } from '../components/ListView'
import { MarqueeText } from '../components/MarqueeText'
import { useOptionsMenu } from '../components/OptionsMenu'
import { Page } from '../components/Page'
import { PriceLineChart } from '../components/PriceLineChart'
import { QuoteRangeBar } from '../components/QuoteRangeBar'
import { RoleBadge } from '../components/RoleBadge'
import { Spinner } from '../components/Spinner'
import { useToast } from '../components/Toast'
import { ApiError } from '../api/client'
import { getIntentSummary } from '../api/intents'
import { getOfficialPrices, getProductOverview } from '../api/products'
import { listQuotes } from '../api/quotes'
import { formatCurrency, parseDecimal, parseDecimalOrNull } from '../api/decimal'
import type { IntentSummaryOut, OfficialPriceOut, OverviewOut, Page as ApiPage, QuoteOut } from '../api/types'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../hooks/useAuth'
import { useFavorites } from '../hooks/useFavorites'
import { useT } from '../i18n'
import { getScreenClass, type ScreenClass } from '../lib/device'
import { categoryLabel, roleLabel } from '../lib/labels'
import { sideShortLabel } from '../lib/quoteSide'
import { getSectionOrder, type ProductSectionKey } from '../lib/productSections'
import { sameRegion } from '../lib/region'

const DAYS = 14
/**
 * 報價那一幕上面還有範圍條，且每列兩行（名稱＋報價）；市場那一幕整幕都是單行清單。
 * 兩個都曾經寫死用 QVGA 的量（3 列／5 列），但 QQVGA（128x160）扣掉標題與範圍條後
 * 剩不到 15px，3 列兩行清單完全放不下——不是被截到一點，是整個清單都看不見。
 * 依螢幕級距分開給值，QQVGA 用小很多的量換取「至少看得到」。
 */
const QUOTERS_PER_SCREEN: Record<ScreenClass, number> = { qqvga: 1, qvga: 3, large: 5 }
const MARKETS_PER_SCREEN: Record<ScreenClass, number> = { qqvga: 2, qvga: 5, large: 8 }
/**
 * 市場清單走 /prices/official（分頁端點，上限 200）而不是 overview 的 official：
 * overview 的 markets_limit 預設只有 10 筆，但這一幕是翻頁顯示的，
 * 卡在 10 筆會讓第 11 個以後的市場永遠翻不到。
 */
const MARKETS_LIMIT = 200
const QUOTES_LIMIT = 50

type Detail = {
  overview: OverviewOut
  quotes: QuoteOut[]
  /** 抓不到時為 null，畫面退回 overview 附的那幾筆。 */
  markets: ApiPage<OfficialPriceOut> | null
}

async function loadDetail(ref: string): Promise<Detail> {
  const overview = await getProductOverview(ref, { days: DAYS })
  // 報價與市場清單抓不到都不該讓整頁掛掉，各自退成空的就好
  const [quotes, markets] = await Promise.all([
    listQuotes({ productId: overview.product.id, limit: QUOTES_LIMIT })
      .then((page) => page.items)
      .catch(() => [] as QuoteOut[]),
    getOfficialPrices(ref, { limit: MARKETS_LIMIT }).catch(() => null),
  ])
  return { overview, quotes, markets }
}

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out.length > 0 ? out : [[]]
}

/** 同一個使用者可能有多筆報價，「曾提交過報價的使用者」只列一次，帶最新那筆當摘要。 */
function uniqueQuoters(quotes: QuoteOut[]): QuoteOut[] {
  const seen = new Map<string, QuoteOut>()
  for (const q of quotes) if (!seen.has(q.seller.id)) seen.set(q.seller.id, q)
  return [...seen.values()]
}

type Screen = DeckScreen & { kind: ProductSectionKey; selectable: boolean }

/**
 * 作物價格頁改成翻頁式：左右鍵在「均價 / 走勢 / 報價 / 市場」之間切換，
 * 每一幕都塞得進一個畫面，不需要捲動。幕的順序仍依身分（productSections）。
 */
export function ProductDetailPage() {
  const { ref } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const auth = useAuth()
  const t = useT()
  // 從地區精靈進來時帶的 region：只拿來把該地區的市場排到前面，不做任何國家假設
  const region = searchParams.get('region')
  // 意向看板的區域：登入者用自己檔案上的行政區（意向就是歸到這裡），
  // 訪客退回精靈帶的 region。兩邊命名空間不一定一致（臺／台），後端會做正規化與退回全國
  const intentRegion = auth.user?.location.subdivision_name ?? region ?? undefined

  const { data, loading, error, reload } = useApi(() => loadDetail(ref ?? ''), [ref])
  // 意向看板另外抓：它的區域要等 auth 載完才知道，跟 overview 綁在一起會讓整頁重抓一次。
  // auth 還在載時先回 null（幾乎立刻 resolve），載完再真的打一次；抓不到那一幕顯示「暫無資料」
  const authLoading = auth.loading
  const { data: intent, reload: reloadIntent } = useApi<IntentSummaryOut | null>(
    () => (authLoading ? Promise.resolve(null) : getIntentSummary(ref ?? '', { region: intentRegion }).catch(() => null)),
    [ref, intentRegion, authLoading],
  )

  // 換到別的作物時幕要回到第一幕；同一個路由元件不會重掛，所以把 ref 一起記在 state 裡。
  // index -1 = 還沒翻過頁，用 ?screen= 決定起始幕（提完期望價回來直接落在意向看板）
  const wantedScreen = searchParams.get('screen')
  const [screenState, setScreenState] = useState({ ref, index: -1 })
  const setScreenIndex = (index: number) => setScreenState({ ref, index })
  // 報價幕的範圍條刻度跟著下方清單目前聚焦的那一筆走（參考 IntentGauge 的游標做法），
  // 一開始（或清單是空的）沒有聚焦目標，退回顯示平均價
  const [selectedQuotePrice, setSelectedQuotePrice] = useState<number | null>(null)

  const toast = useToast()
  const favorites = useFavorites()
  const product = data?.overview.product ?? null
  const favorited = product !== null && favorites.isFavorite(product.id)

  const toggleFavorite = async () => {
    if (product === null) return
    if (auth.user === null) {
      navigate(`/login?returnTo=${encodeURIComponent(`/products/${ref ?? ''}`)}`)
      return
    }
    try {
      if (favorited) {
        await favorites.remove(product)
        toast(t('detail.toast.unfavorited'))
      } else {
        await favorites.add(product)
        toast(t('detail.toast.favorited'))
      }
    } catch (err) {
      // 收藏有數量上限，這個錯誤要講清楚是幾項，不能只說「失敗」
      const limitReached = err instanceof ApiError && err.code === 'favorite_limit_reached'
      toast(
        limitReached
          ? t('detail.toast.limitReached', { limit: favorites.limit })
          : t('common.failed'),
      )
    }
  }

  const quoteUrl = `/products/${encodeURIComponent(ref ?? '')}/quote`
  const supermarketPriceUrl = `/products/${encodeURIComponent(ref ?? '')}/supermarket-price`
  const intentUrl = `/products/${encodeURIComponent(ref ?? '')}/intent`
  // 報價介面只給小農（後端算好的 can_quote）。還沒登入的人先給入口，
  // 進去會被導去登入；登入後若是消費者就完全不顯示。
  const canQuote = auth.user === null || auth.user.can_quote
  // 意向價任何登入者都能提，但小農是供給端不該自己喊需求價（見 IntentFormPage）；
  // 還沒登入的人先給入口，進去會被導去登入。
  const canIntent = auth.user === null || auth.user.role !== 'farmer'

  const menu = useOptionsMenu(t('common.options'), [
    {
      id: 'favorite',
      label: favorited ? t('detail.menu.unfavorite') : t('detail.menu.favorite'),
      disabled: product === null,
      onSelect: () => void toggleFavorite(),
    },
    { id: 'favorites', label: t('detail.menu.favorites'), onSelect: () => navigate('/favorites') },
    {
      id: 'reload',
      label: t('common.refresh'),
      onSelect: () => {
        reload()
        reloadIntent()
      },
    },
    ...(canIntent
      ? [
          { id: 'intent', label: t('detail.menu.newIntent'), onSelect: () => navigate(intentUrl) },
          ...(auth.user !== null
            ? [{ id: 'my-intents', label: t('detail.menu.myIntents'), onSelect: () => navigate('/intents/mine') }]
            : []),
        ]
      : []),
    ...(canQuote
      ? [
          { id: 'quote', label: t('detail.menu.newQuote'), onSelect: () => navigate(quoteUrl) },
          { id: 'my-quotes', label: t('detail.menu.myQuotes'), onSelect: () => navigate('/quotes/mine') },
        ]
      : []),
    // 零售價回報任何登入者都能用，不需要小農／盤商身分（API.md 10.2）
    {
      id: 'supermarket-price',
      label: t('detail.menu.newSupermarketPrice'),
      onSelect: () => navigate(supermarketPriceUrl),
    },
    { id: 'all', label: t('detail.menu.allProducts'), onSelect: () => navigate('/products') },
  ])

  function buildScreens({ overview, quotes, markets: marketPage }: Detail): Screen[] {
    const screenClass = getScreenClass()
    const { product, image, official, official_series: series } = overview
    const latestAvg = series?.points.at(-1)?.avg ?? official[0]?.price_avg ?? null
    const currency = series?.currency ?? official[0]?.currency ?? 'TWD'
    // 價格單位以資料庫回傳的為準：走勢 → 官方價 → 品項預設單位
    const unit = series?.unit ?? official[0]?.unit ?? product.default_unit
    const quoters = uniqueQuoters(quotes)
    const allMarkets = marketPage?.items ?? official
    // 超過 200 個市場的品項目前不存在，真的出現時至少要講出來，不能默默吃掉
    const hiddenMarkets = marketPage === null ? 0 : Math.max(0, marketPage.total - marketPage.items.length)
    // 市場的 region 是後端各市場自帶的欄位；選過地區就把同地區的市場排前面，其餘保持後端順序
    const markets =
      region === null
        ? allMarkets
        : [...allMarkets].sort(
            (a, b) => Number(sameRegion(b.region, region)) - Number(sameRegion(a.region, region)),
          )

    const byKind: Record<ProductSectionKey, Screen[]> = {
      fairPrice: [
        {
          kind: 'fairPrice',
          selectable: false,
          label: t('detail.screen.fairPrice'),
          body: (
            <>
              {image !== null && (
                <div className="product-detail__hero">
                  <img src={image.url} alt={product.name} />
                  <p className="product-detail__image-credit">
                    {t('detail.image.credit')}
                    {image.source_url !== null ? (
                      <a href={image.source_url} target="_blank" rel="noreferrer">
                        {image.source ?? 'Wikimedia Commons'}
                      </a>
                    ) : (
                      (image.source ?? 'Wikimedia Commons')
                    )}
                    {image.author !== null ? ` / ${image.author}` : ''}
                    {image.license !== null ? `（${image.license}）` : ''}
                  </p>
                </div>
              )}
              <h3>{t('detail.fairPrice.heading')}</h3>
              {latestAvg !== null ? (
                <p className="product-detail__fair-price">
                  {formatCurrency(latestAvg, currency)} / {unit}
                </p>
              ) : (
                <p className="u-muted">{t('detail.fairPrice.none')}</p>
              )}
              <p className="u-muted">
                {t('detail.meta', {
                  category: categoryLabel(t, product.category),
                  unit: product.default_unit,
                })}
              </p>
              <p>
                <FreshnessBadge updatedAt={overview.updated_at} />
              </p>
            </>
          ),
        },
      ],
      chart: [
        {
          kind: 'chart',
          selectable: false,
          label: t('detail.screen.chart'),
          body: (
            <>
              <h3>{t('detail.chart.heading', { days: DAYS })}</h3>
              {series !== null ? (
                <PriceLineChart
                  points={series.points.map((p) => ({
                    d: p.d,
                    avg: parseDecimal(p.avg),
                    high: parseDecimal(p.high),
                    low: parseDecimal(p.low),
                  }))}
                  currency={series.currency}
                  unit={series.unit}
                  changePct={series.change_pct}
                />
              ) : (
                <p className="u-muted">{t('detail.chart.none')}</p>
              )}
            </>
          ),
        },
      ],
      intent: [
        {
          kind: 'intent',
          selectable: false,
          label: t('detail.screen.intent'),
          body: (
            <>
              <h3>
                {intent?.region !== null && intent?.region !== undefined
                  ? t('detail.intent.headingRegion', { region: intent.region })
                  : t('detail.intent.heading')}
              </h3>
              {intent !== null ? <IntentBoard summary={intent} /> : <p className="u-muted">{t('detail.intent.unavailable')}</p>}
              <p className="u-muted">{t('detail.intent.hint')}</p>
            </>
          ),
        },
      ],
      quotes: chunk(quoters, QUOTERS_PER_SCREEN[screenClass]).map((group) => {
        const rows: ListItem[] = group.map((q) => ({
          id: q.seller.id,
          title: q.seller.business_name ?? q.seller.display_name ?? t('userProfile.unnamed'),
          subtitle: `${sideShortLabel(t, q.side)} ${formatCurrency(q.price, q.currency)} / ${q.unit}${
            q.seller.region !== null ? `・${q.seller.region}` : ''
          }`,
          trailing: roleLabel(t, q.seller.role),
        }))
        return {
          kind: 'quotes',
          selectable: rows.length > 0,
          label: t('detail.screen.quotes'),
          body: (
            <>
              <h3>{t('detail.quotes.heading')}</h3>
              <QuoteRangeBar
                min={parseDecimalOrNull(overview.quotes.price_min) ?? 0}
                avg={parseDecimalOrNull(overview.quotes.price_avg) ?? 0}
                max={parseDecimalOrNull(overview.quotes.price_max) ?? 0}
                currency={overview.quotes.currency ?? currency}
                unit={overview.quotes.unit ?? product.default_unit}
                count={overview.quotes.count}
                selected={selectedQuotePrice}
              />
              <div className="deck__list">
                <ListView
                  items={rows}
                  enabled={!menu.isOpen}
                  emptyText={t('detail.quotes.empty')}
                  onSelect={(item) => navigate(`/users/${encodeURIComponent(item.id)}`)}
                  onFocusChange={(_, index) => setSelectedQuotePrice(parseDecimalOrNull(group[index]?.price))}
                />
              </div>
            </>
          ),
        }
      }),
      markets: chunk(markets, MARKETS_PER_SCREEN[screenClass]).map((group, i, groups) => ({
        kind: 'markets',
        selectable: false,
        label: t('detail.screen.markets'),
        body: (
          <>
            <h3>{t('detail.markets.heading')}</h3>
            <div className="deck__list">
              {group.length === 0 ? (
                <p className="u-muted">{t('detail.markets.empty')}</p>
              ) : (
                <ul className="product-detail__markets">
                  {group.map((o) => (
                    <li key={o.market_id}>
                      <MarqueeText text={`${o.market_name}（${o.region}）`} />
                      <span>
                        {formatCurrency(o.price_avg, o.currency)} / {o.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {i === groups.length - 1 && hiddenMarkets > 0 && (
              <p className="u-muted">{t('detail.markets.more', { count: hiddenMarkets })}</p>
            )}
          </>
        ),
      })),
    }

    return getSectionOrder(auth.user?.role ?? null).flatMap((key) => byKind[key])
  }

  const screens: Screen[] = data === null ? [] : buildScreens(data)
  const wantedIndex = wantedScreen === null ? -1 : screens.findIndex((s) => s.kind === wantedScreen)
  const screenIndex =
    screenState.ref === ref && screenState.index >= 0 ? screenState.index : Math.max(0, wantedIndex)
  const current = screens[Math.min(screenIndex, Math.max(0, screens.length - 1))]

  return (
    <Page
      title={data?.overview.product.name ?? t('detail.title')}
      flush
      headerAside={
        data !== null ? (
          <>
            {favorited && (
              <span className="badge" aria-label={t('detail.favorited.aria')}>
                ★
              </span>
            )}
            <RoleBadge role={auth.user?.role ?? 'consumer'} />
          </>
        ) : undefined
      }
      softKeys={{
        left: { label: t('common.options'), onPress: menu.open },
        // 報價那一幕 Enter 交給清單開啟對方檔案；意向看板那一幕 Enter 去提期望價（誰都能）；
        // 其他幕 Enter 直接去新增報價（消費者沒有這個鍵）
        center: current?.selectable
          ? { label: t('common.view') }
          : current?.kind === 'intent'
            ? { label: t('detail.menu.newIntent'), onPress: () => navigate(intentUrl) }
            : canQuote
              ? { label: t('detail.menu.newQuote'), onPress: () => navigate(quoteUrl) }
              : { label: '' },
        right: { label: t('common.back') },
      }}
    >
      {loading && data === null && <Spinner />}
      {error !== null && <ApiErrorNotice error={error} onRetry={reload} />}
      {screens.length > 0 && (
        <Deck
          screens={screens}
          index={screenIndex}
          onIndexChange={setScreenIndex}
          enabled={!menu.isOpen}
        />
      )}
      {menu.element}
    </Page>
  )
}
