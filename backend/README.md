# CtxBridge — Backend (FastAPI)

Scaffold. The app boots and serves real endpoints; the LLM "brain" is stubbed
(see the `TODO(owner: ...)` markers). Build order and ownership: [../docs/TASKS.md](../docs/TASKS.md).

## Run

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate      # Windows Git Bash  (PowerShell: .venv\Scripts\Activate.ps1)
pip install -r requirements.txt
cp ../.env.example .env             # then fill in MISTRAL_API_KEY
uvicorn app.main:app --reload
```

- Health check: http://localhost:8000/health
- Interactive API docs: http://localhost:8000/docs

## What's implemented vs stubbed

| Area | Status | Owner |
|---|---|---|
| App wiring, CORS, SQLite, seed data | done | — |
| `GET /messages` (history) | done | A |
| `WS /ws` live chat (minimal broadcast) | working, needs hardening | A |
| `GET/PUT /brief` (team context brief) | done | E |
| `POST /explain` | **stub** — returns canned JSON | B |
| Prompt builder (`ctxbridge/prompt.py`) | **stub** | B |
| Mistral provider (`llm/mistral.py`) | **stub** | B |

## Endpoints (contracts: [../docs/DESIGN.md](../docs/DESIGN.md) §5)

- `GET /health`
- `GET /messages`
- `WS /ws` — send `{"type":"message","author_name","author_role","text"}`;
  receive `{"type":"message","message":{...}}`
- `POST /explain` — `{highlighted_text, surrounding_context, reader_role, follow_up_history?}`
  → `{plain_explanation, impact_bullets[], disclaimer}`
- `GET /brief` / `PUT /brief`

## Layout

```
app/
  main.py            # wiring, CORS, lifespan (init_db + seed)
  config.py          # env + roles + DB path
  db.py, seed.py     # SQLite schema + starter data
  chat/              # host: history + websocket        (owner A)
  ctxbridge/         # brain: /explain + prompt (stub)  (owner B)
  workspace/         # team context brief               (owner E)
  llm/               # provider interface + mistral stub (owner B)
```
