import { createContext, useContext } from 'react'

import type { Role } from '../chat/roles'
import { isRole } from '../chat/roles'

export interface Identity {
  name: string
  role: Role
}

const STORAGE_KEY = 'ctxbridge.identity'

export function loadIdentity(): Identity | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (
      parsed &&
      typeof parsed.name === 'string' &&
      parsed.name.trim() &&
      isRole(parsed.role)
    ) {
      return { name: parsed.name, role: parsed.role }
    }
  } catch {
    // ignore malformed storage
  }
  return null
}

export function saveIdentity(identity: Identity): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity))
  } catch {
    // storage unavailable — identity stays in memory only
  }
}

export function clearIdentity(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

// Identity is guaranteed non-null once past the JoinScreen, so consumers read
// it through this context without null checks.
export const IdentityContext = createContext<Identity | null>(null)

export function useIdentity(): Identity {
  const identity = useContext(IdentityContext)
  if (!identity) {
    throw new Error('useIdentity must be used within an IdentityContext provider')
  }
  return identity
}
