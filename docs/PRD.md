# CtxBridge — Product Requirements Document (PRD)

**Version:** 0.1 (Hackathon MVP)
**Date:** 2026-07-31
**Status:** Approved for build

> **One-line pitch:** CtxBridge is the AI that stays silent until your team hits a wall — then explains not just what something means, but what it means for *you*.

---

## 1. Overview

Cross-functional teams (engineering, sales, marketing, design, product) constantly talk *past* each other. Misalignment is rarely caused by bad communication — it's caused by **invisible translation gaps** that nobody flags in the moment, because stopping to ask "wait, what does that mean?" feels slow, awkward, or exposes a knowledge gap.

Existing tools (Slack bots, glossaries, AI assistants) require someone to actively *open* them and *ask*. That friction means the gap is almost never closed in real time.

**CtxBridge is a dormant AI layer that lives inside team conversations and wakes up only when invoked** — at the exact moment someone hits a comprehension wall. A person highlights confusing text → a small **"Ask AI"** button appears → CtxBridge responds with a plain-language translation *and* a role-specific impact analysis, tailored to the reader.

---

## 2. Problem Statement

> How might AI help multi-disciplinary teams make sense of information, present ideas, align on decisions, and review work more effectively?

The core problem: **comprehension gaps in cross-functional communication go unflagged in the moment and surface later as confusion, missed deadlines, or misaligned decisions.**

---

## 3. Target Users

A single cross-functional team sharing one workspace. Every user picks one role on join:

| Role | Cares about |
|---|---|
| **Engineering** | Systems, architecture, feasibility, technical risk |
| **Sales** | Deal timelines, what can be promised, customer impact |
| **Marketing** | Messaging, positioning, launch timing, claims |
| **Design** | User flows, states, edge cases, UI implications |
| **Product** | Roadmap, priorities, requirement alignment |

The reader's role is the key personalization axis — the same highlighted text produces different explanations for different roles.

---

## 4. Goals & Non-Goals

### Goals
- G1 — Let any team member get a plain-language translation of confusing text **in place**, with zero setup per question.
- G2 — Go beyond definition to **role-specific impact** ("what does this mean for *my* work").
- G3 — Make the AI feel **ambient** — it appears only at the moment of friction, not as another tool to remember to open.
- G4 — Keep it **low-friction and non-exposing** — asking is private by default; no one sees that you asked.
- G5 — Be a **two-way** translation layer (tech ↔ non-tech, and between any disciplines), not a "dumb it down for sales" tool.

### Non-Goals (for this MVP)
- NG1 — Not a real Slack/Teams/Notion integration (that is the *future* vision; the hackathon uses a purpose-built demo chat app).
- NG2 — Not a replacement for team communication — it bridges small, constant gaps.
- NG3 — Not a source of ground truth — the impact layer is **inference**, explicitly labeled as AI-suggested.
- NG4 — No per-question logging/analytics, no accounts/auth system, no billing.

---

## 5. User Stories

- **US1 (Translate):** As a Sales rep reading an engineering update, I can highlight a confusing sentence and get a plain-language explanation in my own vocabulary, without leaving the chat.
- **US2 (Impact):** As that same rep, I also see 2–3 bullets on what this likely means for *my* work (deal timelines, what to promise), clearly marked as AI-inferred.
- **US3 (Two-way):** As an Engineer, I can highlight a marketing term ("pipeline velocity", "ARR") and get it explained in engineering-relevant terms.
- **US4 (Context-aware):** The explanation reflects our team's actual goals and current commitments, because a team lead set up a short context brief once.
- **US5 (Follow-up):** After an explanation, I can ask a natural follow-up ("does this affect our launch date?") in the same popup without derailing the channel.
- **US6 (Share):** If an explanation is useful for everyone, I can optionally share it back into the thread — otherwise nobody knows I asked.
- **US7 (Live):** My teammates and I are all in the same live chat on our own machines; new messages appear in real time and I can invoke CtxBridge on any of them.

---

## 6. Functional Requirements

### Must have (MVP core)
- **FR1 — Live team chat:** A shared, real-time multi-user chat. Users join with a name + role; messages broadcast live to all connected clients; a seeded conversation loads at startup.
- **FR2 — Highlight-to-Ask:** Selecting text in a message reveals a floating **Ask AI** button positioned near the selection. No menus, no typing to trigger.
- **FR3 — Role-aware plain explanation:** On invoke, CtxBridge returns a 1–2 sentence explanation reframed using the reader's discipline's mental models and metaphors.
- **FR4 — Role-specific impact:** 2–3 bullets of second-order implications for the reader's role, each **visually labeled as AI-inferred (verify)**.
- **FR5 — Team context brief:** A short, editable, workspace-level brief (goals, current commitments, key terms) that is fed into every explanation.
- **FR6 — Two-way translation:** Works regardless of source/target discipline; not hardcoded to tech→non-tech.
- **FR7 — Privacy by default:** Asking is private to the asker; explanations are not stored or broadcast unless shared.

### Should have (MVP extras)
- **FR8 — Inline follow-up Q&A:** Ask a natural follow-up in the same popup; prior Q&A is kept as context.
- **FR9 — Share to thread:** Optionally post the explanation into the chat as a normal message.

### Could have (stretch — only if ahead of schedule)
- **FR10 — Proactive alignment nudge:** CtxBridge proactively flags messages likely to cause cross-role misalignment, with no one asking.

---

## 7. Non-Functional Requirements

- **NFR1 — Latency:** An explanation should return fast enough to feel in-flow (target < ~5s; show a loading state).
- **NFR2 — Reliability:** LLM output must render cleanly every time — strict JSON contract with a graceful fallback if parsing fails.
- **NFR3 — Portability:** The "brain" (explain logic + highlight widget) must be decoupled from the demo chat app so it can be re-hosted in a real chat tool later.
- **NFR4 — Simplicity of deploy:** Runs locally with minimal setup; environment-configurable URLs so cloud deploy is a late, low-risk decision.
- **NFR5 — No sensitive data handling:** No auth, no PII, no secrets beyond the LLM API key (server-side only, never exposed to the client).

---

## 8. Success Criteria (Demo)

- **SC1** — Multiple teammates chat live from separate machines with no desync.
- **SC2** — Highlighting any message and clicking Ask AI returns a role-appropriate explanation + impact bullets within seconds.
- **SC3** — Switching the reader's role visibly changes the explanation for the *same* highlighted text (the "aha" moment).
- **SC4** — The impact bullets reflect the team brief (not generic), and are clearly labeled as AI-inferred.
- **SC5** — Follow-up and share-to-thread both work in the live demo.

---

## 9. Assumptions & Constraints

- **A1** — One shared workspace for the whole demo; no multi-tenant concerns.
- **A2** — Roles are a fixed dropdown list; no role inference.
- **A3** — LLM provider is **Mistral API** (behind a swappable provider interface). Requires an API key available server-side.
- **A4** — Selection is scoped to a single message for the MVP (no cross-message selection).
- **A5** — 24-hour build window with a small team; scope is prioritized so anything after the core is cut-able.

---

## 10. Out of Scope / Future

- Deep integration into Slack, Notion, Google Docs, Figma comments, meeting transcripts.
- Learning team-specific glossaries over time.
- Aggregate, anonymized insight for team leads ("these concepts get asked about most").
- Smarter context retrieval (auto-pulling from linked docs/roadmaps instead of a static brief).
- Review Mode (highlight a spec/mockup and check against requirements) — considered and deferred.
