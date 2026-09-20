import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ApiErrorNotice } from '../components/ApiErrorNotice'
import { CountryField, CountryPicker } from '../components/CountryPicker'
import { Page } from '../components/Page'
import { useToast } from '../components/Toast'
import { requestOtp } from '../api/auth'
import { listCountries } from '../api/geo'
import { useApi, useApiAction } from '../hooks/useApi'
import {
  hasUserChosenLocale,
  localeName,
  matchLocale,
  translate,
  useI18n,
  type MessageKey,
} from '../i18n'
import { LAST_COUNTRY_KEY, detectDefaultCountry, validatePhone } from '../lib/phone'
import { writeJSON } from '../lib/storage'

export function LoginPhonePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { t, locale, setLocale } = useI18n()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('returnTo') ?? '/'
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState<MessageKey | null>(null)
  // 只記國碼不記物件：換語系重抓清單後，同一國會自動換成新語系的名稱
  const [countryCode, setCountryCode] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const { run, pending, error } = useApiAction(requestOtp)

  // 國家清單一律來自後端（API.md 6：不要在前端寫死）；換語系會自動重抓成該語系的國名
  const countriesState = useApi(() => listCountries(), [])
  const countries = countriesState.data ?? []
  // 還沒選過就用預設（上次選的 → 瀏覽器語系 → 第一筆）；清單未到時是 null
  const country =
    (countryCode === null ? null : countries.find((c) => c.code === countryCode)) ??
    detectDefaultCountry(countries)

  const submit = async () => {
    const result = validatePhone(phone, country, countries)
    if (!result.ok) {
      setPhoneError(result.message)
      toast(t(result.message))
      return
    }
    setPhoneError(null)
    // 打了 +81… 之類的完整號碼時，選擇器跟著切到對應的國家，畫面跟送出的資料一致
    if (result.country.code !== country?.code) setCountryCode(result.country.code)
    writeJSON(LAST_COUNTRY_KEY, result.country.code)

    const res = await run(result.phone, result.country.code)
    if (res !== undefined) {
      navigate(
        `/login/otp?phone=${encodeURIComponent(result.phone)}` +
          `&country=${encodeURIComponent(result.country.code)}` +
          `&masked=${encodeURIComponent(res.phone)}` +
          `&returnTo=${encodeURIComponent(returnTo)}` +
          `&retryAfter=${res.retry_after}&isRegistered=${res.is_registered}`,
      )
    }
  }

  return (
    <Page
      title={t('login.title')}
      softKeys={{
        center: {
          label: pending ? t('login.key.sending') : t('login.key.sendCode'),
          onPress: () => void submit(),
        },
        right: { label: t('common.back') },
      }}
    >
      <div className="form">
        <CountryField
          id="country"
          label={t('login.country')}
          country={country}
          loading={countriesState.loading}
          onOpen={() => setPickerOpen(true)}
        />
        <div className="form__field">
          <label className="form__label" htmlFor="phone">
            {t('login.phone')}
          </label>
          <input
            id="phone"
            className="form__input"
            type="tel"
            inputMode="tel"
            placeholder={t('login.phone.placeholder')}
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value)
              setPhoneError(null)
            }}
          />
          {phoneError !== null ? (
            <p className="form__error">{t(phoneError)}</p>
          ) : (
            <p className="form__hint">{t('login.phone.hint')}</p>
          )}
        </div>
        {countriesState.error !== null && (
          <ApiErrorNotice error={countriesState.error} onRetry={countriesState.reload} />
        )}
        {error !== null && <ApiErrorNotice error={error} />}
      </div>
      {pickerOpen && (
        <CountryPicker
          title={t('login.country.title')}
          countries={countries}
          selectedCode={country?.code ?? null}
          onSelect={(picked) => {
            setCountryCode(picked.code)
            setPhoneError(null)
            // 選了國家時，如果使用者還沒自己選過介面語言，就依這個國家的預設語系建議切換
            // （persist: false：不算「使用者選過」，之後仍可被瀏覽器語系或手動選擇覆蓋）
            const suggested = matchLocale(picked.default_locale)
            if (suggested !== null && suggested !== locale && !hasUserChosenLocale()) {
              void setLocale(suggested, { persist: false }).then(() =>
                toast(translate(suggested, 'settings.toast.language', { language: localeName(suggested) })),
              )
            }
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </Page>
  )
}
