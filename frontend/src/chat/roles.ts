// The fixed role list. Must match backend config.py ROLES exactly - this is
// the `reader_role` / `author_role` vocabulary shared across all tracks.
export const ROLES = [
  'Engineering',
  'Sales',
  'Marketing',
  'Design',
  'Product',
] as const

export type Role = (typeof ROLES)[number]

// Short label shown inside the JoinScreen role grid.
export const ROLE_SHORT: Record<Role, string> = {
  Engineering: 'ENG',
  Sales: 'SALES',
  Marketing: 'MKT',
  Design: 'DESIGN',
  Product: 'PRODUCT',
}

// CSS class suffix per role - drives pill + avatar tints (see index.css).
export const ROLE_KEY: Record<Role, string> = {
  Engineering: 'eng',
  Sales: 'sales',
  Marketing: 'mkt',
  Design: 'design',
  Product: 'product',
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

// Returns the css key for a known role, or 'unknown' for anything the server
// sends that we don't recognise (rendered as a neutral gray pill).
export function roleKey(role: string): string {
  return isRole(role) ? ROLE_KEY[role] : 'unknown'
}
