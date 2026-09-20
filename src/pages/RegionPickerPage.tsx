import { useNavigate } from 'react-router-dom'
import { ApiErrorNotice } from '../components/ApiErrorNotice'
import { ListView, type ListItem } from '../components/ListView'
import { Page } from '../components/Page'
import { Spinner } from '../components/Spinner'
import { getMarketRegions } from '../api/markets'
import { useApi } from '../hooks/useApi'
import { useT } from '../i18n'
import { sameRegion } from '../lib/region'
import { readJSON, writeJSON } from '../lib/storage'

type WizardLast = { region?: string; country?: string; category?: string }

/** 地區清單完全以後端 GET /v1/markets/regions 回傳的為準（含順序），前端不加國家篩選、不寫死。 */
export function RegionPickerPage() {
  const navigate = useNavigate()
  const t = useT()
  const last = readJSON<WizardLast>('wizard:last', {})
  const { data, loading, error, reload } = useApi(() => getMarketRegions(), [])

  const regions = data ?? []
  // 同名地區可能分屬不同國家（API.md 7.9），清單跨國時把國碼一起標出來
  const multiCountry = new Set(regions.map((r) => r.country_code)).size > 1
  const items: ListItem[] = regions.map((r) => ({
    id: `${r.country_code}:${r.region}`,
    title: r.region,
    trailing: multiCountry
      ? `${r.country_code}・${r.market_count}`
      : t(r.market_count === 1 ? 'wizard.region.markets.one' : 'wizard.region.markets.other', {
          count: r.market_count,
        }),
  }))

  const initialIndex = Math.max(0, regions.findIndex((r) => sameRegion(r.region, last.region)))

  return (
    <Page
      title={t('wizard.region.title')}
      flush
      softKeys={{ center: { label: t('common.select') }, right: { label: t('common.back') } }}
    >
      <p className="wizard__hint">{t('wizard.region.hint')}</p>
      {error !== null && <ApiErrorNotice error={error} onRetry={reload} />}
      <ListView
        items={items}
        initialIndex={initialIndex}
        emptyText={loading ? t('common.loading') : t('wizard.region.empty')}
        onSelect={(_, index) => {
          const picked = regions[index]
          if (picked === undefined) return
          writeJSON('wizard:last', { ...last, region: picked.region, country: picked.country_code })
          navigate(
            `/wizard/category?region=${encodeURIComponent(picked.region)}&country=${encodeURIComponent(picked.country_code)}`,
          )
        }}
      />
      {loading && regions.length === 0 && <Spinner />}
    </Page>
  )
}
