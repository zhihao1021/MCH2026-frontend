import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ListView } from '../components/ListView'
import { Page } from '../components/Page'
import { useToast } from '../components/Toast'
import { useAuth } from '../hooks/useAuth'
import { readJSON, writeJSON } from '../lib/storage'

type Settings = {
  sound: boolean
  dataSaver: boolean
}

const DEFAULTS: Settings = { sound: true, dataSaver: false }
const AUTH_ITEM_ID = '__auth__'
const PROFILE_ITEM_ID = '__profile__'

export function SettingsPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState<Settings>(() => readJSON('settings', DEFAULTS))
  const toast = useToast()
  const auth = useAuth()

  const toggle = (key: keyof Settings) => {
    const next = { ...settings, [key]: !settings[key] }
    setSettings(next)
    writeJSON('settings', next)
    toast(next[key] ? '已開啟' : '已關閉')
  }

  const authItem =
    auth.user === null
      ? { id: AUTH_ITEM_ID, title: '登入', subtitle: '登入後可新增報價、維護個人檔案' }
      : { id: AUTH_ITEM_ID, title: `登出（${auth.user.display_name ?? auth.user.phone}）` }

  const items = [
    authItem,
    ...(auth.user !== null
      ? [{ id: PROFILE_ITEM_ID, title: '個人檔案', subtitle: '暱稱、位置、聯絡方式' }]
      : []),
    { id: 'sound', title: '音效', trailing: settings.sound ? '開' : '關' },
    { id: 'dataSaver', title: '省流量模式', trailing: settings.dataSaver ? '開' : '關' },
  ]

  const handleSelect = (id: string) => {
    if (id === AUTH_ITEM_ID) {
      if (auth.user === null) {
        navigate('/login')
      } else {
        void auth.logout().then(() => toast('已登出'))
      }
      return
    }
    if (id === PROFILE_ITEM_ID) {
      navigate('/profile')
      return
    }
    toggle(id as keyof Settings)
  }

  return (
    <Page title="設定" flush softKeys={{ center: { label: '選擇' }, right: { label: '返回' } }}>
      <ListView items={items} enabled={!auth.loading} onSelect={(item) => handleSelect(item.id)} />
    </Page>
  )
}
