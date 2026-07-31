import { useLayoutEffect, useRef, useState } from 'react'

export interface ExplainResult {
  plain: string
  impact: string[]
  disclaimer: string
}

const MARGIN = 10
const GAP = 8

// Result card for the highlight-to-ask flow. Anchored near the selection
// rect; flips above the selection when it would overflow the viewport
// bottom, and clamps horizontally so it never runs off-screen (DESIGN §6.2,
// spec §3.6). Renders loading / error+retry / success — no follow-up or
// share-to-thread yet (that's the next milestone).
export function ExplainPopover({
  rect,
  highlighted,
  status,
  result,
  onClose,
  onRetry,
  onShare,
}: {
  rect: DOMRect
  highlighted: string
  status: 'loading' | 'success' | 'error'
  result: ExplainResult | null
  onClose: () => void
  onRetry: () => void
  onShare: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  // Measure after render (size depends on content/status) then place.
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
  }, [rect, status, result])

  return (
    <div
      ref={ref}
      className="explain-popover"
      // Hidden until measured once, so it never flashes at (0,0) first.
      style={pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0, visibility: 'hidden' }}
    >
      <div className="share-head">
        <span className="brand">
          <span className="sq" aria-hidden="true" /> CtxBridge
        </span>
        <button type="button" className="popover-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      <span className="quoted">{highlighted}</span>

      {status === 'loading' && <div className="popover-loading">Thinking…</div>}

      {status === 'error' && (
        <div className="popover-error">
          <p>Couldn't reach CtxBridge. The explanation may be temporarily unavailable.</p>
          <button type="button" className="retry" onClick={onRetry}>
            RETRY
          </button>
        </div>
      )}

      {status === 'success' && result && (
        <>
          <div className="disclaimer-row">
            <span className="disclaimer">{result.disclaimer}</span>
          </div>
          <div className="share-label">Plain</div>
          <p>{result.plain}</p>
          {result.impact.length > 0 && (
            <>
              <div className="share-label">Impact</div>
              <ul>
                {result.impact.map((bullet, i) => (
                  <li key={i}>{bullet}</li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      <div className="popover-footer">
        {status === 'success' && (
          <button type="button" className="share-btn" onClick={onShare}>
            ↗ Share to thread
          </button>
        )}
        <span className="popover-hint">esc to close</span>
      </div>
    </div>
  )
}
