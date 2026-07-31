import { Avatar, RolePill } from './Atoms'
import type { Message as ChatMessage } from '../api/rest'
import { decodeSharedExplanation } from './sharedExplanation'

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// A single chat row. Renders either a plain bubble or, when the text carries
// the shared-explanation sentinel, the branded CtxBridge card (design spec §3.8).
export function Message({ message }: { message: ChatMessage }) {
  const shared = decodeSharedExplanation(message.text)
  const time = formatTime(message.created_at)

  return (
    <div className="msg">
      <Avatar name={message.author_name} role={message.author_role} />
      <div className="msg-main">
        <div className="meta">
          <span className="who">{message.author_name}</span>
          <RolePill role={message.author_role} />
          <span className="ts">{time}</span>
          {shared && <span className="shared-tag">· shared an explanation</span>}
        </div>

        {shared ? (
          <div className="share-card">
            <div className="share-head">
              <span className="brand">
                <span className="sq" aria-hidden="true" /> CtxBridge
              </span>
              <span className="disclaimer">AI-inferred — verify</span>
            </div>
            <span className="quoted">{shared.highlighted}</span>
            <div className="share-label">Plain</div>
            <p>{shared.plain}</p>
            {shared.impact.length > 0 && (
              <>
                <div className="share-label">Impact for {shared.reader_role.toLowerCase()}</div>
                <ul>
                  {shared.impact.map((bullet, i) => (
                    <li key={i}>{bullet}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ) : (
          // data-message-text is the contract with the highlight widget (§3.4):
          // its value is the exact plain text, and it is the closest ancestor
          // of every text node in the message.
          <div className="body" data-message-text={message.text}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  )
}
