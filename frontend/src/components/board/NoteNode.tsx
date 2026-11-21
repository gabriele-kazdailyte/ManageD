import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import StickyNoteAsset from '../StickyNoteAsset'
import { useBoardActions } from './BoardActionsContext'
import type { AssetNode } from './boardModel'

function NoteNode({ data }: NodeProps<AssetNode>) {
  const { onUpdate, onDelete } = useBoardActions()
  return <StickyNoteAsset asset={data.asset} isDeleting={data.isDeleting} onDelete={onDelete} onUpdate={onUpdate} />
}

export default memo(NoteNode)
