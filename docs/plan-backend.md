# Alpha Plan — Backend

See `architecture.md` for design, `alpha.md` for scope, `api-contract.md` for exact request/response/payload shapes.

## Tasks

1. [x] **Project setup** — add EF Core + SQLite provider, register `DbContext` in `Program.cs`.
2. [ ] **Entities** — `User`, `Workspace` (with a skip-navigation `Users` collection — no explicit membership entity), `Asset`, `TodoItem`. Initial migration, then a migration dropping the unused `Asset.Revision` column and its `[ConcurrencyCheck]`. *Status: entities and the initial migration exist; dropping `Revision` remains.*
3. [ ] **CORS** — one named policy applied to both the REST API and the hub. Allowed origins come from configuration (`appsettings`), not a hardcoded dev URL, so production sets its own. SignalR needs credentials, and credentials can't be combined with a wildcard origin, so list origins explicitly.
4. [x] **`UsersController`** — `POST /api/users`, `GET /api/users/{id}`. Data Annotations on the request DTO.
5. [x] **`WorkspacesController`** — `POST /api/workspaces` (creates the workspace, adds the creator as first member), `GET /api/workspaces?userId=`, `POST /api/workspaces/{id}/members`, `DELETE /api/workspaces/{id}`.
6. [ ] **`AssetsController`** — target state is `GET /api/assets/presets` only. The existing `POST`, `GET` and `DELETE` asset endpoints are removed once the hub (step 10) covers them; assets are created, read and deleted through the hub, never here.
7. [ ] **`WorkspaceService`** — thin: create, list, add-member, and `IsMemberAsync(workspaceId, userId)`, which the hub uses to verify a user before they join. No concurrency concerns, nothing here is collaboratively edited. *Status: create, list and add-member exist; `IsMemberAsync` remains.*
8. [ ] **`AssetService`** — `ApplyDeltaAsync(assetId, delta)`: validates the delta, applies it in one `SaveChangesAsync`, skips entries for items that aren't in the asset, reloads and reapplies once on `DbUpdateConcurrencyException` (an item deleted mid-save), and returns the delta that was actually applied for the hub to broadcast. A missing asset or an invalid delta is signalled with a typed exception, not a null or a bool; the hub turns it into a `HubException`. Apply and broadcast run under a per-asset lock so the broadcast order matches the save order. Also create (reads seed items from `PresetCatalog` when a `presetName` is given), load a workspace's assets for `JoinWorkspace`, and delete. `IAssetStore` stays: it gains `ApplyDeltaAsync` and a method that loads a workspace's assets with their items (the existing list returns summaries only), and both `EfAssetStore` and `InMemoryAssetStore` implement them. The per-asset lock lives in `AssetService`, not the store.
9. [ ] **`PresenceService`** — in-memory, keyed by connection id, not just user id (one user can have multiple tabs open). Tracks workspaces, not assets. Registered as a singleton since every connection shares it, so its storage must be safe for concurrent access. Also answers whether a connection has joined a given workspace, which the hub uses for its checks.
10. [ ] **`WorkspaceHub`** at `/hubs/workspace` — `JoinWorkspace` (first asks `WorkspaceService.IsMemberAsync` and throws a `HubException` if the user isn't a member — the hub does no membership lookup itself; then joins the group, then returns every asset with its items and the current viewers), `LeaveWorkspace`, `CreateAsset` (with optional `presetName`), `UpdateAsset`, `DeleteAsset`, plus an `OnDisconnectedAsync` override for ungraceful drops (tab closed, network loss); broadcasts `AssetCreated`, `AssetUpdated`, `AssetDeleted`, `UserJoined`, `UserLeft` to the whole group, including the sender. Every asset event carries `assetId`. Every method other than `JoinWorkspace` requires the calling connection to have joined the workspace (checked against `PresenceService`; for `UpdateAsset` and `DeleteAsset` the workspace is the asset's), otherwise it throws. A failed call throws a `HubException` to the caller only. Registered in `Program.cs` with `AddSignalR()` and `MapHub<WorkspaceHub>("/hubs/workspace")`. `AssetUpdated` carries the delta as applied, with skipped entries removed — don't broadcast the raw request or clients will apply entries the server ignored.
11. [ ] **Tests** — xUnit, SQLite in-memory (`:memory:`) so real transactional behavior is exercised, not skipped by a non-relational provider. Priority: `AssetService.ApplyDeltaAsync` — concurrent additions both survive, edits to different items both survive, same-field edits are last-write-wins, an edit against a deleted item is skipped — plus `CreateAsset` with and without a preset.
12. [ ] **Rename starter templates to presets** — do this before steps 8 and 10, so the hub is built with its final names. `TemplateCatalog` → `PresetCatalog`, `TodoTemplate` → `TodoPreset`, `TemplateInfo` → `PresetInfo`, `Data/todo-templates.json` → `todo-presets.json` (and its `.csproj` entry), `GET /api/assets/templates` → `/api/assets/presets`, `CreateAssetRequest.TemplateName` → `PresetName`, the "Unknown template." error, and `ManageD.Api.http`. `TemplateType` stays: it is the kind of asset, not a preset.

This list is numbered by dependency order, not by when to write tests — per the team's TDD practice, write `ApplyDeltaAsync`'s tests alongside step 8, before wiring the hub or controllers to it, not after everything else is built.

## Sequencing notes

- Step 12 touches the same names the frontend uses (`presetName`, `/api/assets/presets`): land it first and tell the frontend, or both sides rename twice.
- The `Asset.Revision` drop in step 2 is a migration on top of the canvas-fields one — merge that first so the model snapshot doesn't conflict.
- Steps 2–3 can be stubbed (in-memory fake data, no real DB) so the rest aren't blocked waiting on a working EF setup — swap the stub for the real `DbContext` once it's ready.
- Step 8 is the logic the hub depends on — write its tests first, build it against them, before wiring the hub to it.
- Workspaces (5, 7) are simple CRUD with no concurrency concerns — build these first as a warm-up before the harder `AssetService`/`WorkspaceHub` work.
- Hand the frontend team the hub method/event names (step 10) and REST endpoints (steps 4–6) as soon as they're decided, even before they're implemented — frontend can build against that contract with a stub server.

## Out of scope for alpha

Real auth, RBAC, any template besides Todo, everything else listed under "Out of scope" in `alpha.md`.
