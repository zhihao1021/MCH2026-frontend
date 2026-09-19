import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiErrorNotice } from '../components/ApiErrorNotice'
import { Deck, type DeckScreen } from '../components/Deck'
import { ListView, type ListItem } from '../components/ListView'
import { MarqueeText } from '../components/MarqueeText'
import { MiniMap } from '../components/MiniMap'
import { Page } from '../components/Page'
import { Spinner } from '../components/Spinner'
import { formatCurrency } from '../api/decimal'
import { fetchRoute } from '../api/routing'
import type { LocationPrecision, PublicUserOut, QuoteOut } from '../api/types'
import { getPublicUser, getPublicUserQuotes } from '../api/users'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../hooks/useAuth'
import { useT, type MessageKey, type Translate } from '../i18n'
import { getScreenClass, type ScreenClass } from '../lib/device'
import {
  bearingDeg,
  compassLabel,
  coordsOf,
  distanceKm,
  formatDistance,
  formatDuration,
  type Coords,
} from '../lib/distance'
import { intlLocale } from '../i18n/locale'
import { roleLabel } from '../lib/labels'
import { sideShortLabel } from '../lib/quoteSide'
import { PAGE_SIZE } from '../lib/paging'
import { readJSON } from '../lib/storage'

type PublicProfile = { user: PublicUserOut; quotes: QuoteOut[] }

/**
 * 地圖尺寸依螢幕級距寫死：Cloud Phone 不會轉向，也沒有視窗縮放。
 * 高度是「扣掉翻頁列、內距與下面那幾行字之後剩下的空間」——
 * 幕本身是 overflow:hidden，給太高會把距離那行字切掉。
 */
const MAP_SIZE: Record<ScreenClass, { width: number; height: number }> = {
  qqvga: { width: 104, height: 56 },
  qvga: { width: 212, height: 132 },
  large: { width: 300, height: 186 },
}

const PRECISION_NOTE: Record<LocationPrecision, MessageKey | null> = {
  exact: null,
  approximate_1km: 'map.note.approximate',
  hidden: null,
}

/** 地圖那一幕畫得出什麼，取決於「雙方」各自公開了多少。 */
type MapState =
  | { kind: 'ready'; me: Coords; them: Coords }
  | { kind: 'loading' }
  /** 對方沒公開座標——預設的 region 就是這樣，所以這是最常見的情況。 */
  | { kind: 'no-target' }
  | { kind: 'need-login' }
  | { kind: 'need-coords' }

function resolveMapState(
  me: Coords | null,
  them: Coords | null,
  authLoading: boolean,
  loggedIn: boolean,
): MapState {
  if (them === null) return { kind: 'no-target' }
  // auth 還在確認登入狀態時先不要下判斷，否則重新整理會先閃一格「請登入」
  if (authLoading) return { kind: 'loading' }
  if (!loggedIn) return { kind: 'need-login' }
  if (me === null) return { kind: 'need-coords' }
  return { kind: 'ready', me, them }
}

/** 為什麼現在看到的不是車程距離；一切正常（或根本沒差）時回 null。 */
function routeNote(
  dataSaver: boolean,
  requested: boolean,
  loading: boolean,
  failed: boolean,
  missing: boolean,
): MessageKey | null {
  if (dataSaver) return 'map.note.dataSaver'
  // 兩點近到不值得查路線，直線距離本身就夠準了，不用解釋
  if (!requested) return null
  if (loading) return 'map.note.routeLoading'
  if (failed) return 'map.note.routeFailed'
  if (missing) return 'map.note.routeMissing'
  return null
}

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

function displayName(t: Translate, user: PublicUserOut): string {
  return user.business_name ?? user.display_name ?? t('userProfile.unnamed')
}

type ScreenKind = 'profile' | 'quotes' | 'map'
type Screen = DeckScreen & { kind: ScreenKind }

/**
 * 別人的公開檔案（API.md 5）：第一幕是基本資料，中間每幕 5 筆是他目前有效的報價，
 * 選報價可跳到那個作物，最後一幕是他跟我的相對位置。
 * 不含電話——電話只在各筆報價的 seller 上決定要不要露出。
 */
export function UserProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const auth = useAuth()
  const t = useT()
  const { data, loading, error, reload } = useApi(() => loadProfile(id ?? ''), [id])

  const [screenState, setScreenState] = useState({ id, index: 0 })
  const screenIndex = screenState.id === id ? screenState.index : 0
  const setScreenIndex = (index: number) => setScreenState({ id, index })

  // 兩邊都有座標才算得出距離；對方預設只公開到縣市，所以 them 多半是 null
  const me = coordsOf(auth.user?.location)
  const them = coordsOf(data?.user.location)
  const mapState = resolveMapState(me, them, auth.loading, auth.user !== null)
  const km = mapState.kind === 'ready' ? distanceKm(mapState.me, mapState.them) : null

  // 省流量模式（設定頁）下連圖磚都不抓了，更不該為了一個數字多打一次外部服務
  const dataSaver = readJSON('settings', { dataSaver: false }).dataSaver
  // 近到 100 公尺內就別問路線了：對方的座標可能本來就模糊化到 1 公里，
  // 這時候「車程 0 公尺、約 1 分」只會比直線距離更沒意義
  const needsRoute = mapState.kind === 'ready' && !dataSaver && km !== null && km >= 0.1
  const routeFrom = needsRoute && mapState.kind === 'ready' ? mapState.me : null
  const routeTo = needsRoute && mapState.kind === 'ready' ? mapState.them : null
  /**
   * 車程距離是「錦上添花」：查得到就用，查不到就退回直線距離，
   * 所以這裡的 error 不會叫出 ApiErrorNotice，只在地圖那一幕寫一行說明。
   */
  const route = useApi(
    () => (routeFrom !== null && routeTo !== null ? fetchRoute(routeFrom, routeTo) : Promise.resolve(null)),
    [routeFrom?.latitude, routeFrom?.longitude, routeTo?.latitude, routeTo?.longitude],
  )
  const routed = route.data

  const screens: Screen[] = data === null ? [] : buildScreens(data)

  function buildScreens({ user, quotes }: PublicProfile): Screen[] {
    const profile: Screen = {
      kind: 'profile',
      label: t('userProfile.screen.profile'),
      body: (
        <>
          <p className="user-profile__name">{displayName(t, user)}</p>
          {user.business_name !== null && user.display_name !== null && (
            <p className="u-muted">{user.display_name}</p>
          )}
          {user.bio !== null && <MarqueeText text={user.bio} />}
          <dl>
            <dt>{t('userProfile.location')}</dt>
            <dd>{user.location.formatted}</dd>
            {km !== null && (
              <>
                <dt>
                  {routed !== null
                    ? t('userProfile.distance.route')
                    : t('userProfile.distance.straight')}
                </dt>
                <dd>
                  {routed !== null
                    ? t('userProfile.distance.route.value', {
                        distance: formatDistance(t, routed.distanceKm),
                        duration: formatDuration(t, routed.durationSec),
                      })
                    : formatDistance(t, km)}
                </dd>
              </>
            )}
            {user.website_url !== null && (
              <>
                <dt>{t('userProfile.website')}</dt>
                <dd>
                  <MarqueeText text={user.website_url} />
                </dd>
              </>
            )}
            <dt>{t('userProfile.activeQuotes')}</dt>
            <dd>
              {t(
                user.active_quote_count === 1
                  ? 'userProfile.activeQuotes.value.one'
                  : 'userProfile.activeQuotes.value.other',
                { count: user.active_quote_count },
              )}
            </dd>
            <dt>{t('userProfile.memberSince')}</dt>
            <dd>{new Date(user.member_since).toLocaleDateString(intlLocale())}</dd>
          </dl>
        </>
      ),
    }

    const quoteScreens: Screen[] = []
    for (let i = 0; i < quotes.length; i += PAGE_SIZE) {
      const rows: ListItem[] = quotes.slice(i, i + PAGE_SIZE).map((q) => ({
        id: q.id,
        title: q.product.name,
        subtitle: `${sideShortLabel(t, q.side)} ${formatCurrency(q.price, q.currency)} / ${q.unit}`,
        trailing: q.region ?? '',
        imageUrl: q.product.image_url,
      }))
      quoteScreens.push({
        kind: 'quotes',
        label: t('userProfile.screen.quotes'),
        body: (
          <>
            <h3>{t('userProfile.quotes.heading')}</h3>
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

    return [
      profile,
      ...quoteScreens,
      { kind: 'map', label: t('userProfile.screen.map'), body: mapBody(user) },
    ]
  }

  function mapBody(user: PublicUserOut) {
    if (mapState.kind === 'loading') return <Spinner />

    if (mapState.kind === 'no-target') {
      return (
        <>
          <h3>{t('userProfile.location')}</h3>
          <p>{user.location.formatted}</p>
          <p className="u-muted">{t('map.noTarget')}</p>
        </>
      )
    }

    if (mapState.kind === 'need-login') {
      return (
        <>
          <h3>{t('userProfile.location')}</h3>
          <p>{user.location.formatted}</p>
          <p className="u-muted">{t('map.needLogin')}</p>
        </>
      )
    }

    if (mapState.kind === 'need-coords') {
      return (
        <>
          <h3>{t('userProfile.location')}</h3>
          <p>{user.location.formatted}</p>
          <p className="u-muted">{t('map.needCoords')}</p>
        </>
      )
    }

    const straight = distanceKm(mapState.me, mapState.them)
    const bearing = bearingDeg(mapState.me, mapState.them)
    const compass = compassLabel(t, bearing)
    const screenClass = getScreenClass()
    const size = MAP_SIZE[screenClass]
    // 128x160 放不下兩行說明，距離與時間併成一行
    const compact = screenClass === 'qqvga'

    const summary =
      routed !== null
        ? t('map.summary.route', { distance: formatDistance(t, routed.distanceKm) })
        : formatDistance(t, straight)
    const caption =
      routed !== null
        ? t('map.caption.route', { duration: formatDuration(t, routed.durationSec), compass })
        : t('map.caption.straight', { compass, degrees: Math.round(bearing) % 360 })
    // 一次只擠得下一行附註，路線的狀態比座標精度重要（沒有路線時數字的意義不一樣）
    const note =
      routeNote(dataSaver, needsRoute, route.loading, route.error !== null, routed === null) ??
      PRECISION_NOTE[user.location.precision]

    return (
      <>
        <MiniMap
          from={mapState.me}
          to={mapState.them}
          path={routed?.path ?? []}
          width={size.width}
          height={size.height}
          schematic={dataSaver}
        />
        {compact ? (
          <p className="user-map__summary">
            {routed !== null
              ? t('map.compact.route', {
                  distance: summary,
                  duration: formatDuration(t, routed.durationSec),
                })
              : t('map.compact.straight', { distance: summary, compass })}
          </p>
        ) : (
          <>
            <p className="user-map__summary">{summary}</p>
            <p className="user-map__caption u-muted">{caption}</p>
            {note !== null && <p className="user-map__caption u-muted">{t(note)}</p>}
          </>
        )}
      </>
    )
  }

  const current = screens[Math.min(screenIndex, Math.max(0, screens.length - 1))]

  // 中央鍵跟著目前這一幕走：報價幕交給清單開作物，地圖幕缺什麼就帶去補什麼
  const centerKey = (() => {
    if (current?.kind === 'quotes') return { label: t('userProfile.key.viewCrop') }
    if (current?.kind === 'map') {
      if (mapState.kind === 'need-login') {
        return {
          label: t('common.login'),
          onPress: () => navigate(`/login?returnTo=${encodeURIComponent(`/users/${id ?? ''}`)}`),
        }
      }
      if (mapState.kind === 'need-coords') {
        return { label: t('map.key.setCoords'), onPress: () => navigate('/profile') }
      }
      return { label: '' }
    }
    if (screens.length > 1) return { label: t('userProfile.key.viewQuotes'), onPress: () => setScreenIndex(1) }
    return { label: '' }
  })()

  return (
    <Page
      title={data !== null ? displayName(t, data.user) : t('userProfile.title')}
      flush
      headerAside={
        data !== null ? (
          <span className="badge badge--role">{roleLabel(t, data.user.role)}</span>
        ) : undefined
      }
      softKeys={{ center: centerKey, right: { label: t('common.back') } }}
    >
      {loading && data === null && <Spinner />}
      {error !== null && <ApiErrorNotice error={error} onRetry={reload} />}
      {screens.length > 0 && <Deck screens={screens} index={screenIndex} onIndexChange={setScreenIndex} />}
    </Page>
  )
}
