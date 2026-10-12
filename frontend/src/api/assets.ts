// Mirrors the backend's response records (see docs/api-contract.md).
export type TemplateType = 'Todo'

export type TodoItem = {
  id: string
  text: string
  isDone: boolean
  order: number
}

export type AssetSnapshot = {
  id: string
  title: string
  templateType: TemplateType
  revision: number
  items: TodoItem[]
}

type AssetSummary = {
  id: string
  title: string
  templateType: TemplateType
  updatedAt: string
  itemCount: number
}

async function readJson<T>(response: Response, action: string): Promise<T> {
  if (!response.ok) {
    throw new Error(`Could not ${action} (HTTP ${response.status}).`)
  }

  return (await response.json()) as T
}

export async function createAsset(workspaceId: string, title: string, templateType: TemplateType) {
  const response = await fetch('/api/assets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, workspaceId, templateType }),
  })

  return readJson<AssetSnapshot>(response, 'create the asset')
}

// The list endpoint returns summaries without items, so each asset's full snapshot is fetched as well.
export async function loadWorkspaceAssets(workspaceId: string, signal?: AbortSignal) {
  const response = await fetch(`/api/assets?workspaceId=${encodeURIComponent(workspaceId)}`, { signal })
  const summaries = await readJson<AssetSummary[]>(response, 'load assets')

  return Promise.all(
    summaries.map(async (summary) => {
      const assetResponse = await fetch(`/api/assets/${encodeURIComponent(summary.id)}`, { signal })
      return readJson<AssetSnapshot>(assetResponse, 'load an asset')
    }),
  )
}

export async function deleteAsset(assetId: string) {
  const response = await fetch(`/api/assets/${encodeURIComponent(assetId)}`, { method: 'DELETE' })

  // 404 means someone already deleted it, which is the outcome the caller wanted anyway.
  if (!response.ok && response.status !== 404) {
    throw new Error(`Could not delete the asset (HTTP ${response.status}).`)
  }
}
