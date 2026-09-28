# Alpha Plan — Backend (BED)

See `architecture.md` for design, `alpha.md` for scope, `api-contract.md` for exact request/response/payload shapes.

## Tasks

1. **Project setup** — add EF Core + SQLite provider, register `DbContext` in `Program.cs`.
2. **Entities** — `User`, `Document` (with `Revision` as a concurrency token), `TodoItem`. Initial migration.
3. **CORS** — allow the frontend's dev origin on both the REST API and the hub.
4. **`UsersController`** — `POST /api/users`, `GET /api/users/{id}`. Data Annotations on the request DTO.
5. **`DocumentsController`** — `POST /api/documents`, `GET /api/documents?ownerId=`, `GET /api/documents/{id}`, `DELETE /api/documents/{id}`. No item mutation here.
6. **`DocumentService`** — create/read/list documents; one `ApplyOperation(documentId, baseRevision, operation)` method taking an internal discriminated-union operation type, asserting `baseRevision` via the concurrency token, catching `DbUpdateConcurrencyException` and returning `Applied`/`Conflict`. Each hub method (step 8) constructs the matching operation and calls this — the type never crosses the wire, so it's fine for it to be polymorphic even though the hub methods themselves aren't.
7. **`PresenceService`** — in-memory, keyed by connection id, not just user id (one user can have multiple tabs open).
8. **`DocumentHub`** — `JoinDocument`, `LeaveDocument`, `AddItem`, `UpdateItem`, `DeleteItem`, `ReorderItem`, plus an `OnDisconnectedAsync` override for ungraceful drops (tab closed, network loss); broadcasts `ItemAdded`, `ItemUpdated`, `ItemDeleted`, `ItemReordered`, `EditRejected`, `UserJoined`, `UserLeft`. `EditRejected` goes to the caller only; everything else broadcasts to the whole group, including the sender. `ItemReordered` carries every item whose `Order` shifted, not just the one moved — don't skip this or reorders will desync other clients.
9. **Tests** — xUnit, SQLite in-memory (`:memory:`) so concurrency-token behavior is actually exercised, not skipped by a non-relational provider. Priority: `DocumentService.ApplyOperation` conflict/success paths.

This list is numbered by dependency order, not by when to write tests — per the team's TDD practice, write `ApplyOperation`'s tests alongside step 6, before wiring the hub or controllers to it, not after everything else is built.

## Sequencing notes

- Steps 2–3 can be stubbed (in-memory fake data, no real DB) so 4–8 aren't blocked waiting on a working EF setup — swap the stub for the real `DbContext` once it's ready.
- Step 6 is the one piece of logic both the controller and the hub depend on — write its tests first, build it against them, before wiring either entry point to it.
- Hand the frontend team the hub method/event names (step 8) and REST endpoints (steps 4–5) as soon as they're decided, even before they're implemented — FED can build against that contract with a stub server.

## Out of scope for alpha

Real auth, any template besides Todo, everything else listed under "Out of scope" in `alpha.md`.
