# Plan — Migrate the board canvas to React Flow

Replace the hand-rolled board in `frontend/src/components/Canvas.tsx` with React Flow (`@xyflow/react`, MIT; v12+ is the current React Flow package). `TodoAsset` and `StickyNoteAsset` become custom nodes. Hub syncing (`WorkspaceProvider`, `workspaceReducer`, `AssetDelta`) stays as it is. `CalendarView` is not touched.

See `architecture.md` (Layout (beta)), `tbd.md` (Canvas layout), `api-contract.md` and `plan-frontend.md` for context.

The plan has two tracks:

- **Frontend (FE1–FE7)** needs no backend changes. Everything that works today keeps working: moves are already saved through `UpdateAsset` with `{x, y}`.
- **Backend (BE1–BE2)** is optional. It unlocks the follow-up frontend tasks (FE8–FE11) and can happen whenever it fits.

## Goals

- An infinite board you can pan and zoom: wheel or trackpad pans, Ctrl or pinch zooms around the cursor, space-drag or middle-drag pans. Zoom controls, fit view and a minimap.
- Selection: click, Shift-click and marquee select, then move the selected cards together.
- Remove the current bugs:
  - Cards jumping when another card is deleted (the grid fallback is based on list position).
  - The passive wheel listener, so wheel zoom no longer scrolls the page.
  - Zoom anchored to the top-left corner.
  - Positions clamped to ≥ 0.
  - Re-rendering every card on each pointer move.
- After the backend track: drop at the cursor, resizable cards, z-order.

## Non-goals

- Edges/connectors, freehand drawing or shapes.
- Live position streaming while dragging. Positions are still sent once, when the drag ends (last-write-wins, per `tbd.md`).
- Undo/redo.

## Conventions for every task

- Work on a feature branch. One task per commit.
- Keep the code style that's already there: function components, CSS files next to components, no new state library.
- Before calling a task done, these must pass:
  - Frontend: `cd frontend && npm run lint && npm run build && npm test` (`npm test` from FE1 on)
  - Backend: `cd backend && dotnet test`
- Don't change hub method or event names. Only add optional parameters and fields.
- Check every **Acceptance** item before ticking a task.

---

# Frontend track (no backend changes)

### FE1. [ ] Dependencies, test runner and the mapping layer
- **Files:** `frontend/package.json`, `frontend/vite.config.ts`, global CSS import (`main.tsx`), new `frontend/src/components/board/boardModel.ts` and `boardModel.test.ts`
- **Steps:**
  1. `npm i @xyflow/react`. `npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom`. Add `"test": "vitest run"` and `test: { environment: 'jsdom' }`. Import `@xyflow/react/dist/style.css` once.
  2. Types: `AssetNodeData = { asset: AssetSnapshot; isDeleting: boolean }` and `AssetNode = Node<AssetNodeData, 'todo' | 'note'>`.
  3. `assetsToNodes(assets, deletingIds, previous?)`:
     - `id` = asset id, `type` from `templateType`, `dragHandle: '.asset-drag-handle'`.
     - Saved positions are used as-is, with no clamping, so negative coordinates work.
     - **Stable fallback for unmoved cards:** an asset at exactly (0,0) hasn't been placed yet, because `CreateAsset` has no position. Give it a grid slot (3 columns, 280px apart) based on its rank among unmoved assets **sorted by id**, not on its index in the asset list. Cards that have been moved never jump.
     - Keep `selected`, plus `position` while `dragging`, from `previous` when the id matches. A server echo must not clear the selection or interrupt a drag.
  4. `positionDelta(node)` returns `{ x, y }` rounded to whole numbers. If the result is exactly (0,0), send (1,1), so the card isn't treated as unmoved.
- **Acceptance:** unit tests cover:
  - Mapping both template types.
  - Negative coordinates.
  - The fallback slot staying the same when an unrelated or moved card is deleted.
  - Selection and drag position surviving a re-map.
  - The delta rounding and the (0,0) → (1,1) rule.

### FE2. [ ] Card components become React Flow nodes
- **Files:** `TodoAsset.tsx`, `StickyNoteAsset.tsx` and their CSS, new `components/board/TodoNode.tsx`, `NoteNode.tsx`, `BoardActionsContext.ts`
- **Steps:**
  1. Remove the `onMoveStart` / `onMove` / `onMoveEnd` props and the header pointer handlers. Add the class `asset-drag-handle` to each header.
  2. Add `nodrag` to every input, textarea, button, checkbox and date picker, and to the todo-item reorder list (it uses HTML5 drag-and-drop).
  3. Add `nowheel` to scrollable areas: the markdown preview and long todo lists.
  4. `TodoNode` / `NoteNode` are `memo`'d wrappers that read `data`. They get `onUpdate` / `onDelete` from `BoardActionsContext`, so node objects stay stable.
  5. Keep the fixed width of 260px.
- **Acceptance:** lint and build pass, and nothing references `onMoveStart`.

### FE3. [ ] `Board` replaces `Canvas`
- **Files:** new `components/board/Board.tsx` and `Board.css`; `pages/WorkspacePage.tsx`; delete `Canvas.tsx` and `Canvas.css`
- **Steps:**
  1. `<ReactFlowProvider>` + `<ReactFlow>`. Props stay the same as `Canvas`, so `WorkspacePage` only swaps the import.
  2. Keep `nodes` in local state. Recompute them with `assetsToNodes(assets, deletingIds, prev)` when the inputs change. `onNodesChange` → `applyNodeChanges`, local only.
  3. `onNodeDragStop(_, _node, dragged)`: for each dragged node, call `onUpdate(asset, positionDelta(node))`.
  4. `nodeTypes = { todo: TodoNode, note: NoteNode }`, defined outside the component.
  5. Pan and zoom: `panOnScroll`, `zoomOnScroll={false}`, `zoomOnPinch`, `panOnDrag={[1]}`, `selectionOnDrag`, `minZoom={0.15}`, `maxZoom={3}`.
  6. `<Background variant="dots" gap={22} />`, `<Controls />`, `<MiniMap pannable zoomable />`, styled with `--panel`, `--border`, `--accent`. Hide the React Flow attribution (`proOptions={{ hideAttribution: true }}`).
  7. Remove the "Fit all components" checkbox. Call `fitView` once after the first load.
  8. Loading, error and empty states go in an overlay on top of the flow, not in place of it, so dropping onto an empty board still works.
  9. The sidebar drop (`onDrop`) keeps working as today. The drop position is still ignored until FE8.
  10. `deleteKeyCode={null}` for now.
- **Acceptance (run the app with the backend running):**
  - Cards render at their saved positions. Deleting a card doesn't move any other card.
  - Dragging by the header moves a card. On release one `UpdateAsset` is sent, and other viewers see the new spot.
  - Negative positions work.
  - Typing in a todo input or the note editor doesn't drag or pan. Reordering todo items still works.
  - Wheel pans, Ctrl or pinch zooms around the cursor, and the page never scrolls.
  - Marquee-select two cards, drag them, and both positions persist.
  - A remote update doesn't clear your selection or interrupt your drag.
  - Create, delete, edit, presence and the calendar all still work.

### FE4. [ ] Keyboard delete through the confirmation dialog
- **Files:** `Board.tsx`, `WorkspacePage.tsx`
- **Steps:**
  1. `deleteKeyCode={['Delete', 'Backspace']}`.
  2. `onBeforeDelete` returns `false` and passes the selected assets to `onDelete`. Only the server's `AssetDeleted` event removes cards.
  3. With several cards selected, either show one "Delete N items?" dialog or limit it to one card. Note the choice in the commit.
- **Acceptance:** Delete opens the dialog, and confirming removes the card for everyone. Backspace inside an input only edits text.

### FE5. [ ] Save the view per workspace
- **Steps:**
  1. `onMoveEnd` saves `{ x, y, zoom }` to `localStorage` under the key `board-viewport:<workspaceId>`.
  2. On load, restore the saved view, or `fitView` if there isn't one.
- **Acceptance:** pan and zoom, switch to Calendar and back, or reload, and the view is the same.

### FE6. [ ] Performance check
- **Steps:** with about 200 cards (create them through the hub), check that dragging and panning stay smooth. Node components must be `memo`'d, and `nodeTypes` and the callbacks stable. Fix anything that re-renders every node on each move.
- **Acceptance:** with React DevTools' profiler, dragging one card re-renders only that node.

### FE7. [ ] Cleanup and docs
- **Steps:**
  1. Remove the CSS selectors only the old canvas used.
  2. Update `docs/plan-frontend.md`, `docs/architecture.md` (Frontend / board) and `frontend/README.md` with the interactions: wheel pans, Ctrl or pinch zooms, space/middle-drag, marquee select, Delete key.
- **Acceptance:** `grep -r "Canvas" frontend/src` only finds `Board`-related names. Lint, build and tests pass.

---

# Backend track (optional, independent)

Can run at any time, in parallel with the frontend track. The two tracks share no files.

### BE1. [x] `CreateAsset` takes an optional position
- **Files:** `backend/src/ManageD.Api/Hubs/WorkspaceHub.cs`, `Services/AssetService.cs` + `IAssetService.cs`, `docs/api-contract.md`, `backend/tests/ManageD.Api.Tests`
- **Steps:** add `float? x, float? y` to the new asset. Reject values that aren't finite. **Deviation:** SignalR doesn't support optional hub arguments or overloads (a 4-argument call to a 6-parameter method fails), so this is a new hub method `CreateAssetAt(..., x, y)` and `CreateAsset` is unchanged.
- **Acceptance:** tests show the given x/y is saved and that leaving them out still gives (0,0). Existing clients are unaffected.

### BE2. [x] Send size and z-order in snapshots and deltas
- **Files:** `Dtos/AssetSnapshot.cs`, `Dtos/AssetDelta.cs` (+ `IsEmpty`), `Services/DeltaApplier.cs`, `Services/EfAssetStore.cs` (`ToSnapshot`), `docs/api-contract.md`, `docs/architecture.md`, tests. The DB columns already exist, so there's no migration.
- **Steps:**
  1. `AssetSnapshot` gets `float SizeX, float SizeY, int ZPos`. 0 means "auto".
  2. `AssetDelta` gets `float? SizeX, float? SizeY, int? ZPos`.
  3. Validation: sizes are finite and within 160–1200, or 0.
  4. Last-write-wins, as already decided in `tbd.md`.
- **Acceptance:** tests cover applying and validating each field.

---

# Frontend follow-ups (after the backend track)

### FE8. [x] Drop at the cursor — needs BE1
- **Steps:**
  1. In `onDrop`, `screenToFlowPosition({ x: e.clientX, y: e.clientY })` gives the board position. Pass it to `createAsset(title, presetName, templateType, position?)`, which calls `CreateAssetAt(..., x, y)` (see BE1).
  2. The toolbar's "new note" button places the note at the center of the current view.
- **Acceptance:** a dropped card appears under the cursor for every viewer.

### FE9. [x] Size and z-order fields in the frontend — needs BE2
- **Steps:**
  1. Mirror the new fields in `frontend/src/api/assets.ts`.
  2. Handle them in `context/applyDelta.ts` and add a test.
  3. In `assetsToNodes`, map `zIndex` from `zPos`, and `width`/`height` from `sizeX`/`sizeY` when they're greater than 0.

### FE10. [x] Bring to front and resizable cards — needs FE9
- **Steps:**
  1. Bring to front: on drag start or click, if the card isn't on top, send `{ zPos: max + 1 }`.
  2. Resize: `<NodeResizer minWidth={200} minHeight={120} isVisible={selected} />`, and `onResizeEnd` sends `{ sizeX, sizeY }`. The card CSS fills the node and scrolls inside it (with `nowheel`).
- **Acceptance:** z-order and size are kept after a reload and shown to other viewers. Cards that were never resized look the same as before.

### FE11. [x] Remove the unmoved-card fallback — needs FE8
- Once every new card is created with a position, assets at (0,0) only come from old data. Decide whether to keep the fallback for those or drop it, and remove the (0,0) → (1,1) rule if it's dropped.
- **Decision:** keep both. The fallback keeps old boards readable, and the (0,0) → (1,1) rule is what stops a card the user drags to exactly (0,0) from jumping back to a grid slot. They can go together once old data is gone. See `architecture.md`, Frontend board.

## Order

```
Frontend:  FE1 → FE2 → FE3 → FE4 → FE5 → FE6 → FE7
Backend:   BE1        BE2                       (any time, in parallel)
Follow-up: BE1 → FE8 → FE11
           BE2 → FE9 → FE10
```

FE2 and FE3 both edit the card components, so one agent should do them in order.

## Later

- Connectors between cards: an `Edge` table plus hub events, rendered as React Flow edges.
- Live drag streaming and showing other viewers' cursors.
- Undo/redo on top of the delta model.
