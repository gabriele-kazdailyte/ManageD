# Architecture — Alpha

## Overview

Frontend (React) talks to two backend entry points: a REST API for CRUD, and a SignalR hub for real-time editing. Both call one shared service layer, which is the only thing that touches the database.

Containment: a **User** belongs to one or more **Workspace**s. A **Workspace** contains **Asset**s — a wrapper around a typed content object (`TemplateType`, `Todo` only for alpha). Workspace membership gates what's listed for a user; it isn't role-based — RBAC (owner/editor/viewer per asset) stays out of scope, see `alpha.md`.

CORS is enabled from the start: frontend and backend run on different ports in dev, so the backend must explicitly allow the frontend's origin, for both the REST API and the hub.

Exact request/response/payload shapes are in `api-contract.md` — this doc covers design, that one covers the wire format backend and frontend both build against.

## Entities

- **User** — `Id (uuid), DisplayName (string), CreatedAt (datetime, UTC)`
- **Workspace** — `Id (uuid), Name (string), CreatedAt (datetime, UTC)`. Has a many-to-many `Users` navigation (membership) and a one-to-many `Assets` navigation.
- **Asset** — `Id (uuid), Title (string), TemplateType (enum, Todo only), Revision (int, concurrency token), WorkspaceId (uuid, ForeignKey→Workspace), X (float), Y (float), SizeX (float), SizeY (float), ZPos (int), CreatedAt (datetime, UTC), UpdatedAt (datetime, UTC)`. The canvas fields (`X`…`ZPos`) are added now so beta doesn't need another schema redo; nothing reads or writes them in alpha — see Canvas (beta).
- **TodoItem** — `Id (uuid), AssetId (uuid, ForeignKey→Asset), Text (string), IsDone (bool), Order (int)`

## REST API

### UsersController — `/api/users`

| Endpoint | Description |
|---|---|
| `POST /api/users` | Creates a user from a display name, returns the user id. |
| `GET /api/users/{id}` | Returns a user's display name. |

### WorkspacesController — `/api/workspaces`

| Endpoint | Description |
|---|---|
| `POST /api/workspaces` | Creates a workspace and adds the creator as its first member. |
| `GET /api/workspaces?userId=` | Lists workspaces the given user is a member of. `userId` is required. |
| `POST /api/workspaces/{id}/members` | Adds a user to the workspace. No permission check — any caller naming a `userId` can add it, consistent with alpha having no real auth. |
| `DELETE /api/workspaces/{id}` | Deletes a workspace. |

### AssetsController — `/api/assets`

| Endpoint | Description |
|---|---|
| `POST /api/assets` | Creates an empty Todo asset inside the given workspace. |
| `GET /api/assets?workspaceId=` | Lists assets inside the given workspace. `workspaceId` is required. |
| `GET /api/assets/{id}` | Returns an asset's full snapshot: title, revision, items. |
| `DELETE /api/assets/{id}` | Deletes an asset. |

Content is never created or edited via REST — only through the hub.

Validation failures return the framework-default 400 `application/problem+json` body. A missing workspace/asset/user returns an empty 404.

Membership isn't enforced as a security boundary on direct-by-id lookups (`GET /api/assets/{id}` etc.) — there's no auth to make that enforcement meaningful yet. It governs what's *listed* for a user, not what's reachable with an id already in hand.

## SignalR Hub — `AssetHub` at `/hubs/asset`

### Client → Server

| Method | Description |
|---|---|
| `JoinAsset(assetId, userId)` | Adds the connection to the asset's group, registers presence, notifies the group. |
| `LeaveAsset(assetId)` | Removes the connection from the group and presence. |
| `AddItem(assetId, baseRevision, text)` | Adds a new item against a known revision. Appended at the end — `Order` is set to the current max `Order` in the asset, plus one. |
| `UpdateItem(assetId, baseRevision, itemId, text?, isDone?)` | Edits an item's text and/or done state against a known revision. `null` on either parameter means that field is left unchanged, not cleared — `Text` is already required non-empty by validation, so there's no valid "clear it" state to distinguish from "don't touch it." |
| `DeleteItem(assetId, baseRevision, itemId)` | Removes an item against a known revision. |
| `ReorderItem(assetId, baseRevision, itemId, newOrder)` | Moves an item to a new integer position against a known revision. `Order` is a plain integer; every item between the old and new position shifts by one to make room, so a reorder can touch — and conflict with edits to — items it didn't directly target. |

One hub method per operation, rather than a single method taking a generic payload, avoids needing a JSON type discriminator for a polymorphic operation type.

### Server → Client

| Event | Description |
|---|---|
| `ItemAdded(item, newRevision)` | Broadcast to the whole group, including the sender, when `AddItem` is accepted. |
| `ItemUpdated(itemId, text?, isDone?, newRevision)` | Broadcast when `UpdateItem` is accepted. |
| `ItemDeleted(itemId, newRevision)` | Broadcast when `DeleteItem` is accepted. |
| `ItemReordered(changes, newRevision)` | Broadcast when `ReorderItem` is accepted. `changes` is a list of `{itemId, order}` — every item whose `Order` actually changed, including the moved item itself, not just the one targeted. |
| `EditRejected(currentRevision, currentSnapshot)` | Sent to the caller only, when `baseRevision` is stale. |
| `UserJoined(userId, displayName)` | Broadcast when a user joins an asset. |
| `UserLeft(userId)` | Broadcast when a user leaves an asset. |

Outbound events mirror the inbound methods one-for-one, for the same reason inbound is split: a single generic `EditApplied(operation, newRevision)` would need the same polymorphic serialization the split methods were chosen to avoid.

A hub method that targets a missing asset/item, or hits any failure unrelated to `baseRevision`, throws a `HubException` — SignalR surfaces this as a rejected invocation to the caller only. `EditRejected` is reserved specifically for a stale `baseRevision`, not for errors generally.

On disconnect — explicit `LeaveAsset`, or an ungraceful drop (tab closed, network loss) handled by overriding `OnDisconnectedAsync` — the hub looks up every asset this connection was present in via `PresenceService`, removes it, and broadcasts `UserLeft` for each. Presence is keyed by connection id specifically so this lookup works without the client having to say anything on its way out.

## Service Layer

| Service | Responsibility |
|---|---|
| `WorkspaceService` | Creates a workspace (adding the creator as its first member), adds members, lists a user's workspaces. |
| `AssetService` | Create, read, list assets; one internal `ApplyOperation(assetId, baseRevision, operation)` method, taking an internal discriminated-union operation type, used by all four hub methods. Increments `Revision` on success. |
| `PresenceService` | Tracks which connections are viewing which asset, in memory, keyed by connection id. |
| `UserService` | Creates and reads users. |

Each hub method constructs the matching operation record and calls `ApplyOperation`; the polymorphism avoided on the wire (see SignalR Hub) doesn't apply here, since this type never gets serialized — it exists only to avoid repeating the load-check-revision-save sequence four times.

## Validation

Data Annotations on REST DTOs (`[Required]`, `[MaxLength]`) for shape validation — display name, workspace/asset name/title, item text non-empty and within length limits. The framework rejects malformed requests with a 400 before a handler runs. Rules that need DB access (e.g. an `itemId` belongs to the given `assetId`) aren't shape validation and live in the relevant service, not on a DTO.

## Data Access

**SQLite** — single file, no external DB process to run in dev. Chosen for alpha because the goal is proving the concurrency mechanism works, not production-grade storage; revisit for beta if real concurrent-load behavior needs testing.

`Workspace`-`User` membership uses EF Core's skip navigations (`Workspace.Users`, `User.Workspaces`, both `ICollection<T>`) rather than an explicit join entity — EF generates and manages the bridge table itself. No membership class to write or maintain; add one back only if membership ever needs its own data (a role, a joined-at timestamp exposed to the API, etc.) beyond the plain yes/no it is now.

Services talk to the database through EF Core's `DbContext`/`DbSet<T>` directly — no repository layer. `DbContext` already provides Unit of Work (batches changes, commits them as one transaction on `SaveChangesAsync`) and per-entity querying, so a hand-rolled repository on top would just forward to it. Entities are plain C# classes; EF maps them to tables and translates LINQ queries into SQL.

## Concurrency

`Revision` is a plain `int`, marked `[ConcurrencyCheck]` — not the `[Timestamp]`/rowversion pattern common in EF Core tutorials, which is a `byte[]` column type SQLite doesn't support the way SQL Server does. The app increments `Revision` itself as part of applying an operation. Applying an operation loads the asset, mutates the relevant `TodoItem`, and increments `Revision`, all in one `SaveChangesAsync()` call. EF emits `UPDATE ... WHERE Id = @id AND Revision = @loadedRevision`; if another operation already advanced the revision, zero rows match and EF throws `DbUpdateConcurrencyException`. `AssetService` catches this and returns `Conflict`. The database enforces atomicity of check-and-increment — the service never compares revisions in memory before writing.

Only `Asset.Revision` is a concurrency token — `Workspace` has no concurrent-editing concept in alpha; it's created and listed, never collaboratively edited.

## Routing

React Router, two routes. There is no per-asset route: a workspace is a canvas, and its assets live on it and are edited inline.

| Route | Renders |
|---|---|
| `/` | Workspaces the current user belongs to — list/create. |
| `/workspaces/:workspaceId` | The workspace canvas — its assets, edited inline, with live sync. The id comes from the URL, so refresh and shareable links work. |

## Frontend State

Context + `useReducer`, scoped to the workspace canvas (the one screen with real-time state). Each hub event maps to a reducer action (`ITEM_ADDED`, `ITEM_UPDATED`, `ITEM_DELETED`, `ITEM_REORDERED`, `EDIT_REJECTED`, `USER_JOINED`, `USER_LEFT`), plus a `LOCAL_EDIT` action for the optimistic apply. A `WorkspaceProvider` owns the reducer, seeded from the REST snapshot; child components read state and dispatch via context instead of prop drilling. The workspaces list on `/` is plain REST data, no reducer needed — it's not edited in real time.

Canvas-specific actions (placing, moving, resizing assets) aren't listed here yet — they depend on the hub and entity changes planned in a separate PR.

## Frontend Flow

1. On boot, load `{userId, displayName}` from localStorage, or create one via `POST /api/users`.
2. `/` lists the user's workspaces (`GET /api/workspaces?userId=`); creating one calls `POST /api/workspaces` and navigates into it.
3. `/workspaces/:workspaceId` is the canvas. Opening it — always fetch the snapshot first (the workspace's assets, `GET /api/assets?workspaceId=`), then connect to the hub and join the workspace. This runs on every connect, including reconnects after a dropped connection, so the client never resumes from state that might have missed edits made while it was offline.
4. Creating an asset happens on the canvas itself (`POST /api/assets`), not on a separate page.
5. Local edits apply optimistically, then are sent via the matching hub method (`AddItem`/`UpdateItem`/`DeleteItem`/`ReorderItem`); state is only confirmed once the matching broadcast event is received back from the group.
6. `EditRejected` discards the optimistic change and replaces state with `currentSnapshot`.
7. Leaving the canvas leaves the workspace on the hub and closes the connection.

## Canvas (beta)

A workspace is a canvas: its assets are placed on it, resized and stacked, and edited inline. **In alpha only the database fields exist** — `X`, `Y`, `SizeX`, `SizeY` (float) and `ZPos` (int) on `Asset`, listed under Entities — so beta doesn't need another schema redo. Everything below is beta, not built yet.

### REST

Creating an asset accepts its position and size. Listing a workspace's assets and fetching a snapshot return them.

### Hub: one group per workspace

A SignalR "group" is the set of connections that receive the same messages. In alpha a client joins a group per asset (`JoinAsset`), so it only hears about the one asset it has open. On a canvas, one screen shows all of a workspace's assets at once, so per-asset groups would mean joining one group per asset. Instead the client joins once per workspace (`JoinWorkspace`) and gets one stream of events for everything on that canvas.

- **Join/leave:** `JoinWorkspace(workspaceId, userId)` and `LeaveWorkspace(workspaceId)` replace `JoinAsset`/`LeaveAsset`. Presence becomes "who is on this canvas", and disconnect cleanup runs per workspace, same mechanism as before.
- **Layout operations (new):** `AddAsset`, `MoveAsset`, `ResizeAsset`, `SetZPos`, `DeleteAsset`. One method per operation, as in alpha, each with a matching broadcast event (`AssetAdded`, `AssetMoved`, `AssetResized`, `AssetZPosChanged`, `AssetDeleted`).
- **Item operations:** `AddItem`, `UpdateItem`, `DeleteItem`, `ReorderItem` keep their shape. They still target an `assetId`, and their events now carry it, so every client knows which asset on the canvas changed.
- **Broadcast and errors:** same as alpha — events go to the whole group including the sender, and a missing workspace or asset throws a `HubException`.
- **Connect/reconnect:** the client first fetches the workspace's assets over REST, then joins the group, so it never resumes from stale state.

### Open: revision and conflict rules

How layout changes interact with `Revision` and conflict detection is undecided — see `tbd.md`.

### Not stored

Pan offset and zoom level are per-user view state in the frontend and never reach the backend.

## Deferred

Not part of alpha, decided later:

- **CI** — no GitHub Actions gate on PRs yet.
- **Deployment/hosting** — no target environment chosen yet.
- **RBAC** — per-asset owner/editor/viewer roles. Workspace membership (this doc) is a flat yes/no gate, not a replacement for this.
- **Open decisions** — see `tbd.md`.
