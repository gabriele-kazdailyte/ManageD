# To be decided

Open decisions that block no alpha work.

## Revision system for canvas layout

`Asset` stores its canvas placement (`X`, `Y`, `SizeX`, `SizeY`, `ZPos`), but nothing reads or writes these in alpha. Once layout can change live, we need to decide how layout edits interact with `Revision`, which today guards item edits only (see `architecture.md`, Concurrency).

| Option | How it works | Trade-off |
|---|---|---|
| Single revision | Layout edits bump the same `Asset.Revision` as item edits. | Simplest, but dragging an asset rejects a concurrent item edit, and the reverse. |
| Separate revisions | A second counter for layout, so item edits and layout edits never conflict with each other. | Two counters to maintain; two moves of the same asset can still conflict. |
| Layout last-write-wins | Layout edits skip the revision check; the latest write wins. | No rejected drags, but one user's move can silently overwrite another's. |
| Per-property merge | Merge changes field by field (one user moves, another resizes). | Fewer lost edits; more logic to write and test. |
| OT / CRDT | A real-time merge algorithm. | Handles concurrent edits best; far more complex than the project needs. |

No decision yet. Needed before layout operations are added to the hub (beta).
