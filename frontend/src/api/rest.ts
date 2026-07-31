import type { Role } from '../chat/roles'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export interface Message {
  id: number
  author_name: string
  author_role: string // may be a known Role or an unrecognised string
  text: string
  created_at: string // ISO 8601
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`)
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
  return res.json() as Promise<T>
}

// GET /messages - full history, oldest first (DESIGN §5.1).
export function fetchMessages(): Promise<Message[]> {
  return getJson<Message[]>('/messages')
}

// GET /brief - the workspace context brief (DESIGN §5.3).
export async function fetchBrief(): Promise<string> {
  const data = await getJson<{ brief_text: string }>('/brief')
  return data.brief_text
}

// PUT /brief - persist an edited brief. Resolves once the server confirms.
export async function saveBrief(briefText: string): Promise<void> {
  const res = await fetch(`${API_URL}/brief`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brief_text: briefText }),
  })
  if (!res.ok) throw new Error(`PUT /brief failed: ${res.status}`)
}

export interface ExplainRequest {
  highlighted_text: string
  surrounding_context: string
  reader_role: Role
  // Discipline of the person who wrote the containing message. Optional; when
  // present, the backend uses it to calibrate the reframing direction.
  author_role?: string
  follow_up_history?: { role: 'user' | 'assistant'; content: string }[]
}

export interface ExplainSource {
  bullet_index: number
  type: 'brief' | 'context'
  quote: string
}

export interface ExplainResponse {
  plain_explanation: string
  impact_bullets: string[]
  // Verified citations grounding specific bullets. Empty when nothing was cited
  // or all citations failed verbatim-match on the server.
  sources: ExplainSource[]
  disclaimer: string
}

// POST /explain - owned by the widget (Track D); exported here so the whole
// REST surface lives in one module. Not called by Track C components.
export async function explain(req: ExplainRequest): Promise<ExplainResponse> {
  const res = await fetch(`${API_URL}/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) throw new Error(`POST /explain failed: ${res.status}`)
  return res.json() as Promise<ExplainResponse>
}
