import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiErrorNotice } from '../components/ApiErrorNotice'
import type { ListItem } from '../components/ListView'
import { Page } from '../components/Page'
import { PagedListView } from '../components/PagedListView'
import { listProducts } from '../api/products'
import { useApi } from '../hooks/useApi'
import { useT } from '../i18n'
import { PAGE_SIZE, pageCountOf } from '../lib/paging'

/** 全部作物有 130+ 筆，交給後端分頁，每翻一頁抓一次。 */
export function ProductListPage() {
  const navigate = useNavigate()
  const t = useT()
  const [pageIndex, setPageIndex] = useState(0)

  const { data, loading, error, reload } = useApi(
    () => listProducts({ limit: PAGE_SIZE, offset: pageIndex * PAGE_SIZE }),
    [pageIndex],
  )

  const items: ListItem[] = (data?.items ?? []).map((p) => ({
    id: p.slug,
    title: p.name,
    imageUrl: p.image_url,
  }))

  return (
    <Page
      title={t('products.title')}
      flush
      softKeys={{ center: { label: t('common.select') }, right: { label: t('common.back') } }}
    >
      {error !== null && <ApiErrorNotice error={error} onRetry={reload} />}
      <PagedListView
        items={items}
        pageIndex={pageIndex}
        pageCount={pageCountOf(data?.total ?? 0)}
        onPageChange={setPageIndex}
        loading={loading}
        emptyText={loading ? t('common.loading') : t('products.empty')}
        onSelect={(item) => navigate(`/products/${encodeURIComponent(item.id)}`)}
      />
    </Page>
  )
}
