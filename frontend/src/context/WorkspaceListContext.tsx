import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useUser } from './UserContext'

export type Workspace = {
  id: string
  name: string
}

type WorkspaceListContextValue = {
  workspaces: Workspace[]
  isLoading: boolean
  error: string | null
  reload: () => void
  deleteWorkspace: (workspaceId: string) => Promise<void>
}

const WorkspaceListContext = createContext<WorkspaceListContextValue | undefined>(undefined)

export function WorkspaceListProvider({ children }: { children: ReactNode }) {
  const { identity } = useUser()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const startLoad = useCallback(() => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    fetch(`/api/workspaces?userId=${encodeURIComponent(identity.userId)}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Could not load workspaces (HTTP ${response.status}).`)
        }
        return response.json() as Promise<Workspace[]>
      })
      .then(setWorkspaces)
      .catch((loadError: unknown) => {
        if (loadError instanceof Error && loadError.name === 'AbortError') {
          return
        }
        setError(loadError instanceof Error ? loadError.message : 'Could not load workspaces.')
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })
  }, [identity.userId])

  const reload = useCallback(() => {
    setIsLoading(true)
    setError(null)
    startLoad()
  }, [startLoad])

  const deleteWorkspace = useCallback(async (workspaceId: string) => {
    const response = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error(`Could not delete the workspace (HTTP ${response.status}).`)
    }

    setWorkspaces((current) => current.filter((workspace) => workspace.id !== workspaceId))
  }, [])

  useEffect(() => {
    startLoad()
    return () => controllerRef.current?.abort()
  }, [startLoad])

  return (
    <WorkspaceListContext.Provider value={{ workspaces, isLoading, error, reload, deleteWorkspace }}>
      {children}
    </WorkspaceListContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWorkspaceList() {
  const context = useContext(WorkspaceListContext)
  if (!context) {
    throw new Error('useWorkspaceList must be used within a WorkspaceListProvider.')
  }
  return context
}
