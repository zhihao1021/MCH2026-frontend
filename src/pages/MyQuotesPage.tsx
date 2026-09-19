import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiErrorNotice } from '../components/ApiErrorNotice'
import { ListView, type ListItem } from '../components/ListView'
import { useOptionsMenu, type OptionItem } from '../components/OptionsMenu'
import { Page } from '../components/Page'
import { Spinner } from '../components/Spinner'
import { useToast } from '../components/Toast'
import { deleteQuote, getMyQuotes, patchQuote } from '../api/quotes'
import { formatCurrency } from '../api/decimal'
import type { QuoteOut } from '../api/types'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../hooks/useAuth'
import { quoteStatusLabel } from '../lib/labels'

const RETURN_TO = '/quotes/mine'

export function MyQuotesPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const auth = useAuth()
  const { data, loading, error, reload } = useApi(() => getMyQuotes({ limit: 50 }), [])
  const [selected, setSelected] = useState<QuoteOut | null>(null)

  useEffect(() => {
    if (!auth.loading && auth.user === null) {
      navigate(`/login?returnTo=${encodeURIComponent(RETURN_TO)}`, { replace: true })
    }
  }, [auth.loading, auth.user, navigate])

  const withdraw = useCallback(
    async (quote: QuoteOut) => {
      try {
        await deleteQuote(quote.id)
        toast('已下架')
        reload()
      } catch {
        toast('下架失敗，請稍後再試')
      }
    },
    [toast, reload],
  )

  const renew = useCallback(
    async (quote: QuoteOut) => {
      try {
        await patchQuote(quote.id, { valid_hours: 48 })
        toast('已重新上架')
        reload()
      } catch {
        toast('重新上架失敗，請稍後再試')
      }
    },
    [toast, reload],
  )

  const menuItems: OptionItem[] =
    selected === null
      ? []
      : [
          { id: 'view', label: '查看作物', onSelect: () => navigate(`/products/${selected.product.slug}`) },
          ...(selected.status === 'active'
            ? [{ id: 'withdraw', label: '下架', onSelect: () => void withdraw(selected) }]
            : selected.status === 'withdrawn' || selected.status === 'expired'
              ? [{ id: 'renew', label: '重新上架', onSelect: () => void renew(selected) }]
              : []),
        ]

  const menu = useOptionsMenu('報價操作', menuItems)

  if (auth.user === null) return null

  const items: ListItem[] = (data?.items ?? []).map((q) => ({
    id: q.id,
    title: q.product.name,
    subtitle: `${q.side === 'sell' ? '賣' : '收'}・${quoteStatusLabel(q.status)}`,
    // 單位跟著這筆報價當初存的 q.unit，不是商品目前的 default_unit——
    // 商品單位之後如果變了，舊報價仍要照當時資料庫記錄的單位顯示。
    trailing: `${formatCurrency(q.price, q.currency)} / ${q.unit}`,
  }))

  return (
    <Page
      title="我的報價"
      flush
      softKeys={{
        left: { label: '操作', onPress: menu.open },
        center: { label: '操作' },
        right: { label: '返回' },
      }}
    >
      {error !== null && <ApiErrorNotice error={error} onRetry={reload} />}
      <ListView
        items={items}
        enabled={!menu.isOpen}
        emptyText={loading ? '載入中…' : '目前沒有報價紀錄'}
        onSelect={(item) => {
          const quote = data?.items.find((q) => q.id === item.id) ?? null
          setSelected(quote)
          menu.open()
        }}
      />
      {loading && data === null && <Spinner />}
      {menu.element}
    </Page>
  )
}
