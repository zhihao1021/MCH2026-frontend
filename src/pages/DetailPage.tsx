import { Page } from '../components/Page'
import { useNavigate, useParams } from 'react-router-dom'

export function DetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <Page
      title={`項目 ${id}`}
      softKeys={{
        center: { label: '返回', onPress: () => navigate('/') },
        right: { label: '返回' },
      }}
    >
      <div className="prose">
        <h2>項目 {id}</h2>
        <p>
          這是詳細頁的內容區。內容過長時會自動捲動，Header 與軟鍵列保持固定。
        </p>
        <dl>
          <dt>編號</dt>
          <dd>{id}</dd>
          <dt>狀態</dt>
          <dd>正常</dd>
        </dl>
      </div>
    </Page>
  )
}
