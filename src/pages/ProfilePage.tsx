import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiErrorNotice } from '../components/ApiErrorNotice'
import { Page } from '../components/Page'
import { RoleBadge } from '../components/RoleBadge'
import { Spinner } from '../components/Spinner'
import { useToast } from '../components/Toast'
import { listSubdivisions } from '../api/geo'
import { putMyLocation } from '../api/location'
import { patchMe } from '../api/me'
import type { LocationVisibility } from '../api/types'
import { useApi, useApiAction } from '../hooks/useApi'
import { useAuth } from '../hooks/useAuth'

const RETURN_TO = '/profile'

const VISIBILITY_OPTIONS: { value: LocationVisibility; label: string }[] = [
  { value: 'region', label: '只顯示縣市' },
  { value: 'approximate', label: '大概位置' },
  { value: 'exact', label: '精確地址' },
  { value: 'private', label: '不公開' },
]

export function ProfilePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const auth = useAuth()
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
  const [visibility, setVisibility] = useState<LocationVisibility>('region')
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (user === null || initialized) return
    setDisplayName(user.display_name ?? '')
    setBusinessName(user.business_name ?? '')
    setBio(user.bio ?? '')
    setSubdivisionCode(user.location.subdivision_code ?? '')
    setLocality(user.location.locality ?? '')
    setVisibility(user.location.visibility)
    setInitialized(true)
  }, [user, initialized])

  const { run: saveProfile, pending: savingProfile, error: profileError } = useApiAction(patchMe)
  const { run: saveLocation, pending: savingLocation, error: locationError } = useApiAction(putMyLocation)

  if (auth.loading || user === null) {
    return (
      <Page title="個人檔案" softKeys={{ right: { label: '返回' } }}>
        <Spinner />
      </Page>
    )
  }

  const pending = savingProfile || savingLocation
  const activeError = profileError ?? locationError

  const submit = async () => {
    const updatedProfile = await saveProfile({
      display_name: displayName.trim().length > 0 ? displayName.trim() : null,
      business_name: businessName.trim().length > 0 ? businessName.trim() : null,
      bio: bio.trim().length > 0 ? bio.trim() : null,
    })
    if (updatedProfile === undefined) return

    const updatedUser = await saveLocation({
      country_code: user.country_code,
      subdivision_code: subdivisionCode.length > 0 ? subdivisionCode : null,
      locality: locality.trim().length > 0 ? locality.trim() : null,
      visibility,
    })
    if (updatedUser === undefined) return

    auth.login(updatedUser)
    toast('已儲存')
  }

  return (
    <Page
      title="個人檔案"
      softKeys={{
        center: { label: pending ? '儲存中…' : '儲存', onPress: () => void submit() },
        right: { label: '返回' },
      }}
    >
      <div className="prose">
        <p className="u-muted">
          <RoleBadge role={user.role} />・{user.phone}
        </p>
        <p className="u-muted">目前位置：{user.location.formatted}</p>
        <p className="u-muted">加入於 {user.created_at.slice(0, 10)}</p>
      </div>

      <div className="form">
        <div className="form__field">
          <label className="form__label" htmlFor="displayName">
            暱稱
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
            農場／商號名稱（選填）
          </label>
          <input
            id="businessName"
            className="form__input"
            type="text"
            placeholder="例如：阿明有機農場"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        </div>

        <div className="form__field">
          <label className="form__label" htmlFor="subdivision">
            所在縣市
          </label>
          <select
            id="subdivision"
            className="form__input"
            value={subdivisionCode}
            onChange={(e) => setSubdivisionCode(e.target.value)}
          >
            <option value="">未設定</option>
            {(subdivisions ?? []).map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form__field">
          <label className="form__label" htmlFor="locality">
            市／鎮／區（選填）
          </label>
          <input
            id="locality"
            className="form__input"
            type="text"
            placeholder="例如：斗六市"
            value={locality}
            onChange={(e) => setLocality(e.target.value)}
          />
        </div>

        <div className="form__field">
          <label className="form__label" htmlFor="visibility">
            位置公開範圍
          </label>
          <select
            id="visibility"
            className="form__input"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as LocationVisibility)}
          >
            {VISIBILITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="form__hint">報價時買家會看到你的位置，依這裡設定的範圍顯示。</p>
        </div>

        <div className="form__field">
          <label className="form__label" htmlFor="bio">
            自我介紹（選填）
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
    </Page>
  )
}
