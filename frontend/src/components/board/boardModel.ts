import type { Node } from '@xyflow/react'
import type { AssetSnapshot } from '../../api/assets'

export type AssetNodeData = {
  asset: AssetSnapshot
  isDeleting: boolean
}

export type AssetNode = Node<AssetNodeData, 'todo' | 'note'>

export const DRAG_HANDLE_SELECTOR = '.asset-drag-handle'

const GRID_COLUMNS = 3
const GRID_SPACING = 280

const isUnmoved = (asset: AssetSnapshot) => asset.x === 0 && asset.y === 0

// Assets at exactly (0,0) have not been placed yet (CreateAsset has no position). They get a grid slot
// based on their rank among unmoved assets sorted by id, so moving or deleting other cards never shifts them.
function fallbackSlots(assets: readonly AssetSnapshot[]) {
  const slots = new Map<string, { x: number; y: number }>()
  const unmovedIds = assets
    .filter(isUnmoved)
    .map((asset) => asset.id)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  unmovedIds.forEach((id, rank) => {
    slots.set(id, {
      x: (rank % GRID_COLUMNS) * GRID_SPACING,
      y: Math.floor(rank / GRID_COLUMNS) * GRID_SPACING,
    })
  })
  return slots
}

export function assetsToNodes(
  assets: readonly AssetSnapshot[],
  deletingIds: ReadonlySet<string>,
  previous: readonly AssetNode[] = [],
): AssetNode[] {
  const slots = fallbackSlots(assets)
  const previousById = new Map(previous.map((node) => [node.id, node]))

  return assets.map((asset) => {
    const before = previousById.get(asset.id)
    const savedPosition =
      Number.isFinite(asset.x) && Number.isFinite(asset.y) && !isUnmoved(asset)
        ? { x: asset.x, y: asset.y }
        : undefined
    const position = before?.dragging ? before.position : (savedPosition ?? slots.get(asset.id) ?? { x: 0, y: 0 })

    const node: AssetNode = {
      id: asset.id,
      type: asset.templateType === 'Note' ? 'note' : 'todo',
      position,
      dragHandle: DRAG_HANDLE_SELECTOR,
      data: { asset, isDeleting: deletingIds.has(asset.id) },
    }
    if (before?.selected) {
      node.selected = true
    }
    if (before?.dragging) {
      node.dragging = true
    }
    return node
  })
}

// Whole-number position to send to the server. (0,0) means "unmoved" there, so it is sent as (1,1).
export function positionDelta(node: Pick<AssetNode, 'position'>): { x: number; y: number } {
  const x = Math.round(node.position.x)
  const y = Math.round(node.position.y)
  return x === 0 && y === 0 ? { x: 1, y: 1 } : { x, y }
}
