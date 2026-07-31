import { roleKey } from './roles'

// Monospace role pill. Unknown roles render as a neutral gray pill labelled
// with the raw string (design spec §7).
export function RolePill({ role }: { role: string }) {
  return <span className={`role-pill rp-${roleKey(role)}`}>{role.toLowerCase()}</span>
}

// Square, role-tinted avatar showing the first letter of the display name.
export function Avatar({
  name,
  role,
  small = false,
}: {
  name: string
  role: string
  small?: boolean
}) {
  const initial = (name.trim()[0] ?? '?').toUpperCase()
  return (
    <span className={`avatar a-${roleKey(role)}${small ? ' avatar-sm' : ''}`}>{initial}</span>
  )
}
