import { useNavigate } from 'react-router-dom'
import { ApiErrorNotice } from '../components/ApiErrorNotice'
import { ListView, type ListItem } from '../components/ListView'
import { Page } from '../components/Page'
import { Spinner } from '../components/Spinner'
import { getMarketRegions } from '../api/markets'
import { useApi } from '../hooks/useApi'
import { sameRegion } from '../lib/region'
import { readJSON, writeJSON } from '../lib/storage'

type WizardLast = { region?: string; season?: string }

/** 地區清單完全以後端 GET /v1/markets/regions 回傳的為準（含順序），前端不加國家篩選、不寫死。 */
export function RegionPickerPage() {
  const navigate = useNavigate()
  const last = readJSON<WizardLast>('wizard:last', {})
  const { data, loading, error, reload } = useApi(() => getMarketRegions(), [])

  const regions = data ?? []
  const items: ListItem[] = regions.map((r) => ({
    id: r.region,
    title: r.region,
    trailing: `${r.market_count} 個市場`,
  }))

  const initialIndex = Math.max(0, regions.findIndex((r) => sameRegion(r.region, last.region)))

  return (
    <Page title="選擇地區" flush softKeys={{ center: { label: '選擇' }, right: { label: '返回' } }}>
      <p className="wizard__hint">請選擇您所在或想查詢的地區</p>
      {error !== null && <ApiErrorNotice error={error} onRetry={reload} />}
      <ListView
        items={items}
        initialIndex={initialIndex}
        emptyText={loading ? '載入中…' : '目前沒有地區資料'}
        onSelect={(item) => {
          writeJSON('wizard:last', { ...last, region: item.id })
          navigate(`/wizard/season?region=${encodeURIComponent(item.id)}`)
        }}
      />
      {loading && regions.length === 0 && <Spinner />}
    </Page>
  )
}
