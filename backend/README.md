# Refract — Backend (FastAPI)

The brain and chat host. Serves the REST + WebSocket API the frontend talks to, drives the Mistral chain that powers `/explain`, and persists chat + brief in local SQLite.

For end-to-end setup (env, running, first-time flow) see the [root README](../README.md). This document covers what's specific to the backend.

---

## Request pipeline for `/explain`

The endpoint runs each request through this ordered chain — every step can short-circuit cleanly without breaking the UI.

```
POST /explain
  │
  ├─ 1. Per-IP rate limit (15 req / 60s) ─────────── 429 if tripped
  │
  ├─ 2. Provider check ──────────────────────────── 503 if key missing
  │
  ├─ 3. In-memory cache (brief, role, highlight) ── hit → return instantly
  │
  ├─ 4. Gate model (ministral-3b, JSON mode) — "is this substantive?"
  │      → trivial → return canned trivial response, cached
  │      → substantive → proceed
  │      (skipped for follow-ups)
  │
  ├─ 5. Build messages (brief + role + author_role + context + highlighted)
  │
  ├─ 6. Main LLM call (mistral-small, JSON mode)
  │      → exception → look up known_good safety net → return that, or 503
  │
  ├─ 7. Parse JSON + Pydantic re-validation
  │      → parse failure → drop raw text into plain_explanation (fallback)
  │
  ├─ 8. Verify each source citation appears verbatim in brief/context
  │      → fabricated quotes dropped silently (bullets stay)
  │
  └─ 9. Cache well-formed results (skip for follow-ups)
```

Every failure mode has a defined behavior — the popover on the frontend never sees an unhandled error.

---

## Endpoints

Contracts are defined in [../docs/DESIGN.md §5](../docs/DESIGN.md).

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness + role list |
| `GET` | `/messages` | Chat history, oldest first |
| `WS` | `/ws` | Live chat: send `{type, author_name, author_role, text}`, receive `{type, message}` |
| `GET` | `/brief` | The workspace context brief |
| `PUT` | `/brief` | Save an edited brief |
| `POST` | `/explain` | Role-aware explanation of a highlighted phrase (see pipeline above) |

Interactive docs at http://localhost:8000/docs when running.

### `POST /explain` request/response

```jsonc
// Request
{
  "highlighted_text": "canary release",
  "surrounding_context": "We're adding a feature flag rollout for the new pricing engine, gated behind a canary release.",
  "reader_role": "Sales",
  "author_role": "Engineering",           // optional; discipline of who wrote the containing message
  "follow_up_history": [                  // optional; alternating assistant/user turns
    { "role": "assistant", "content": "A canary release means..." },
    { "role": "user", "content": "does this affect our launch date?" }
  ]
}

// Response
{
  "plain_explanation": "…1-2 sentences reframed for the reader's role…",
  "impact_bullets": [
    "…hedged, second-order 'what this means for my work' nudge…"
  ],
  "sources": [
    { "bullet_index": 0, "type": "brief",   "quote": "verbatim slice of the brief" },
    { "bullet_index": 1, "type": "context", "quote": "verbatim slice of the containing message" }
  ],
  "disclaimer": "AI-inferred — confirm with the relevant team."
}
```

---

## Iterating the system prompt

Lives at `app/ctxbridge/prompts/system.md`. Edit freely — the module reads it at import time, so a backend restart (or uvicorn `--reload`) is enough to reload. No Python changes needed.

After edits, run the eval harness to confirm nothing regressed.

---

## Eval harness

Batch-runs 10 seeded scenarios × 5 roles = 50 real Mistral calls, prints them side-by-side for quality review. Use this whenever the prompt or model changes.

```bash
# Print to stdout
../.venv/Scripts/python scripts/eval_explain.py

# Snapshot to markdown for archiving
../.venv/Scripts/python scripts/eval_explain.py --out ../docs/eval-2026-08-01.md
```

Baseline run: 0 failures, avg 2.55s per call, all under 5s.

---

## Layout

```
app/
├── main.py               # FastAPI wiring, CORS, lifespan (init_db + seed_if_empty)
├── config.py             # env parsing, ROLES list, DB path
├── db.py                 # SQLite connection + schema
├── seed.py               # 13-message cross-functional demo conversation + default brief
├── chat/
│   ├── routes.py         # GET /messages
│   ├── ws.py             # WS /ws — ConnectionManager, validation, rate limit, broadcast
│   └── models.py         # insert_message
├── workspace/
│   ├── routes.py         # GET/PUT /brief
│   └── store.py          # get_brief / set_brief
├── ctxbridge/
│   ├── routes.py         # POST /explain — the full pipeline (see top of this file)
│   ├── prompt.py         # loads system.md, builds delimited messages
│   ├── prompts/system.md # the actual system prompt (editable)
│   ├── known_good.py     # demo safety net table (add more pairs as needed)
│   └── schema.py         # ExplainRequest / ExplainResponse / Source / FollowUpTurn
└── llm/
    ├── base.py           # LLMProvider protocol
    ├── factory.py        # env → provider instance
    └── mistral.py        # MistralProvider (accepts per-call model override)

scripts/
└── eval_explain.py       # prompt-quality eval harness
```

---

## Safety features

- **Cache** — `(brief_text, reader_role, highlighted_text)` → response. Cleared on process restart.
- **Rate limit** — 15 req / 60s per IP (sliding window). Same pattern as `chat/ws.py`.
- **Demo safety net** — `known_good.py` holds pre-verified responses for scripted demo highlights; served if Mistral errors so the demo path survives an outage. Only fires on real provider errors.
- **Source verification** — every citation's quote must appear verbatim (case-insensitive) in the claimed source; fabricated quotes are dropped, bullets stay.
- **Ephemeral explanations** — `/explain` never persists request/response (privacy per DESIGN §10). Only chat messages and the brief are stored.

---

## Requirements

See `requirements.txt`. Core deps: `fastapi`, `uvicorn[standard]`, `mistralai`, `python-dotenv`, `pydantic`.
