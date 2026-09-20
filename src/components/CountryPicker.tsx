import { useRef, useState, type KeyboardEvent } from 'react'
import type { CountryOut } from '../api/types'
import { useKeypad } from '../hooks/useKeypad'
import { useSoftKeys } from '../hooks/useSoftKeys'
import { useI18n } from '../i18n'
import { localizedGeoName } from '../i18n/locale'
import { countryLabel, filterCountries } from '../lib/phone'
import { ListView, type ListItem } from './ListView'

type PickerProps = {
  title: string
  countries: CountryOut[]
  selectedCode: string | null
  onSelect: (country: CountryOut) => void
  onClose: () => void
}

/**
 * 全螢幕的國家選擇器：上方搜尋框即時過濾，下方 D-pad 清單。
 *
 * 做成 overlay 而不是獨立路由，是為了不讓底下表單已填的欄位（電話、個人資料）因換頁而消失。
 * 清單順序沿用後端回傳（已依請求語系的國名排序，API.md 6.1），前端只過濾不重排。
 * Cloud Phone 的 <input> 會進全螢幕 IME，所以過濾只能在 onChange 做；LSK 用來把焦點送進搜尋框。
 */
export function CountryPicker({ title, countries, selectedCode, onSelect, onClose }: PickerProps) {
  const { t, locale } = useI18n()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = filterCountries(countries, query)
  const items: (ListItem & { country: CountryOut })[] = filtered.map((c) => {
    const primary = localizedGeoName(locale, c.name, c.name_en)
    const other = primary === c.name ? c.name_en : c.name
    return {
      id: c.code,
      title: primary,
      // 另一種語言的名字當輔助說明，兩邊剛好同字（純羅馬字國名）就不重複顯示
      subtitle: other === primary ? undefined : other,
      trailing: `+${c.dialing_code}`,
      country: c,
    }
  })
  const initialIndex = Math.max(
    0,
    filtered.findIndex((c) => c.code === selectedCode),
  )

  useSoftKeys({
    left: { label: t('common.search'), onPress: () => inputRef.current?.focus() },
    center: { label: t('common.select') },
    right: { label: t('common.cancel'), onPress: onClose },
  })

  // 桌機開發：在搜尋框按 Enter / ↓ 回到清單（Cloud Phone 關掉 IME 後焦點本來就會回來）
  const onSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault()
      inputRef.current?.blur()
    }
  }

  return (
    <div className="country-picker" role="dialog" aria-modal="true" aria-label={title}>
      <div className="country-picker__title">{title}</div>
      <div className="country-picker__search">
        <input
          ref={inputRef}
          className="form__input"
          type="search"
          placeholder={t('login.country.search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onSearchKeyDown}
          aria-label={t('common.search')}
        />
      </div>
      <div className="country-picker__list">
        {/* 查詢字串一變就重掛清單，焦點回到第一筆，數字鍵跳號也跟著對齊 */}
        <ListView
          key={query}
          items={items}
          initialIndex={initialIndex}
          emptyText={t('login.country.empty')}
          onSelect={(item) => {
            onClose()
            onSelect(item.country)
          }}
        />
      </div>
    </div>
  )
}

type FieldProps = {
  id: string
  label: string
  country: CountryOut | null
  loading: boolean
  onOpen: () => void
}

/**
 * 表單裡的「目前選擇的國家」列。長得像輸入框、按 Enter 或點擊開啟選擇器。
 *
 * Enter 要自己攔：<button> 不算文字輸入目標，否則會先被頁面的中鍵（送出／儲存）吃掉。
 * 這個 handler 在子元件掛載、比 <Page> 的軟鍵處理器晚註冊，所以在按鍵堆疊上層。
 */
export function CountryField({ id, label, country, loading, onOpen }: FieldProps) {
  const { t, locale } = useI18n()
  const buttonRef = useRef<HTMLButtonElement>(null)

  useKeypad((key) => {
    if (key !== 'Enter' || document.activeElement !== buttonRef.current) return
    onOpen()
    return true
  })

  return (
    <div className="form__field">
      <label className="form__label" htmlFor={id}>
        {label}
      </label>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        className="form__input form__picker"
        onClick={onOpen}
        disabled={loading && country === null}
      >
        <span className={country === null ? 'u-muted' : undefined}>
          {country !== null
            ? countryLabel(country, locale)
            : loading
              ? t('common.loading')
              : t('login.country.placeholder')}
        </span>
        <span className="form__picker-chevron" aria-hidden="true">
          ›
        </span>
      </button>
    </div>
  )
}
