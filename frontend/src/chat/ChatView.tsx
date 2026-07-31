import { useState } from 'react'

import { RolePill } from './Atoms'
import { Composer } from './Composer'
import { MessageList } from './MessageList'
import { Sidebar } from './Sidebar'
import { useMessages } from './useMessages'
import type { Identity } from '../state/identity'
import { HighlightLayer } from '../ctxbridge/HighlightLayer'
import { SpecView } from '../spec/SpecView'

export type ViewMode = 'chat' | 'spec'

// The main app layout once past the JoinScreen: sidebar + channel pane.
// Owns the live message hook and threads its pieces to the children. `view`
// swaps the main pane between live chat and the demo Spec doc - HighlightLayer
// stays mounted so the widget works on either surface.
export function ChatView({ identity }: { identity: Identity }) {
  const { messages, connection, attempt, send, retry } = useMessages(identity)
  const [view, setView] = useState<ViewMode>('chat')

  const reconnecting = connection === 'reconnecting' || connection === 'connecting'
  const closed = connection === 'closed'

  return (
    <div className="chat">
      <Sidebar identity={identity} messages={messages} view={view} onChangeView={setView} />

      <div className="main">
        <div className="channel-head">
          <div className="title">
            <h4>{view === 'chat' ? '# general' : '📄 pricing-v2.md'}</h4>
            <span className="members">
              {view === 'chat' ? (messages.length > 0 ? 'live' : 'connecting…') : 'draft · read only'}
            </span>
          </div>
          <div className="who-am-i">
            You: {identity.name} <RolePill role={identity.role} />
          </div>
        </div>

        {view === 'chat' && (reconnecting || closed) && (
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

        {view === 'chat' ? (
          <>
            <MessageList messages={messages} />
            <Composer connection={connection} onSend={send} />
          </>
        ) : (
          <SpecView />
        )}
      </div>

      <HighlightLayer send={send} />
    </div>
  )
}
