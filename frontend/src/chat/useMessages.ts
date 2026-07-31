import { useCallback, useEffect, useRef, useState } from 'react'

import { fetchMessages } from '../api/rest'
import type { Message } from '../api/rest'
import { ChatSocket } from '../api/ws'
import type { ConnectionState } from '../api/ws'
import type { Identity } from '../state/identity'

interface UseMessages {
  messages: Message[]
  connection: ConnectionState
  attempt: number
  send: (text: string) => boolean
  retry: () => void
}

// Owns the message array. On mount: GET /messages, then open the socket and
// append live frames. On reconnect: re-pull history and merge by id so no
// message is lost or duplicated (design spec §5.2).
export function useMessages(identity: Identity): UseMessages {
  const [messages, setMessages] = useState<Message[]>([])
  const [connection, setConnection] = useState<ConnectionState>('connecting')
  const [attempt, setAttempt] = useState(0)
  const socketRef = useRef<ChatSocket | null>(null)

  // Append a single message, ignoring duplicates by id (server id is authoritative).
  const appendMessage = useCallback((incoming: Message) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === incoming.id)) return prev
      return [...prev, incoming]
    })
  }, [])

  // Merge a fresh history pull into current state, keeping id order.
  const mergeHistory = useCallback((history: Message[]) => {
    setMessages((prev) => {
      const byId = new Map<number, Message>()
      for (const m of prev) byId.set(m.id, m)
      for (const m of history) byId.set(m.id, m)
      return Array.from(byId.values()).sort((a, b) => a.id - b.id)
    })
  }, [])

  useEffect(() => {
    let cancelled = false

    // Initial history load.
    fetchMessages()
      .then((history) => {
        if (!cancelled) mergeHistory(history)
      })
      .catch(() => {
        // history will fill in on the next reconnect pull if this fails
      })

    const socket = new ChatSocket({
      onMessage: appendMessage,
      onState: (state, currentAttempt) => {
        setConnection(state)
        setAttempt(currentAttempt)
      },
      onReconnect: () => {
        fetchMessages()
          .then((history) => {
            if (!cancelled) mergeHistory(history)
          })
          .catch(() => {})
      },
    })
    socketRef.current = socket
    socket.connect()

    return () => {
      cancelled = true
      socket.close()
      socketRef.current = null
    }
  }, [appendMessage, mergeHistory])

  const send = useCallback(
    (text: string): boolean => {
      const trimmed = text.trim()
      if (!trimmed) return false
      return (
        socketRef.current?.send({
          author_name: identity.name,
          author_role: identity.role,
          text: trimmed,
        }) ?? false
      )
    },
    [identity.name, identity.role],
  )

  const retry = useCallback(() => {
    socketRef.current?.retry()
  }, [])

  return { messages, connection, attempt, send, retry }
}
