import type { Message } from './rest'
import type { Role } from '../chat/roles'

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000/ws'

export type ConnectionState = 'connecting' | 'open' | 'reconnecting' | 'closed'

interface OutgoingMessage {
  type: 'message'
  author_name: string
  author_role: Role
  text: string
}

interface IncomingMessage {
  type: 'message'
  message: Message
}

export interface ChatSocketHandlers {
  onMessage: (message: Message) => void
  onState: (state: ConnectionState, attempt: number) => void
  // Fired when a fresh connection opens after a drop, so the caller can
  // re-pull history and diff (DESIGN §9). Not fired on the first connect.
  onReconnect: () => void
}

// Exponential backoff schedule, capped, then give up until manual retry.
const BACKOFF_MS = [1000, 2000, 4000, 8000, 8000]

// Thin WebSocket client: connects, auto-reconnects with backoff, and sends
// message frames. History is owned by the caller via REST - this only carries
// the live channel.
export class ChatSocket {
  private ws: WebSocket | null = null
  private handlers: ChatSocketHandlers
  private attempt = 0
  private hasConnectedOnce = false
  private manuallyClosed = false
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  constructor(handlers: ChatSocketHandlers) {
    this.handlers = handlers
  }

  connect(): void {
    this.manuallyClosed = false
    this.open()
  }

  private open(): void {
    this.handlers.onState(this.attempt === 0 ? 'connecting' : 'reconnecting', this.attempt)

    let ws: WebSocket
    try {
      ws = new WebSocket(WS_URL)
    } catch {
      this.scheduleReconnect()
      return
    }
    this.ws = ws

    ws.onopen = () => {
      const wasReconnect = this.hasConnectedOnce
      this.attempt = 0
      this.hasConnectedOnce = true
      this.handlers.onState('open', 0)
      if (wasReconnect) this.handlers.onReconnect()
    }

    ws.onmessage = (event) => {
      let payload: IncomingMessage
      try {
        payload = JSON.parse(event.data)
      } catch {
        return
      }
      if (payload?.type === 'message' && payload.message) {
        this.handlers.onMessage(payload.message)
      }
    }

    ws.onclose = () => {
      this.ws = null
      if (!this.manuallyClosed) this.scheduleReconnect()
    }

    ws.onerror = () => {
      // onclose follows and drives the reconnect; nothing to do here.
      ws.close()
    }
  }

  private scheduleReconnect(): void {
    if (this.attempt >= BACKOFF_MS.length) {
      // Exhausted automatic retries - wait for an explicit retry() call.
      this.handlers.onState('closed', this.attempt)
      return
    }
    const delay = BACKOFF_MS[this.attempt]
    this.attempt += 1
    this.reconnectTimer = setTimeout(() => this.open(), delay)
  }

  // Called by the UI's "Retry" affordance after backoff is exhausted.
  retry(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.attempt = 0
    this.open()
  }

  send(message: Omit<OutgoingMessage, 'type'>): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) return false
    const frame: OutgoingMessage = { type: 'message', ...message }
    this.ws.send(JSON.stringify(frame))
    return true
  }

  close(): void {
    this.manuallyClosed = true
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
    this.ws = null
  }
}
