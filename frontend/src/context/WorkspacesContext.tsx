import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useUser } from './UserContext'

export type Workspace = {
  id: string
  name: string
}

type WorkspacesContextValue = {
  workspaces: Workspace[]
  isLoading: boolean
  error: string | null
  reload: () => void
}

const WorkspacesContext = createContext<WorkspacesContextValue | undefined>(undefined)

export function WorkspacesProvider({ children }: { children: ReactNode }) {
  const { identity } = useUser()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback((signal?: AbortSignal) => {
    fetch(`/api/workspaces?userId=${encodeURIComponent(identity.userId)}`, { signal })
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
        if (!signal?.aborted) {
          setIsLoading(false)
        }
      })
  }, [identity.userId])

  const reload = useCallback(() => {
    setIsLoading(true)
    setError(null)
    load()
  }, [load])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  return (
    <WorkspacesContext.Provider value={{ workspaces, isLoading, error, reload }}>
      {children}
    </WorkspacesContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWorkspaces() {
  const context = useContext(WorkspacesContext)
  if (!context) {
    throw new Error('useWorkspaces must be used within a WorkspacesProvider.')
  }
  return context
}
