import { useState } from 'react'
import { ListView, type ListItem } from '../components/ListView'
import { useOptionsMenu } from '../components/OptionsMenu'
import { Page } from '../components/Page'
import { useNavigate } from 'react-router-dom'

const ITEMS: ListItem[] = [
  { id: 'wizard', title: '依地區查詢作物', subtitle: '選擇地區與季節，快速找到作物行情' },
  { id: 'products', title: '瀏覽所有作物', subtitle: '不篩選地區季節，直接看清單' },
]

export function HomePage() {
  const navigate = useNavigate()
  const [position, setPosition] = useState(1)

  const menu = useOptionsMenu('選項', [
    { id: 'settings', label: '設定', onSelect: () => navigate('/settings') },
    { id: 'about', label: '關於', onSelect: () => navigate('/about') },
  ])

  return (
    <Page
      title="農產行情"
      headerAside={<span className="u-muted">{`${position}/${ITEMS.length}`}</span>}
      flush
      softKeys={{
        left: { label: '選項', onPress: menu.open },
        center: { label: '開啟' },
        right: { label: '離開' },
      }}
    >
      <ListView
        items={ITEMS}
        enabled={!menu.isOpen}
        onFocusChange={(_, index) => setPosition(index + 1)}
        onSelect={(item) => navigate(item.id === 'wizard' ? '/wizard/region' : '/products')}
      />
      {menu.element}
    </Page>
  )
}
