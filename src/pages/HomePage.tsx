import { useState } from 'react'
import { ListView, type ListItem } from '../components/ListView'
import { useOptionsMenu } from '../components/OptionsMenu'
import { Page } from '../components/Page'
import { useToast } from '../components/Toast'
import { useNavigate } from 'react-router-dom'

// 介面骨架用的假資料，之後換成真正的資料來源即可
const ITEMS: ListItem[] = Array.from({ length: 12 }, (_, i) => ({
  id: String(i + 1),
  title: `項目 ${i + 1}`,
  subtitle: i % 3 === 0 ? '有附註說明的一行' : undefined,
}))

export function HomePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [position, setPosition] = useState(1)

  const menu = useOptionsMenu('選項', [
    { id: 'settings', label: '設定', onSelect: () => navigate('/settings') },
    { id: 'refresh', label: '重新整理', onSelect: () => toast('已重新整理') },
    { id: 'about', label: '關於', onSelect: () => navigate('/about') },
  ])

  return (
    <Page
      title="MCH2026"
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
        onSelect={(item) => navigate(`/items/${item.id}`)}
      />
      {menu.element}
    </Page>
  )
}
