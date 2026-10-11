import { createContext, useContext, type Dispatch, type SetStateAction } from 'react'

export type UserIdentity = {
  userId: string
  displayName: string
}

type UserContextValue = {
  identity: UserIdentity | null
  setIdentity: Dispatch<SetStateAction<UserIdentity | null>>
}

const STORAGE_KEY = 'manageD.identity'

export const UserContext = createContext<UserContextValue | undefined>(undefined)

export function readStoredIdentity(): UserIdentity | null {
  if (typeof window === 'undefined') {
    return null
  }

  const storedIdentity = window.localStorage.getItem(STORAGE_KEY)
  if (!storedIdentity) {
    return null
  }

  try {
    const parsedIdentity = JSON.parse(storedIdentity) as Partial<UserIdentity>

    if (!parsedIdentity.userId || !parsedIdentity.displayName) {
      window.localStorage.removeItem(STORAGE_KEY)
      return null
    }

    return {
      userId: parsedIdentity.userId,
      displayName: parsedIdentity.displayName,
    }
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function persistIdentity(identity: UserIdentity) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(identity))
}

export async function createIdentity(displayName: string): Promise<UserIdentity> {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName }),
  })

  if (!response.ok) {
    throw new Error(`Failed to create user (HTTP ${response.status}).`)
  }

  const createdUser = (await response.json()) as { id: string; displayName: string }

  return {
    userId: createdUser.id,
    displayName: createdUser.displayName,
  }
}

export function useUser(): Omit<UserContextValue, 'identity'> & { identity: UserIdentity } {
  const context = useContext(UserContext)

  if (!context || !context.identity) {
    throw new Error('useUser must be used within an authenticated UserContext provider.')
  }

  return { ...context, identity: context.identity }
}
