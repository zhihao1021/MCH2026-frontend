import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ListItem } from '../components/ListView'
import { useOptionsMenu } from '../components/OptionsMenu'
import { Page } from '../components/Page'
import { PagedListView } from '../components/PagedListView'
import { Spinner } from '../components/Spinner'
import { useToast } from '../components/Toast'
import { formatCurrency } from '../api/decimal'
import type { FavoriteLatest, FavoriteOut } from '../api/types'
import { useAuth } from '../hooks/useAuth'
import { useFavorites } from '../hooks/useFavorites'
import { useT, type Translate } from '../i18n'
import { PAGE_SIZE, pageCountOf } from '../lib/paging'

const RETURN_TO = '/favorites'

/** 清單那一行的價格：後端已經算好漲跌，不用自己抓兩天相減。 */
function describeLatest(t: Translate, latest: FavoriteLatest | null): string {
  if (latest === null) return t('favorites.latest.none')
  const price = `${formatCurrency(latest.price_avg, latest.currency)} / ${latest.unit}`
  if (latest.change_pct === null) return price
  const arrow = latest.change_pct >= 0 ? '▲' : '▼'
  return `${price} ${arrow}${Math.abs(latest.change_pct).toFixed(1)}%`
}

/**
 * 收藏的作物。清單不分頁（上限 30 筆）且已附最新價，所以這裡只做前端切頁。
 *
 * 批次取消收藏用「選取模式」而不是長按或滑動：功能機只有方向鍵與 Enter，
 * 進入選取模式後 Enter 就是勾選／取消勾選，右軟鍵先退出選取模式再返回。
 */
export function FavoritesPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const auth = useAuth()
  const favorites = useFavorites()
  const t = useT()

  const [pageIndex, setPageIndex] = useState(0)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [batch, setBatch] = useState(false)
  const [selected, setSelected] = useState<string[]>([])

  const items = favorites.items
  const pageCount = pageCountOf(items.length)
  const page = Math.min(pageIndex, pageCount - 1)
  const pageItems = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const focused: FavoriteOut | undefined = pageItems[focusedIndex]

  const isSelected = (id: string) => selected.includes(id)
  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    )

  const leaveBatch = () => {
    setBatch(false)
    setSelected([])
  }

  const productsOf = (ids: string[]) =>
    items.filter((f) => ids.includes(f.product.id)).map((f) => f.product)

  const removeSelected = async () => {
    const targets = productsOf(selected)
    if (targets.length === 0) return
    const removed = await favorites.removeMany(targets)
    leaveBatch()
    toast(
      removed === targets.length
        ? t('favorites.toast.removedCount', { count: removed })
        : t('favorites.toast.removedPartial', { removed, failed: targets.length - removed }),
    )
  }

  const removeFocused = async () => {
    if (focused === undefined) return
    try {
      await favorites.remove(focused.product)
      toast(t('favorites.toast.removed', { name: focused.product.name }))
    } catch {
      toast(t('favorites.toast.removeFailed'))
    }
  }

  const confirmClear = useOptionsMenu(t('favorites.confirm.title'), [
    {
      id: 'yes',
      label: t('favorites.confirm.yes', { count: items.length }),
      onSelect: () => {
        void favorites.removeMany(items.map((f) => f.product)).then((removed) => {
          leaveBatch()
          toast(t('favorites.toast.removedCount', { count: removed }))
        })
      },
    },
    { id: 'no', label: t('common.cancel'), onSelect: () => undefined },
  ])

  const batchOptions = [
    {
      id: 'remove-selected',
      label: t('favorites.batch.removeSelected', { count: selected.length }),
      disabled: selected.length === 0,
      onSelect: () => void removeSelected(),
    },
    {
      id: 'select-all',
      label: t('favorites.batch.selectAll'),
      disabled: selected.length === items.length,
      onSelect: () => setSelected(items.map((f) => f.product.id)),
    },
    {
      id: 'clear-selection',
      label: t('favorites.batch.clearSelection'),
      disabled: selected.length === 0,
      onSelect: () => setSelected([]),
    },
    { id: 'exit', label: t('favorites.batch.exit'), onSelect: leaveBatch },
  ]

  const normalOptions = [
    {
      id: 'remove',
      label:
        focused !== undefined
          ? t('favorites.menu.remove', { name: focused.product.name })
          : t('favorites.menu.removeGeneric'),
      disabled: focused === undefined,
      onSelect: () => void removeFocused(),
    },
    {
      id: 'batch',
      label: t('favorites.menu.batch'),
      disabled: items.length === 0,
      onSelect: () => {
        setBatch(true)
        setSelected([])
      },
    },
    {
      id: 'clear',
      label: t('favorites.menu.clear'),
      disabled: items.length === 0,
      onSelect: confirmClear.open,
    },
    { id: 'reload', label: t('common.refresh'), onSelect: () => void favorites.reload() },
  ]

  const menu = useOptionsMenu(
    batch ? t('favorites.batch.title') : t('common.options'),
    batch ? batchOptions : normalOptions,
  )

  if (auth.loading) {
    return (
      <Page title={t('favorites.title')} softKeys={{ right: { label: t('common.back') } }}>
        <Spinner />
      </Page>
    )
  }

  if (auth.user === null) {
    return (
      <Page
        title={t('favorites.title')}
        softKeys={{
          center: {
            label: t('common.login'),
            onPress: () => navigate(`/login?returnTo=${encodeURIComponent(RETURN_TO)}`),
          },
          right: { label: t('common.back') },
        }}
      >
        <div className="prose">
          <p>{t('favorites.login.line1')}</p>
          <p className="u-muted">{t('favorites.login.line2')}</p>
        </div>
      </Page>
    )
  }

  const rows: ListItem[] = pageItems.map((f) => ({
    id: f.product.id,
    title: f.product.name,
    subtitle: describeLatest(t, f.latest),
    imageUrl: f.product.image_url,
    trailing: batch ? (isSelected(f.product.id) ? '✓' : '　') : undefined,
  }))

  return (
    <Page
      title={t('favorites.title')}
      flush
      headerAside={
        <span className="u-muted">
          {batch
            ? t('favorites.batch.count', { count: selected.length })
            : `${items.length}/${favorites.limit}`}
        </span>
      }
      softKeys={{
        left: { label: t('common.options'), onPress: menu.open },
        center: { label: batch ? t('favorites.key.select') : t('common.view') },
        // 選取模式下右軟鍵先退出選取，再按一次才是返回
        right: batch
          ? { label: t('common.done'), onPress: leaveBatch }
          : { label: t('common.back') },
      }}
    >
      <PagedListView
        items={rows}
        pageIndex={page}
        pageCount={pageCount}
        onPageChange={(next) => {
          setPageIndex(next)
          setFocusedIndex(0)
        }}
        loading={favorites.loading}
        enabled={!menu.isOpen && !confirmClear.isOpen}
        emptyText={favorites.loading ? t('common.loading') : t('favorites.empty')}
        loadingLabel={t('favorites.loading')}
        onFocusChange={(_, index) => setFocusedIndex(index)}
        onSelect={(item) => {
          const favorite = pageItems.find((f) => f.product.id === item.id)
          if (favorite === undefined) return
          if (batch) {
            toggle(favorite.product.id)
            return
          }
          navigate(`/products/${encodeURIComponent(favorite.product.slug)}`)
        }}
      />
      {items.length === 0 && !favorites.loading && (
        <p className="wizard__hint">{t('favorites.hint')}</p>
      )}
      {menu.element}
      {confirmClear.element}
    </Page>
  )
}
