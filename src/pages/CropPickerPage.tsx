import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ApiErrorNotice } from '../components/ApiErrorNotice'
import type { ListItem } from '../components/ListView'
import { Page } from '../components/Page'
import { PagedListView } from '../components/PagedListView'
import { listProducts } from '../api/products'
import { listQuotes } from '../api/quotes'
import type { ProductOut, QuoteOut } from '../api/types'
import { getSeasonalCropSlugs } from '../data/seasonalCrops'
import { isSeason, seasonLabel } from '../data/seasons'
import { useApi } from '../hooks/useApi'
import { useT } from '../i18n'
import { PAGE_SIZE, pageCountOf } from '../lib/paging'

/** 一次抓齊該地區有資料的品項：後端上限 200，目前最大的地區也只有 130 項左右。 */
const REGION_LIMIT = 200

/**
 * 這個地區「真的有東西可看」的作物。
 *
 * 兩個來源都要算：
 * - `GET /products?region=…` 只回在該地**有官方行情**的品項（API.md 7.1）。
 * - 但小農／盤商可能在還沒有官方行情的作物上報價，那些也該出現，
 *   所以再把該地區的報價品項併進來。兩邊都沒有的作物就不列——
 *   點進去只會看到一片空白。
 */
async function loadRegionCrops(region: string, countryCode: string | null): Promise<ProductOut[]> {
  const [official, quotes] = await Promise.all([
    listProducts({ region, countryCode: countryCode ?? undefined, limit: REGION_LIMIT }),
    // 報價抓不到不該讓整頁掛掉，退成空清單就好
    listQuotes({ region, countryCode: countryCode ?? undefined, limit: REGION_LIMIT })
      .then((page) => page.items)
      .catch(() => [] as QuoteOut[]),
  ])

  const merged = new Map<string, ProductOut>()
  for (const product of official.items) merged.set(product.id, product)
  for (const quote of quotes) if (!merged.has(quote.product.id)) merged.set(quote.product.id, quote.product)
  return [...merged.values()]
}

/**
 * 某地區某一季的作物。清單一律先限縮到「這個地區有的作物」，
 * 再用靜態季節表篩一次；靜態表沒收錄這個地區時就全列（仍然只有該地區有的）。
 */
export function CropPickerPage() {
  const navigate = useNavigate()
  const t = useT()
  const [searchParams] = useSearchParams()
  const region = searchParams.get('region')
  const season = searchParams.get('season')
  // 地區名稱可能跨國撞名，地區清單本來就會回國碼，一路帶過來比對才準（API.md 7.9）
  const country = searchParams.get('country')

  // 換地區／季節時頁碼要歸零；同一個路由元件不會重掛，所以把來源一起記在 state 裡
  const sourceKey = `${region}:${country}:${season}`
  const [pageState, setPageState] = useState({ key: sourceKey, index: 0 })
  const pageIndex = pageState.key === sourceKey ? pageState.index : 0
  const setPageIndex = (index: number) => setPageState({ key: sourceKey, index })

  const { data, loading, error, reload } = useApi(
    () => (region === null ? Promise.resolve<ProductOut[]>([]) : loadRegionCrops(region, country)),
    [region, country],
  )

  useEffect(() => {
    if (region === null || season === null) navigate('/wizard/region', { replace: true })
  }, [region, season, navigate])

  if (region === null || season === null) return null

  const available = data ?? []
  // 靜態表查不到這個地區（例如後端新增了還沒維護的地區）就不做季節篩選
  const slugs = isSeason(season) ? getSeasonalCropSlugs(region, season) : null
  const crops = slugs === null ? available : available.filter((p) => slugs.includes(p.slug))

  const pageCount = pageCountOf(crops.length)
  const page = Math.min(pageIndex, pageCount - 1)
  const items: ListItem[] = crops.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((p) => ({
    id: p.slug,
    title: p.name,
    imageUrl: p.image_url,
  }))

  const emptyText = loading
    ? t('common.loading')
    : available.length === 0
      ? t('wizard.crop.emptyRegion')
      : t('wizard.crop.emptySeason')

  return (
    <Page
      title={t('wizard.crop.title', {
        region,
        season: seasonLabel(t, isSeason(season) ? season : 'spring'),
      })}
      flush
      softKeys={{ center: { label: t('common.select') }, right: { label: t('common.back') } }}
    >
      {error !== null && <ApiErrorNotice error={error} onRetry={reload} />}
      <PagedListView
        items={items}
        pageIndex={page}
        pageCount={pageCount}
        onPageChange={setPageIndex}
        loading={loading}
        emptyText={emptyText}
        loadingLabel={t('wizard.crop.loading')}
        onSelect={(item) =>
          navigate(`/products/${encodeURIComponent(item.id)}?region=${encodeURIComponent(region)}`)
        }
      />
    </Page>
  )
}
