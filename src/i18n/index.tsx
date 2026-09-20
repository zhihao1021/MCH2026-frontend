import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { en, type MessageKey, type Messages } from './en'
import { DEFAULT_LOCALE, getLocale, setRuntimeLocale, type Locale } from './locale'

export type { Locale } from './locale'
export { LOCALES, intlLocale, localeName, matchLocale, hasUserChosenLocale } from './locale'
export type { MessageKey } from './en'

export type TranslateVars = Record<string, string | number>

/**
 * 翻譯函式。lib 裡的純函式（距離、方位、分類標籤…）也吃這個型別，
 * 這樣字串全部集中在字典裡，而那些函式仍然不必碰 React。
 */
export type Translate = (key: MessageKey, vars?: TranslateVars) => string

/**
 * 英文以外的字典改成 lazy import：12 種語言全部靜態打包的話，
 * 使用者用不到的 11 份也會被送到 Cloud Phone 的頻寬有限連線上。
 * 英文維持靜態載入，因為它同時是 MessageKey 的型別來源、也是缺字的退回對象。
 */
const LOADERS: Record<Exclude<Locale, 'en'>, () => Promise<Messages>> = {
  'zh-Hant': () => import('./zh-Hant').then((m) => m.zhHant),
  'zh-Hans': () => import('./zh-Hans').then((m) => m.zhHans),
  ja: () => import('./ja').then((m) => m.ja),
  th: () => import('./th').then((m) => m.th),
}

const loaded: Partial<Record<Locale, Messages>> = { en }
const loading = new Map<Locale, Promise<Messages>>()

/** 確保某個語系的字典已經載入到記憶體快取；en 一律已經在。 */
export function loadDictionary(locale: Locale): Promise<Messages> {
  // 提前 return 讓 TS 把後面的 locale 縮成 Exclude<Locale, 'en'>，正好對得上 LOADERS 的型別
  if (locale === 'en') return Promise.resolve(en)

  const cached = loaded[locale]
  if (cached !== undefined) return Promise.resolve(cached)

  let pending = loading.get(locale)
  if (pending === undefined) {
    pending = LOADERS[locale]().then((dict) => {
      loaded[locale] = dict
      return dict
    })
    loading.set(locale, pending)
  }
  return pending
}

function interpolate(template: string, vars?: TranslateVars): string {
  if (vars === undefined) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  )
}

/** 缺字（字典還沒載入、或該語系漏翻）退回英文，而不是顯示 key。 */
export function translate(locale: Locale, key: MessageKey, vars?: TranslateVars): string {
  const template = loaded[locale]?.[key] ?? en[key]
  return interpolate(template, vars)
}

type I18nApi = {
  locale: Locale
  setLocale: (locale: Locale, options?: { persist?: boolean }) => Promise<void>
  t: Translate
}

const I18nCtx = createContext<I18nApi | null>(null)

/**
 * 語系狀態。初始值來自 localStorage 或瀏覽器語系偵測（見 locale.ts），預設英文。
 *
 * setLocale 先把字典載入完成、再同步更新 React 之外的執行期語系（API 的 Accept-Language、
 * Intl 的數字格式），最後才 setState 觸發重繪——避免切換瞬間畫面先閃回英文再變成目標語言。
 * 掛載時若初始語系不是英文，也要等對應字典載完才算 ready，同樣是為了不要先閃一次英文。
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => getLocale())
  const [ready, setReady] = useState(() => loaded[getLocale()] !== undefined)

  useEffect(() => {
    if (loaded[locale] !== undefined) {
      setReady(true)
      return
    }
    let cancelled = false
    void loadDictionary(locale).then(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setLocale = useCallback(async (next: Locale, options?: { persist?: boolean }) => {
    await loadDictionary(next)
    setRuntimeLocale(next, options)
    setLocaleState(next)
  }, [])

  // index.html 的 lang 與 <title> 是靜態的英文預設值，這裡跟著目前語系修正
  useEffect(() => {
    document.documentElement.lang = locale
    document.title = translate(locale, 'app.title')
  }, [locale])

  const t = useCallback<Translate>((key, vars) => translate(locale, key, vars), [locale])

  const api = useMemo<I18nApi>(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  // 字典還沒載完之前不渲染：本地 chunk，載入時間短，避免閃一次英文再變目標語言
  if (!ready) return null

  return <I18nCtx.Provider value={api}>{children}</I18nCtx.Provider>
}

export function useI18n(): I18nApi {
  const ctx = useContext(I18nCtx)
  if (ctx === null) throw new Error('useI18n 必須在 <I18nProvider> 內使用')
  return ctx
}

/** 只要翻譯函式時用這個，語意比 useI18n().t 清楚。 */
export function useT(): Translate {
  return useI18n().t
}

export { DEFAULT_LOCALE }
