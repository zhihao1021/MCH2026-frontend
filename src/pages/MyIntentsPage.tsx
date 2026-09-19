import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiErrorNotice } from '../components/ApiErrorNotice'
import { ListView, type ListItem } from '../components/ListView'
import { useOptionsMenu, type OptionItem } from '../components/OptionsMenu'
import { Page } from '../components/Page'
import { Spinner } from '../components/Spinner'
import { useToast } from '../components/Toast'
import { formatCurrency } from '../api/decimal'
import { getMyIntents, getMyReputation, withdrawIntent } from '../api/intents'
import type { IntentOut, ReputationOut } from '../api/types'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../hooks/useAuth'
import { useT } from '../i18n'
import { intentExclusionLabel, intentStatusLabel } from '../lib/labels'

const RETURN_TO = '/intents/mine'

type MyIntents = {
  items: IntentOut[]
  /** 信譽抓不到不該讓整頁掛掉，標題列少一個數字而已。 */
  reputation: ReputationOut | null
}

async function loadMyIntents(includeHistory: boolean): Promise<MyIntents> {
  const [page, reputation] = await Promise.all([
    getMyIntents({ includeHistory, limit: 50 }),
    getMyReputation().catch(() => null),
  ])
  return { items: page.items, reputation }
}

/**
 * 我的期望價（API.md 9.4）。單筆意向只有本人看得到，這裡就是唯一看得到自己出價的地方。
 * excluded_reason 只顯示使用者「能改善」的那幾種（低於底線、離群、區外、機房 IP）；
 * shadowed / zero_weight 不顯示——影子封禁的重點就是對方不知道。
 */
export function MyIntentsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const auth = useAuth()
  const t = useT()
  const [includeHistory, setIncludeHistory] = useState(false)
  const { data, loading, error, reload } = useApi(() => loadMyIntents(includeHistory), [includeHistory])
  const [selected, setSelected] = useState<IntentOut | null>(null)

  useEffect(() => {
    if (!auth.loading && auth.user === null) {
      navigate(`/login?returnTo=${encodeURIComponent(RETURN_TO)}`, { replace: true })
    }
  }, [auth.loading, auth.user, navigate])

  const withdraw = useCallback(
    async (intent: IntentOut) => {
      try {
        await withdrawIntent(intent.id)
        toast(t('myIntents.toast.withdrawn'))
        reload()
      } catch {
        toast(t('myIntents.toast.withdrawFailed'))
      }
    },
    [toast, reload, t],
  )

  const menuItems: OptionItem[] = [
    ...(selected === null
      ? []
      : [
          {
            id: 'view',
            label: t('myQuotes.menu.view'),
            onSelect: () => navigate(`/products/${selected.product.slug}?screen=intent`),
          },
          {
            id: 'update',
            label: t('myIntents.menu.update'),
            onSelect: () => navigate(`/products/${selected.product.slug}/intent`),
          },
          ...(selected.status === 'active'
            ? [{ id: 'withdraw', label: t('myIntents.menu.withdraw'), onSelect: () => void withdraw(selected) }]
            : []),
        ]),
    {
      id: 'history',
      label: includeHistory ? t('myIntents.menu.hideHistory') : t('myIntents.menu.showHistory'),
      onSelect: () => setIncludeHistory((v) => !v),
    },
  ]

  const menu = useOptionsMenu(t('myIntents.menu.title'), menuItems)

  if (auth.user === null) return null

  const items: ListItem[] = (data?.items ?? []).map((i) => {
    const exclusion = intentExclusionLabel(t, i.excluded_reason)
    return {
      id: i.id,
      title: i.product.name,
      subtitle: [i.region, intentStatusLabel(t, i.status), exclusion].filter((s) => s !== null).join('・'),
      trailing: `${formatCurrency(i.price, i.currency)} / ${i.unit}`,
    }
  })

  const reputation = data?.reputation ?? null

  return (
    <Page
      title={t('myIntents.title')}
      flush
      headerAside={
        reputation !== null ? (
          <span className="u-muted" aria-label={t('myIntents.reputation.aria')}>
            {t('myIntents.reputation.short', { weight: reputation.weight.toFixed(2) })}
          </span>
        ) : undefined
      }
      softKeys={{
        left: { label: t('common.options'), onPress: menu.open },
        center: { label: t('myQuotes.key.action') },
        right: { label: t('common.back') },
      }}
    >
      {error !== null && <ApiErrorNotice error={error} onRetry={reload} />}
      {reputation !== null && (
        <p className="u-muted myintents__reputation">
          {t('myIntents.reputation.line', {
            weight: reputation.weight.toFixed(2),
            hits: reputation.hits,
            misses: reputation.misses,
          })}
          {reputation.has_verified_purchase ? `・${t('myIntents.reputation.verified')}` : ''}
        </p>
      )}
      <ListView
        items={items}
        enabled={!menu.isOpen}
        emptyText={loading ? t('common.loading') : t('myIntents.empty')}
        onSelect={(item) => {
          setSelected(data?.items.find((i) => i.id === item.id) ?? null)
          menu.open()
        }}
      />
      {loading && data === null && <Spinner />}
      {menu.element}
    </Page>
  )
}
