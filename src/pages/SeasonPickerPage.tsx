import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ListView, type ListItem } from '../components/ListView'
import { Page } from '../components/Page'
import { SEASONS, seasonLabel } from '../data/seasons'
import { useT } from '../i18n'
import { readJSON, writeJSON } from '../lib/storage'

type WizardLast = { region?: string; country?: string; season?: string }

export function SeasonPickerPage() {
  const navigate = useNavigate()
  const t = useT()
  const [searchParams] = useSearchParams()
  const region = searchParams.get('region')
  const country = searchParams.get('country')
  const last = readJSON<WizardLast>('wizard:last', {})

  useEffect(() => {
    if (region === null) navigate('/wizard/region', { replace: true })
  }, [region, navigate])

  if (region === null) return null

  const items: ListItem[] = SEASONS.map((season) => ({ id: season, title: seasonLabel(t, season) }))
  const initialIndex = Math.max(0, SEASONS.findIndex((season) => season === last.season))

  return (
    <Page
      title={t('wizard.season.title', { region })}
      flush
      softKeys={{ center: { label: t('common.select') }, right: { label: t('common.back') } }}
    >
      <p className="wizard__hint">{t('wizard.season.hint')}</p>
      <ListView
        items={items}
        initialIndex={initialIndex}
        onSelect={(item) => {
          writeJSON('wizard:last', { ...last, region, country: country ?? undefined, season: item.id })
          const countryParam = country === null ? '' : `&country=${encodeURIComponent(country)}`
          navigate(`/wizard/crop?region=${encodeURIComponent(region)}&season=${item.id}${countryParam}`)
        }}
      />
    </Page>
  )
}
