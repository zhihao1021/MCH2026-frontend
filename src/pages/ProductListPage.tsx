import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiErrorNotice } from '../components/ApiErrorNotice'
import type { ListItem } from '../components/ListView'
import { Page } from '../components/Page'
import { PagedListView } from '../components/PagedListView'
import { listProducts } from '../api/products'
import { useApi } from '../hooks/useApi'
import { PAGE_SIZE, pageCountOf } from '../lib/paging'

/** 全部作物有 130+ 筆，交給後端分頁，每翻一頁抓一次。 */
export function ProductListPage() {
  const navigate = useNavigate()
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
      title="所有作物"
      flush
      softKeys={{ center: { label: '選擇' }, right: { label: '返回' } }}
    >
      {error !== null && <ApiErrorNotice error={error} onRetry={reload} />}
      <PagedListView
        items={items}
        pageIndex={pageIndex}
        pageCount={pageCountOf(data?.total ?? 0)}
        onPageChange={setPageIndex}
        loading={loading}
        emptyText={loading ? '載入中…' : '目前沒有作物資料'}
        onSelect={(item) => navigate(`/products/${encodeURIComponent(item.id)}`)}
      />
    </Page>
  )
}
