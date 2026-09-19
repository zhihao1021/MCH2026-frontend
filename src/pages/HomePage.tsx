import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ListView, type ListItem } from '../components/ListView'
import { useOptionsMenu } from '../components/OptionsMenu'
import { Page } from '../components/Page'
import { useToast } from '../components/Toast'
import { useAuth } from '../hooks/useAuth'
import { useFavorites } from '../hooks/useFavorites'
import { translate, useI18n } from '../i18n'

const PATHS: Record<string, string> = {
  wizard: '/wizard/region',
  products: '/products',
  favorites: '/favorites',
  intents: '/intents/mine',
  notifications: '/notifications',
}

export function HomePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const favorites = useFavorites()
  const auth = useAuth()
  const { t, locale, setLocale } = useI18n()
  const [position, setPosition] = useState(1)

  const items: ListItem[] = [
    { id: 'wizard', title: t('home.wizard.title'), subtitle: t('home.wizard.subtitle') },
    { id: 'products', title: t('home.products.title'), subtitle: t('home.products.subtitle') },
    {
      id: 'favorites',
      title: t('home.favorites.title'),
      subtitle: t('home.favorites.subtitle'),
      // 收藏數直接顯示在列上：未登入或還沒收藏過就不顯示數字
      trailing: favorites.items.length > 0 ? `${favorites.items.length}` : undefined,
    },
    // 期望價與開團通知都要登入才有內容，訪客的首頁維持三項就好
    ...(auth.user !== null
      ? [
          { id: 'intents', title: t('home.intents.title'), subtitle: t('home.intents.subtitle') },
          { id: 'notifications', title: t('home.notifications.title'), subtitle: t('home.notifications.subtitle') },
        ]
      : []),
  ]

  // 語言就放在首頁的選項裡：這是使用者第一眼看到的畫面，
  // 看不懂介面的人不該還要先找到「設定」才換得掉語言
  const nextLocale = locale === 'en' ? 'zh-Hant' : 'en'

  const menu = useOptionsMenu(t('common.options'), [
    {
      id: 'language',
      label: t('home.menu.language', { language: t(`language.${nextLocale}`) }),
      onSelect: () => {
        setLocale(nextLocale)
        // 提示訊息要用「切換後」的語言：這一輪的 t 還是舊語系
        toast(translate(nextLocale, 'settings.toast.language', { language: translate(nextLocale, `language.${nextLocale}`) }))
      },
    },
    { id: 'settings', label: t('home.menu.settings'), onSelect: () => navigate('/settings') },
    { id: 'about', label: t('home.menu.about'), onSelect: () => navigate('/about') },
  ])

  return (
    <Page
      title={t('app.title')}
      headerAside={<span className="u-muted">{`${position}/${items.length}`}</span>}
      flush
      softKeys={{
        left: { label: t('common.options'), onPress: menu.open },
        center: { label: t('common.open') },
        right: { label: t('common.exit') },
      }}
    >
      <ListView
        items={items}
        enabled={!menu.isOpen}
        onFocusChange={(_, index) => setPosition(index + 1)}
        onSelect={(item) => navigate(PATHS[item.id] ?? '/')}
      />
      {menu.element}
    </Page>
  )
}
