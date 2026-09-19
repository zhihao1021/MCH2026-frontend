import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ApiErrorNotice } from '../components/ApiErrorNotice'
import { Deck, type DeckScreen } from '../components/Deck'
import { FreshnessBadge } from '../components/FreshnessBadge'
import { ListView, type ListItem } from '../components/ListView'
import { MarqueeText } from '../components/MarqueeText'
import { useOptionsMenu } from '../components/OptionsMenu'
import { Page } from '../components/Page'
import { PriceLineChart } from '../components/PriceLineChart'
import { QuoteRangeBar } from '../components/QuoteRangeBar'
import { RoleBadge } from '../components/RoleBadge'
import { Spinner } from '../components/Spinner'
import { getProductOverview } from '../api/products'
import { listQuotes } from '../api/quotes'
import { formatCurrency, parseDecimal, parseDecimalOrNull } from '../api/decimal'
import type { OverviewOut, QuoteOut } from '../api/types'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../hooks/useAuth'
import { categoryLabel, roleLabel } from '../lib/labels'
import { getSectionOrder, type ProductSectionKey } from '../lib/productSections'
import { sameRegion } from '../lib/region'

const DAYS = 14
// 報價那一幕上面還有範圍條，且每列兩行（名稱＋報價），QVGA 只放得下 3 列；
// 市場那一幕整幕都是單行清單，放 5 列
const QUOTERS_PER_SCREEN = 3
const MARKETS_PER_SCREEN = 5

type Detail = { overview: OverviewOut; quotes: QuoteOut[] }

async function loadDetail(ref: string): Promise<Detail> {
  const overview = await getProductOverview(ref, { days: DAYS })
  // 報價清單抓不到不該讓整頁掛掉，退成空清單就好
  const quotes = await listQuotes({ productId: overview.product.id, limit: 50 })
    .then((page) => page.items)
    .catch(() => [] as QuoteOut[])
  return { overview, quotes }
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
  // 從地區精靈進來時帶的 region：只拿來把該地區的市場排到前面，不做任何國家假設
  const region = searchParams.get('region')

  const { data, loading, error, reload } = useApi(() => loadDetail(ref ?? ''), [ref])

  // 換到別的作物時幕要回到第一幕；同一個路由元件不會重掛，所以把 ref 一起記在 state 裡
  const [screenState, setScreenState] = useState({ ref, index: 0 })
  const screenIndex = screenState.ref === ref ? screenState.index : 0
  const setScreenIndex = (index: number) => setScreenState({ ref, index })

  const quoteUrl = `/products/${encodeURIComponent(ref ?? '')}/quote`
  // 報價介面只給小農／盤商（後端算好的 can_quote）。還沒登入的人先給入口，
  // 進去會被導去登入；登入後若是消費者就完全不顯示。
  const canQuote = auth.user === null || auth.user.can_quote

  const menu = useOptionsMenu('選項', [
    { id: 'reload', label: '重新整理', onSelect: reload },
    ...(canQuote
      ? [
          { id: 'quote', label: '新增報價', onSelect: () => navigate(quoteUrl) },
          { id: 'my-quotes', label: '我的報價', onSelect: () => navigate('/quotes/mine') },
        ]
      : []),
    { id: 'all', label: '所有作物', onSelect: () => navigate('/products') },
  ])

  function buildScreens({ overview, quotes }: Detail): Screen[] {
    const { product, image, official, official_series: series } = overview
    const latestAvg = series?.points.at(-1)?.avg ?? official[0]?.price_avg ?? null
    const currency = series?.currency ?? official[0]?.currency ?? 'TWD'
    // 價格單位以資料庫回傳的為準：走勢 → 官方價 → 品項預設單位
    const unit = series?.unit ?? official[0]?.unit ?? product.default_unit
    const quoters = uniqueQuoters(quotes)
    // 市場的 region 是後端各市場自帶的欄位；選過地區就把同地區的市場排前面，其餘保持後端順序
    const markets =
      region === null
        ? official
        : [...official].sort(
            (a, b) => Number(sameRegion(b.region, region)) - Number(sameRegion(a.region, region)),
          )

    const byKind: Record<ProductSectionKey, Screen[]> = {
      fairPrice: [
        {
          kind: 'fairPrice',
          selectable: false,
          label: '均價',
          body: (
            <>
              {image !== null && (
                <div className="product-detail__hero">
                  <img src={image.url} alt={product.name} />
                  <p className="product-detail__image-credit">
                    圖片：
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
              <h3>公平價格（官方均價）</h3>
              {latestAvg !== null ? (
                <p className="product-detail__fair-price">
                  {formatCurrency(latestAvg, currency)} / {unit}
                </p>
              ) : (
                <p className="u-muted">暫無官方資料</p>
              )}
              <p className="u-muted">
                {categoryLabel(product.category)}・單位 {product.default_unit}
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
          label: '走勢',
          body: (
            <>
              <h3>歷史價格走勢（近 {DAYS} 天）</h3>
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
                <p className="u-muted">尚無走勢資料</p>
              )}
            </>
          ),
        },
      ],
      quotes: chunk(quoters, QUOTERS_PER_SCREEN).map((group) => {
        const rows: ListItem[] = group.map((q) => ({
          id: q.seller.id,
          title: q.seller.business_name ?? q.seller.display_name ?? '未具名使用者',
          subtitle: `${q.side === 'sell' ? '賣' : '收'} ${formatCurrency(q.price, q.currency)} / ${q.unit}${
            q.seller.region !== null ? `・${q.seller.region}` : ''
          }`,
          trailing: roleLabel(q.seller.role),
        }))
        return {
          kind: 'quotes',
          selectable: rows.length > 0,
          label: '報價',
          body: (
            <>
              <h3>使用者報價</h3>
              <QuoteRangeBar
                min={parseDecimalOrNull(overview.quotes.price_min) ?? 0}
                avg={parseDecimalOrNull(overview.quotes.price_avg) ?? 0}
                max={parseDecimalOrNull(overview.quotes.price_max) ?? 0}
                currency={overview.quotes.currency ?? currency}
                unit={overview.quotes.unit ?? product.default_unit}
                count={overview.quotes.count}
              />
              <div className="deck__list">
                <ListView
                  items={rows}
                  enabled={!menu.isOpen}
                  emptyText="還沒有人提交報價"
                  onSelect={(item) => navigate(`/users/${encodeURIComponent(item.id)}`)}
                />
              </div>
            </>
          ),
        }
      }),
      markets: chunk(markets, MARKETS_PER_SCREEN).map((group) => ({
        kind: 'markets',
        selectable: false,
        label: '市場',
        body: (
          <>
            <h3>各市場官方最新行情</h3>
            <div className="deck__list">
              {group.length === 0 ? (
                <p className="u-muted">目前沒有市場資料</p>
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
          </>
        ),
      })),
    }

    return getSectionOrder(auth.user?.role ?? null).flatMap((key) => byKind[key])
  }

  const screens: Screen[] = data === null ? [] : buildScreens(data)
  const current = screens[Math.min(screenIndex, Math.max(0, screens.length - 1))]

  return (
    <Page
      title={data?.overview.product.name ?? '作物詳情'}
      flush
      headerAside={data !== null ? <RoleBadge role={auth.user?.role ?? 'consumer'} /> : undefined}
      softKeys={{
        left: { label: '選項', onPress: menu.open },
        // 報價那一幕 Enter 交給清單開啟對方檔案；其他幕 Enter 直接去新增報價（消費者沒有這個鍵）
        center: current?.selectable
          ? { label: '查看' }
          : canQuote
            ? { label: '新增報價', onPress: () => navigate(quoteUrl) }
            : { label: '' },
        right: { label: '返回' },
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
