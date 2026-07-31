# CtxBridge — Team Task Distribution (5 Members)

**Date:** 2026-07-31
**Related:** [PRD.md](./PRD.md), [DESIGN.md](./DESIGN.md), [MVP.md](./MVP.md)

The split follows the architecture's natural seams (host/brain × backend/frontend) so people own non-overlapping code and rarely block each other. Sharayu owns the presentation, research, and demo narrative — the story the demo is judged on.

**Scope note:** No cloud deploy for this hackathon. Runs locally on one or more laptops (LAN if multi-machine). Integration is a shared phase owned by all four devs after the frontend and backend tracks are functional.

---

## 1. Roles at a Glance

| Owner | Track | Owns | Notes |
|---|---|---|---|
| **Sahil** | **A — Realtime Chat Backend** | `chat/`, `db.py`, `seed.py`, `workspace/`, WebSocket + history + brief endpoints | Plumbing, async, seed loading |
| **Aditya** | **B — The Brain (Backend + Prompt)** | `ctxbridge/`, `prompt.py`, `llm/`, `/explain`, eval harness | **Highest-value, riskiest slot — this is the demo** |
| **Atharva** | **C — Chat Frontend** | Join, ChatView, MessageList, Composer, WS/REST clients, identity state | Real-time UI structure |
| **Soham** | **D — CtxBridge Widget Frontend** | `useHighlight`, AskButton, ExplainPopover, follow-up, share-to-thread | Fiddly DOM/selection work — the "aha" moment |
| **Sharayu** | **Presentation / Research** | Personas, competitive landscape, pitch deck, demo script, seeded conversation + brief text, rehearsals | Owns the story the demo lands |

---

## 2. Critical Path & How We Avoid Blocking

Two dependency chains matter:

- **Live chat:** Sahil (chat backend) → Atharva (chat frontend)
- **The demo:** Aditya (`/explain`) → Soham (widget)

**Unblocking rule — ship stubs in the first 2 hours:**
- **Aditya keeps the current stubbed `/explain`** (already in [ctxbridge/routes.py](../backend/app/ctxbridge/routes.py)) so Soham builds the entire popover against real-shaped data without waiting for the prompt to be good.
- **Sahil publishes the WS/REST contract hour 1** (it's already in [DESIGN.md §5](./DESIGN.md)). Atharva builds against hardcoded messages + a thin mock until Sahil's socket is live.
- **Sharayu provides the default team-brief text + a first draft of the seeded conversation early** so Aditya can ground the prompt and Atharva/Soham have real content to work with.

Everyone codes against the contracts in DESIGN.md §5 — those are the interface, frozen at M0.

---

## 3. M0 — Scaffold & Contracts (0–2h) — *whole team*

Get skeletons ready so everyone can work in parallel after this. (Most scaffolding already exists — see current repo state.)

- **All:** confirm repo layout, branch strategy (feature branches → `main`), `.env` keys (`MISTRAL_API_KEY`, `LLM_MODEL`, `CORS_ORIGINS`, `VITE_API_URL`, `VITE_WS_URL`), and lock the API contracts (DESIGN §5). No contract changes after this without telling the two sides.
- **Sahil:** verify FastAPI app boots, SQLite schema + [db.py](../backend/app/db.py), [chat/routes.py](../backend/app/chat/routes.py), [seed.py](../backend/app/seed.py) scaffold; confirm `GET /messages` works.
- **Aditya:** confirm `ctxbridge/` module boots + **stubbed `POST /explain` returning canned JSON** ([ctxbridge/routes.py](../backend/app/ctxbridge/routes.py)); [llm/base.py](../backend/app/llm/base.py) interface (no real call yet).
- **Atharva:** replace the default Vite starter in [App.tsx](../frontend/src/App.tsx); JoinScreen (name + role), empty ChatView shell, `api/` clients scaffolded.
- **Soham:** `ctxbridge/` frontend folder, a bare ExplainPopover that renders against Aditya's stub response.
- **Sharayu:** draft default team-brief text and a first-pass seeded conversation (rough — will iterate).

**Exit:** every app boots; Soham's popover renders Aditya's stub; Atharva shows seeded/hardcoded messages.

---

## 4. M1 — Live Chat End-to-End (2–8h)

Primary owners: **Sahil + Atharva** (Aditya, Soham, Sharayu advance their own tracks in parallel).

- **Sahil:** harden WebSocket endpoint + `ConnectionManager` (broadcast to all clients); persist each message to SQLite; `GET /messages` history; wire [seed.py](../backend/app/seed.py) to load on startup (idempotent); `GET/PUT /brief` endpoints working end-to-end.
- **Atharva:** WS client (`ws.ts`) + REST history; render live message list; Composer sends via WS; identity (name + role) threaded into outgoing messages; auto-scroll, basic styling; BriefEditor UI wired to `GET/PUT /brief`.
- **Aditya (parallel):** start real `MistralProvider` + `prompt.py` v1; keep the stub as fallback.
- **Soham (parallel):** `useHighlight` — `window.getSelection()` → selected text + anchor rect + containing message's full text; float the AskButton near the selection.
- **Sharayu (parallel):** personas (one card per role), competitive landscape research, refine seeded conversation and brief.

**Exit (M1 gate):** two browser windows chat live as different roles with no desync; brief edits persist.

---

## 5. M2 — The Brain (8–16h) — *the demo; swarm here*

Primary owners: **Aditya + Soham**. This is what we're judged on — if anyone finishes early, they join here.

- **Aditya:** real `/explain` end-to-end — prompt builder (system persona + brief + role + context + highlighted text), Mistral call via `MistralProvider`, **strict JSON parse + fallback**; build the **eval harness** (few seeded messages × each role) and iterate prompt quality; tune impact bullets to be grounded, not generic; lock model + params.
- **Soham:** wire AskButton → `POST /explain` with `{highlighted_text, surrounding_context, reader_role}`; ExplainPopover renders plain explanation + impact bullets **tagged "AI-inferred — verify"**; loading + error states; popover positioning (flip when clipped, Esc + click-outside to close).
- **Atharva (support):** ensure MessageList exposes the containing message's full text as `surrounding_context` to the widget (agree on the DOM contract with Soham — a `data-message-text` attribute on the bubble is the simplest); role available from identity state.
- **Sahil (support):** any history/context endpoints the widget needs; help harden WS; stability pass.
- **Sharayu:** run the eval harness with Aditya, curate the **seeded demo conversation** so the highlight examples land; lock the highlight → role matrix (which 2–3 phrases get demoed under which roles for the SC3 "same text, different role" moment); draft the demo script.

**Exit (M2 gate — the core proof):** highlight any message → role-aware explanation + impact in < ~5s; same text under a different role gives visibly different output.

---

## 6. M3 — Extras + Shared Integration (16–20h)

### 6.1 Extras (parallel)

- **Soham:** inline follow-up Q&A (append `follow_up_history`, render Q&A in popover); share-to-thread (post formatted explanation as a normal chat message via Atharva's WS client).
- **Aditya:** support follow-up in the prompt (continue the same Q&A coherently).
- **Atharva:** render shared explanations nicely in the message list (distinct style).
- **Sahil:** stability pass on WS (reconnect → re-pull history); rate/length limits on message input.
- **Sharayu:** finalize pitch deck; write talking points for likely judge questions.

### 6.2 Integration checkpoint — *all 4 devs together*

Once frontend and backend tracks are functional independently, the four devs sit down and integrate. Rough checklist:

1. **Wire frontend → backend URLs** — set `VITE_API_URL` / `VITE_WS_URL` at whoever hosts the backend, or `localhost` if one machine runs both.
2. **CORS check** — backend `CORS_ORIGINS` allows the frontend origin(s).
3. **End-to-end smoke test** — join from 2+ browser windows as different roles, chat live, highlight a message, get an explanation, follow up, share to thread.
4. **Contract audit** — verify `surrounding_context` handoff between Atharva and Soham works with real messages (not just hardcoded).
5. **Role-switch demo path** — confirm SC3 (same text, different role → different output) actually works with the real prompt + seeded conversation.
6. **Seed conversation** — Sharayu's scripted messages actually appear on startup via [seed.py](../backend/app/seed.py).
7. **Brief flows through** — edit brief → next `/explain` reflects it in impact bullets.
8. **LAN test** — if demoing across laptops, test on the actual network once.
9. **Failure modes** — kill the LLM key → 503 renders cleanly; disconnect WS → reconnect banner shows; malformed JSON → fallback path renders.

**Exit:** follow-up + share-to-thread work live; brief edits change explanations; end-to-end demo path runs clean on the demo machine(s).

---

## 7. M4 — Polish & Demo (20–23h) — *whole team*

- **Sharayu (lead):** own the demo script + dry-run; prepare the pitch deck for handoff; optional cached "known-good" `/explain` response as an LLM-failure safety net (coordinate with Aditya on how to swap it in).
- **Atharva + Soham:** UI polish — button placement, popover styling, empty/loading/error states, mobile-safe enough for judges' screens.
- **Aditya:** final prompt tuning against the exact seeded scenario; lock the model + params.
- **Sahil:** load-check with 5 concurrent clients; fix any desync.
- **All:** kill scope creep — anything not in Definition of Done ([MVP.md §6](./MVP.md)) is out.

---

## 8. Buffer (23–24h) — *whole team*

Full demo dry-run following Sharayu's script (MVP §5). Freeze features; only fix demo-breaking bugs. Sharayu leads final pitch rehearsal.

---

## 9. Per-Person Definition of Done

- **Sahil (A):** seeded history loads; live multi-user chat with no desync; WS survives reconnect; brief GET/PUT works.
- **Aditya (B):** `/explain` returns grounded, role-specific JSON reliably; never crashes the UI (fallback works); eval harness shows quality across roles; model + params locked.
- **Atharva (C):** join → live chat feels like a real chat app; surrounding context + role reach the widget; brief editor works.
- **Soham (D):** highlight → Ask AI → clean popover with labeled impact; follow-up + share-to-thread work; positioning is stable.
- **Sharayu:** personas + landscape research done; seeded conversation + brief text land the demo; pitch deck and demo script are rehearsed and ready.

---

## 10. Sharayu — Presentation & Research Detail

### 10.1 Research & Positioning
- **User personas** — one card per role (Engineering, Sales, Marketing, Design, Product): day-in-the-life, exact comprehension gaps they hit, moment they'd invoke CtxBridge. Feeds the seeded conversation.
- **Competitive landscape** — short scan: Slack AI, Notion AI, Glean, Guru, Slab, ChatGPT tab, plain glossaries. For each: what it does, why it fails the "ambient, in-the-moment" test (PRD §1). Output: one slide + a 1-paragraph "why CtxBridge is different" pitch line.
- **Existing tech survey** — brief scan of underlying tech (RAG glossaries, chat assistants) so the pitch can honestly frame what's novel (dormant + role-aware impact layer, not the LLM itself).
- **Problem framing** — sharpen the one-line pitch (PRD §1) and the 30-second version.

### 10.2 Demo Content (hands off to backend)
- **Scripted demo conversation** — 8–15 messages, cross-functional voices, each containing 2–3 highlight-worthy phrases (jargon, ambiguous terms, commitments). Hand to Sahil for [seed.py](../backend/app/seed.py).
- **Team brief text** — references goals + current commitments so impact bullets are specific, not generic. Hand to Sahil to seed into the `workspace` row.
- **Highlight → role matrix** — pre-decide 2–3 phrases × which role demoes each, so SC3 (same text, different role → different output) is guaranteed to land. Aditya (prompt) and Soham (widget) tune against this.

### 10.3 Pitch Deck & Narrative
- **Pitch deck** — problem → why existing tools fail → CtxBridge (dormant, role-aware) → live demo → what's next. One slide per persona. One slide showing the "same text, different role" side-by-side output.
- **Demo script** — the exact click-by-click walkthrough (PRD SC1–SC5): who logs in as which role, which message gets highlighted, what to say while it's loading, when to switch roles.
- **Judge Q&A prep** — talking points for likely questions:
  - "Isn't this just ChatGPT in a tab?" (dormant + role-aware + team-brief-grounded)
  - "How is impact different from explanation?" (second-order vs definition)
  - "Why not real Slack integration?" (scope; portable brain is designed to move)
  - "How do you avoid hallucination?" (AI-inferred label + brief grounding + explicit inference)

### 10.4 Delivery
- **Rehearsals** — at least one full dry-run of pitch + demo with the team; time it.
- **LLM-failure safety net** — optional cached "known-good" response to swap into `/explain` if Mistral is flaky mid-demo (coordinate with Aditya).

---

## 11. Coordination Notes

- **Contracts are frozen at M0.** Any change → announce to both affected owners immediately.
- **Integrate continuously** — merge to `main` often; the M3 integration checkpoint is a checkpoint, not the *first* time things are wired together.
- **M2 is the demo.** If we're behind, cut in this order: proactive nudge (already deferred) → share-to-thread → follow-up → polish. Never cut the M2 core.
- **The `surrounding_context` handoff between Atharva and Soham is the single most important frontend interface** — lock the DOM contract at M0 (recommend: `data-message-text` attribute on each message bubble).
- **Sharayu's seeded conversation is the single most important demo asset** — it decides what the judges see. First draft by end of M0, locked by mid-M2.
