# Alpha Plan — Frontend

See `architecture.md` for design, `alpha.md` for scope, `api-contract.md` for exact request/response/payload shapes.

## Tasks

1. **Routing** — install React Router, two routes: `/` (dashboard) and `/documents/:id` (document view).
2. **Identity** — on boot, load `{userId, displayName}` from localStorage; if absent, prompt for a display name and `POST /api/users`.
3. **Dashboard (`/`)** — list the current user's documents (`GET /api/documents?ownerId=`), create (`POST /api/documents`, navigate to the new document), delete.
4. **`DocumentProvider`** — Context + `useReducer`, scoped to the document view. Actions: `ITEM_ADDED`, `ITEM_UPDATED`, `ITEM_DELETED`, `ITEM_REORDERED`, `EDIT_REJECTED`, `USER_JOINED`, `USER_LEFT`, `LOCAL_EDIT`. Seeded from the REST snapshot on mount.
5. **Document view (`/documents/:id`)** — on mount and on every reconnect: `GET /api/documents/{id}` for the snapshot first, replace state entirely, then connect to the hub and call `JoinDocument`.
6. **Editing UI** — add/edit/toggle/delete/reorder todo items. Each action dispatches `LOCAL_EDIT` immediately (optimistic), then calls the matching hub method (`AddItem`/`UpdateItem`/`DeleteItem`/`ReorderItem`). `ITEM_REORDERED` applies a list of `{itemId, order}` changes, not a single item — a reorder can shift more than the one dragged.
7. **Reconciliation** — the matching broadcast event confirms an edit; `EditRejected` discards the optimistic change and replaces state with `currentSnapshot`.
8. **Presence UI** — render the live list of viewers from `UserJoined`/`UserLeft`.
9. **Connection status** — surface reconnecting/disconnected state from the SignalR client so users know when their edits aren't going through.

## Sequencing notes

- Steps 1–3 don't need a real backend — build against a stub REST layer (hardcoded/mocked responses) while backend is still wiring up the database.
- Step 4 (`DocumentProvider`) is the one piece everything else in the document view depends on — build and test its reducer logic against fake events before wiring up a real hub connection.
- Get the hub method/event names and REST endpoint shapes from backend as soon as they're settled (see `plan-backend.md`), so the stub layer matches the real contract and swapping it in later is a non-event.

## Out of scope for alpha

Real auth, any template besides Todo, everything else listed under "Out of scope" in `alpha.md`.
