import { createContext, useContext } from 'react'
import type { AssetSnapshot } from '../api/assets'
import type { ConnectionStatus, Viewer } from '../api/hub'

export type WorkspaceContextValue = {
  assets: AssetSnapshot[]
  viewers: Viewer[]
  isLoading: boolean
  error: string | null
  connectionStatus: ConnectionStatus
  // The created asset arrives as an AssetCreated event, so these return nothing
  createAsset: (title: string, presetName: string | null) => Promise<void>
  deleteAsset: (assetId: string) => Promise<void>
}

export const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined)

export function useWorkspace() {
  const context = useContext(WorkspaceContext)

  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider.')
  }

  return context
}