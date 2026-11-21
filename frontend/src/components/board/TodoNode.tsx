import { memo } from 'react'
import { NodeResizer, useNode, type NodeProps, type ResizeParams } from '@xyflow/react'
import TodoAsset from '../TodoAsset'
import { useBoardActions } from './BoardActionsContext'
import { resizeDelta, MAX_CARD_SIZE, MIN_CARD_HEIGHT, MIN_CARD_WIDTH, type AssetNode } from './boardModel'

function TodoNode({ data, selected, id }: NodeProps<AssetNode>) {
  const { onUpdate, onDelete } = useBoardActions()
  const { asset } = data
  // The `height` prop is the measured height, which every card has. A card is "sized" only when its node
  // has an explicit height: saved from a resize, or set live by the resizer.
  const isSized = useNode<AssetNode>(id)?.height !== undefined
  const handleResizeEnd = (_event: unknown, params: ResizeParams) => onUpdate(asset, resizeDelta(asset, params))

  return (
    <div className={isSized ? 'asset-node asset-node--sized' : 'asset-node'}>
      <NodeResizer
        isVisible={selected}
        minWidth={MIN_CARD_WIDTH}
        minHeight={MIN_CARD_HEIGHT}
        maxWidth={MAX_CARD_SIZE}
        maxHeight={MAX_CARD_SIZE}
        onResizeEnd={handleResizeEnd}
      />
      <TodoAsset asset={asset} isDeleting={data.isDeleting} onDelete={onDelete} onUpdate={onUpdate} />
    </div>
  )
}

export default memo(TodoNode)
