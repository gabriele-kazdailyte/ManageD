import type { AssetDelta, TodoItem, TodoItemChange } from '../api/assets'

export const MAX_ITEM_TEXT_LENGTH = 200

export function addItemDelta(items: TodoItem[], text: string): AssetDelta {
  const nextOrder = items.reduce((highest, item) => Math.max(highest, item.order), -1) + 1

  return {
    added: [{
      id: crypto.randomUUID(),
      text,
      isDone: false,
      order: nextOrder,
      deadlineDate: null,
      completedDate: null,
    }],
  }
}

export function editTextDelta(itemId: string, text: string): AssetDelta {
  return { updated: [{ id: itemId, text }] }
}

export function setDoneDelta(itemId: string, isDone: boolean): AssetDelta {
  const completedDateString = new Date().toISOString().slice(0, 10)

  return {
    updated: [
      isDone
        ? { id: itemId, isDone, completedDate: completedDateString }
        : { id: itemId, isDone, clearCompletedDate: true },
    ],
  }
}

export function setDeadlineDelta(itemId: string, deadlineDate: string | null): AssetDelta {
  return {
    updated: [
      deadlineDate === null
        ? { id: itemId, clearDeadline: true }
        : { id: itemId, deadlineDate },
    ],
  }
}

export function deleteItemDelta(itemId: string): AssetDelta {
  return { deleted: [itemId] }
}

// Returns only the items whose order value actually changes, or null if nothing changes
export function reorderDelta(items: TodoItem[], from: number, to: number): AssetDelta | null {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return null
  }

  const moved = [...items]
  const [item] = moved.splice(from, 1)
  moved.splice(to, 0, item)

  const orderIsStrictlyIncreasing = items.every((entry, index) => index === 0 || items[index - 1].order < entry.order)
  let updated: TodoItemChange[]

  if (orderIsStrictlyIncreasing) {
    // Only the items between the old and the new position trade places, everything else keeps its order
    const low = Math.min(from, to)
    const high = Math.max(from, to)
    const slots = items.slice(low, high + 1).map((entry) => entry.order)
    updated = moved
      .slice(low, high + 1)
      .flatMap((entry, index) => (entry.order !== slots[index] ? [{ id: entry.id, order: slots[index] }] : []))
  } else {
    // Duplicate order values can't express a new position, so renumber the list 0, 1, 2, ...
    updated = moved.flatMap((entry, index) => (entry.order !== index ? [{ id: entry.id, order: index }] : []))
  }

  return updated.length > 0 ? { updated } : null
}