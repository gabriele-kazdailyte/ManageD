import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  type OnNodeDrag,
} from '@xyflow/react'
import type { AssetDelta, AssetSnapshot } from '../../api/assets'
import { BoardActionsContext, type BoardActions } from './BoardActionsContext'
import { assetsToNodes, positionDelta, type AssetNode } from './boardModel'
import NoteNode from './NoteNode'
import TodoNode from './TodoNode'
import { loadViewport, saveViewport } from './boardViewport'
import './Board.css'

type BoardProps = {
  workspaceId: string
  assets: AssetSnapshot[]
  isLoading: boolean
  error: string | null
  deletingIds: ReadonlySet<string>
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void
  onDelete: (asset: AssetSnapshot) => void
  onUpdate: (asset: AssetSnapshot, delta: AssetDelta) => void
}

// Defined outside the component so React Flow always sees the same object.
const nodeTypes: NodeTypes = { todo: TodoNode, note: NoteNode }
const MULTI_SELECT_KEYS = ['Shift', 'Meta', 'Control']
const DELETE_KEYS = ['Delete', 'Backspace']

// Hides the "React Flow" link. Allowed by the MIT license; the authors ask commercial users who hide it to consider a Pro subscription.
const PRO_OPTIONS = { hideAttribution: true }

function Flow({ workspaceId, assets, isLoading, error, deletingIds, onDelete, onUpdate }: BoardProps) {
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
  const latest = useRef({ onDelete, onUpdate })
  useEffect(() => {
    latest.current = { onDelete, onUpdate }
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

  const { fitView } = useReactFlow()
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
        onNodeDragStop={onNodeDragStop}
        defaultViewport={savedViewport}
        onMoveEnd={onMoveEnd}
        nodesConnectable={false}
        deleteKeyCode={DELETE_KEYS}
        onBeforeDelete={onBeforeDelete}
        panOnScroll
        zoomOnScroll={false}
        zoomOnPinch
        panOnDrag={[1]}
        selectionOnDrag
        multiSelectionKeyCode={MULTI_SELECT_KEYS}
        minZoom={0.15}
        maxZoom={3}
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
  return (
    <section className="board" onDragOver={(event) => event.preventDefault()} onDrop={props.onDrop}>
      <ReactFlowProvider>
        <Flow {...props} />
      </ReactFlowProvider>
    </section>
  )
}

export default Board
