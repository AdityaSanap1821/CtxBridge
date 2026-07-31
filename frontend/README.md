# Refract — Frontend (React + Vite)

Vite + React + TypeScript. Renders the chat surface, the spec-doc surface, and the highlight-to-ask widget on top.

For end-to-end setup (env, running both services, first-time flow) see the [root README](../README.md). This document covers what's specific to the frontend.

---

## Run

```bash
npm install
npm run dev
```

Vite prints the local URL (default `http://localhost:5173`). If that port is busy it will pick the next free one — make sure it's included in the backend's `CORS_ORIGINS`.

### Env vars

| Var | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | Backend origin for REST calls |
| `VITE_WS_URL` | `ws://localhost:8000/ws` | Backend WebSocket URL |

Set them inline when the backend runs somewhere else:

```bash
VITE_API_URL=http://192.168.1.10:8000 VITE_WS_URL=ws://192.168.1.10:8000/ws npm run dev
```

### Scripts

- `npm run dev` — Vite dev server with HMR
- `npm run build` — production build
- `npm run preview` — serve the production build locally

---

## Layout

```
src/
├── App.tsx                  # switches JoinScreen ⇄ ChatView based on identity
├── main.tsx                 # entry
├── App.css                  # all component styles (single sheet)
├── index.css                # CSS variables (colors, roles, typography)
│
├── chat/
│   ├── JoinScreen.tsx       # name + role selection
│   ├── ChatView.tsx         # sidebar + main pane; switches chat / spec view
│   ├── Sidebar.tsx          # workspace, brief, channels list, teammates
│   ├── MessageList.tsx      # scrollable message rows
│   ├── Message.tsx          # single row; renders plain bubble OR shared-explanation card
│   ├── Composer.tsx         # message input at the bottom
│   ├── Atoms.tsx            # Avatar, RolePill
│   ├── useMessages.ts       # owns messages[], connection state, history merge on reconnect
│   ├── roles.ts             # ROLES vocabulary + colour keys
│   └── sharedExplanation.ts # encode/decode contract for share-to-thread cards
│
├── ctxbridge/
│   ├── HighlightLayer.tsx   # owns the widget flow (state, /explain calls, follow-ups, role toggle, share)
│   ├── useHighlight.ts      # captures selection + containing message text + author role
│   ├── AskButton.tsx        # floating "Ask AI" pill near the selection rect
│   └── ExplainPopover.tsx   # popover UI — role toggle, plain, impact bullets, sources, follow-up, copy, share
│
├── spec/
│   └── SpecView.tsx         # static PRD-style doc; proves widget generalises past chat
│
├── workspace/
│   ├── BriefEditor.tsx      # read-only paragraph cards + edit textarea in sidebar
│   └── useBrief.ts          # GET/PUT /brief
│
├── state/
│   └── identity.ts          # name + role, persisted in localStorage
│
└── api/
    ├── rest.ts              # /messages, /brief, /explain typed clients
    └── ws.ts                # ChatSocket — connect, reconnect with backoff, send/receive
```

---

## The highlight → explain widget

The widget is deliberately decoupled from the chat surface. It works on **any** element in the page that carries these two data attributes:

```html
<div data-message-text="the full plain text of the message"
     data-message-role="Engineering">
  ...
</div>
```

`useHighlight` looks for the closest ancestor with `data-message-text` and captures both attributes when the user finishes a selection. That's how the same `HighlightLayer` component drives the widget on both the chat surface (`Message.tsx`) and the spec-doc surface (`SpecView.tsx`) without any conditionals.

If you want to add a third surface (comments, transcripts, PR descriptions), just render the content with the same two attributes and mount `HighlightLayer` somewhere above it.

---

## Popover behaviour cheat sheet

- Opens on **Ask AI** click; positions itself near the selection rect, flips above when it would overflow, clamps to viewport
- **Role toggle** re-fires `/explain` with the new `reader_role`; content morphs in place
- **Follow-up input** at the bottom threads a Q&A conversation without leaving the popover
- **Copy** — writes plain + impact + follow-ups + disclaimer to the clipboard
- **Share to thread** — posts the current view as a chat message (stamped with the currently-viewed role)
- **Esc** or **click-outside** closes; scrolling does NOT close (position:fixed keeps the popover anchored to viewport)

---

## Type-checking

The project uses TypeScript strict mode. Before pushing:

```bash
node node_modules/typescript/bin/tsc --noEmit
```
