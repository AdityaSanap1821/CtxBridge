import { RolePill } from './Atoms'
import { Composer } from './Composer'
import { MessageList } from './MessageList'
import { Sidebar } from './Sidebar'
import { useMessages } from './useMessages'
import type { Identity } from '../state/identity'

// The main app layout once past the JoinScreen: sidebar + channel pane.
// Owns the live message hook and threads its pieces to the children.
export function ChatView({ identity }: { identity: Identity }) {
  const { messages, connection, attempt, send, retry } = useMessages(identity)

  const reconnecting = connection === 'reconnecting' || connection === 'connecting'
  const closed = connection === 'closed'

  return (
    <div className="chat">
      <Sidebar identity={identity} messages={messages} />

      <div className="main">
        <div className="channel-head">
          <div className="title">
            <h4># general</h4>
            <span className="members">{messages.length > 0 ? 'live' : 'connecting…'}</span>
          </div>
          <div className="who-am-i">
            You: {identity.name} <RolePill role={identity.role} />
          </div>
        </div>

        {(reconnecting || closed) && (
          <div className={`conn-banner${closed ? ' closed' : ''}`}>
            {closed ? (
              <>
                <span>Connection lost.</span>
                <button type="button" className="retry" onClick={retry}>
                  RETRY
                </button>
              </>
            ) : (
              <>
                <span>Connection lost. Reconnecting…</span>
                <span className="attempt">retry {attempt}/5</span>
              </>
            )}
          </div>
        )}

        <MessageList messages={messages} />

        <Composer connection={connection} onSend={send} />
      </div>
    </div>
  )
}
