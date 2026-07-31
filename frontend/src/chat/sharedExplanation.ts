// Wire format for "share to thread" (design spec §3.8). The widget (Track D)
// posts a normal WS message whose `text` is this sentinel + JSON. Message.tsx
// detects the prefix and renders the branded card instead of a plain bubble.

const SENTINEL = '__ctxbridge__'

export interface SharedExplanation {
  highlighted: string
  plain: string
  impact: string[]
  reader_role: string
}

// Used by the widget when sharing. Kept here so both sides share one format.
export function encodeSharedExplanation(payload: SharedExplanation): string {
  return SENTINEL + JSON.stringify(payload)
}

// Returns the parsed payload if `text` is a well-formed shared explanation,
// or null otherwise. Null means "render as a plain message" — never throws,
// so a malformed payload can never crash the list (design spec §7).
export function decodeSharedExplanation(text: string): SharedExplanation | null {
  if (!text.startsWith(SENTINEL)) return null
  try {
    const parsed = JSON.parse(text.slice(SENTINEL.length))
    if (
      parsed &&
      typeof parsed.highlighted === 'string' &&
      typeof parsed.plain === 'string' &&
      Array.isArray(parsed.impact) &&
      typeof parsed.reader_role === 'string'
    ) {
      return {
        highlighted: parsed.highlighted,
        plain: parsed.plain,
        impact: parsed.impact.filter((b: unknown) => typeof b === 'string'),
        reader_role: parsed.reader_role,
      }
    }
  } catch {
    // fall through to null — treat as plain text
  }
  return null
}
