import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
  type OnBeforeDelete,
  type OnMoveEnd,
  type OnNodesChange,
  type NodeTypes,
  type NodeMouseHandler,
  type OnNodeDrag,
} from '@xyflow/react'
import type { AssetDelta, AssetSnapshot } from '../../api/assets'
import { BoardActionsContext, type BoardActions } from './BoardActionsContext'
import {
  assetsToNodes,
  CENTER_ANCHOR,
  DROP_ANCHOR,
  bringToFrontDelta,
  newCardPosition,
  positionDelta,
  type AssetNode,
  type BoardPoint,
  type BoardView,
} from './boardModel'
import NoteNode from './NoteNode'
import TodoNode from './TodoNode'
import { loadViewport, saveViewport } from './boardViewport'
import { MAX_ZOOM, MIN_ZOOM } from './boardCamera'
import { useBoardCamera } from './useBoardCamera'
import './Board.css'

type BoardProps = {
  workspaceId: string
  assets: AssetSnapshot[]
  isLoading: boolean
  error: string | null
  deletingIds: ReadonlySet<string>
  // position is where the card should go, in board coordinates
  onDrop: (event: React.DragEvent<HTMLElement>, position: BoardPoint) => void
  viewRef?: RefObject<BoardView | null>
  onDelete: (asset: AssetSnapshot) => void
  onUpdate: (asset: AssetSnapshot, delta: AssetDelta) => void
}

const handleDragOver = (event: React.DragEvent<HTMLElement>) => event.preventDefault()

// Defined outside the component so React Flow always sees the same object.
const nodeTypes: NodeTypes = { todo: TodoNode, note: NoteNode }
const MULTI_SELECT_KEYS = ['Shift', 'Meta', 'Control']
const DELETE_KEYS = ['Delete', 'Backspace']

// Hides the "React Flow" link. Allowed by the MIT license; the authors ask commercial users who hide it to consider a Pro subscription.
const PRO_OPTIONS = { hideAttribution: true }

function Flow({
  workspaceId,
  assets,
  isLoading,
  error,
  deletingIds,
  onDelete,
  onUpdate,
  onDrop,
  viewRef,
  containerRef,
}: BoardProps & { containerRef: RefObject<HTMLElement | null> }) {
  useBoardCamera(containerRef)

  const [model, setModel] = useState(() => ({
    assets,
    deletingIds,
    nodes: assetsToNodes(assets, deletingIds),
  }))
  let nodes = model.nodes
  if (model.assets !== assets || model.deletingIds !== deletingIds) {
    nodes = assetsToNodes(assets, deletingIds, model.nodes)
    setModel({ assets, deletingIds, nodes })
  }

  // The node components get actions through context. Keeping the latest callbacks in refs makes the
  // context value stable, so a parent re-render doesn't re-render every card.
  const latest = useRef({ assets, onDelete, onUpdate })
  useEffect(() => {
    latest.current = { assets, onDelete, onUpdate }
  })
  const actions = useMemo<BoardActions>(
    () => ({
      onDelete: (asset) => latest.current.onDelete(asset),
      onUpdate: (asset, delta) => latest.current.onUpdate(asset, delta),
    }),
    [],
  )

  const onNodesChange = useCallback<OnNodesChange<AssetNode>>((changes) => {
    // Local only: positions are sent to the server when a drag ends, and deletes go through the dialog.
    for (const change of changes.getByType('remove')) {
      changes.remove(change)
    }
    setModel((current) => ({ ...current, nodes: changes.applyTo(current.nodes) }))
  }, [])

  // Grabbing or clicking a card brings it above the others, once, and only if it isn't already on top.
  const bringToFront = useCallback((assetId: string) => {
    const { assets: current, onUpdate: update } = latest.current
    const delta = bringToFrontDelta(current, assetId)
    const asset = current.find((candidate) => candidate.id === assetId)
    if (delta && asset) {
      update(asset, delta)
    }
  }, [])
  const onNodeDragStart = useCallback<OnNodeDrag<AssetNode>>((_event, node) => bringToFront(node.id), [bringToFront])
  const onNodeClick = useCallback<NodeMouseHandler<AssetNode>>((_event, node) => bringToFront(node.id), [bringToFront])

  const onNodeDragStop = useCallback<OnNodeDrag<AssetNode>>((_event, _node, dragged) => {
    for (const node of dragged) {
      const { asset } = node.data
      const delta = positionDelta(node)
      if (delta.x !== asset.x || delta.y !== asset.y) {
        latest.current.onUpdate(asset, delta)
      }
    }
  }, [])

  // Never let React Flow remove nodes itself: the key press only opens the confirmation dialog, and the
  // card disappears when the server's AssetDeleted event arrives. The dialog handles one card at a time,
  // so with several cards selected the keys do nothing (use the card's × button).
  const onBeforeDelete = useCallback<OnBeforeDelete<AssetNode>>(async ({ nodes: toDelete }) => {
    if (toDelete.length === 1) {
      latest.current.onDelete(toDelete[0].data.asset)
    }
    return false
  }, [])

  const { fitView, screenToFlowPosition } = useReactFlow()

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      onDrop(event, newCardPosition(screenToFlowPosition({ x: event.clientX, y: event.clientY }), DROP_ANCHOR))
    },
    [onDrop, screenToFlowPosition],
  )

  useEffect(() => {
    if (!viewRef) {
      return
    }
    viewRef.current = {
      getNewCardPosition: () => {
        const rect = containerRef.current?.getBoundingClientRect()
        const center = screenToFlowPosition({
          x: (rect?.left ?? 0) + (rect?.width ?? 0) / 2,
          y: (rect?.top ?? 0) + (rect?.height ?? 0) / 2,
        })
        return newCardPosition(center, CENTER_ANCHOR)
      },
    }
    return () => {
      viewRef.current = null
    }
  }, [viewRef, containerRef, screenToFlowPosition])
  const initialized = useNodesInitialized()
  // A saved view for this workspace wins over fitting to the cards. Read once, on mount.
  const [savedViewport] = useState(() => loadViewport(workspaceId))
  const hasFitted = useRef(savedViewport !== undefined)
  const onMoveEnd = useCallback<OnMoveEnd>((_event, viewport) => saveViewport(workspaceId, viewport), [workspaceId])
  useEffect(() => {
    if (hasFitted.current || isLoading) {
      return
    }
    if (nodes.length === 0) {
      hasFitted.current = true
      return
    }
    if (initialized) {
      hasFitted.current = true
      void fitView({ maxZoom: 1, padding: 0.15 })
    }
  }, [isLoading, nodes.length, initialized, fitView])

  return (
    <BoardActionsContext.Provider value={actions}>
      <ReactFlow<AssetNode>
        nodes={nodes}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        defaultViewport={savedViewport}
        onMoveEnd={onMoveEnd}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        nodesConnectable={false}
        deleteKeyCode={DELETE_KEYS}
        onBeforeDelete={onBeforeDelete}
        panOnScroll
        // 1:1 with the trackpad or wheel, like Excalidraw (React Flow's default is half speed).
        panOnScrollSpeed={1}
        zoomOnDoubleClick={false}
        zoomOnScroll={false}
        zoomOnPinch
        // Dragging empty canvas with the left or middle button pans the board; holding Shift draws a selection box instead.
        panOnDrag={[0, 1]}
        selectionKeyCode="Shift"
        multiSelectionKeyCode={MULTI_SELECT_KEYS}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        proOptions={PRO_OPTIONS}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
      {error ? <p className="board__error" role="alert">{error}</p> : null}
      {isLoading ? <div className="board__overlay">Loading…</div> : null}
    </BoardActionsContext.Provider>
  )
}

function Board(props: BoardProps) {
  const containerRef = useRef<HTMLElement>(null)
  return (
    <section ref={containerRef} className="board">
      <ReactFlowProvider>
        <Flow {...props} containerRef={containerRef} />
      </ReactFlowProvider>
    </section>
  )
}

export default Board
