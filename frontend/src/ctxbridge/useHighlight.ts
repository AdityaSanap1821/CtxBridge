import { useCallback, useEffect, useState } from 'react'

export interface HighlightSelection {
  text: string
  rect: DOMRect
  containingMessageText: string
  containingMessageRole: string
}

// Captures the current text selection when it falls inside a message bubble
// (marked by data-message-text - the DOM contract with Track C, DESIGN §3.4).
// Selection spanning multiple messages uses the message where it started and
// ignores the rest (DESIGN §9). `selection` is null for empty/whitespace
// selection or selection outside any message body. `clear` lets a consumer
// drop the captured selection after it acts on it (e.g. closing the popover),
// since a programmatic removeAllRanges() fires no mouseup/keyup to re-sync.
export function useHighlight(): { selection: HighlightSelection | null; clear: () => void } {
  const [selection, setSelection] = useState<HighlightSelection | null>(null)
  const clear = useCallback(() => setSelection(null), [])

  useEffect(() => {
    function handle() {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setSelection(null)
        return
      }
      const text = sel.toString().trim()
      if (!text) {
        setSelection(null)
        return
      }

      const anchorEl =
        sel.anchorNode instanceof Element ? sel.anchorNode : sel.anchorNode?.parentElement
      const container = anchorEl?.closest<HTMLElement>('[data-message-text]')
      if (!container) {
        setSelection(null)
        return
      }

      const rect = sel.getRangeAt(0).getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) {
        setSelection(null)
        return
      }

      setSelection({
        text,
        rect,
        containingMessageText: container.dataset.messageText ?? '',
        containingMessageRole: container.dataset.messageRole ?? '',
      })
    }

    // mouseup/keyup (not selectionchange) so the button appears once a drag
    // or shift+arrow selection finishes, not on every intermediate tick.
    document.addEventListener('mouseup', handle)
    document.addEventListener('keyup', handle)
    return () => {
      document.removeEventListener('mouseup', handle)
      document.removeEventListener('keyup', handle)
    }
  }, [])

  return { selection, clear }
}
