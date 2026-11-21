import type { Node } from '@xyflow/react'
import type { AssetDelta, AssetSnapshot } from '../../api/assets'

export type AssetNodeData = {
  asset: AssetSnapshot
  isDeleting: boolean
}

export type AssetNode = Node<AssetNodeData, 'todo' | 'note'>

export const DRAG_HANDLE_SELECTOR = '.asset-drag-handle'

// Limits while resizing. The server accepts 160 to 1200; the board's minimums are a little larger so a card stays usable.
export const MIN_CARD_WIDTH = 200
export const MIN_CARD_HEIGHT = 120
export const MAX_CARD_SIZE = 1200

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
    // While the user is dragging or resizing this card, the local node is the truth, not the server's last echo.
    const isBeingChanged = before?.dragging || before?.resizing
    const position = isBeingChanged && before ? before.position : (savedPosition ?? slots.get(asset.id) ?? { x: 0, y: 0 })

    const isDeleting = deletingIds.has(asset.id)
    const type = asset.templateType === 'Note' ? 'note' : 'todo'

    // 0 means auto size: no width/height, so the card sizes itself.
    const width = isBeingChanged && before ? before.width : asset.sizeX > 0 ? asset.sizeX : undefined
    const height = isBeingChanged && before ? before.height : asset.sizeY > 0 ? asset.sizeY : undefined
    const zIndex = asset.zPos

    // Reuse the previous node object when nothing changed, so React Flow and the node components can skip work.
    if (
      before &&
      before.type === type &&
      before.data.asset === asset &&
      before.data.isDeleting === isDeleting &&
      before.position.x === position.x &&
      before.position.y === position.y &&
      before.width === width &&
      before.height === height &&
      before.zIndex === zIndex
    ) {
      return before
    }

    const node: AssetNode = {
      id: asset.id,
      type,
      position,
      zIndex,
      dragHandle: DRAG_HANDLE_SELECTOR,
      data: { asset, isDeleting },
    }
    if (width !== undefined) {
      node.width = width
    }
    if (height !== undefined) {
      node.height = height
    }
    // Measured size is kept so a re-map doesn't make React Flow hide the node until it is measured again.
    if (before?.measured) {
      node.measured = before.measured
    }
    if (before?.selected) {
      node.selected = true
    }
    if (before?.dragging) {
      node.dragging = true
    }
    if (before?.resizing) {
      node.resizing = true
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

export type BoardPoint = { x: number; y: number }

// What the page can ask the board for: where a new card should go so it lands in the middle of the view.
export type BoardView = { getNewCardPosition: () => BoardPoint }

// Cards are 260px wide. A card dropped on the cursor is held by its header; a card created from the toolbar
// is centered in the view (the 110 is about half the height of a new note).
export const DROP_ANCHOR: BoardPoint = { x: 130, y: 20 }
export const CENTER_ANCHOR: BoardPoint = { x: 130, y: 110 }

// Top-left position for a new card whose `anchor` point should sit at `point` (both in board coordinates).
export function newCardPosition(point: BoardPoint, anchor: BoardPoint): BoardPoint {
  return positionDelta({ position: { x: point.x - anchor.x, y: point.y - anchor.y } })
}

// Delta that puts an asset above all the others, or null if it is already strictly on top.
export function bringToFrontDelta(assets: readonly AssetSnapshot[], assetId: string): AssetDelta | null {
  const asset = assets.find((candidate) => candidate.id === assetId)
  if (!asset) {
    return null
  }
  const highestOther = assets.reduce(
    (highest, candidate) => (candidate.id === assetId ? highest : Math.max(highest, candidate.zPos)),
    Number.NEGATIVE_INFINITY,
  )
  return asset.zPos > highestOther ? null : { zPos: highestOther + 1 }
}

// Whole-number size to send once a resize ends. Resizing from the top or left edge also moves the card,
// so the position is included when it changed.
export function resizeDelta(
  asset: Pick<AssetSnapshot, 'x' | 'y'>,
  result: { x: number; y: number; width: number; height: number },
): AssetDelta {
  const delta: AssetDelta = { sizeX: Math.round(result.width), sizeY: Math.round(result.height) }
  const position = positionDelta({ position: result })
  if (position.x !== asset.x || position.y !== asset.y) {
    delta.x = position.x
    delta.y = position.y
  }
  return delta
}
