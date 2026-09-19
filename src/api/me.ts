import { apiFetch } from './client'
import type { PatchMeBody, UserOut } from './types'

export function getMe(): Promise<UserOut> {
  return apiFetch('/me', { auth: true })
}

export function patchMe(body: PatchMeBody): Promise<UserOut> {
  return apiFetch('/me', { method: 'PATCH', auth: true, body: JSON.stringify(body) })
}
