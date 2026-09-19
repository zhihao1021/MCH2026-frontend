import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiErrorNotice } from '../components/ApiErrorNotice'
import { ListView, type ListItem } from '../components/ListView'
import { Page } from '../components/Page'
import { Spinner } from '../components/Spinner'
import { formatCurrency } from '../api/decimal'
import { listNotifications } from '../api/intents'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../hooks/useAuth'
import { useT } from '../i18n'

const RETURN_TO = '/notifications'

/**
 * 產地開團通知清單（API.md 9.5）。這裡只列，不回報已讀——
 * 「已讀」是進到單筆通知（NotificationDetailPage）那一刻才算，
 * 掃過清單不代表看過內容。
 */
export function NotificationsPage() {
  const navigate = useNavigate()
  const auth = useAuth()
  const t = useT()
  const { data, loading, error, reload } = useApi(() => listNotifications({ limit: 50 }), [])

  useEffect(() => {
    if (!auth.loading && auth.user === null) {
      navigate(`/login?returnTo=${encodeURIComponent(RETURN_TO)}`, { replace: true })
    }
  }, [auth.loading, auth.user, navigate])

  if (auth.user === null) return null

  const items: ListItem[] = (data?.items ?? []).map((n) => ({
    id: n.id,
    // 未讀的加個點：功能機沒有粗體可靠，直接用符號
    title: `${n.opened_at === null ? '● ' : ''}${n.product.name}`,
    subtitle:
      n.intent_price !== null
        ? t('notifications.row.withIntent', {
            offer: formatCurrency(n.offer_price, n.currency),
            intent: formatCurrency(n.intent_price, n.currency),
            unit: n.unit,
          })
        : t('notifications.row.offerOnly', { offer: formatCurrency(n.offer_price, n.currency), unit: n.unit }),
  }))

  return (
    <Page
      title={t('notifications.title')}
      flush
      softKeys={{ center: { label: t('common.open') }, right: { label: t('common.back') } }}
    >
      {error !== null && <ApiErrorNotice error={error} onRetry={reload} />}
      <ListView
        items={items}
        emptyText={loading ? t('common.loading') : t('notifications.empty')}
        onSelect={(item) => navigate(`/notifications/${encodeURIComponent(item.id)}`)}
      />
      {loading && data === null && <Spinner />}
    </Page>
  )
}
