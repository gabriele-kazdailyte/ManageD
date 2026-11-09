import { HubConnectionBuilder, LogLevel, type HubConnection } from '@microsoft/signalr'
import type { AssetSnapshot } from './assets'

export type Viewer = {
  userId: string
  displayName: string
}

export type JoinedState = {
  assets: AssetSnapshot[]
  viewers: Viewer[]
}

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

const HUB_URL = `${import.meta.env.VITE_BACKEND_ORIGIN ?? ''}/hubs/workspace`

export function createWorkspaceConnection(): HubConnection {
  return new HubConnectionBuilder()
    .withUrl(HUB_URL)
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build()
}

const HUB_EXCEPTION_MARKER = 'HubException: '

export function hubErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const index = error.message.indexOf(HUB_EXCEPTION_MARKER)
    if (index >= 0) {
      return error.message.slice(index + HUB_EXCEPTION_MARKER.length)
    }
  }

  return fallback
}