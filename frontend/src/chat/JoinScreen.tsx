import { useState } from 'react'

import { ROLES, ROLE_SHORT } from './roles'
import type { Role } from './roles'
import type { Identity } from '../state/identity'

interface JoinScreenProps {
  onJoin: (identity: Identity) => void
}

// Full-page centered card. Two decisions only: display name + one role.
// On submit, hands the identity up; no network call (design spec §3.1).
export function JoinScreen({ onJoin }: JoinScreenProps) {
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role | null>(null)

  const canJoin = name.trim().length > 0 && role !== null

  function submit() {
    if (!canJoin || role === null) return
    onJoin({ name: name.trim(), role })
  }

  return (
    <div className="join">
      <div className="join-card">
        <div className="wordmark">
          <span className="sq" aria-hidden="true" /> Refract
        </div>
        <h3>Join the workspace</h3>
        <p className="lede">Pick a name and a role - same as your seat at the table.</p>

        <label className="field" htmlFor="join-name">
          Display name
        </label>
        <input
          id="join-name"
          type="text"
          autoFocus
          placeholder="e.g. Aditya"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
          }}
        />

        <span className="field">Role</span>
        <div className="role-grid" role="radiogroup" aria-label="Role">
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={role === r}
              className={`role-pick${role === r ? ' on' : ''}`}
              onClick={() => setRole(r)}
            >
              <span className={`swatch ${ROLE_SHORT[r].toLowerCase()}`} aria-hidden="true" />
              {ROLE_SHORT[r]}
            </button>
          ))}
        </div>

        <button className="btn full" type="button" disabled={!canJoin} onClick={submit}>
          Enter chat →
        </button>
        {!role && <p className="join-hint">Pick a role to continue.</p>}

        <p className="privacy">
          You'll be visible to teammates.
          <br />
          What you highlight will not be.
        </p>
      </div>
    </div>
  )
}
