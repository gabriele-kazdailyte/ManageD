import type { AssetDelta, AssetSnapshot, TodoItem } from '../api/assets'

// By order, with id as a stable tiebreak. The server breaks ties by GUID order,
// which can differ when two items share an order value (e.g. simultaneous adds).
export function sortItems(items: TodoItem[]): TodoItem[] {
  return [...items].sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

// Applies a delta to one asset. Used both for the user's own edits (before the server confirms them)
export function applyDelta(asset: AssetSnapshot, delta: AssetDelta): AssetSnapshot {
  let items = asset.items

  // Deletes first, like the server: an edit of an item deleted in the same delta is skipped
  if (delta.deleted?.length) {
    const removed = new Set(delta.deleted)
    items = items.filter((item) => !removed.has(item.id))
  }

  // Only the fields that were sent, only for items that still exist
  if (delta.updated?.length) {
    const changes = new Map(delta.updated.map((change) => [change.id, change]))
    items = items.map((item) => {
      const change = changes.get(item.id)
      if (!change) {
        return item
      }

      return {
        ...item,
        text: change.text ?? item.text,
        isDone: change.isDone ?? item.isDone,
        order: change.order ?? item.order,
      }
    })
  }

  // An added item whose id is already there is ignored
  if (delta.added?.length) {
    const existing = new Set(items.map((item) => item.id))
    items = [...items, ...delta.added.filter((item) => !existing.has(item.id))]
  }

  return { ...asset, title: delta.title ?? asset.title, items: sortItems(items) }
}