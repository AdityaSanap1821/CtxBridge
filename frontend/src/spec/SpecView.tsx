// Second-surface demo: renders a static PRD-style document whose paragraphs
// carry the same `data-message-text` / `data-message-role` contract as chat
// messages, so the highlight-to-ask widget lights up here unchanged. Proves
// the mechanism generalises past chat without a rebuild.

interface Paragraph {
  role: string
  text: string
}

// Draft PRD content deliberately reuses phrases from the seeded chat (canary
// release, pipeline velocity, sharded billing DB, ARR uplift) so a judge can
// highlight the same jargon on either surface and watch the widget work.
const HEADING = 'PRD - Pricing v2 (working draft)'
const AUTHOR = 'Priya · Product · updated Aug 12'

const SECTIONS: { heading: string; paragraphs: Paragraph[] }[] = [
  {
    heading: 'Goal',
    paragraphs: [
      {
        role: 'Product',
        text: 'Ship usage-based pricing before the September enterprise renewals (target Sept 15). The rollout is gated behind a canary release starting at 5% of traffic; we widen the blast radius once the error budget holds and the SLO checks stay green.',
      },
      {
        role: 'Product',
        text: 'Two enterprise prospects are already asking for a hard go-live date. Legal is separately reviewing whether the change is backward compatible with existing committed-use contracts.',
      },
    ],
  },
  {
    heading: 'Engineering plan',
    paragraphs: [
      {
        role: 'Engineering',
        text: "Metering moves to an event-sourced pipeline with idempotency keys on every usage event. The billing DB is being sharded in the same window; if we see replication lag we fail back to the legacy billing path via a kill switch.",
      },
      {
        role: 'Engineering',
        text: 'Invoicing webhooks get exponential backoff on retries plus a dead-letter queue so a failed billing event never silently drops. Watch p99 latency on the canary before we ramp to full traffic.',
      },
    ],
  },
  {
    heading: 'Launch narrative',
    paragraphs: [
      {
        role: 'Marketing',
        text: "We want to lead the launch with 'pipeline velocity' and lock in the ARR uplift claim - the narrative targets a double-digit net revenue retention bump. Demand-gen is asking for a single hero metric (cost per active seat) for the campaign.",
      },
      {
        role: 'Design',
        text: 'The usage dashboard needs final states for metered overages and the soft-cap warning before Figma hand-off. Overage alerts fire in-app and over email; the information architecture depends on that decision.',
      },
    ],
  },
]

export function SpecView() {
  return (
    <div className="spec-view">
      <div className="spec-doc">
        <div className="spec-head">
          <h1>{HEADING}</h1>
          <div className="spec-meta">{AUTHOR}</div>
        </div>
        {SECTIONS.map((section) => (
          <section key={section.heading} className="spec-section">
            <h2>{section.heading}</h2>
            {section.paragraphs.map((p, i) => (
              <p
                key={i}
                className="spec-para"
                // Same DOM contract as chat messages - the highlight widget
                // (HighlightLayer) picks up any element with data-message-text
                // regardless of surface. See useHighlight.ts.
                data-message-text={p.text}
                data-message-role={p.role}
              >
                {p.text}
              </p>
            ))}
          </section>
        ))}
        <div className="spec-footnote">
          Highlight any phrase to explain it in your own discipline's language - same widget as chat.
        </div>
      </div>
    </div>
  )
}
