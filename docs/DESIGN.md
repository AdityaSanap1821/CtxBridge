# CtxBridge - Technical Design Document

**Version:** 0.1 (Hackathon MVP)
**Date:** 2026-07-31
**Related:** [PRD.md](./PRD.md), [MVP.md](./MVP.md)

---

## 1. Design Principle: "Host" vs "Brain"

The most important structural decision. CtxBridge is split into two logical parts:

- **The Host** - a throwaway Slack-like chat app we build only to demo on. Disposable.
- **The Brain** - the reusable IP: the `/explain` API + the highlight-to-ask widget. Stateless and self-contained, so it can later be re-hosted inside a real chat tool (Slack/Teams/Notion) without a rewrite.

Everything below follows from this split. The chat app is a vehicle; the brain is the product.

```
+---------------------------------------------------+
|                   THE HOST                        |
|  (disposable demo chat app - replaceable later)   |
|                                                   |
|   React chat UI  <--- WebSocket --->  FastAPI     |
|   (join, messages, live updates)      chat module |
|                                                   |
|   +-------------------------------------------+   |
|   |               THE BRAIN                   |   |
|   |     (portable - the real product IP)      |   |
|   |                                           |   |
|   |  Highlight widget  --- POST /explain -->  |   |
|   |  (useHighlight,        ctxbridge module   |   |
|   |   AskButton,           + prompt builder   |   |
|   |   ExplainPopover)      + llm provider     |   |
|   +-------------------------------------------+   |
+---------------------------------------------------+
                         |
                         v
                 Mistral API (LLM)
```

---

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite | Fast dev, simple, great for the highlight widget |
| Backend | FastAPI (Python) | Native WebSockets, clean async, nice place to iterate on prompts |
| Real-time | FastAPI WebSocket + in-process broadcast manager | No extra infra for a single-workspace demo |
| Persistence | SQLite | Zero-setup, survives restarts, trivial seeding |
| LLM | Mistral API (behind a provider interface) | Team's chosen provider; interface keeps it swappable |

---

## 3. Component Breakdown

### 3.1 Backend (FastAPI)

```
backend/app/
  main.py            # app wiring, CORS, router mounting, startup seed
  db.py              # SQLite connection + schema init
  seed.py            # loads the scripted demo conversation + default brief
  chat/
    routes.py        # REST: GET /messages (history)
    ws.py            # WebSocket endpoint + ConnectionManager (broadcast)
    models.py        # Message model / row mapping
  ctxbridge/         # THE BRAIN (stateless)
    routes.py        # POST /explain
    prompt.py        # prompt builder (system + inputs + output contract)
    schema.py        # request/response models (pydantic)
  workspace/
    routes.py        # GET/PUT /brief
    store.py         # brief read/write
  llm/
    base.py          # LLMProvider interface: complete(messages) -> str
    mistral.py       # MistralProvider implementation
    factory.py       # picks provider from config/env
  config.py          # env: LLM key, model name, CORS origins
```

**Key module responsibilities:**
- `chat/` - owns live chat: persist message, broadcast to all sockets, serve history. Knows nothing about the LLM.
- `ctxbridge/` - owns `/explain`. Stateless. Given inputs, builds a prompt, calls the LLM provider, returns structured output. This is the portable core.
- `workspace/` - owns the single team brief.
- `llm/` - isolates the provider so Mistral can be swapped without touching `ctxbridge/`.

### 3.2 Frontend (React + Vite)

```
frontend/src/
  main.tsx, App.tsx
  api/
    rest.ts          # fetch helpers (history, brief, explain)
    ws.ts            # WebSocket client (connect, send, onMessage)
  chat/
    JoinScreen.tsx   # name + role selection
    ChatView.tsx     # layout: header, message list, composer
    MessageList.tsx  # renders messages (selection happens here)
    Message.tsx      # single message bubble
    Composer.tsx     # send a message
  ctxbridge/         # THE BRAIN's frontend (portable widget)
    useHighlight.ts  # window.getSelection() -> selection + anchor rect
    AskButton.tsx    # floating "Ask AI" button near the selection
    ExplainPopover.tsx # explanation + impact bullets + follow-up + share
  workspace/
    BriefEditor.tsx  # edit the team context brief
  state/
    identity.ts      # current user name + role
```

---

## 4. Data Model (SQLite)

```sql
CREATE TABLE workspace (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  brief_text  TEXT NOT NULL DEFAULT ''
);

CREATE TABLE messages (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  author_name  TEXT NOT NULL,
  author_role  TEXT NOT NULL,     -- one of the fixed roles
  text         TEXT NOT NULL,
  created_at   TEXT NOT NULL      -- ISO 8601
);
```

- **Roles** are a fixed constant list in code: `Sales | Marketing | Design | Engineering | Product`. No table.
- **Single workspace** (id = 1) for the demo.
- **Explanations are NOT persisted** - privacy by design. The only way an explanation enters the record is "share to thread," which writes a normal `messages` row authored by the sharing user.

---

## 5. API Contracts

### 5.1 Chat

**`GET /messages`** → recent history
```json
[
  { "id": 12, "author_name": "Ravi", "author_role": "Engineering",
    "text": "We're moving checkout to a microservices architecture.",
    "created_at": "2026-07-31T10:02:00Z" }
]
```

**`WS /ws`** - bidirectional chat socket
- Client → server (send a message):
  ```json
  { "type": "message", "author_name": "Ravi", "author_role": "Engineering", "text": "..." }
  ```
- Server → all clients (broadcast):
  ```json
  { "type": "message", "message": { "id": 13, "author_name": "...", "author_role": "...", "text": "...", "created_at": "..." } }
  ```

### 5.2 CtxBridge - the brain

**`POST /explain`**
Request:
```json
{
  "highlighted_text": "gated behind a canary release",
  "surrounding_context": "We're adding a feature flag rollout for the new pricing engine, gated behind a canary release.",
  "reader_role": "Sales",
  "follow_up_history": [
    { "role": "user", "content": "does this affect our launch date?" },
    { "role": "assistant", "content": "..." }
  ]
}
```
Response:
```json
{
  "plain_explanation": "The new pricing system will be released to a small group of users first, not everyone at once, so the team can catch issues early.",
  "impact_bullets": [
    "Full rollout may take longer than a single release date - avoid quoting a hard go-live date to prospects yet.",
    "Early-group customers may briefly see different pricing behavior - worth a heads-up before demos."
  ],
  "disclaimer": "AI-inferred - confirm with the relevant team."
}
```
- `follow_up_history` is optional; when present, the endpoint continues the same Q&A.
- The endpoint is **stateless** - the client owns the follow-up history.

### 5.3 Workspace brief

**`GET /brief`** → `{ "brief_text": "..." }`
**`PUT /brief`** ← `{ "brief_text": "..." }` → `{ "ok": true }`

---

## 6. Key Flows

### 6.1 Real-time chat
1. User completes JoinScreen (name + role) → identity stored client-side.
2. Client calls `GET /messages` for history, then opens `WS /ws`.
3. Sending a message → WS `message` frame → server persists to SQLite → broadcasts to all connected clients → every client appends it.
4. On startup, `seed.py` loads the scripted demo conversation + default brief (idempotent: only seeds an empty DB).

### 6.2 Highlight-to-Ask (the heart)
1. User selects text inside a message bubble. `useHighlight` captures the selected string + the anchor rectangle + the containing message's full text (surrounding context).
2. `AskButton` renders near the selection.
3. Click → `POST /explain` with `{highlighted_text, surrounding_context, reader_role}`.
4. `ExplainPopover` shows a loading state, then renders `plain_explanation` + `impact_bullets` (each tagged **"AI-inferred - verify"**).
5. **Follow-up:** user types a question → same endpoint with `follow_up_history` appended → answer appended in the popover.
6. **Share to thread:** formats the explanation and sends it as a normal chat message authored by the user.
7. Closing the popover discards everything - nothing is stored.

---

## 7. Prompt Design

The prompt is where product quality lives. Structure:

- **System persona:** CtxBridge is a *shared, two-way* translation layer for a cross-functional team. It reframes whatever is highlighted into the **reader's own discipline's** mental models and metaphors - it does not merely simplify, and it is not biased toward tech→non-tech.
- **Injected inputs (clearly delimited):**
  - Team context brief
  - Reader role
  - Surrounding context (the full message)
  - Highlighted text
  - Optional follow-up history
- **Output contract (strict JSON):**
  ```json
  { "plain_explanation": "1-2 sentences in the reader's vocabulary",
    "impact_bullets": ["2-3 second-order 'what this means for my work' nudges"],
    "disclaimer": "AI-inferred - confirm with the relevant team." }
  ```
- **Rules baked into the prompt:** keep it concise; impact bullets must be framed as *inferred* nudges, not facts; use the brief to ground impact (avoid generic guesses); reframe using the reader's role, never condescend.

**Reliability:** request JSON explicitly; parse defensively; if JSON parse fails, fall back to treating the whole response as the plain explanation with an empty impact list, so the UI never breaks.

---

## 8. LLM Provider Interface

```python
class LLMProvider(Protocol):
    def complete(self, messages: list[dict]) -> str: ...

class MistralProvider:
    def __init__(self, api_key: str, model: str): ...
    def complete(self, messages: list[dict]) -> str: ...
```
- `ctxbridge/` depends only on `LLMProvider`, never on Mistral directly.
- `factory.py` selects the provider from env (`LLM_PROVIDER`, `LLM_MODEL`, `<PROVIDER>_API_KEY`).
- Swapping providers = add one class + config; no changes to prompt logic or routes.

---

## 9. Error Handling & Edge Cases

| Case | Handling |
|---|---|
| LLM returns non-JSON | Fallback: whole text → `plain_explanation`, empty `impact_bullets` |
| LLM/API error or timeout | Popover shows a friendly retry message; nothing crashes |
| Empty / whitespace selection | Ask button does not appear |
| Selection spans multiple messages | MVP: use the message where selection started; ignore the rest |
| WebSocket drops | Client shows "reconnecting" and re-pulls history on reconnect |
| Concurrent sends | Server serializes writes; broadcast order = server receive order |
| Missing API key at startup | Backend logs a clear error; `/explain` returns a descriptive 503 |

---

## 10. Security & Privacy

- LLM API key lives **server-side only**; never sent to the client.
- No auth/accounts, no PII collection beyond a display name.
- Explanations are ephemeral - not logged or stored (matches the "no one sees you asked" promise).
- CORS restricted to configured frontend origins.

---

## 11. Testing Strategy

- **Prompt eval harness:** a small script running a few seeded messages × each role through `/explain`, printing outputs for manual quality review (the highest-value test for this project).
- **Backend unit tests:** `/explain` JSON parsing + fallback path; brief get/put; message persistence.
- **Manual multi-window test:** two+ browser windows as different roles, verify live sync + highlight-to-ask.

---

## 12. Deployment

- **Local-first:** backend on `localhost:8000`, frontend on `localhost:5173`, URLs read from env/config.
- **Deploy-ready:** because URLs and CORS are env-driven, moving to a public host (e.g., backend on Render/Railway, frontend on Vercel/Netlify) is a late, low-risk decision - no code changes to the app logic.
- Decision on the demo delivery method (cloud vs tunnel vs LAN) is deferred until the app works locally.

---

## 13. Repo Structure

```
ctxbridge/
  backend/
    app/            # see §3.1
    requirements.txt
    .env.example
  frontend/
    src/            # see §3.2
    package.json
    vite.config.ts
  docs/
    PRD.md
    DESIGN.md
    MVP.md
  README.md
```
