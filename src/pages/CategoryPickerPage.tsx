import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ListView, type ListItem } from '../components/ListView'
import { Page } from '../components/Page'
import { PRODUCT_CATEGORIES } from '../api/types'
import { useT } from '../i18n'
import { categoryLabel } from '../lib/labels'
import { readJSON, writeJSON } from '../lib/storage'

type WizardLast = { region?: string; country?: string; category?: string }

export function CategoryPickerPage() {
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

  const items: ListItem[] = PRODUCT_CATEGORIES.map((category) => ({
    id: category,
    title: categoryLabel(t, category),
  }))
  const initialIndex = Math.max(0, PRODUCT_CATEGORIES.findIndex((category) => category === last.category))

  return (
    <Page
      title={t('wizard.category.title', { region })}
      flush
      softKeys={{ center: { label: t('common.select') }, right: { label: t('common.back') } }}
    >
      <p className="wizard__hint">{t('wizard.category.hint')}</p>
      <ListView
        items={items}
        initialIndex={initialIndex}
        onSelect={(item) => {
          writeJSON('wizard:last', { ...last, region, country: country ?? undefined, category: item.id })
          const countryParam = country === null ? '' : `&country=${encodeURIComponent(country)}`
          navigate(`/wizard/crop?region=${encodeURIComponent(region)}&category=${item.id}${countryParam}`)
        }}
      />
    </Page>
  )
}
