import { createContext, useContext } from 'react'
import type { AssetDelta, AssetSnapshot } from '../../api/assets'

export type BoardActions = {
  onUpdate: (asset: AssetSnapshot, delta: AssetDelta) => void
  onDelete: (asset: AssetSnapshot) => void
}

const noop = () => {}

export const BoardActionsContext = createContext<BoardActions>({ onUpdate: noop, onDelete: noop })

export function useBoardActions() {
  return useContext(BoardActionsContext)
}
