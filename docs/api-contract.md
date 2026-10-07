# API Contract — Alpha

Exact wire shapes for REST and the hub. Backend and frontend both build against this — if a shape needs to change, update it here first, then tell the other side.

Types: `uuid` = string, `datetime` = ISO 8601 string, UTC. `"type | null"` inside a JSON block is schema notation for an optional/nullable field, not a literal value to send.

## REST

### `POST /api/users`

Request:
```json
{ "displayName": "string" }
```
Response `201`:
```json
{ "id": "uuid", "displayName": "string" }
```

### `GET /api/users/{id}`

Response `200`:
```json
{ "id": "uuid", "displayName": "string" }
```

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

### `POST /api/workspaces/{id}/members`

Request:
```json
{ "userId": "uuid" }
```
Response: `204`, empty body.

### `DELETE /api/workspaces/{id}`

Response: `204`, empty body.

### `POST /api/assets`

Request:
```json
{ "title": "string", "workspaceId": "uuid" }
```
Response `201`:
```json
{ "id": "uuid", "title": "string", "revision": 0, "items": [] }
```

### `GET /api/assets?workspaceId={uuid}`

`workspaceId` is required.

Response `200`:
```json
[
  { "id": "uuid", "title": "string", "updatedAt": "datetime", "itemCount": 0 }
]
```

### `GET /api/assets/{id}`

Response `200`:
```json
{
  "id": "uuid",
  "title": "string",
  "revision": 0,
  "items": [
    { "id": "uuid", "text": "string", "isDone": false, "order": 0 }
  ]
}
```

### `DELETE /api/assets/{id}`

Response: `204`, empty body.

### Errors

- Validation failure (e.g. empty `title`/`name`): `400`, framework-default `application/problem+json` body.
- Missing workspace/asset/user: `404`, empty body.

## Hub — `/hubs/asset`

### Client → Server (invoked by name, args in order)

| Method | Args |
|---|---|
| `JoinAsset` | `assetId: uuid, userId: uuid` |
| `LeaveAsset` | `assetId: uuid` |
| `AddItem` | `assetId: uuid, baseRevision: int, text: string` — appended at the end, `Order` = current max + 1 |
| `UpdateItem` | `assetId: uuid, baseRevision: int, itemId: uuid, text: string \| null, isDone: bool \| null` — `null` means "leave unchanged," not "clear" |
| `DeleteItem` | `assetId: uuid, baseRevision: int, itemId: uuid` |
| `ReorderItem` | `assetId: uuid, baseRevision: int, itemId: uuid, newOrder: int` |

### Server → Client (event name, payload)

`ItemAdded`:
```json
{ "item": { "id": "uuid", "text": "string", "isDone": false, "order": 0 }, "newRevision": 0 }
```

`ItemUpdated` (`null` fields mean unchanged, matching `UpdateItem`'s semantics):
```json
{ "itemId": "uuid", "text": "string | null", "isDone": "bool | null", "newRevision": 0 }
```

`ItemDeleted`:
```json
{ "itemId": "uuid", "newRevision": 0 }
```

`ItemReordered` (`changes` covers every item whose `Order` moved, not just the one targeted — reordering shifts everything between old and new position):
```json
{ "changes": [ { "itemId": "uuid", "order": 0 } ], "newRevision": 0 }
```

`EditRejected`:
```json
{
  "currentRevision": 0,
  "currentSnapshot": {
    "title": "string",
    "items": [
      { "id": "uuid", "text": "string", "isDone": false, "order": 0 }
    ]
  }
}
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

A method call against a missing asset/item, or any failure unrelated to `baseRevision`, throws a `HubException` with a message — the client's invocation call rejects, caller only. `EditRejected` is reserved for a stale `baseRevision` specifically.
