import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ApiErrorNotice } from '../components/ApiErrorNotice'
import type { ListItem } from '../components/ListView'
import { Page } from '../components/Page'
import { PagedListView } from '../components/PagedListView'
import { getProduct, listProducts } from '../api/products'
import type { ProductOut } from '../api/types'
import { getSeasonalCropSlugs, SEASONAL_CROPS_FALLBACK_LIMIT } from '../data/seasonalCrops'
import { isSeason, seasonLabel } from '../data/seasons'
import { useApi } from '../hooks/useApi'
import { PAGE_SIZE, pageCountOf } from '../lib/paging'

async function resolveCrops(region: string, season: string): Promise<ProductOut[]> {
  if (!isSeason(season)) return []
  const slugs = getSeasonalCropSlugs(region, season)
  if (slugs === null) {
    const page = await listProducts({ limit: SEASONAL_CROPS_FALLBACK_LIMIT })
    return page.items
  }
  // 沒有批次查詢端點，slugs 數量很小（單季 5 個），有限 fan-out 可接受。
  // 用 allSettled 而不是 all：靜態表裡的 slug 若已不在資料庫（404），
  // 只略過那一項，不能讓整頁掛掉——資料庫才是真相，靜態表只是篩選條件。
  const results = await Promise.allSettled(slugs.map((slug) => getProduct(slug)))
  return results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
}

/** 單季作物一次抓齊（最多 10 筆），分頁在前端切陣列。 */
export function CropPickerPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const region = searchParams.get('region')
  const season = searchParams.get('season')
  const [pageIndex, setPageIndex] = useState(0)
  const { data, loading, error, reload } = useApi(
    () => resolveCrops(region ?? '', season ?? ''),
    [region, season],
  )

  useEffect(() => {
    if (region === null || season === null) navigate('/wizard/region', { replace: true })
  }, [region, season, navigate])

  if (region === null || season === null) return null

  const all = data ?? []
  const pageCount = pageCountOf(all.length)
  const page = Math.min(pageIndex, pageCount - 1)
  const items: ListItem[] = all.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((p) => ({
    id: p.slug,
    title: p.name,
    imageUrl: p.image_url,
  }))

  return (
    <Page
      title={`${region} ${seasonLabel(isSeason(season) ? season : 'spring')}`}
      flush
      softKeys={{ center: { label: '選擇' }, right: { label: '返回' } }}
    >
      {error !== null && <ApiErrorNotice error={error} onRetry={reload} />}
      <PagedListView
        items={items}
        pageIndex={page}
        pageCount={pageCount}
        onPageChange={setPageIndex}
        loading={loading}
        emptyText={loading ? '載入中…' : '沒有符合的作物'}
        loadingLabel="載入作物清單中"
        onSelect={(item) =>
          navigate(`/products/${encodeURIComponent(item.id)}?region=${encodeURIComponent(region)}`)
        }
      />
    </Page>
  )
}
