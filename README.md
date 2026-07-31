# Refract

**A shared, role-aware translation layer for cross-functional teams.** Highlight any phrase in a team chat (or a spec doc) — get an explanation reframed for your discipline plus the second-order impact for *your* work, grounded in the team's context brief.

Same input, refracted through your role.

---

## What it looks like

- **Real-time chat** with seeded cross-functional conversation (Sales, Engineering, Marketing, Design, Product)
- **Highlight → Ask AI** floats a small button near your selection
- **Popover** shows plain-language explanation, impact bullets, and verified citations from the team brief or the source message
- **Role toggle** inside the popover — click a different discipline to see the same phrase reframed live
- **Follow-up Q&A** in the popover, share-to-thread posts a branded card into chat
- **Second surface**: a spec-doc view where the same widget lights up on any paragraph — proving the mechanism generalises past chat

---

## Prerequisites

- **Python 3.11+** (the backend was developed against 3.13)
- **Node 18+** (frontend uses Vite v8)
- **A Mistral API key** — get one at https://console.mistral.ai. Free tier works for light demo use.

---

## Setup

Clone the repo, then run the two setups in parallel — backend and frontend are independent.

### 1. Backend

```bash
cd backend
python -m venv .venv

# Activate — pick the right one for your shell
source .venv/Scripts/activate          # Git Bash on Windows
.venv\Scripts\Activate.ps1             # PowerShell on Windows
source .venv/bin/activate              # macOS / Linux

pip install -r requirements.txt
```

### 2. Frontend

```bash
cd frontend
npm install
```

### 3. Environment variables

Copy `.env.example` to `backend/.env` and add your Mistral key:

```bash
cp .env.example backend/.env
# then edit backend/.env and set MISTRAL_API_KEY=<your-key>
```

Defaults for everything else work out of the box:

| Var | Default | Purpose |
|---|---|---|
| `MISTRAL_API_KEY` | *(required)* | Auth for Mistral API |
| `LLM_PROVIDER` | `mistral` | Only Mistral is wired today |
| `LLM_MODEL` | `mistral-small-latest` | Main model for explanations |
| `LLM_GATE_MODEL` | `ministral-3b-latest` | Cheaper model used as a pre-filter gate |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated origins allowed to hit the backend |

---

## Run

Two terminals. Backend first, then frontend.

### Terminal 1 — backend

```bash
cd backend
../.venv/Scripts/uvicorn app.main:app --reload    # Windows Git Bash
# or (from an activated venv on any OS):
uvicorn app.main:app --reload
```

- Backend runs on `http://localhost:8000`
- Health check: http://localhost:8000/health
- Interactive API docs (OpenAPI): http://localhost:8000/docs

### Terminal 2 — frontend

```bash
cd frontend
npm run dev
```

Vite will pick a port (default `5173`) and print the URL. Open it.

### First-time flow

1. Enter a display name and pick a role.
2. Chat loads with a seeded cross-functional conversation.
3. **Highlight** any phrase inside a message (e.g. `canary release`, `pipeline velocity`, `event-sourced pipeline`).
4. Click the floating **Ask AI** button.
5. Read the popover. Click a different role pill to see the same phrase reframed for that discipline.
6. Ask a follow-up in the input at the bottom, or hit **Share to thread** to post the explanation to the chat.
7. Try the same flow on the **📄 pricing-v2** sidebar item — same widget works on a spec-doc surface.

---

## Project layout

```
├── backend/                    # FastAPI + SQLite + Mistral chain
│   ├── app/
│   │   ├── main.py             # app wiring, CORS, lifespan (init_db + seed)
│   │   ├── config.py           # env + roles + DB path
│   │   ├── db.py, seed.py      # SQLite schema + 13-message seeded conversation
│   │   ├── chat/               # /messages history + WebSocket broadcast
│   │   ├── workspace/          # editable team brief (GET/PUT /brief)
│   │   ├── ctxbridge/          # /explain — the brain
│   │   │   ├── routes.py       # rate limit → cache → gate → main → verify → fallback
│   │   │   ├── prompt.py       # loads system.md, assembles delimited inputs
│   │   │   ├── prompts/system.md   # editable system prompt (iterate freely)
│   │   │   ├── known_good.py   # demo safety net for LLM outages
│   │   │   └── schema.py       # Pydantic contracts
│   │   └── llm/                # provider protocol + Mistral impl
│   ├── scripts/eval_explain.py # 10-scenario × 5-role quality harness
│   └── README.md               # backend-specific notes
├── frontend/                   # Vite + React + TypeScript
│   ├── src/
│   │   ├── chat/               # join screen, chat view, sidebar, message list, composer
│   │   ├── ctxbridge/          # highlight widget, popover, role toggle, follow-up
│   │   ├── spec/               # second-surface spec-doc view
│   │   ├── workspace/          # editable brief in sidebar
│   │   └── api/                # REST + WS clients
│   └── README.md               # frontend-specific notes
├── docs/
│   ├── PRD.md                  # product requirements
│   ├── DESIGN.md               # architecture, contracts, prompt design
│   ├── MVP.md                  # scope + 24-hour plan + demo script
│   ├── TASKS.md                # team task distribution
│   └── eval-baseline.md        # last quality snapshot from the eval harness
└── .env.example
```

---

## Development tips

### Iterate the prompt without touching Python

The system prompt lives at `backend/app/ctxbridge/prompts/system.md`. Edit that file and restart the backend (or run uvicorn with `--reload`). No Python changes needed.

### Run the eval harness

Quality regression check across the seeded highlights × all 5 roles:

```bash
cd backend
../.venv/Scripts/python scripts/eval_explain.py                             # print to stdout
../.venv/Scripts/python scripts/eval_explain.py --out ../docs/eval-<date>.md # snapshot
```

Runs ~50 real Mistral calls (~2-3 minutes). Baseline: 0 failures, avg 2.5-3s per call.

### Reseed the demo conversation

If you edit `backend/app/seed.py` (or you're stuck on an older seed), delete the DB and restart:

```bash
rm backend/ctxbridge.db
```

The seed only runs when the DB is empty, so this forces a fresh load of all 13 messages.

### Extend the demo safety net

If a scripted highlight breaks mid-demo (Mistral outage), the response falls back to a pre-verified table in `backend/app/ctxbridge/known_good.py`. Add more `(highlighted_text, reader_role) → response` entries as the seeded conversation evolves.

---

## Docs

- [Product requirements](docs/PRD.md) — the "why" and scenarios
- [Design](docs/DESIGN.md) — architecture, API contracts, prompt design, error handling
- [MVP scope](docs/MVP.md) — the 24-hour build plan + demo script
- [Task distribution](docs/TASKS.md) — who owned what during the hackathon
- [Eval baseline](docs/eval-baseline.md) — last recorded quality snapshot

---

## Deeper notes

- [Backend README](backend/README.md) — request pipeline, endpoints, safety features
- [Frontend README](frontend/README.md) — component structure, highlight contract, running & building
