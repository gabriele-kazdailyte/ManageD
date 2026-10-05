# To Be Discussed

Open decisions. Nothing here is settled — don't build against it yet.

## Revision / conflict system for the canvas

**Why it's open:** alpha uses one `Revision` per asset. An edit sent with a stale `baseRevision` is rejected and the client resyncs (see `architecture.md`, Concurrency). That works for todo items, but on a canvas it would reject constantly — e.g. dragging an asset while someone ticks an item on it.

**What we need to decide:**
- Does moving, resizing or restacking an asset (`X`, `Y`, `SizeX`, `SizeY`, `ZPos`) bump the same `Revision` as content edits?
- If not, do layout changes skip conflict checks (last write wins), or get their own revision?
- What happens when two people change the same asset at the same time, and the same property, like two drags?

**Options discussed:**
1. **One `Revision` for everything** (alpha as-is) — simplest, but layout and content conflict with each other.
2. **Separate layout and content revisions** — layout changes never conflict with content edits.
3. **Layout last-write-wins, content revision-checked** — no rejections on moves; a conflicting move is harmless.
4. **Per-property merging** (how Figma works) — each property is tracked separately, so only same-property edits conflict.
5. **OT / CRDT** (Google Docs, Excalidraw style) — concurrent edits merge automatically. Most powerful, most work.
