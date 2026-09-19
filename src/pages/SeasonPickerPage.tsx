import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ListView, type ListItem } from '../components/ListView'
import { Page } from '../components/Page'
import { SEASONS } from '../data/seasons'
import { readJSON, writeJSON } from '../lib/storage'

type WizardLast = { region?: string; season?: string }

export function SeasonPickerPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const region = searchParams.get('region')
  const last = readJSON<WizardLast>('wizard:last', {})

  useEffect(() => {
    if (region === null) navigate('/wizard/region', { replace: true })
  }, [region, navigate])

  if (region === null) return null

  const items: ListItem[] = SEASONS.map((s) => ({ id: s.id, title: s.label }))
  const initialIndex = Math.max(0, SEASONS.findIndex((s) => s.id === last.season))

  return (
    <Page
      title={`${region} － 選擇季節`}
      flush
      softKeys={{ center: { label: '選擇' }, right: { label: '返回' } }}
    >
      <p className="wizard__hint">請選擇目前季節</p>
      <ListView
        items={items}
        initialIndex={initialIndex}
        onSelect={(item) => {
          writeJSON('wizard:last', { ...last, region, season: item.id })
          navigate(`/wizard/crop?region=${encodeURIComponent(region)}&season=${item.id}`)
        }}
      />
    </Page>
  )
}
