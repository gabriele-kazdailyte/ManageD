# Alpha Plan — Frontend

See `architecture.md` for design, `alpha.md` for scope, `api-contract.md` for exact request/response/payload shapes.

## Tasks

1. [x] **Routing** — React Router installed, two routes: `/` and `/workspaces/:workspaceId`. No per-asset route; assets live on the workspace canvas.
2. [x] **Identity** — on boot, load `{userId, displayName}` from localStorage; if absent, prompt for a display name and `POST /api/users`.
3. [x] **Workspaces list (`/`)** — List the current user's workspaces (`GET /api/workspaces?userId=`), create (`POST /api/workspaces`, navigate into it).
4. [ ] **Workspace canvas (`/workspaces/:workspaceId`)** — on mount and on every reconnect: connect to the hub (add the `@microsoft/signalr` package; in dev, proxy `/hubs` in `vite.config.ts` with `ws: true`, in production connect to the configured backend origin) and call `JoinWorkspace`, then replace state entirely with its response (every asset with its items, plus current viewers). Render the assets on the canvas; create (optionally from a preset) and delete them there through the hub (`CreateAsset`, `DeleteAsset`), not on a separate page. The preset picker's list comes from `GET /api/assets/presets`; the chosen name is passed as `presetName` to `CreateAsset` when the asset is created, replacing the current create-then-delete-then-swap on an existing asset. *Status: a REST-based canvas exists; the hub is not wired.*
5. [ ] **`WorkspaceProvider`** — Context + `useReducer`, scoped to the workspace canvas. Actions: `ASSET_CREATED`, `ASSET_UPDATED`, `ASSET_DELETED`, `USER_JOINED`, `USER_LEFT`, `LOCAL_EDIT`. `ASSET_UPDATED` and `LOCAL_EDIT` share one function that applies a delta. Seeded from the `JoinWorkspace` response.
6. [ ] **Editing UI** — add/edit/toggle/delete/reorder todo items. Each action builds a delta, dispatches `LOCAL_EDIT` immediately (optimistic), then calls `UpdateAsset(assetId, delta)`. Send on commit (enter, blur, toggle, end of a drag), not per keystroke. New items get a client-generated uuid; a reorder sends the new `order` only for the items that moved.
7. [ ] **Reconciliation** — the `AssetUpdated` broadcast is applied idempotently (items have ids), so the sender's own echo changes nothing. If `UpdateAsset` is rejected with a `HubException`, discard the optimistic change and call `JoinWorkspace` again to resync.
8. [ ] **Presence UI** — render the live list of viewers from `UserJoined`/`UserLeft`.
9. [ ] **Connection status** — surface reconnecting/disconnected state from the SignalR client so users know when their edits aren't going through. If `JoinWorkspace` is rejected because the user isn't a member, show that and send them back to `/` instead of retrying.
10. [x] **Add-member UI** — in the workspace view, a way to enter a `userId` and call `POST /api/workspaces/{id}/members`. No lookup-by-name yet (see caveat below).
11. [ ] **Rename templates to presets** — after the backend rename lands: `loadTemplates` → `loadPresets` and its endpoint, `TemplateInfo` → `PresetInfo`, the `templates` state and props, `handleSelectTemplate` / `onSelectTemplate` → preset names, and the `templateName` field sent to `POST /api/assets` (until the hub replaces it). `TemplateType` stays.

## Sequencing notes

- Steps 1–4 don't need a real backend — build against a stub REST layer (hardcoded/mocked responses) while backend is still wiring up the database.
- Step 5 (`WorkspaceProvider`) is the one piece everything else on the canvas depends on — build and test its reducer logic against fake events before wiring up a real hub connection.
- Get the hub method/event names and REST endpoint shapes from backend as soon as they're settled (see `plan-backend.md`), so the stub layer matches the real contract and swapping it in later is a non-event.

## Caveat: adding a member requires their raw id

Alpha has no user directory or search — `POST /api/workspaces/{id}/members` takes a `userId`, and there's no endpoint to look one up by display name. In practice this means whoever wants to add someone has to already have that person's id (e.g. copy-pasted from them after they created their identity). This is a real UX rough edge, not a hidden implementation detail — worth deciding whether it's acceptable for alpha or needs a minimal lookup endpoint before this ships.

## Out of scope for alpha

Real auth, RBAC, any template besides Todo, everything else listed under "Out of scope" in `alpha.md`.
