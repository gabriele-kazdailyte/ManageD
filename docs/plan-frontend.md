# Alpha Plan — Frontend

See `architecture.md` for design, `alpha.md` for scope, `api-contract.md` for exact request/response/payload shapes.

## Tasks

1. **Routing** — install React Router, three routes: `/`, `/workspaces/:workspaceId`, `/workspaces/:workspaceId/assets/:assetId`.
2. **Identity** — on boot, load `{userId, displayName}` from localStorage; if absent, prompt for a display name and `POST /api/users`.
3. **Workspaces list (`/`)** — list the current user's workspaces (`GET /api/workspaces?userId=`), create (`POST /api/workspaces`, navigate into it).
4. **Assets list (`/workspaces/:workspaceId`)** — list the workspace's assets (`GET /api/assets?workspaceId=`), create (`POST /api/assets`, navigate into it), delete.
5. **`AssetProvider`** — Context + `useReducer`, scoped to the asset view. Actions: `ITEM_ADDED`, `ITEM_UPDATED`, `ITEM_DELETED`, `ITEM_REORDERED`, `EDIT_REJECTED`, `USER_JOINED`, `USER_LEFT`, `LOCAL_EDIT`. Seeded from the REST snapshot on mount.
6. **Asset view (`/workspaces/:workspaceId/assets/:assetId`)** — on mount and on every reconnect: `GET /api/assets/{id}` for the snapshot first, replace state entirely, then connect to the hub and call `JoinAsset`.
7. **Editing UI** — add/edit/toggle/delete/reorder todo items. Each action dispatches `LOCAL_EDIT` immediately (optimistic), then calls the matching hub method (`AddItem`/`UpdateItem`/`DeleteItem`/`ReorderItem`). `ITEM_REORDERED` applies a list of `{itemId, order}` changes, not a single item — a reorder can shift more than the one dragged.
8. **Reconciliation** — the matching broadcast event confirms an edit; `EditRejected` discards the optimistic change and replaces state with `currentSnapshot`.
9. **Presence UI** — render the live list of viewers from `UserJoined`/`UserLeft`.
10. **Connection status** — surface reconnecting/disconnected state from the SignalR client so users know when their edits aren't going through.
11. **Add-member UI** — in the workspace view, a way to enter a `userId` and call `POST /api/workspaces/{id}/members`. No lookup-by-name yet (see caveat below).

## Sequencing notes

- Steps 1–4 don't need a real backend — build against a stub REST layer (hardcoded/mocked responses) while backend is still wiring up the database.
- Step 5 (`AssetProvider`) is the one piece everything else in the asset view depends on — build and test its reducer logic against fake events before wiring up a real hub connection.
- Get the hub method/event names and REST endpoint shapes from backend as soon as they're settled (see `plan-backend.md`), so the stub layer matches the real contract and swapping it in later is a non-event.

## Caveat: adding a member requires their raw id

Alpha has no user directory or search — `POST /api/workspaces/{id}/members` takes a `userId`, and there's no endpoint to look one up by display name. In practice this means whoever wants to add someone has to already have that person's id (e.g. copy-pasted from them after they created their identity). This is a real UX rough edge, not a hidden implementation detail — worth deciding whether it's acceptable for alpha or needs a minimal lookup endpoint before this ships.

## Out of scope for alpha

Real auth, RBAC, any template besides Todo, everything else listed under "Out of scope" in `alpha.md`.
