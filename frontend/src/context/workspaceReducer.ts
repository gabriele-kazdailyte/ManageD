import type { AssetSnapshot } from '../api/assets'
import type { Viewer } from '../api/hub'

// Events pushed by the server. Each one is idempotent: applying it twice changes nothing
export type WorkspaceEvent =
  | { type: 'ASSET_CREATED'; asset: AssetSnapshot }
  | { type: 'ASSET_DELETED'; assetId: string }
  | { type: 'USER_JOINED'; viewer: Viewer }
  | { type: 'USER_LEFT'; userId: string }

export type WorkspaceAction =
  | WorkspaceEvent
  | { type: 'SYNC_STARTED' }
  | { type: 'STATE_LOADED'; assets: AssetSnapshot[]; viewers: Viewer[] }
  | { type: 'SYNC_FAILED'; message: string }

export type WorkspaceState = {
  // False from the moment a join starts until its result arrives
  isSynced: boolean
  // True once the first join succeeded. Later re-joins don't bring the loading screen back
  hasLoaded: boolean
  assets: AssetSnapshot[]
  viewers: Viewer[]
  // Events that arrived while a join was in flight. Applied after its result
  pending: WorkspaceEvent[]
  error: string | null
}

export const initialWorkspaceState: WorkspaceState = {
  isSynced: false,
  hasLoaded: false,
  assets: [],
  viewers: [],
  pending: [],
  error: null,
}

function byDisplayName(a: Viewer, b: Viewer) {
  return a.displayName.localeCompare(b.displayName)
}

function applyEvent(state: WorkspaceState, event: WorkspaceEvent): WorkspaceState {
  switch (event.type) {
    case 'ASSET_CREATED':
      if (state.assets.some((asset) => asset.id === event.asset.id)) {
        return state
      }
      return { ...state, assets: [...state.assets, event.asset] }

    case 'ASSET_DELETED':
      return { ...state, assets: state.assets.filter((asset) => asset.id !== event.assetId) }

    case 'USER_JOINED':
      if (state.viewers.some((viewer) => viewer.userId === event.viewer.userId)) {
        return state
      }
      return { ...state, viewers: [...state.viewers, event.viewer].sort(byDisplayName) }

    case 'USER_LEFT':
      return { ...state, viewers: state.viewers.filter((viewer) => viewer.userId !== event.userId) }
  }
}

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'SYNC_STARTED':
      return { ...state, isSynced: false, pending: [], error: null }

    case 'STATE_LOADED': {
      const loaded: WorkspaceState = {
        ...state,
        isSynced: true,
        hasLoaded: true,
        assets: action.assets,
        viewers: action.viewers,
        pending: [],
        error: null,
      }
      return state.pending.reduce(applyEvent, loaded)
    }

    case 'SYNC_FAILED':
      return { ...state, isSynced: false, pending: [], error: action.message }

    default:
      return state.isSynced
        ? applyEvent(state, action)
        : { ...state, pending: [...state.pending, action] }
  }
}