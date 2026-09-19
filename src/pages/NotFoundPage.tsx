import { Page } from '../components/Page'
import { useNavigate } from 'react-router-dom'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <Page
      title="找不到頁面"
      softKeys={{
        center: { label: '回首頁', onPress: () => navigate('/', { replace: true }) },
        right: { label: '返回' },
      }}
    >
      <p className="u-muted">這個路徑不存在。</p>
    </Page>
  )
}
