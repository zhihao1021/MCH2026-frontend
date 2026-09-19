import type { UserRole } from '../api/types'
import { roleLabel } from '../lib/labels'

export function RoleBadge({ role }: { role: UserRole }) {
  return <span className="badge badge--role">{roleLabel(role)}視角</span>
}
