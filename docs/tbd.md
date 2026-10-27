# Decisions

## Concurrent edits — decided: delta merge, no revision

Edits are sent as deltas (only what changed), so concurrent changes merge: two additions both survive, edits to different items or fields both apply, edits to the same field are last-write-wins. There is no revision and no rejected edit. Details are in `architecture.md`, Concurrency.

The cost: two people editing the same field of the same item silently lose one edit. Accepted for alpha.

## Canvas layout — decided: last-write-wins

Moving and resizing assets (`X`, `Y`, `SizeX`, `SizeY`, `ZPos`) is last-write-wins. The client sends a move on drop, the server saves it, and everyone shows the coordinates the server broadcasts. Dragging a card another user is working on is accepted. Details are in `architecture.md`, Layout (beta).
