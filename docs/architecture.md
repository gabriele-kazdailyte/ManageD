# Architecture — Alpha

## Overview

Frontend (React) talks to two backend entry points: a REST API for CRUD, and a SignalR hub for real-time editing. Both call one shared service layer, which is the only thing that touches the database.

CORS is enabled from the start: frontend and backend run on different ports in dev, so the backend must explicitly allow the frontend's origin, for both the REST API and the hub.

Exact request/response/payload shapes are in `api-contract.md` — this doc covers design, that one covers the wire format backend and frontend both build against.

## Entities

- **User** — `Id (uuid), DisplayName (string), CreatedAt (datetime, UTC)`
- **Document** — `Id (uuid), Title (string), TemplateType (enum, Todo only), Revision (int, concurrency token), OwnerId (uuid, ForeignKey→User), CreatedAt (datetime, UTC), UpdatedAt (datetime, UTC)`
- **TodoItem** — `Id (uuid), DocumentId (uuid, ForeignKey→Document), Text (string), IsDone (bool), Order (int)`

## REST API

### UsersController — `/api/users`

| Endpoint | Description |
|---|---|
| `POST /api/users` | Creates a user from a display name, returns the user id. |
| `GET /api/users/{id}` | Returns a user's display name. |

### DocumentsController — `/api/documents`

| Endpoint | Description |
|---|---|
| `POST /api/documents` | Creates an empty Todo document owned by the given user. |
| `GET /api/documents?ownerId=` | Lists documents owned by the given user. `ownerId` is required — this is always "my documents," not a global list; there's no other access boundary in alpha. |
| `GET /api/documents/{id}` | Returns a document's full snapshot: title, revision, items. |
| `DELETE /api/documents/{id}` | Deletes a document. |

Content is never created or edited via REST — only through the hub.

Validation failures return the framework-default 400 `application/problem+json` body. A missing document/user returns an empty 404.

## SignalR Hub — `DocumentHub` at `/hubs/document`

### Client → Server

| Method | Description |
|---|---|
| `JoinDocument(documentId, userId)` | Adds the connection to the document's group, registers presence, notifies the group. |
| `LeaveDocument(documentId)` | Removes the connection from the group and presence. |
| `AddItem(documentId, baseRevision, text)` | Adds a new item against a known revision. Appended at the end — `Order` is set to the current max `Order` in the document, plus one. |
| `UpdateItem(documentId, baseRevision, itemId, text?, isDone?)` | Edits an item's text and/or done state against a known revision. `null` on either parameter means that field is left unchanged, not cleared — `Text` is already required non-empty by validation, so there's no valid "clear it" state to distinguish from "don't touch it." |
| `DeleteItem(documentId, baseRevision, itemId)` | Removes an item against a known revision. |
| `ReorderItem(documentId, baseRevision, itemId, newOrder)` | Moves an item to a new integer position against a known revision. `Order` is a plain integer; every item between the old and new position shifts by one to make room, so a reorder can touch — and conflict with edits to — items it didn't directly target. |

One hub method per operation, rather than a single method taking a generic payload, avoids needing a JSON type discriminator for a polymorphic operation type.

### Server → Client

| Event | Description |
|---|---|
| `ItemAdded(item, newRevision)` | Broadcast to the whole group, including the sender, when `AddItem` is accepted. |
| `ItemUpdated(itemId, text?, isDone?, newRevision)` | Broadcast when `UpdateItem` is accepted. |
| `ItemDeleted(itemId, newRevision)` | Broadcast when `DeleteItem` is accepted. |
| `ItemReordered(changes, newRevision)` | Broadcast when `ReorderItem` is accepted. `changes` is a list of `{itemId, order}` — every item whose `Order` actually changed, including the moved item itself, not just the one targeted. |
| `EditRejected(currentRevision, currentSnapshot)` | Sent to the caller only, when `baseRevision` is stale. |
| `UserJoined(userId, displayName)` | Broadcast when a user joins a document. |
| `UserLeft(userId)` | Broadcast when a user leaves a document. |

Outbound events mirror the inbound methods one-for-one, for the same reason inbound is split: a single generic `EditApplied(operation, newRevision)` would need the same polymorphic serialization the split methods were chosen to avoid.

A hub method that targets a missing document/item, or hits any failure unrelated to `baseRevision`, throws a `HubException` — SignalR surfaces this as a rejected invocation to the caller only. `EditRejected` is reserved specifically for a stale `baseRevision`, not for errors generally.

On disconnect — explicit `LeaveDocument`, or an ungraceful drop (tab closed, network loss) handled by overriding `OnDisconnectedAsync` — the hub looks up every document this connection was present in via `PresenceService`, removes it, and broadcasts `UserLeft` for each. Presence is keyed by connection id specifically so this lookup works without the client having to say anything on its way out.

## Service Layer

| Service | Responsibility |
|---|---|
| `DocumentService` | Create, read, list documents; one internal `ApplyOperation(documentId, baseRevision, operation)` method, taking an internal discriminated-union operation type, used by all four hub methods. Increments `Revision` on success. |
| `PresenceService` | Tracks which connections are viewing which document, in memory, keyed by connection id. |
| `UserService` | Creates and reads users. |

Each hub method constructs the matching operation record and calls `ApplyOperation`; the polymorphism avoided on the wire (see SignalR Hub) doesn't apply here, since this type never gets serialized — it exists only to avoid repeating the load-check-revision-save sequence four times.

## Validation

Data Annotations on REST DTOs (`[Required]`, `[MaxLength]`) for shape validation — display name, title, item text non-empty and within length limits. The framework rejects malformed requests with a 400 before a handler runs. Rules that need DB access (e.g. an `itemId` belongs to the given `documentId`) aren't shape validation and live in `DocumentService`, not on a DTO.

## Data Access

**SQLite** — single file, no external DB process to run in dev. Chosen for alpha because the goal is proving the concurrency mechanism works, not production-grade storage; revisit for beta if real concurrent-load behavior needs testing.

Services talk to the database through EF Core's `DbContext`/`DbSet<T>` directly — no repository layer. `DbContext` already provides Unit of Work (batches changes, commits them as one transaction on `SaveChangesAsync`) and per-entity querying, so a hand-rolled repository on top would just forward to it. Entities are plain C# classes; EF maps them to tables and translates LINQ queries into SQL.

## Concurrency

`Revision` is a plain `int`, marked `[ConcurrencyCheck]` — not the `[Timestamp]`/rowversion pattern common in EF Core tutorials, which is a `byte[]` column type SQLite doesn't support the way SQL Server does. The app increments `Revision` itself as part of applying an operation. Applying an operation loads the document, mutates the relevant `TodoItem`, and increments `Revision`, all in one `SaveChangesAsync()` call. EF emits `UPDATE ... WHERE Id = @id AND Revision = @loadedRevision`; if another operation already advanced the revision, zero rows match and EF throws `DbUpdateConcurrencyException`. `DocumentService` catches this and returns `Conflict`. The database enforces atomicity of check-and-increment — the service never compares revisions in memory before writing.

## Routing

React Router, two routes:

| Route | Renders |
|---|---|
| `/` | Dashboard — list/create/delete documents. |
| `/documents/:id` | Document view — the id comes from the URL, so refresh and shareable links work. |

## Frontend State

Context + `useReducer`, scoped to the document view. Each hub event maps to a reducer action (`ITEM_ADDED`, `ITEM_UPDATED`, `ITEM_DELETED`, `ITEM_REORDERED`, `EDIT_REJECTED`, `USER_JOINED`, `USER_LEFT`), plus a `LOCAL_EDIT` action for the optimistic apply. A `DocumentProvider` owns the reducer, seeded from the REST snapshot; child components read state and dispatch via context instead of prop drilling.

## Frontend Flow

1. On boot, load `{userId, displayName}` from localStorage, or create one via `POST /api/users`.
2. `/` lists documents via `GET /api/documents`; creating one calls `POST /api/documents` and navigates to `/documents/:id`.
3. Opening `/documents/:id` — always `GET /api/documents/{id}` for the snapshot first, then connect to the hub and call `JoinDocument`. This runs on every connect, including reconnects after a dropped connection, so the client never resumes from state that might have missed edits made while it was offline.
4. Local edits apply optimistically, then are sent via the matching hub method (`AddItem`/`UpdateItem`/`DeleteItem`/`ReorderItem`); state is only confirmed once the matching broadcast event is received back from the group.
5. `EditRejected` discards the optimistic change and replaces state with `currentSnapshot`.
6. Leaving a document calls `LeaveDocument` and closes the connection.

## Deferred

Not part of alpha, decided later:

- **CI** — no GitHub Actions gate on PRs yet.
- **Deployment/hosting** — no target environment chosen yet.
