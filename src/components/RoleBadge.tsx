import type { UserRole } from '../api/types'
import { useT } from '../i18n'
import { roleLabel } from '../lib/labels'

export function RoleBadge({ role }: { role: UserRole }) {
  const t = useT()
  return <span className="badge badge--role">{t('roles.badge', { role: roleLabel(t, role) })}</span>
}
