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

### `POST /api/documents`

Request:
```json
{ "title": "string", "ownerId": "uuid" }
```
Response `201`:
```json
{ "id": "uuid", "title": "string", "revision": 0, "items": [] }
```

### `GET /api/documents?ownerId={uuid}`

`ownerId` is required, not optional — always scoped to one user's own documents.

Response `200`:
```json
[
  { "id": "uuid", "title": "string", "updatedAt": "datetime", "itemCount": 0 }
]
```

### `GET /api/documents/{id}`

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

### `DELETE /api/documents/{id}`

Response: `204`, empty body.

### Errors

- Validation failure (e.g. empty `title`): `400`, framework-default `application/problem+json` body.
- Missing document/user: `404`, empty body.

## Hub — `/hubs/document`

### Client → Server (invoked by name, args in order)

| Method | Args |
|---|---|
| `JoinDocument` | `documentId: uuid, userId: uuid` |
| `LeaveDocument` | `documentId: uuid` |
| `AddItem` | `documentId: uuid, baseRevision: int, text: string` — appended at the end, `Order` = current max + 1 |
| `UpdateItem` | `documentId: uuid, baseRevision: int, itemId: uuid, text: string \| null, isDone: bool \| null` — `null` means "leave unchanged," not "clear" |
| `DeleteItem` | `documentId: uuid, baseRevision: int, itemId: uuid` |
| `ReorderItem` | `documentId: uuid, baseRevision: int, itemId: uuid, newOrder: int` |

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

A method call against a missing document/item, or any failure unrelated to `baseRevision`, throws a `HubException` with a message — the client's invocation call rejects, caller only. `EditRejected` is reserved for a stale `baseRevision` specifically.
