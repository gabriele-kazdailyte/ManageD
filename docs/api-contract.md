# API Contract — Alpha

Exact wire shapes for REST and the hub. Backend and frontend both build against this — if a shape needs to change, update it here first, then tell the other side.

Types: `uuid` = string, `datetime` = ISO 8601 string, UTC, `templateType` = enum name as a string (`"Todo"` — the only value in alpha), never its numeric value. `"type | null"` inside a JSON block is schema notation for an optional/nullable field, not a literal value to send.

## REST

### `POST /api/users`

Registers a user.

Request:
```json
{ "username": "string", "password": "string", "displayName": "string" }
```
- `username`: 3–32 characters, only ASCII letters, digits and `_`. Unique regardless of case: `Marius` and `marius` can't both exist. Returned with the capitals it was registered with.
- `password`: 8–128 characters. Not trimmed.
- `displayName`: required, at most 32 characters, any characters (spaces and accents are fine). Not unique.

Response `201` with a `Location` header pointing at `GET /api/users/{id}`:
```json
{ "id": "uuid", "username": "string", "displayName": "string" }
```
A taken username is a `409` with `detail` `"That username is already taken."`. Too many attempts from one address is a `429`, see Errors.

### `POST /api/users/login`

Request:
```json
{ "username": "string", "password": "string" }
```
`username` matches regardless of case, `password` must match exactly.

Response `200`:
```json
{ "id": "uuid", "username": "string", "displayName": "string" }
```
A wrong password and an unknown username both give the same `401` with `detail` `"Wrong username or password."`, so the reply never reveals which usernames exist. Too many attempts from one address is a `429`.

There is no logout endpoint: the server keeps no session, so logging out is the client forgetting the user.

### `GET /api/users/{id}`

Response `200`:
```json
{ "id": "uuid", "username": "string", "displayName": "string" }
```
No user response ever includes the password or its hash.

### `POST /api/workspaces`

Request:
```json
{ "name": "string", "creatorUserId": "uuid" }
```
Response `201`:
```json
{ "id": "uuid", "name": "string" }
```

### `GET /api/workspaces?userId={uuid}`

`userId` is required — lists only workspaces that user is a member of.

Response `200`:
```json
[
  { "id": "uuid", "name": "string" }
]
```

### `GET /api/workspaces/{id}/members`

Lists the workspace's members, sorted by display name.

Response `200`:
```json
[
  { "id": "uuid", "displayName": "string" }
]
```

### `POST /api/workspaces/{id}/members`

Adds a user to the workspace by id. Adding someone who is already a member is not an error, so the same request can safely be sent twice.

Request:
```json
{ "userId": "uuid" }
```
Response `201` (the user was added) or `200` (the user was already a member):
```json
{ "id": "uuid", "displayName": "string" }
```

A missing workspace or user is a `404` with a `detail` message saying which one (`"Workspace not found."` / `"No user with that ID exists."`), see Errors.

### `DELETE /api/workspaces/{id}`

Response: `204`, empty body.

### `GET /api/assets/presets`

Lists the server-defined presets a new asset can be seeded from (via `presetName` on the hub's `CreateAsset`). `itemCount` is how many items the preset would add.

Response `200`:
```json
[
  { "name": "string", "itemCount": 0 }
]
```

Assets themselves are created, read and deleted through the hub, see below.

### Errors

- Validation failure (e.g. empty `name` or `displayName`, a username with a space, a short password): `400`, framework-default `application/problem+json` body.
- Taken username on register: `409`, `application/problem+json` body with a `detail` message.
- Failed login: `401`, `application/problem+json` body with a `detail` message.
- Rate limit: register and login are limited per IP address (by default 10 registers and 5 logins a minute, set under `RateLimits` in appsettings). Going over gives a `429` with an empty body.
- Missing workspace/user: `404`, empty body. The exception is `POST /api/workspaces/{id}/members`, where either the workspace or the user can be missing: its `404` has an `application/problem+json` body whose `detail` says which one.

## Hub — `/hubs/workspace`

One group per workspace. Types shared by several shapes below:

```json
// item
{ "id": "uuid", "text": "string", "isDone": false, "order": 0, "deadlineDate": "date | null", "completedDate": "date | null" }
// asset — x and y are canvas coordinates in pixels, sizeX and sizeY the card size (0 = auto), zPos the stacking order
{ "id": "uuid", "title": "string", "templateType": "templateType", "x": 0, "y": 0, "sizeX": 0, "sizeY": 0, "zPos": 0, "items": [ item ] }
// delta — every part optional; only what changed
{
  "title": "string | null",
  "x": "number | null",
  "y": "number | null",
  "sizeX": "number | null",
  "sizeY": "number | null",
  "zPos": "int | null",
  "added": [ item ],
  "updated": [ {
    "id": "uuid",
    "text": "string | null",
    "isDone": "bool | null",
    "order": "int | null",
    "deadlineDate": "date | null",
    "clearDeadline": false,
    "completedDate": "date | null",
    "clearCompletedDate": false
  } ],
  "deleted": [ "uuid" ]
}
```

Field meanings: `asset.x` and `asset.y` are canvas coordinates in pixels (any finite number, negative included) and can be changed independently in an asset delta. `asset.sizeX` and `asset.sizeY` are the card size in pixels: `0` means auto (the client sizes the card to its content), otherwise a finite number from 160 to 1200; anything else is rejected with an invalid delta and nothing in the delta is applied. `asset.zPos` is the stacking order, any integer, higher on top. A new asset is created on top of its workspace (highest `zPos` + 1). All three can also be changed independently in an asset delta, last write wins. `item.text` is non-empty, at most 200 characters. `item.order` is the position, ascending; duplicates are allowed and tie-break by `id`. `item.deadlineDate` and `item.completedDate` are optional calendar dates in `YYYY-MM-DD` format. Completion dates are recorded by the server in UTC when an item is marked done and cleared when reopened. The UI shows a green filled circle for completion on or before the deadline, yellow for late completion, red for an overdue unfinished item, and a hollow circle for an unfinished item whose deadline has not passed. In `added`, `id` is a new uuid generated by the client. In `updated`, a field that is `null` or omitted is left unchanged, not cleared; set `clearDeadline` to `true` to remove a deadline. Completion dates can only change with `isDone`. A change cannot set and clear either date at the same time.

### Client → Server (invoked by name, args in order)

| Method | Args |
|---|---|
| `JoinWorkspace` | `workspaceId: uuid, userId: uuid` — returns the workspace state, see below |
| `LeaveWorkspace` | `workspaceId: uuid` |
| `CreateAsset` | `workspaceId: uuid, title: string, templateType: templateType \| null, presetName: string \| null` — `templateType` `null` means `Todo`; `presetName` `null` means an empty asset, a known name seeds the asset with that template's items, an unknown name throws a `HubException` |
| `CreateAssetAt` | `workspaceId: uuid, title: string, templateType: templateType \| null, presetName: string \| null, x: number \| null, y: number \| null` — same as `CreateAsset`, and the new asset is placed at `x`, `y` (`null` means 0; a non-finite number throws a `HubException`). `CreateAsset` is unchanged and creates at (0,0); SignalR needs the exact argument count, so a position can't be an optional extra argument on it |
| `UpdateAsset` | `assetId: uuid, delta: delta` |
| `DeleteAsset` | `assetId: uuid` |

`JoinWorkspace` return value, sent only to the caller:
```json
{
  "assets": [ asset ],
  "viewers": [ { "userId": "uuid", "displayName": "string" } ]
}
```
The connection joins the group before the state is read. Call it on every connect and reconnect, and replace local state with the result. Events that arrive before the call returns may be newer than the result: buffer them and apply them afterwards. Applying is idempotent — an `added` item whose `id` the client already has is ignored.

`UpdateAsset` applies the whole delta in one transaction. Entries that refer to an item not in the asset are skipped, not errors. Send a delta on commit, not per keystroke.

### Server → Client (event name, payload)

`AssetCreated` (`asset.items` holds the seeded items, or is empty):
```json
{ "asset": asset }
```

`AssetUpdated` (`delta` is what was actually applied, with skipped entries removed; applying it twice is harmless):
```json
{ "assetId": "uuid", "delta": delta }
```

`AssetDeleted`:
```json
{ "assetId": "uuid" }
```

`UserJoined`:
```json
{ "userId": "uuid", "displayName": "string" }
```

`UserLeft`:
```json
{ "userId": "uuid" }
```

### Errors

A `JoinWorkspace` by a user who isn't a member of the workspace, any other method called from a connection that hasn't joined the workspace, a method call against a missing workspace/asset, or one that fails validation (empty or over-long `text`, a new item whose `id` already exists, an unknown `presetName`), throws a `HubException` with a message — the client's invocation call rejects, caller only. The client discards its optimistic change and calls `JoinWorkspace` again to resync.
