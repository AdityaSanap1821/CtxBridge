// Floating trigger that appears near a text selection inside a message body.
// Anchored with position:fixed using the selection's viewport rect.
export function AskButton({ rect, onClick }: { rect: DOMRect; onClick: () => void }) {
  const top = rect.top - 40
  const left = rect.left + rect.width / 2

  return (
    <button
      type="button"
      className="ask-btn"
      style={{ top: Math.max(8, top), left }}
      // Prevent the mousedown from collapsing the browser selection before
      // the click fires - HighlightLayer needs it to still be intact.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      Ask AI
    </button>
  )
}
