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
}

const WorkspaceListContext = createContext<WorkspaceListContextValue | undefined>(undefined)

// Owns the user's list of workspaces (REST, no reducer); distinct from the planned singular
// WorkspaceProvider that holds a single canvas's real-time state.
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

  useEffect(() => {
    startLoad()
    return () => controllerRef.current?.abort()
  }, [startLoad])

  return (
    <WorkspaceListContext.Provider value={{ workspaces, isLoading, error, reload }}>
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
