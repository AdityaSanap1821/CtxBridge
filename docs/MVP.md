# CtxBridge — MVP Scope & 24-Hour Plan

**Version:** 0.1
**Date:** 2026-07-31
**Related:** [PRD.md](./PRD.md), [DESIGN.md](./DESIGN.md)

---

## 1. What the MVP Is

A **live, multi-user demo chat app** (built by us) with **CtxBridge** layered on top. Teammates join from their own machines as different roles, chat live over a seeded conversation, and invoke CtxBridge by highlighting any message to get a role-aware plain-language explanation plus role-specific impact bullets.

The MVP proves the core thesis in one screen: **the same highlighted text explained differently for different roles, grounded in the team's real context.**

---

## 2. Scope

### In scope — Core (must ship)
- **C1** — Real-time multi-user chat (join with name + role, live broadcast, seeded history)
- **C2** — Highlight-to-Ask floating button
- **C3** — Role-aware plain explanation
- **C4** — Role-specific impact bullets, labeled AI-inferred
- **C5** — Team context brief (editable, fed into every explanation)
- **C6** — Two-way translation (any discipline → reader's discipline)
- **C7** — Privacy by default (asking is private; nothing stored unless shared)

### In scope — Extras (should ship)
- **E1** — Inline follow-up Q&A in the popup
- **E2** — Share explanation to thread

### Deferred — Stretch (only if ahead)
- **S1** — Proactive alignment nudge (LLM flags likely cross-role misalignment unprompted)

### Cut (explicitly not doing)
- Review Mode (highlight a spec/mockup, check against requirements)
- Real Slack/Teams/Notion integration
- Accounts / auth, analytics / per-question logging
- Cross-message text selection

---

## 3. Feature Priority (MoSCoW)

| Priority | Features | Notes |
|---|---|---|
| **Must** | C1–C7 | The demo does not exist without these |
| **Should** | E1, E2 | High demo value, low cost — build after core works |
| **Could** | S1 | Only if comfortably ahead; first thing cut if behind |
| **Won't** | Review Mode, real integrations, auth | Documented as future scope |

---

## 4. 24-Hour Milestone Plan

| Milestone | Window | Goal | Done when |
|---|---|---|---|
| **M0 — Scaffold** | 0–2h | Repo, FastAPI + React shells, SQLite + seed | App boots; seeded messages render |
| **M1 — Live chat** | 2–8h | Real-time multi-user chat end-to-end | Two windows chat live with no desync |
| **M2 — The Brain** | 8–16h | Highlight → `/explain` → Mistral → render plain + impact | Highlight any message, get role-aware output |
| **M3 — Extras** | 16–20h | Brief editor, follow-up Q&A, share-to-thread | E1 + E2 work in the live app |
| **M4 — Polish** | 20–23h | UI polish, scripted scenario, error handling, deploy choice | Demo scenario runs clean start-to-finish |
| **Buffer** | 23–24h | Full dry-run + fixes | Team can run the demo without surprises |

> **The golden rule:** M2 is the demo. Everything after M2 is cut-able in priority order. Get to a demoable brain as early as possible, even if rough.

---

## 5. Demo Script (target narrative)

1. **Setup shot:** Show the team chat with seeded history — an engineer's message about a "canary release / feature flag rollout for the new pricing engine."
2. **The gap:** A teammate (as **Sales**) highlights "gated behind a canary release" → **Ask AI** button appears → click.
3. **The payoff:** Plain explanation appears in Sales's language, plus 2 impact bullets ("avoid quoting a hard go-live date…") labeled *AI-inferred*.
4. **The aha:** Another teammate highlights the *same* text as **Design** or **Marketing** → visibly different, role-appropriate output. Same words, different meaning for different people.
5. **Two-way:** An **Engineer** highlights a marketing term ("pipeline velocity") → explained in engineering terms.
6. **Grounded:** Point out that the impact bullets reflect the team brief (a real commitment), not a generic guess.
7. **Close the loop:** Ask a follow-up ("does this affect our launch date?") in-place, then **share to thread** so the whole team benefits.
8. **The pitch:** "It stayed silent until we hit a wall — then it explained not just what it meant, but what it meant for *each of us*."

---

## 6. Definition of Done (MVP)

- [ ] Multiple teammates chat live from separate machines with no desync (C1)
- [ ] Highlighting a message shows the Ask AI button and returns output in < ~5s (C2, NFR1)
- [ ] Same text + different role → visibly different explanation (C3, C4 — the core proof)
- [ ] Impact bullets are labeled AI-inferred and reflect the team brief (C4, C5)
- [ ] Two-way translation demonstrated (C6)
- [ ] Asking is private; explanations not stored unless shared (C7)
- [ ] Follow-up Q&A and share-to-thread work live (E1, E2)
- [ ] LLM failures degrade gracefully — UI never breaks (NFR2)
- [ ] Full demo script runs clean end-to-end in a dry run

---

## 7. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| LLM returns malformed JSON | Broken popover | Strict prompt + defensive parse + fallback to plain text |
| Explanations feel generic | Weak "impact" story | Invest early in the team brief + prompt; use the eval harness |
| Venue Wi-Fi isolates clients | Demo can't sync | Build local-first; keep deploy option open (env-driven URLs) |
| Scope creep past M2 | Nothing polished | Enforce priority order; treat everything after M2 as optional |
| Mistral latency/outage on demo day | Awkward pause | Loading states; retry; consider a cached "known-good" scenario as backup |
| Highlight UX fiddliness (button placement) | Feels janky | Keep selection single-message; test button anchoring early |

---

## 8. Open Decisions (to resolve during build)

- **D1** — Demo delivery method (cloud deploy vs ngrok tunnel vs LAN) — decide after M2.
- **D2** — Exact seeded conversation content — write alongside M4 to best fit the demo narrative.
- **D3** — Whether to add a simple "known-good" cached response as a demo-day safety net.
