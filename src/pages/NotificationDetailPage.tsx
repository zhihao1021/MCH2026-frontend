import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiErrorNotice } from '../components/ApiErrorNotice'
import { Page } from '../components/Page'
import { Spinner } from '../components/Spinner'
import { useToast } from '../components/Toast'
import { formatCurrency } from '../api/decimal'
import { listNotifications, respondNotification } from '../api/intents'
import type { NotificationOut } from '../api/types'
import { intlLocale } from '../i18n/locale'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../hooks/useAuth'
import { useT } from '../i18n'

/**
 * 沒有 GET /me/notifications/{id}，從清單裡撈這一筆（通知量小，一頁就拿得完）。
 * 找不到就當 notification_not_found 處理。
 */
async function findNotification(id: string): Promise<NotificationOut | null> {
  const page = await listNotifications({ limit: 50 })
  return page.items.find((n) => n.id === id) ?? null
}

/**
 * 單筆開團通知。一進來就回報「已讀」（clicked:false），
 * 按「前往購買」再回報一次 clicked:true——漏打會讓後端把人判成幽靈需求扣信譽（API.md 12-16）。
 */
export function NotificationDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const auth = useAuth()
  const t = useT()
  const { data, loading, error, reload } = useApi(() => findNotification(id ?? ''), [id])
  const [going, setGoing] = useState(false)
  const openedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!auth.loading && auth.user === null) {
      navigate(`/login?returnTo=${encodeURIComponent(`/notifications/${id ?? ''}`)}`, { replace: true })
    }
  }, [auth.loading, auth.user, navigate, id])

  // 已讀回報：每筆只打一次；已經 opened 過的不再打
  useEffect(() => {
    if (data === null || data.opened_at !== null || openedRef.current === data.id) return
    openedRef.current = data.id
    respondNotification(data.id, { clicked: false }).catch(() => {
      /* 已讀回報失敗不影響閱讀，下次進來會再試 */
    })
  }, [data])

  if (auth.user === null) return null

  const goBuy = async () => {
    if (data === null || going) return
    setGoing(true)
    try {
      await respondNotification(data.id, { clicked: true })
    } catch {
      toast(t('common.failed'))
    } finally {
      setGoing(false)
    }
    navigate(`/products/${encodeURIComponent(data.product.slug)}?screen=quotes`)
  }

  return (
    <Page
      title={t('notifications.detail.title')}
      softKeys={{
        center: data !== null ? { label: going ? t('common.loading') : t('notifications.key.buy'), onPress: () => void goBuy() } : undefined,
        right: { label: t('common.back') },
      }}
    >
      {loading && data === null && <Spinner />}
      {error !== null && <ApiErrorNotice error={error} onRetry={reload} />}
      {!loading && error === null && data === null && <p className="u-muted">{t('errors.notificationNotFound')}</p>}
      {data !== null && (
        <>
          <h3>{data.product.name}</h3>
          <p className="product-detail__fair-price">
            {formatCurrency(data.offer_price, data.currency)} / {data.unit}
          </p>
          {data.intent_price !== null && (
            <p className="u-muted">
              {t('notifications.detail.yourIntent', {
                price: formatCurrency(data.intent_price, data.currency),
                unit: data.unit,
              })}
            </p>
          )}
          <p className="u-muted">
            {t('notifications.detail.sentAt', { date: new Date(data.sent_at).toLocaleDateString(intlLocale()) })}
          </p>
          <p className="form__hint">{t('notifications.detail.hint')}</p>
        </>
      )}
    </Page>
  )
}
