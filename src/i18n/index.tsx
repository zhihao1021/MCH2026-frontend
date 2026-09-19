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
import { zhHant } from './zh-Hant'
import { DEFAULT_LOCALE, getLocale, setRuntimeLocale, type Locale } from './locale'

export type { Locale } from './locale'
export { LOCALES, intlLocale } from './locale'
export type { MessageKey } from './en'

export type TranslateVars = Record<string, string | number>

/**
 * 翻譯函式。lib 裡的純函式（距離、方位、分類標籤…）也吃這個型別，
 * 這樣字串全部集中在字典裡，而那些函式仍然不必碰 React。
 */
export type Translate = (key: MessageKey, vars?: TranslateVars) => string

const DICTIONARIES: Record<Locale, Messages> = {
  en,
  'zh-Hant': zhHant,
}

function interpolate(template: string, vars?: TranslateVars): string {
  if (vars === undefined) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  )
}

export function translate(locale: Locale, key: MessageKey, vars?: TranslateVars): string {
  // 缺字退回英文而不是顯示 key：畫面上寧可看到另一個語言，也不要看到 'foo.bar'
  const template = DICTIONARIES[locale][key] ?? en[key]
  return interpolate(template, vars)
}

type I18nApi = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Translate
}

const I18nCtx = createContext<I18nApi | null>(null)

/**
 * 語系狀態。初始值來自 localStorage（見 locale.ts），預設英文。
 *
 * setLocale 先同步更新 React 之外的執行期語系（API 的 Accept-Language、
 * Intl 的數字格式），再 setState 觸發重繪，否則這一輪畫面會混到舊語系。
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => getLocale())

  const setLocale = useCallback((next: Locale) => {
    setRuntimeLocale(next)
    setLocaleState(next)
  }, [])

  // index.html 的 lang 與 <title> 是靜態的英文預設值，這裡跟著目前語系修正
  useEffect(() => {
    document.documentElement.lang = locale
    document.title = translate(locale, 'app.title')
  }, [locale])

  const t = useCallback<Translate>((key, vars) => translate(locale, key, vars), [locale])

  const api = useMemo<I18nApi>(() => ({ locale, setLocale, t }), [locale, setLocale, t])

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
