import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { ROLES, ROLE_SHORT, roleKey } from '../chat/roles'
import type { Role } from '../chat/roles'
import type { ExplainSource } from '../api/rest'

export interface ExplainResult {
  plain: string
  impact: string[]
  sources: ExplainSource[]
  disclaimer: string
}

export interface FollowUp {
  question: string
  answer: string
  impact: string[]
  sources: ExplainSource[]
  status: 'loading' | 'success' | 'error'
}

const MARGIN = 10
const GAP = 8

// Result card for the highlight-to-ask flow. Anchored near the selection
// rect; flips above the selection when it would overflow the viewport
// bottom, and clamps horizontally so it never runs off-screen (DESIGN §6.2,
// spec §3.6). Renders loading / error+retry / success, plus follow-up Q&A
// once an initial success is on screen.
// Verified provenance footnotes for one bullet: "→ from brief: 'quote'".
// The server has already dropped any citations whose quote wasn't a verbatim
// substring of its claimed source, so anything reaching here is real.
function BulletSources({ sources, bulletIndex }: { sources: ExplainSource[]; bulletIndex: number }) {
  const mine = sources.filter((s) => s.bullet_index === bulletIndex)
  if (mine.length === 0) return null
  return (
    <div className="bullet-sources">
      {mine.map((s, i) => (
        <div className="bullet-source" key={i}>
          <span className="bullet-source-type">from {s.type}:</span>
          <span className="bullet-source-quote">"{s.quote}"</span>
        </div>
      ))}
    </div>
  )
}

export function ExplainPopover({
  rect,
  highlighted,
  status,
  result,
  followUps,
  viewingRole,
  onClose,
  onRetry,
  onShare,
  onSubmitFollowUp,
  onChangeRole,
}: {
  rect: DOMRect
  highlighted: string
  status: 'loading' | 'success' | 'error'
  result: ExplainResult | null
  followUps: FollowUp[]
  viewingRole: Role
  onClose: () => void
  onRetry: () => void
  onShare: () => void
  onSubmitFollowUp: (question: string) => void
  onChangeRole: (role: Role) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [draft, setDraft] = useState('')

  const pending = followUps.some((f) => f.status === 'loading')
  const canSubmit = draft.trim().length > 0 && !pending
  const [copied, setCopied] = useState(false)

  // Show a transient "Copied!" state on the copy button. Reset after ~1.5s.
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(t)
  }, [copied])

  async function copy() {
    if (!result) return
    const lines: string[] = [`"${highlighted}"`, '', result.plain]
    if (result.impact.length) {
      lines.push('', 'Impact:')
      for (const b of result.impact) lines.push(`- ${b}`)
    }
    for (const f of followUps) {
      if (f.status !== 'success') continue
      lines.push('', `Q: ${f.question}`, `A: ${f.answer}`)
      for (const b of f.impact) lines.push(`- ${b}`)
    }
    lines.push('', `- ${result.disclaimer}`)
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setCopied(true)
    } catch {
      // Clipboard access can be blocked (no HTTPS, no user gesture, permissions).
      // Fail quietly - the button just doesn't flash "Copied!".
    }
  }

  // Measure after every content change (initial result, added follow-ups)
  // so the popover stays anchored correctly as it grows.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    let top = rect.bottom + GAP
    if (top + height > vh - MARGIN) {
      top = rect.top - height - GAP
    }
    top = Math.max(MARGIN, Math.min(top, vh - height - MARGIN))

    let left = rect.left + rect.width / 2 - width / 2
    left = Math.max(MARGIN, Math.min(left, vw - width - MARGIN))

    setPos({ top, left })
  }, [rect, status, result, followUps.length])

  // Auto-scroll to the latest follow-up as they land.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [followUps.length, followUps[followUps.length - 1]?.status])

  function submit() {
    if (!canSubmit) return
    const q = draft.trim()
    setDraft('')
    onSubmitFollowUp(q)
    // Refocus for the next question.
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <div
      ref={ref}
      className="explain-popover"
      // Hidden until measured once, so it never flashes at (0,0) first.
      style={pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0, visibility: 'hidden' }}
    >
      <div className="share-head">
        <span className="brand">
          <span className="sq" aria-hidden="true" /> Refract
        </span>
        <button type="button" className="popover-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      <span className="quoted">{highlighted}</span>

      <div className="role-toggle" role="radiogroup" aria-label="Explain as role">
        <span className="role-toggle-label">View as</span>
        {ROLES.map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={r === viewingRole}
            className={`role-toggle-pill role-${roleKey(r)}${r === viewingRole ? ' on' : ''}`}
            onClick={() => onChangeRole(r)}
            disabled={status === 'loading'}
            title={r}
          >
            {ROLE_SHORT[r]}
          </button>
        ))}
      </div>

      {status === 'loading' && <div className="popover-loading">Thinking…</div>}

      {status === 'error' && (
        <div className="popover-error">
          <p>Couldn't reach Refract. The explanation may be temporarily unavailable.</p>
          <button type="button" className="retry" onClick={onRetry}>
            RETRY
          </button>
        </div>
      )}

      {status === 'success' && result && (
        <div className="popover-scroll" ref={scrollRef}>
          <div className="disclaimer-row">
            <span className="disclaimer">{result.disclaimer}</span>
          </div>
          <div className="share-label">Plain</div>
          <p>{result.plain}</p>
          {result.impact.length > 0 && (
            <>
              <div className="share-label">Impact</div>
              <ul className="impact-list">
                {result.impact.map((bullet, i) => (
                  <li key={i}>
                    {bullet}
                    <BulletSources sources={result.sources} bulletIndex={i} />
                  </li>
                ))}
              </ul>
            </>
          )}

          {followUps.map((f, i) => (
            <div className="follow-up" key={i}>
              <div className="follow-up-q">
                <span className="follow-up-tag">You</span>
                <span>{f.question}</span>
              </div>
              {f.status === 'loading' && (
                <div className="follow-up-a follow-up-loading">Thinking…</div>
              )}
              {f.status === 'error' && (
                <div className="follow-up-a follow-up-error">
                  Couldn't get a reply. Ask again to retry.
                </div>
              )}
              {f.status === 'success' && (
                <div className="follow-up-a">
                  <span className="follow-up-tag">Refract</span>
                  <p className="follow-up-a-plain">{f.answer}</p>
                  {f.impact.length > 0 && (
                    <ul className="impact-list">
                      {f.impact.map((bullet, j) => (
                        <li key={j}>
                          {bullet}
                          <BulletSources sources={f.sources} bulletIndex={j} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {status === 'success' && result && (
        <div className="follow-up-input">
          <input
            ref={inputRef}
            type="text"
            placeholder={pending ? 'Waiting for reply…' : 'Ask a follow-up…'}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
              // Prevent Esc from bubbling to the popover close handler while
              // the user is mid-typing - they can still click the × button.
              if (e.key === 'Escape') e.stopPropagation()
            }}
            disabled={pending}
          />
          <button
            type="button"
            className="follow-up-send"
            onClick={submit}
            disabled={!canSubmit}
            aria-label="Ask follow-up"
          >
            ↵
          </button>
        </div>
      )}

      <div className="popover-footer">
        {status === 'success' && (
          <>
            <button
              type="button"
              className="copy-btn"
              onClick={copy}
              aria-label="Copy explanation to clipboard"
            >
              {copied ? '✓ Copied' : '⧉ Copy'}
            </button>
            <button type="button" className="share-btn" onClick={onShare}>
              ↗ Share to thread
            </button>
          </>
        )}
        <span className="popover-hint">esc to close</span>
      </div>
    </div>
  )
}
