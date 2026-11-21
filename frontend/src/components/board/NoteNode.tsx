import { memo } from 'react'
import { NodeResizer, type NodeProps, type ResizeParams } from '@xyflow/react'
import StickyNoteAsset from '../StickyNoteAsset'
import { useBoardActions } from './BoardActionsContext'
import { resizeDelta, MAX_CARD_SIZE, MIN_CARD_HEIGHT, MIN_CARD_WIDTH, type AssetNode } from './boardModel'

function NoteNode({ data, selected, height }: NodeProps<AssetNode>) {
  const { onUpdate, onDelete } = useBoardActions()
  const { asset } = data
  const handleResizeEnd = (_event: unknown, params: ResizeParams) => onUpdate(asset, resizeDelta(asset, params))

  return (
    <div className={height === undefined ? 'asset-node' : 'asset-node asset-node--sized'}>
      <NodeResizer
        isVisible={selected}
        minWidth={MIN_CARD_WIDTH}
        minHeight={MIN_CARD_HEIGHT}
        maxWidth={MAX_CARD_SIZE}
        maxHeight={MAX_CARD_SIZE}
        color="var(--accent)"
        onResizeEnd={handleResizeEnd}
      />
      <StickyNoteAsset asset={asset} isDeleting={data.isDeleting} onDelete={onDelete} onUpdate={onUpdate} />
    </div>
  )
}

export default memo(NoteNode)
