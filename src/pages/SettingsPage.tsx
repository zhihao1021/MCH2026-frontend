import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ListView } from '../components/ListView'
import { Page } from '../components/Page'
import { useToast } from '../components/Toast'
import { useAuth } from '../hooks/useAuth'
import { translate, useI18n, type Locale } from '../i18n'
import { readJSON, writeJSON } from '../lib/storage'

type Settings = {
  sound: boolean
  dataSaver: boolean
}

const DEFAULTS: Settings = { sound: true, dataSaver: false }
const AUTH_ITEM_ID = '__auth__'
const PROFILE_ITEM_ID = '__profile__'
const LANGUAGE_ITEM_ID = '__language__'

export function SettingsPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState<Settings>(() => readJSON('settings', DEFAULTS))
  const toast = useToast()
  const auth = useAuth()
  const { t, locale, setLocale } = useI18n()

  const toggle = (key: keyof Settings) => {
    const next = { ...settings, [key]: !settings[key] }
    setSettings(next)
    writeJSON('settings', next)
    toast(next[key] ? t('settings.toast.on') : t('settings.toast.off'))
  }

  // 只有兩個語言，直接輪替，不必再開一層選單
  const nextLocale: Locale = locale === 'en' ? 'zh-Hant' : 'en'

  const switchLanguage = () => {
    setLocale(nextLocale)
    // 提示訊息用切換後的語言：這一輪的 t 還是舊語系
    toast(
      translate(nextLocale, 'settings.toast.language', {
        language: translate(nextLocale, `language.${nextLocale}`),
      }),
    )
  }

  const authItem =
    auth.user === null
      ? { id: AUTH_ITEM_ID, title: t('settings.login'), subtitle: t('settings.login.subtitle') }
      : {
          id: AUTH_ITEM_ID,
          title: t('settings.logout', { name: auth.user.display_name ?? auth.user.phone }),
        }

  const items = [
    authItem,
    ...(auth.user !== null
      ? [{ id: PROFILE_ITEM_ID, title: t('settings.profile'), subtitle: t('settings.profile.subtitle') }]
      : []),
    { id: LANGUAGE_ITEM_ID, title: t('settings.language'), trailing: t(`language.${locale}`) },
    { id: 'sound', title: t('settings.sound'), trailing: settings.sound ? t('settings.on') : t('settings.off') },
    {
      id: 'dataSaver',
      title: t('settings.dataSaver'),
      trailing: settings.dataSaver ? t('settings.on') : t('settings.off'),
    },
  ]

  const handleSelect = (id: string) => {
    if (id === AUTH_ITEM_ID) {
      if (auth.user === null) {
        navigate('/login')
      } else {
        void auth.logout().then(() => toast(t('settings.toast.loggedOut')))
      }
      return
    }
    if (id === PROFILE_ITEM_ID) {
      navigate('/profile')
      return
    }
    if (id === LANGUAGE_ITEM_ID) {
      switchLanguage()
      return
    }
    toggle(id as keyof Settings)
  }

  return (
    <Page
      title={t('settings.title')}
      flush
      softKeys={{ center: { label: t('common.select') }, right: { label: t('common.back') } }}
    >
      <ListView items={items} enabled={!auth.loading} onSelect={(item) => handleSelect(item.id)} />
    </Page>
  )
}
