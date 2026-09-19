import { useState } from 'react'
import { ListView } from '../components/ListView'
import { Page } from '../components/Page'
import { useToast } from '../components/Toast'
import { readJSON, writeJSON } from '../lib/storage'

type Settings = {
  sound: boolean
  dataSaver: boolean
}

const DEFAULTS: Settings = { sound: true, dataSaver: false }

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(() => readJSON('settings', DEFAULTS))
  const toast = useToast()

  const toggle = (key: keyof Settings) => {
    const next = { ...settings, [key]: !settings[key] }
    setSettings(next)
    writeJSON('settings', next)
    toast(next[key] ? '已開啟' : '已關閉')
  }

  const items = [
    { id: 'sound', title: '音效', trailing: settings.sound ? '開' : '關' },
    { id: 'dataSaver', title: '省流量模式', trailing: settings.dataSaver ? '開' : '關' },
  ]

  return (
    <Page
      title="設定"
      flush
      softKeys={{ center: { label: '切換' }, right: { label: '返回' } }}
    >
      <ListView items={items} onSelect={(item) => toggle(item.id as keyof Settings)} />
    </Page>
  )
}
