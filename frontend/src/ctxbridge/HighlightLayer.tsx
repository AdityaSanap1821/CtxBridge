import { useCallback, useEffect, useRef, useState } from 'react'

import { useHighlight } from './useHighlight'
import { AskButton } from './AskButton'
import { ExplainPopover } from './ExplainPopover'
import type { ExplainResult, FollowUp } from './ExplainPopover'
import { explain } from '../api/rest'
import { encodeSharedExplanation } from '../chat/sharedExplanation'
import { useIdentity } from '../state/identity'

type Status = 'loading' | 'success' | 'error'

interface Active {
  highlighted: string
  context: string
  rect: DOMRect
  status: Status
  result: ExplainResult | null
  followUps: FollowUp[]
}

// Owns the highlight-to-ask flow. The Ask button is derived directly from the
// live selection (no mirrored state); clicking it snapshots the selection into
// `active` and drives loading -> success | error. Mounted once inside ChatView
// so the button and popover float above the message list (DESIGN §6.2).
export function HighlightLayer({ send }: { send: (text: string) => boolean }) {
  const identity = useIdentity()
  const { selection, clear } = useHighlight()
  const [active, setActive] = useState<Active | null>(null)
  const requestId = useRef(0)

  function run(query: { highlighted: string; context: string; rect: DOMRect }) {
    setActive({ ...query, status: 'loading', result: null, followUps: [] })
    const id = ++requestId.current
    explain({
      highlighted_text: query.highlighted,
      surrounding_context: query.context,
      reader_role: identity.role,
    })
      .then((res) => {
        if (id !== requestId.current) return
        setActive((a) =>
          a && {
            ...a,
            status: 'success',
            result: { plain: res.plain_explanation, impact: res.impact_bullets, disclaimer: res.disclaimer },
          }
        )
      })
      .catch(() => {
        if (id !== requestId.current) return
        setActive((a) => a && { ...a, status: 'error' })
      })
  }

  function ask() {
    if (!selection) return
    run({ highlighted: selection.text, context: selection.containingMessageText, rect: selection.rect })
  }

  function retry() {
    if (active) run({ highlighted: active.highlighted, context: active.context, rect: active.rect })
  }

  // Ask a follow-up. Builds `follow_up_history` per the DESIGN §5.2 contract:
  // assistant turns carry only plain_explanation (not the full JSON) — matches
  // the shape verified by the backend eval in Track B task #5. Failed prior
  // follow-ups are dropped from the history so the model doesn't see a hole.
  function submitFollowUp(question: string) {
    if (!active || active.status !== 'success' || !active.result) return
    const initialPlain = active.result.plain
    const priorSuccess = active.followUps.filter((f) => f.status === 'success')
    const history: { role: 'user' | 'assistant'; content: string }[] = [
      { role: 'assistant', content: initialPlain },
      ...priorSuccess.flatMap((f) => [
        { role: 'user' as const, content: f.question },
        { role: 'assistant' as const, content: f.answer },
      ]),
      { role: 'user', content: question },
    ]

    const pending: FollowUp = { question, answer: '', impact: [], status: 'loading' }
    let indexAt = -1
    setActive((a) => {
      if (!a) return a
      indexAt = a.followUps.length
      return { ...a, followUps: [...a.followUps, pending] }
    })

    const id = ++requestId.current
    explain({
      highlighted_text: active.highlighted,
      surrounding_context: active.context,
      reader_role: identity.role,
      follow_up_history: history,
    })
      .then((res) => {
        if (id !== requestId.current) return
        setActive((a) => {
          if (!a || indexAt < 0) return a
          const updated = [...a.followUps]
          updated[indexAt] = {
            question,
            answer: res.plain_explanation,
            impact: res.impact_bullets,
            status: 'success',
          }
          return { ...a, followUps: updated }
        })
      })
      .catch(() => {
        if (id !== requestId.current) return
        setActive((a) => {
          if (!a || indexAt < 0) return a
          const updated = [...a.followUps]
          updated[indexAt] = { question, answer: '', impact: [], status: 'error' }
          return { ...a, followUps: updated }
        })
      })
  }

  const close = useCallback(() => {
    requestId.current += 1 // invalidate any in-flight request
    setActive(null)
    window.getSelection()?.removeAllRanges()
    clear() // drop the captured selection so the Ask button doesn't linger
  }, [clear])

  // Post the explanation into the thread as a normal message carrying the
  // shared-explanation sentinel; Message.tsx renders it as the branded card
  // (DESIGN §6.2 step 6). Only closes if the send actually went out, so a
  // disconnected socket leaves the popover up to retry. Follow-up turns are
  // kept private to the asker for now — only the initial explanation is shared.
  function share() {
    if (!active || active.status !== 'success' || !active.result) return
    const text = encodeSharedExplanation({
      highlighted: active.highlighted,
      plain: active.result.plain,
      impact: active.result.impact,
      reader_role: identity.role,
    })
    if (send(text)) close()
  }

  // Esc closes the popover; click-outside closes it; scrolling invalidates the
  // captured rect so we close rather than float over stale content. Only wired
  // while the popover is open.
  useEffect(() => {
    if (!active) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    function onDown(e: MouseEvent) {
      if ((e.target as HTMLElement).closest('.explain-popover')) return
      close()
    }
    function onScroll(e: Event) {
      // Ignore scrolls that happen inside the popover itself (Q&A history).
      if ((e.target as HTMLElement).closest?.('.explain-popover')) return
      close()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('scroll', onScroll, true)
    }
  }, [active, close])

  if (active) {
    return (
      <ExplainPopover
        rect={active.rect}
        highlighted={active.highlighted}
        status={active.status}
        result={active.result}
        followUps={active.followUps}
        onClose={close}
        onRetry={retry}
        onShare={share}
        onSubmitFollowUp={submitFollowUp}
      />
    )
  }

  if (selection) {
    return <AskButton rect={selection.rect} onClick={ask} />
  }

  return null
}
