export type Member = {
  id: string
  displayName: string
}

export type AddMemberOutcome = 'added' | 'alreadyMember'

async function readError(response: Response, action: string): Promise<Error> {
  try {
    const problem = (await response.json()) as { detail?: string }
    if (problem.detail) {
      return new Error(problem.detail)
    }
  } catch {
    // No JSON body, so fall back to the generic message below.
  }

  return new Error(`Could not ${action} (HTTP ${response.status}).`)
}

export async function listMembers(workspaceId: string, signal?: AbortSignal) {
  const response = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/members`, { signal })

  if (!response.ok) {
    throw await readError(response, 'load members')
  }

  return (await response.json()) as Member[]
}

// The backend answers 201 when the user was added and 200 when they were already a member.
export async function addMember(workspaceId: string, userId: string) {
  const response = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  })

  if (!response.ok) {
    throw await readError(response, 'add the member')
  }

  const member = (await response.json()) as Member
  const outcome: AddMemberOutcome = response.status === 201 ? 'added' : 'alreadyMember'

  return { member, outcome }
}
