import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import type { HubConnection } from '@microsoft/signalr'
import type { AssetSnapshot } from '../api/assets'
import {
  createWorkspaceConnection,
  hubErrorMessage,
  type ConnectionStatus,
  type JoinedState,
  type Viewer,
} from '../api/hub'
import { useUser } from './UserContext'
import { WorkspaceContext, type WorkspaceContextValue } from './WorkspaceContext'
import { initialWorkspaceState, workspaceReducer } from './workspaceReducer'

type WorkspaceProviderProps = {
  workspaceId: string
  children: ReactNode
}

export function WorkspaceProvider({ workspaceId, children }: WorkspaceProviderProps) {
  const { identity } = useUser()
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspaceState)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const connectionRef = useRef<HubConnection | null>(null)

  useEffect(() => {
    const connection = createWorkspaceConnection()
    connectionRef.current = connection
    let cancelled = false

    const join = async () => {
      dispatch({ type: 'SYNC_STARTED' })

      try {
        const joined = await connection.invoke<JoinedState>('JoinWorkspace', workspaceId, identity.userId)

        if (!cancelled) {
          dispatch({ type: 'STATE_LOADED', assets: joined.assets, viewers: joined.viewers })
        }
      } catch (joinError) {
        if (!cancelled) {
          dispatch({ type: 'SYNC_FAILED', message: hubErrorMessage(joinError, 'Could not join the workspace.') })
        }
      }
    }

    connection.on('AssetCreated', (payload: { asset: AssetSnapshot }) =>
      dispatch({ type: 'ASSET_CREATED', asset: payload.asset }),
    )
    connection.on('AssetDeleted', (payload: { assetId: string }) =>
      dispatch({ type: 'ASSET_DELETED', assetId: payload.assetId }),
    )
    connection.on('UserJoined', (viewer: Viewer) => dispatch({ type: 'USER_JOINED', viewer }))
    connection.on('UserLeft', (payload: { userId: string }) =>
      dispatch({ type: 'USER_LEFT', userId: payload.userId }),
    )

    connection.onreconnecting(() => {
      if (!cancelled) {
        setConnectionStatus('reconnecting')
      }
    })
    connection.onreconnected(() => {
      if (!cancelled) {
        setConnectionStatus('connected')
        void join()
      }
    })
    connection.onclose(() => {
      if (!cancelled) {
        setConnectionStatus('disconnected')
      }
    })

    connection
      .start()
      .then(() => {
        if (cancelled) {
          return
        }

        setConnectionStatus('connected')
        return join()
      })
      .catch(() => {
        if (!cancelled) {
          setConnectionStatus('disconnected')
          dispatch({ type: 'SYNC_FAILED', message: 'Could not connect to the server.' })
        }
      })

    return () => {
      cancelled = true
      void connection.stop()
    }
  }, [workspaceId, identity.userId])

  const createAsset = useCallback(
    async (title: string, presetName: string | null) => {
      const connection = connectionRef.current
      if (!connection) {
        throw new Error('Not connected to the server.')
      }

      try {
        await connection.invoke('CreateAsset', workspaceId, title, 'Todo', presetName)
      } catch (invokeError) {
        throw new Error(hubErrorMessage(invokeError, 'Could not create the asset.'), { cause: invokeError })
      }
    },
    [workspaceId],
  )

  const deleteAsset = useCallback(async (assetId: string) => {
    const connection = connectionRef.current
    if (!connection) {
      throw new Error('Not connected to the server.')
    }

    try {
      await connection.invoke('DeleteAsset', assetId)
    } catch (invokeError) {
      throw new Error(hubErrorMessage(invokeError, 'Could not delete the asset.'), { cause: invokeError })
    }
  }, [])

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      assets: state.assets,
      viewers: state.viewers,
      isLoading: !state.hasLoaded && state.error === null,
      error: state.error,
      connectionStatus,
      createAsset,
      deleteAsset,
    }),
    [state, connectionStatus, createAsset, deleteAsset],
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}