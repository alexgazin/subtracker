# Payments Inbox Demo

Run locally:

```bash
# install UI deps (inside ui/ folder)
cd ui
npm install

# start UI dev server
npm run dev
```

Open http://localhost:5173


API contract (recommended)

- POST /api/inbox/confirm
  - body: { cardId: string, status: 'paid'|'failed'|'canceled', confidence?: string, source?: string }
  - response: 200 { ok: true, cardId, status }

- POST /api/inbox/undo
  - body: { cardId: string }
  - response: 200 { ok: true }

- POST /api/inbox/snooze
  - body: { cardId: string, until?: ISODate }
  - response: 200 { ok: true }

Integration notes
- When user confirms, record an audit event: `status_confirmed(user|system)`, timestamp, confidence, source.
- Choose whether to implement optimistic server write (call confirm immediately and provide undo endpoint to revert) or delay final write until undo window passes. Both approaches are supported; demo uses optimistic write with undo endpoint.
- Implement snooze scheduling server-side so cards reappear on desired cadence.

Accessibility & design notes
- Controls are large (>=44px) and keyboard accessible.
- Use semantic roles for segmented control (radiogroup/radio).
- Provide visible focus outlines; supports dark mode via `[data-theme='dark']`.

Tracking events (replace `ui/src/lib/tracker.ts` with your analytics):
- `inbox_card_shown` { cardId, merchant, confidence }
- `inbox_card_action_clicked` { cardId, status }
- `inbox_card_undo` { cardId }
- `inbox_card_dismissed` { cardId }
- `inbox_card_expanded` { cardId, expanded }


Development notes
- Demo runs with mock API (toggle `MOCK_MODE` in `ui/src/lib/api.ts`).
- To integrate with your backend, set `MOCK_MODE = false` and configure `BASE`.
