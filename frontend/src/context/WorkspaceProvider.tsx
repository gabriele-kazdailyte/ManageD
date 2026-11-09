import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import { HubConnectionState, type HubConnection } from '@microsoft/signalr'
import type { AssetDelta, AssetSnapshot } from '../api/assets'
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
  const joinRef = useRef<(() => Promise<void>) | null>(null)

  useEffect(() => {
    const connection = createWorkspaceConnection()
    connectionRef.current = connection
    // StrictMode runs effects twice in dev; a stopped connection must not touch state
    let cancelled = false

    // Runs on connect and on every reconnect: the server forgets group membership when a connection drops
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

    joinRef.current = join

    connection.on('AssetCreated', (payload: { asset: AssetSnapshot }) =>
      dispatch({ type: 'ASSET_CREATED', asset: payload.asset }),
    )
    connection.on('AssetUpdated', (payload: { assetId: string; delta: AssetDelta }) =>
      dispatch({ type: 'ASSET_UPDATED', assetId: payload.assetId, delta: payload.delta }),
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
      joinRef.current = null
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

  const updateAsset = useCallback(async (assetId: string, delta: AssetDelta) => {
    const connection = connectionRef.current
    if (!connection || connection.state !== HubConnectionState.Connected) {
      throw new Error('Not connected to the server.')
    }

    // Optimistic: the server's echo of this change is applied again, harmlessly
    dispatch({ type: 'LOCAL_EDIT', assetId, delta })

    try {
      await connection.invoke('UpdateAsset', assetId, delta)
    } catch (invokeError) {
      // Rejected: drop the optimistic change by reloading the server's state
      void joinRef.current?.()
      throw new Error(hubErrorMessage(invokeError, 'Could not save the change.'), { cause: invokeError })
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
      updateAsset,
    }),
    [state, connectionStatus, createAsset, deleteAsset, updateAsset],
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}
