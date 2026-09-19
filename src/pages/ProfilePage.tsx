import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiErrorNotice } from '../components/ApiErrorNotice'
import { useOptionsMenu } from '../components/OptionsMenu'
import { Page } from '../components/Page'
import { RoleBadge } from '../components/RoleBadge'
import { Spinner } from '../components/Spinner'
import { useToast } from '../components/Toast'
import { listSubdivisions } from '../api/geo'
import { detectMyLocation, putMyLocation } from '../api/location'
import { patchMe } from '../api/me'
import type { LocationVisibility } from '../api/types'
import { useApi, useApiAction } from '../hooks/useApi'
import { useAuth } from '../hooks/useAuth'
import { useT, type MessageKey, type Translate } from '../i18n'

const RETURN_TO = '/profile'

const VISIBILITY_OPTIONS: LocationVisibility[] = ['region', 'approximate', 'exact', 'private']

/** 有填座標時，只有這兩種公開範圍會把座標給別人看（API.md 4.7）。 */
const VISIBILITY_WITH_COORDS: LocationVisibility[] = ['exact', 'approximate']

type ParsedCoords =
  | { ok: true; latitude: number | null; longitude: number | null }
  | { ok: false; message: MessageKey }

/**
 * 座標一律成對：後端只收到其中一個會回 422（API.md 4.5），
 * 所以在這裡就擋掉，錯誤訊息也講得比後端的欄位錯誤具體。
 */
function parseCoords(latText: string, lngText: string): ParsedCoords {
  const rawLat = latText.trim()
  const rawLng = lngText.trim()
  if (rawLat === '' && rawLng === '') return { ok: true, latitude: null, longitude: null }
  if (rawLat === '' || rawLng === '') return { ok: false, message: 'profile.coords.pairRequired' }

  const latitude = Number(rawLat)
  const longitude = Number(rawLng)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { ok: false, message: 'profile.coords.numeric' }
  }
  if (latitude < -90 || latitude > 90) return { ok: false, message: 'profile.coords.latRange' }
  if (longitude < -180 || longitude > 180) return { ok: false, message: 'profile.coords.lngRange' }
  return { ok: true, latitude, longitude }
}

function visibilityLabel(t: Translate, visibility: LocationVisibility): string {
  return t(`profile.visibility.${visibility}`)
}

export function ProfilePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const auth = useAuth()
  const t = useT()
  const user = auth.user

  useEffect(() => {
    if (!auth.loading && user === null) {
      navigate(`/login?returnTo=${encodeURIComponent(RETURN_TO)}`, { replace: true })
    }
  }, [auth.loading, user, navigate])

  const { data: subdivisions } = useApi(
    () => listSubdivisions(user?.country_code ?? 'TW'),
    [user?.country_code],
  )

  const [displayName, setDisplayName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [bio, setBio] = useState('')
  const [subdivisionCode, setSubdivisionCode] = useState('')
  const [locality, setLocality] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [visibility, setVisibility] = useState<LocationVisibility>('region')
  const [coordError, setCoordError] = useState<MessageKey | null>(null)
  // 定位端點回傳的 notice 必須原樣顯示（API.md 4.4），免得被當成 GPS 定位
  const [detectNotice, setDetectNotice] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (user === null || initialized) return
    setDisplayName(user.display_name ?? '')
    setBusinessName(user.business_name ?? '')
    setBio(user.bio ?? '')
    setSubdivisionCode(user.location.subdivision_code ?? '')
    setLocality(user.location.locality ?? '')
    setLatitude(user.location.latitude?.toString() ?? '')
    setLongitude(user.location.longitude?.toString() ?? '')
    setVisibility(user.location.visibility)
    setInitialized(true)
  }, [user, initialized])

  const { run: saveProfile, pending: savingProfile, error: profileError } = useApiAction(patchMe)
  const { run: saveLocation, pending: savingLocation, error: locationError } = useApiAction(putMyLocation)
  // 定位失敗是預期內的（開發機沒有對外 IP、伺服器關掉這功能…），
  // 一律退回手動輸入，所以這裡不看 error，只用 toast 告知
  const { run: detect, pending: detecting } = useApiAction(detectMyLocation)

  const runDetect = async () => {
    const suggestion = await detect()
    if (suggestion === undefined) {
      toast(t('profile.toast.detectFailed'))
      return
    }
    if (suggestion.latitude !== null && suggestion.longitude !== null) {
      setLatitude(String(suggestion.latitude))
      setLongitude(String(suggestion.longitude))
      setCoordError(null)
    }
    // 已經填過的欄位不覆蓋：推估值只是「幫你少打幾個字」，使用者手動填的比較準
    if (
      suggestion.subdivision_code !== null &&
      subdivisionCode === '' &&
      (subdivisions ?? []).some((s) => s.code === suggestion.subdivision_code)
    ) {
      setSubdivisionCode(suggestion.subdivision_code)
    }
    if (suggestion.locality !== null && locality.trim() === '') setLocality(suggestion.locality)
    setDetectNotice(suggestion.notice)
    toast(t('profile.toast.detected'))
  }

  const menu = useOptionsMenu(t('common.options'), [
    {
      id: 'detect',
      label: detecting ? t('profile.menu.detecting') : t('profile.menu.detect'),
      disabled: detecting,
      onSelect: () => void runDetect(),
    },
    {
      id: 'clear-coords',
      label: t('profile.menu.clearCoords'),
      disabled: latitude.trim() === '' && longitude.trim() === '',
      onSelect: () => {
        setLatitude('')
        setLongitude('')
        setCoordError(null)
        setDetectNotice(null)
        toast(t('profile.toast.coordsCleared'))
      },
    },
  ])

  if (auth.loading || user === null) {
    return (
      <Page title={t('profile.title')} softKeys={{ right: { label: t('common.back') } }}>
        <Spinner />
      </Page>
    )
  }

  const pending = savingProfile || savingLocation
  const activeError = profileError ?? locationError

  const submit = async () => {
    const coords = parseCoords(latitude, longitude)
    if (!coords.ok) {
      setCoordError(coords.message)
      toast(t(coords.message))
      return
    }
    setCoordError(null)

    const updatedProfile = await saveProfile({
      display_name: displayName.trim().length > 0 ? displayName.trim() : null,
      business_name: businessName.trim().length > 0 ? businessName.trim() : null,
      bio: bio.trim().length > 0 ? bio.trim() : null,
    })
    if (updatedProfile === undefined) return

    // PUT 是整筆取代：這頁沒有欄位可編的 address_line / postal_code / timezone
    // 也要原樣帶回去，否則每存一次檔案就會被清掉一次（API.md 4.5）。
    const updatedUser = await saveLocation({
      country_code: user.country_code,
      subdivision_code: subdivisionCode.length > 0 ? subdivisionCode : null,
      locality: locality.trim().length > 0 ? locality.trim() : null,
      address_line: user.location.address_line,
      postal_code: user.location.postal_code,
      latitude: coords.latitude,
      longitude: coords.longitude,
      timezone: user.location.timezone,
      visibility,
    })
    if (updatedUser === undefined) return

    auth.login(updatedUser)
    toast(t('common.saved'))
  }

  const hasCoords = latitude.trim() !== '' && longitude.trim() !== ''
  const coordsHidden = hasCoords && !VISIBILITY_WITH_COORDS.includes(visibility)

  return (
    <Page
      title={t('profile.title')}
      softKeys={{
        left: { label: t('common.options'), onPress: menu.open },
        center: {
          label: pending ? t('common.saving') : t('common.save'),
          onPress: () => void submit(),
        },
        right: { label: t('common.back') },
      }}
    >
      <div className="prose">
        <p className="u-muted">
          <RoleBadge role={user.role} />・{user.phone}
        </p>
        <p className="u-muted">{t('profile.currentLocation', { location: user.location.formatted })}</p>
        <p className="u-muted">{t('profile.joined', { date: user.created_at.slice(0, 10) })}</p>
      </div>

      <div className="form">
        <div className="form__field">
          <label className="form__label" htmlFor="displayName">
            {t('profile.displayName')}
          </label>
          <input
            id="displayName"
            className="form__input"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <div className="form__field">
          <label className="form__label" htmlFor="businessName">
            {t('profile.businessName')}
          </label>
          <input
            id="businessName"
            className="form__input"
            type="text"
            placeholder={t('profile.businessNamePlaceholder')}
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        </div>

        <div className="form__field">
          <label className="form__label" htmlFor="subdivision">
            {t('profile.subdivision')}
          </label>
          <select
            id="subdivision"
            className="form__input"
            value={subdivisionCode}
            onChange={(e) => setSubdivisionCode(e.target.value)}
          >
            <option value="">{t('profile.subdivision.none')}</option>
            {(subdivisions ?? []).map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form__field">
          <label className="form__label" htmlFor="locality">
            {t('profile.locality')}
          </label>
          <input
            id="locality"
            className="form__input"
            type="text"
            placeholder={t('profile.localityPlaceholder')}
            value={locality}
            onChange={(e) => setLocality(e.target.value)}
          />
        </div>

        <div className="form__field">
          <label className="form__label" htmlFor="latitude">
            {t('profile.latitude')}
          </label>
          <input
            id="latitude"
            className="form__input"
            type="text"
            inputMode="decimal"
            placeholder={t('profile.latitudePlaceholder')}
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
          />
        </div>

        <div className="form__field">
          <label className="form__label" htmlFor="longitude">
            {t('profile.longitude')}
          </label>
          <input
            id="longitude"
            className="form__input"
            type="text"
            inputMode="decimal"
            placeholder={t('profile.longitudePlaceholder')}
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
          />
        </div>
        {coordError !== null && <p className="form__error">{t(coordError)}</p>}
        {detectNotice !== null && <p className="form__hint">{detectNotice}</p>}
        <p className="form__hint">{t('profile.coords.hint')}</p>

        <div className="form__field">
          <label className="form__label" htmlFor="visibility">
            {t('profile.visibility')}
          </label>
          <select
            id="visibility"
            className="form__input"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as LocationVisibility)}
          >
            {VISIBILITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {visibilityLabel(t, option)}
              </option>
            ))}
          </select>
          <p className="form__hint">{t('profile.visibility.hint')}</p>
          {coordsHidden && (
            <p className="form__hint">{t('profile.visibility.coordsHidden')}</p>
          )}
        </div>

        <div className="form__field">
          <label className="form__label" htmlFor="bio">
            {t('profile.bio')}
          </label>
          <input
            id="bio"
            className="form__input"
            type="text"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>

        {activeError !== null && <ApiErrorNotice error={activeError} />}
      </div>
      {menu.element}
    </Page>
  )
}
