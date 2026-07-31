import { Avatar } from './Atoms'
import type { Message } from '../api/rest'
import type { Identity } from '../state/identity'
import type { ViewMode } from './ChatView'
import { BriefEditor } from '../workspace/BriefEditor'
import { decodeSharedExplanation } from './sharedExplanation'

interface Teammate {
  name: string
  role: string
}

// Presence is derived, not pushed: distinct message authors plus the current
// user, all shown online (design spec §3.3, §7 - no backend dependency).
function deriveTeammates(messages: Message[], me: Identity): Teammate[] {
  const seen = new Map<string, Teammate>()
  seen.set(me.name, { name: me.name, role: me.role })
  for (const m of messages) {
    // Skip shared-explanation cards - the author already appears as themselves.
    if (decodeSharedExplanation(m.text)) continue
    if (!seen.has(m.author_name)) {
      seen.set(m.author_name, { name: m.author_name, role: m.author_role })
    }
  }
  return Array.from(seen.values())
}

interface SidebarProps {
  identity: Identity
  messages: Message[]
  view: ViewMode
  onChangeView: (v: ViewMode) => void
}

export function Sidebar({ identity, messages, view, onChangeView }: SidebarProps) {
  const teammates = deriveTeammates(messages, identity)

  return (
    <aside className="side">
      <div className="ws">
        <div className="name">
          Refract Team <span className="caret">▾</span>
        </div>
        <div className="status" title="online" />
      </div>

      <BriefEditor />

      <div className="side-section channels">
        <div className="h">Channels</div>
        <button
          type="button"
          className={`row${view === 'chat' ? ' active' : ''}`}
          onClick={() => onChangeView('chat')}
        >
          <span className="hash">#</span>general
        </button>
      </div>

      <div className="side-section channels">
        <div className="h">Docs</div>
        <button
          type="button"
          className={`row${view === 'spec' ? ' active' : ''}`}
          onClick={() => onChangeView('spec')}
        >
          <span className="hash">📄</span>pricing-v2
        </button>
      </div>

      <div className="side-section presence">
        <div className="h">Teammates online</div>
        {teammates.map((t) => {
          const isMe = t.name === identity.name
          return (
            <div className={`row${isMe ? ' me' : ''}`} key={t.name}>
              <Avatar name={t.name} role={t.role} small />
              <span className="pname">
                {t.name}
                {isMe && ' (you)'}
              </span>
              <span className="dot" />
            </div>
          )
        })}
      </div>
    </aside>
  )
}
