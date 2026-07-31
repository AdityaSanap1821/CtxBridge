import { useEffect, useRef, useState } from 'react'

import type { ConnectionState } from '../api/ws'

const MAX_LEN = 2000
const COUNTER_AT = 1800

interface ComposerProps {
  connection: ConnectionState
  onSend: (text: string) => boolean
}

// Message input. Enter sends, Shift+Enter newlines. Disables and shows a
// reconnecting hint when the socket is down (design spec §3.5).
export function Composer({ connection, onSend }: ComposerProps) {
  const [text, setText] = useState('')
  const [shake, setShake] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)

  const disconnected = connection !== 'open'
  const overLimit = text.length > MAX_LEN

  // Auto-grow the textarea to fit its content.
  useEffect(() => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`
  }, [text])

  function send() {
    const trimmed = text.trim()
    if (!trimmed || disconnected) return
    if (overLimit) {
      setShake(true)
      setTimeout(() => setShake(false), 400)
      return
    }
    if (onSend(trimmed)) setText('')
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="composer">
      <div className={`composer-box${shake ? ' shake' : ''}${disconnected ? ' is-disabled' : ''}`}>
        <textarea
          ref={taRef}
          className="composer-input"
          rows={1}
          placeholder={disconnected ? 'Reconnecting…' : 'Message #general'}
          value={text}
          disabled={disconnected}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <div className="composer-tools">
          {disconnected ? (
            <span className="hint hint-warn">disconnected</span>
          ) : (
            <span className="hint">↵ send · ⇧↵ newline</span>
          )}
          <div className="composer-right">
            {text.length >= COUNTER_AT && (
              <span className={`counter${overLimit ? ' over' : ''}`}>
                {text.length}/{MAX_LEN}
              </span>
            )}
            {!disconnected && text.trim() && (
              <button type="button" className="send" onClick={send}>
                SEND
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
