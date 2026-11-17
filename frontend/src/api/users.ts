export type User = {
  id: string
  username: string
  displayName: string
}

// The server's error bodies: a 400 lists what's wrong per field, a 401/409 has one detail message,
// and a 429 has no body at all.
type ProblemBody = {
  detail?: string
  errors?: Record<string, string[]>
}

async function readUserError(response: Response): Promise<Error> {
  if (response.status === 429) {
    return new Error('Too many attempts. Wait a minute, then try again.')
  }

  // In development the Vite proxy answers 500 itself when the backend isn't running.
  if (response.status >= 500) {
    return new Error('Unable to reach the server. Check that the backend is running, then try again.')
  }

  try {
    const problem = (await response.json()) as ProblemBody

    if (problem.detail) {
      return new Error(problem.detail)
    }

    const firstFieldError = problem.errors ? Object.values(problem.errors).flat()[0] : undefined
    if (firstFieldError) {
      return new Error(firstFieldError)
    }
  } catch {
    // No JSON body, so fall back to the generic message below.
  }

  return new Error(`Something went wrong (HTTP ${response.status}).`)
}

async function postUser(url: string, body: object): Promise<User> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw await readUserError(response)
  }

  return (await response.json()) as User
}

export function register(username: string, password: string, displayName: string) {
  return postUser('/api/users', { username, password, displayName })
}

export function login(username: string, password: string) {
  return postUser('/api/users/login', { username, password })
}

// Returns null when the user no longer exists (for example after the database was reset), so the app can log out.
// Any other failure, like the backend being down, throws instead.
export async function getUser(userId: string, signal?: AbortSignal): Promise<User | null> {
  const response = await fetch(`/api/users/${encodeURIComponent(userId)}`, { signal })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw await readUserError(response)
  }

  return (await response.json()) as User
}
