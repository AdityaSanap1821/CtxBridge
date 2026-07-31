import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { Message } from './Message'
import type { Message as ChatMessage } from '../api/rest'

// Distance from the bottom (px) within which we treat the user as "pinned".
const PIN_THRESHOLD = 80

// Scrolling message feed. Auto-pins to the bottom on new messages unless the
// user has scrolled up, in which case a "new messages" chip appears (§3.2).
export function MessageList({ messages }: { messages: ChatMessage[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [pinned, setPinned] = useState(true)
  // Message count as of the last time the user was at the bottom. The unseen
  // chip is derived from this, so no setState happens inside the scroll effect.
  const [seenCount, setSeenCount] = useState(0)
  const prevCount = useRef(0)

  function scrollToBottom(behavior: ScrollBehavior = 'auto') {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior })
  }

  // Keep the view pinned to the bottom as messages arrive (imperative only).
  useLayoutEffect(() => {
    const grew = messages.length > prevCount.current
    prevCount.current = messages.length
    if (grew && pinned) scrollToBottom()
  }, [messages.length, pinned])

  // Pin to bottom once history has first rendered. Imperative only — the
  // unseen chip stays hidden until the user scrolls up (pinned starts true).
  useEffect(() => {
    scrollToBottom()
  }, [])

  function onScroll() {
    const el = scrollRef.current
    if (!el) return
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < PIN_THRESHOLD
    setPinned(near)
    if (near) setSeenCount(messages.length)
  }

  const unseen = !pinned && messages.length > seenCount

  return (
    <div className="msg-list-wrap">
      <div className="msg-list" ref={scrollRef} onScroll={onScroll}>
        {messages.map((m) => (
          <Message key={m.id} message={m} />
        ))}
      </div>
      {unseen && (
        <button
          type="button"
          className="new-messages"
          onClick={() => {
            scrollToBottom('smooth')
            setPinned(true)
            setSeenCount(messages.length)
          }}
        >
          New messages ↓
        </button>
      )}
    </div>
  )
}
