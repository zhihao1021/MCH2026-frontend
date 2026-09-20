import { useNavigate } from 'react-router-dom'
import { ListView, type ListItem } from '../components/ListView'
import { Page } from '../components/Page'
import { useToast } from '../components/Toast'
import { patchMe } from '../api/me'
import { useAuth } from '../hooks/useAuth'
import { LOCALES, localeName, translate, useI18n, type Locale } from '../i18n'

/**
 * 語言選單：已經超過兩個語言，不能再直接輪替（見 HomePage / SettingsPage 舊版註解），
 * 改成獨立頁面列出所有支援語系。
 */
export function LanguagePickerPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const auth = useAuth()
  const { t, locale, setLocale } = useI18n()

  const items: ListItem[] = LOCALES.map((l) => ({
    id: l,
    title: localeName(l),
    trailing: l === locale ? '✓' : undefined,
  }))
  const initialIndex = Math.max(0, LOCALES.indexOf(locale))

  const pick = async (next: Locale) => {
    if (next === locale) {
      navigate(-1)
      return
    }
    await setLocale(next)
    // 已登入的話順手同步到後端（地址本地化用的是伺服端存的語系，API.md 4 節），失敗就算了，不擋 UI
    if (auth.user !== null) void patchMe({ locale: next }).catch(() => {})
    // 提示訊息用切換後的語言：這一輪的 t 還是舊語系
    toast(translate(next, 'settings.toast.language', { language: localeName(next) }))
    navigate(-1)
  }

  return (
    <Page
      title={t('settings.language')}
      flush
      softKeys={{ center: { label: t('common.select') }, right: { label: t('common.back') } }}
    >
      <ListView items={items} initialIndex={initialIndex} onSelect={(item) => void pick(item.id as Locale)} />
    </Page>
  )
}
