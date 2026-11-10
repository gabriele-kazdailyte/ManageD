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
const UNEXPECTED_ERROR_PREFIX = 'An unexpected error occurred'

export function hubErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    const marker = error.message.lastIndexOf(HUB_EXCEPTION_MARKER)
    if (marker >= 0) {
      return error.message.slice(marker + HUB_EXCEPTION_MARKER.length)
    }

    if (!error.message.startsWith(UNEXPECTED_ERROR_PREFIX)) {
      return error.message
    }
  }

  return fallback
}