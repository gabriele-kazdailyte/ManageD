import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import TodoAsset from '../TodoAsset'
import { useBoardActions } from './BoardActionsContext'
import type { AssetNode } from './boardModel'

function TodoNode({ data }: NodeProps<AssetNode>) {
  const { onUpdate, onDelete } = useBoardActions()
  return <TodoAsset asset={data.asset} isDeleting={data.isDeleting} onDelete={onDelete} onUpdate={onUpdate} />
}

export default memo(TodoNode)
