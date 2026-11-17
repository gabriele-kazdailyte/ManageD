import { createContext, useContext, type Dispatch, type SetStateAction } from 'react'
import type { User } from '../api/users'

export type UserIdentity = {
  userId: string
  username: string
  displayName: string
}

type UserContextValue = {
  identity: UserIdentity | null
  setIdentity: Dispatch<SetStateAction<UserIdentity | null>>
  logout: () => void
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

    // Identities saved before login existed have no username. Their accounts have no password, so they
    // can't log in again: drop them and show the login screen.
    if (!parsedIdentity.userId || !parsedIdentity.username || !parsedIdentity.displayName) {
      window.localStorage.removeItem(STORAGE_KEY)
      return null
    }

    return {
      userId: parsedIdentity.userId,
      username: parsedIdentity.username,
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

export function clearStoredIdentity() {
  window.localStorage.removeItem(STORAGE_KEY)
}

// The server calls it `id`; the rest of the app has always called it `userId`.
export function toIdentity(user: User): UserIdentity {
  return { userId: user.id, username: user.username, displayName: user.displayName }
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

  const createdUser = (await response.json()) as User

  return toIdentity(createdUser)
}

export function useUser(): Omit<UserContextValue, 'identity'> & { identity: UserIdentity } {
  const context = useContext(UserContext)

  if (!context || !context.identity) {
    throw new Error('useUser must be used within an authenticated UserContext provider.')
  }

  return { ...context, identity: context.identity }
}
