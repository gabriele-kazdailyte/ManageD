# Alpha Plan — Backend

See `architecture.md` for design, `alpha.md` for scope, `api-contract.md` for exact request/response/payload shapes.

## Tasks

1. **Project setup** — add EF Core + SQLite provider, register `DbContext` in `Program.cs`.
2. **Entities** — `User`, `Workspace` (with a skip-navigation `Users` collection — no explicit membership entity), `Asset` (with `Revision` as a concurrency token), `TodoItem`. Initial migration.
3. **CORS** — allow the frontend's dev origin on both the REST API and the hub.
4. **`UsersController`** — `POST /api/users`, `GET /api/users/{id}`. Data Annotations on the request DTO.
5. **`WorkspacesController`** — `POST /api/workspaces` (creates the workspace, adds the creator as first member), `GET /api/workspaces?userId=`, `POST /api/workspaces/{id}/members`, `DELETE /api/workspaces/{id}`.
6. **`AssetsController`** — `POST /api/assets`, `GET /api/assets?workspaceId=`, `GET /api/assets/{id}`, `DELETE /api/assets/{id}`. No item mutation here.
7. **`WorkspaceService`** — thin: create, list, add-member. No concurrency concerns, nothing here is collaboratively edited.
8. **`AssetService`** — one `ApplyOperation(assetId, baseRevision, operation)` method taking an internal discriminated-union operation type, asserting `baseRevision` via the concurrency token, catching `DbUpdateConcurrencyException` and returning `Applied`/`Conflict`. Each hub method (step 10) constructs the matching operation and calls this — the type never crosses the wire, so it's fine for it to be polymorphic even though the hub methods themselves aren't.
9. **`PresenceService`** — in-memory, keyed by connection id, not just user id (one user can have multiple tabs open).
10. **`AssetHub`** — `JoinAsset`, `LeaveAsset`, `AddItem`, `UpdateItem`, `DeleteItem`, `ReorderItem`, plus an `OnDisconnectedAsync` override for ungraceful drops (tab closed, network loss); broadcasts `ItemAdded`, `ItemUpdated`, `ItemDeleted`, `ItemReordered`, `EditRejected`, `UserJoined`, `UserLeft`. `EditRejected` goes to the caller only; everything else broadcasts to the whole group, including the sender. `ItemReordered` carries every item whose `Order` shifted, not just the one moved — don't skip this or reorders will desync other clients.
11. **Tests** — xUnit, SQLite in-memory (`:memory:`) so concurrency-token behavior is actually exercised, not skipped by a non-relational provider. Priority: `AssetService.ApplyOperation` conflict/success paths.

This list is numbered by dependency order, not by when to write tests — per the team's TDD practice, write `ApplyOperation`'s tests alongside step 8, before wiring the hub or controllers to it, not after everything else is built.

## Sequencing notes

- Steps 2–3 can be stubbed (in-memory fake data, no real DB) so the rest aren't blocked waiting on a working EF setup — swap the stub for the real `DbContext` once it's ready.
- Step 8 is the one piece of logic both the controller and the hub depend on — write its tests first, build it against them, before wiring either entry point to it.
- Workspaces (5, 7) are simple CRUD with no concurrency concerns — build these first as a warm-up before the harder `AssetService`/`AssetHub` work.
- Hand the frontend team the hub method/event names (step 10) and REST endpoints (steps 4–6) as soon as they're decided, even before they're implemented — frontend can build against that contract with a stub server.

## Out of scope for alpha

Real auth, RBAC, any template besides Todo, everything else listed under "Out of scope" in `alpha.md`.
