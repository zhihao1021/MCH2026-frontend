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
import { useT } from '../i18n'
import { quoteStatusLabel } from '../lib/labels'
import { sideShortLabel } from '../lib/quoteSide'

const RETURN_TO = '/quotes/mine'

export function MyQuotesPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const auth = useAuth()
  const t = useT()
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
        toast(t('myQuotes.toast.withdrawn'))
        reload()
      } catch {
        toast(t('myQuotes.toast.withdrawFailed'))
      }
    },
    [toast, reload, t],
  )

  const renew = useCallback(
    async (quote: QuoteOut) => {
      try {
        await patchQuote(quote.id, { valid_hours: 48 })
        toast(t('myQuotes.toast.renewed'))
        reload()
      } catch {
        toast(t('myQuotes.toast.renewFailed'))
      }
    },
    [toast, reload, t],
  )

  const menuItems: OptionItem[] =
    selected === null
      ? []
      : [
          {
            id: 'view',
            label: t('myQuotes.menu.view'),
            onSelect: () => navigate(`/products/${selected.product.slug}`),
          },
          ...(selected.status === 'active'
            ? [{ id: 'withdraw', label: t('myQuotes.menu.withdraw'), onSelect: () => void withdraw(selected) }]
            : selected.status === 'withdrawn' || selected.status === 'expired'
              ? [{ id: 'renew', label: t('myQuotes.menu.renew'), onSelect: () => void renew(selected) }]
              : []),
        ]

  const menu = useOptionsMenu(t('myQuotes.menu.title'), menuItems)

  if (auth.user === null) return null

  const items: ListItem[] = (data?.items ?? []).map((q) => ({
    id: q.id,
    title: q.product.name,
    subtitle: `${sideShortLabel(t, q.side)}・${quoteStatusLabel(t, q.status)}`,
    // 單位跟著這筆報價當初存的 q.unit，不是商品目前的 default_unit——
    // 商品單位之後如果變了，舊報價仍要照當時資料庫記錄的單位顯示。
    trailing: `${formatCurrency(q.price, q.currency)} / ${q.unit}`,
  }))

  return (
    <Page
      title={t('myQuotes.title')}
      flush
      softKeys={{
        left: { label: t('myQuotes.key.action'), onPress: menu.open },
        center: { label: t('myQuotes.key.action') },
        right: { label: t('common.back') },
      }}
    >
      {error !== null && <ApiErrorNotice error={error} onRetry={reload} />}
      <ListView
        items={items}
        enabled={!menu.isOpen}
        emptyText={loading ? t('common.loading') : t('myQuotes.empty')}
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
