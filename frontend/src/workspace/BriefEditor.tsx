import { useEffect, useRef, useState } from 'react'

import { useBrief } from './useBrief'

function relativeTime(ts: number): string {
  const secs = Math.round((Date.now() - ts) / 1000)
  if (secs < 5) return 'just now'
  if (secs < 60) return `${secs}s ago`
  const mins = Math.round(secs / 60)
  if (mins < 60) return `${mins}m ago`
  return `${Math.round(mins / 60)}h ago`
}

// Splits the brief into paragraph blocks (blank-line separated) for the
// read-only card list. Each "KEY: value" line renders its key as a label.
function ParagraphCards({ text }: { text: string }) {
  const blocks = text
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)

  if (blocks.length === 0) {
    return <div className="brief-body brief-empty">No brief yet. Click Edit to add team context.</div>
  }

  return (
    <>
      {blocks.map((block, i) => {
        const match = block.match(/^([A-Z][A-Z –-]{1,20}):\s*([\s\S]*)$/)
        return (
          <div className="brief-body" key={i}>
            {match ? (
              <>
                <span className="k">{match[1]}</span>
                {match[2]}
              </>
            ) : (
              block
            )}
          </div>
        )
      })}
    </>
  )
}

// Sidebar brief: read-only paragraph cards that swap for a textarea on Edit.
// Explicit Save runs PUT /brief; Cancel discards the draft (design spec §3.7).
export function BriefEditor() {
  const { brief, loading, savedAt, save } = useBrief()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing) taRef.current?.focus()
  }, [editing])

  function startEdit() {
    setDraft(brief)
    setError(false)
    setEditing(true)
  }

  async function onSave() {
    setSaving(true)
    setError(false)
    try {
      await save(draft)
      setEditing(false)
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="side-section">
      <div className="h">
        Team brief
        {editing ? (
          <span className="edit editing">Editing</span>
        ) : (
          <button
            type="button"
            className="edit"
            onClick={startEdit}
            title="Edits apply on the next explanation; other clients see them on reload."
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="brief-edit">
          <textarea
            ref={taRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          {error && <div className="brief-error">Couldn't save — retry.</div>}
          <div className="row">
            <span>{savedAt ? `saved ${relativeTime(savedAt)}` : ''}</span>
            <div className="actions">
              <button type="button" className="mini-btn" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button type="button" className="mini-btn primary" onClick={onSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : loading ? (
        <div className="brief-body brief-empty">Loading brief…</div>
      ) : (
        <ParagraphCards text={brief} />
      )}
    </div>
  )
}
