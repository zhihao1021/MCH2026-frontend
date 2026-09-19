import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiErrorNotice } from '../components/ApiErrorNotice'
import { Deck, type DeckScreen } from '../components/Deck'
import { ListView, type ListItem } from '../components/ListView'
import { MarqueeText } from '../components/MarqueeText'
import { Page } from '../components/Page'
import { Spinner } from '../components/Spinner'
import { formatCurrency } from '../api/decimal'
import type { PublicUserOut, QuoteOut } from '../api/types'
import { getPublicUser, getPublicUserQuotes } from '../api/users'
import { useApi } from '../hooks/useApi'
import { roleLabel } from '../lib/labels'
import { PAGE_SIZE } from '../lib/paging'

type PublicProfile = { user: PublicUserOut; quotes: QuoteOut[] }

async function loadProfile(id: string): Promise<PublicProfile> {
  const [user, quotes] = await Promise.all([
    getPublicUser(id),
    // 報價清單抓不到不該擋住檔案本身
    getPublicUserQuotes(id, { limit: 50 })
      .then((page) => page.items)
      .catch(() => [] as QuoteOut[]),
  ])
  return { user, quotes }
}

function displayName(user: PublicUserOut): string {
  return user.business_name ?? user.display_name ?? '未具名使用者'
}

/**
 * 別人的公開檔案（API.md 5）：第一幕是基本資料，之後每幕 5 筆是他目前有效的報價，
 * 選報價可跳到那個作物。不含電話——電話只在各筆報價的 seller 上決定要不要露出。
 */
export function UserProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, loading, error, reload } = useApi(() => loadProfile(id ?? ''), [id])

  const [screenState, setScreenState] = useState({ id, index: 0 })
  const screenIndex = screenState.id === id ? screenState.index : 0
  const setScreenIndex = (index: number) => setScreenState({ id, index })

  const screens: DeckScreen[] = data === null ? [] : buildScreens(data)

  function buildScreens({ user, quotes }: PublicProfile): DeckScreen[] {
    const profile: DeckScreen = {
      label: '檔案',
      body: (
        <>
          <p className="user-profile__name">{displayName(user)}</p>
          {user.business_name !== null && user.display_name !== null && (
            <p className="u-muted">{user.display_name}</p>
          )}
          {user.bio !== null && <MarqueeText text={user.bio} />}
          <dl>
            <dt>所在地</dt>
            <dd>{user.location.formatted}</dd>
            {user.website_url !== null && (
              <>
                <dt>網站</dt>
                <dd>
                  <MarqueeText text={user.website_url} />
                </dd>
              </>
            )}
            <dt>有效報價</dt>
            <dd>{user.active_quote_count} 筆</dd>
            <dt>加入時間</dt>
            <dd>{new Date(user.member_since).toLocaleDateString('zh-Hant')}</dd>
          </dl>
        </>
      ),
    }

    const quoteScreens: DeckScreen[] = []
    for (let i = 0; i < quotes.length; i += PAGE_SIZE) {
      const rows: ListItem[] = quotes.slice(i, i + PAGE_SIZE).map((q) => ({
        id: q.id,
        title: q.product.name,
        subtitle: `${q.side === 'sell' ? '賣' : '收'} ${formatCurrency(q.price, q.currency)} / ${q.unit}`,
        trailing: q.region ?? '',
        imageUrl: q.product.image_url,
      }))
      quoteScreens.push({
        label: '報價',
        body: (
          <>
            <h3>目前有效的報價</h3>
            <div className="deck__list">
              <ListView
                items={rows}
                onSelect={(item) => {
                  const quote = quotes.find((q) => q.id === item.id)
                  if (quote !== undefined) navigate(`/products/${encodeURIComponent(quote.product.slug)}`)
                }}
              />
            </div>
          </>
        ),
      })
    }

    return [profile, ...quoteScreens]
  }

  const onQuotesScreen = screenIndex > 0 && screens.length > 1

  return (
    <Page
      title={data !== null ? displayName(data.user) : '使用者檔案'}
      flush
      headerAside={
        data !== null ? <span className="badge badge--role">{roleLabel(data.user.role)}</span> : undefined
      }
      softKeys={{
        center: onQuotesScreen
          ? { label: '看作物' }
          : screens.length > 1
            ? { label: '看報價', onPress: () => setScreenIndex(1) }
            : { label: '' },
        right: { label: '返回' },
      }}
    >
      {loading && data === null && <Spinner />}
      {error !== null && <ApiErrorNotice error={error} onRetry={reload} />}
      {screens.length > 0 && <Deck screens={screens} index={screenIndex} onIndexChange={setScreenIndex} />}
    </Page>
  )
}
