# CtxBridge — Team Task Distribution (5 Members)

**Date:** 2026-07-31
**Related:** [PRD.md](./PRD.md), [DESIGN.md](./DESIGN.md), [MVP.md](./MVP.md)

The split follows the architecture's natural seams (host/brain × backend/frontend) so people own non-overlapping code and rarely block each other. Assign real names to A–E based on strengths — notes below on who each slot suits.

---

## 1. Roles at a Glance

| # | Owner | Owns | Best suited to |
|---|---|---|---|
| **A** | **Realtime Chat Backend** | `chat/`, `db.py`, `seed.py`, WebSocket + history | Strong Python/async; likes plumbing |
| **B** | **The Brain (Backend + Prompt)** | `ctxbridge/`, `prompt.py`, `llm/`, `/explain`, eval harness | Best at LLMs/prompting — **highest-value, riskiest slot** |
| **C** | **Chat Frontend** | Join, ChatView, MessageList, Composer, WS/REST clients | Solid React; UI structure |
| **D** | **CtxBridge Widget Frontend** | `useHighlight`, AskButton, ExplainPopover, follow-up, share | React + fiddly DOM/selection work |
| **E** | **Integration / Brief / DevOps / Demo Lead** | Team brief (both ends), config/env/CORS, deploy, seed content, demo script, testing, polish | Generalist + owns the demo landing cleanly |

---

## 2. Critical Path & How We Avoid Blocking

Two dependency chains matter:

- **Live chat:** A (chat backend) → C (chat frontend)
- **The demo:** B (`/explain`) → D (widget)

**Unblocking rule — ship stubs in the first 2 hours:**
- **B ships a stubbed `/explain` immediately** that returns canned, correctly-shaped JSON. D then builds the entire popover against real-shaped data without waiting for the prompt to be good.
- **A publishes the WS/REST contract hour 1** (it's already in [DESIGN.md §5](./DESIGN.md)). C builds against hardcoded messages + a thin mock until A's socket is live.
- **E provides the default team-brief text early** so B can ground the prompt and C/D have real content.

Everyone codes against the contracts in DESIGN.md §5 — those are the interface, agreed at M0.

---

## 3. M0 — Scaffold & Contracts (0–2h) — *whole team*

Get skeletons booting so everyone can work in parallel after this.

- **All:** agree repo layout, branch strategy (feature branches → `main`), `.env` keys, and lock the API contracts (DESIGN §5). No contract changes after this without telling the two sides.
- **A:** FastAPI app boots, SQLite schema + `db.py`, empty `chat/` routes, `seed.py` scaffold.
- **B:** `ctxbridge/` module + **stubbed `POST /explain` returning canned JSON**, `llm/base.py` interface (no real call yet).
- **C:** Vite + React app boots, JoinScreen (name + role), empty ChatView shell, `api/` clients scaffolded.
- **D:** `ctxbridge/` frontend folder, a bare ExplainPopover that renders against the stub response.
- **E:** repo init + README, `.env.example`, CORS config, shared roles constant, draft default team-brief text.

**Exit:** every app boots; D's popover renders B's stub; C shows seeded/hardcoded messages.

---

## 4. M1 — Live Chat End-to-End (2–8h)

Primary owners: **A + C** (B, D, E advance their own tracks in parallel).

- **A:** WebSocket endpoint + `ConnectionManager` (broadcast to all clients); persist each message to SQLite; `GET /messages` history; wire `seed.py` to load on startup (idempotent).
- **C:** WS client (`ws.ts`) + REST history; render live message list; Composer sends via WS; identity (name + role) threaded into outgoing messages; auto-scroll, basic styling.
- **B (parallel):** start real `MistralProvider` + `prompt.py` v1; keep the stub as fallback.
- **D (parallel):** `useHighlight` — `window.getSelection()` → selected text + anchor rect; float the AskButton near the selection.
- **E (parallel):** brief `GET/PUT /brief` endpoints + BriefEditor UI; env wiring; help A/C with integration.

**Exit (M1 gate):** two browser windows chat live as different roles with no desync.

---

## 5. M2 — The Brain (8–16h) — *the demo; swarm here*

Primary owners: **B + D**. This is what we're judged on — if anyone finishes early, they join here.

- **B:** real `/explain` end-to-end — prompt builder (system persona + brief + role + context + highlighted text), Mistral call, **strict JSON parse + fallback**; build the **eval harness** (few seeded messages × each role) and iterate prompt quality; tune impact bullets to be grounded, not generic.
- **D:** wire AskButton → `POST /explain` with `{highlighted_text, surrounding_context (containing message), reader_role}`; ExplainPopover renders plain explanation + impact bullets **tagged "AI-inferred — verify"**; loading + error states.
- **C (support):** ensure MessageList exposes the containing message's full text as surrounding context to the widget; role available from identity state.
- **A (support):** any history/context endpoints the widget needs; help harden WS.
- **E:** run the eval harness with B, curate the **seeded demo conversation** so the highlight examples land; start the demo script.

**Exit (M2 gate — the core proof):** highlight any message → role-aware explanation + impact in < ~5s; same text under a different role gives visibly different output.

---

## 6. M3 — Extras (16–20h)

- **D:** inline follow-up Q&A (append `follow_up_history`, render Q&A in popover); share-to-thread (post formatted explanation as a normal chat message).
- **B:** support follow-up in the prompt (continue the same Q&A coherently).
- **C:** render shared explanations nicely in the message list (distinct style).
- **E:** finalize BriefEditor UX; make the brief content demo-perfect.
- **A:** stability pass on WS (reconnect → re-pull history).

**Exit:** follow-up + share-to-thread work live; brief edits change explanations.

---

## 7. M4 — Polish & Demo (20–23h) — *whole team*

- **E (lead):** own the demo script + dry-run; decide delivery method (cloud / tunnel / LAN); optional cached "known-good" response as a safety net.
- **C + D:** UI polish — button placement, popover styling, empty/loading/error states, mobile-safe enough for judges' screens.
- **B:** final prompt tuning against the exact seeded scenario; lock the model + params.
- **A:** load-check with 5 concurrent clients; fix any desync.
- **All:** kill scope creep — anything not in Definition of Done ([MVP.md §6](./MVP.md)) is out.

---

## 8. Buffer (23–24h) — *whole team*

Full demo dry-run following the script (MVP §5). Freeze features; only fix demo-breaking bugs. Prepare the pitch handoff using the updated [pitch deck](../CtxBridge_Hackathon_Pitch.md).

---

## 9. Per-Person Definition of Done

- **A:** seeded history loads; live multi-user chat with no desync; WS survives reconnect.
- **B:** `/explain` returns grounded, role-specific JSON reliably; never crashes the UI (fallback works); eval harness shows quality across roles.
- **C:** join → live chat feels like a real chat app; surrounding context + role reach the widget.
- **D:** highlight → Ask AI → clean popover with labeled impact; follow-up + share-to-thread work.
- **E:** app runs for the whole team; demo script runs clean end-to-end; brief is demo-perfect; delivery method chosen.

---

## 10. Coordination Notes

- **Contracts are frozen at M0.** Any change → announce to both affected owners immediately.
- **Integrate continuously** — merge to `main` often; don't save integration for the end.
- **M2 is the demo.** If we're behind, cut in this order: proactive nudge (already deferred) → share-to-thread → follow-up → polish. Never cut the M2 core.
- **One shared channel** for "I'm blocked on X" — E watches it and unblocks.
