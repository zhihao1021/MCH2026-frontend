import { useNavigate } from 'react-router-dom'
import { Page } from '../components/Page'
import { useT } from '../i18n'

export function NotFoundPage() {
  const navigate = useNavigate()
  const t = useT()

  return (
    <Page
      title={t('notFound.title')}
      softKeys={{
        center: { label: t('common.home'), onPress: () => navigate('/', { replace: true }) },
        right: { label: t('common.back') },
      }}
    >
      <p className="u-muted">{t('notFound.body')}</p>
    </Page>
  )
}
