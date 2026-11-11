// Mirrors the backend's response records (see docs/api-contract.md).
export type TemplateType = 'Todo' | 'Note'

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
  items: TodoItem[]
  noteContent: string
}

export type TodoItemChange = {
  id: string
  text?: string | null
  isDone?: boolean | null
  order?: number | null
}

export type AssetDelta = {
  title?: string | null
  noteContent?: string | null
  added?: TodoItem[]
  updated?: TodoItemChange[]
  deleted?: string[]
}

export type PresetInfo = {
  name: string
  itemCount: number
}

async function readJson<T>(response: Response, action: string): Promise<T> {
  if (!response.ok) {
    throw new Error(`Could not ${action} (HTTP ${response.status}).`)
  }

  return (await response.json()) as T
}

export async function loadPresets(signal?: AbortSignal) {
  const response = await fetch('/api/assets/presets', { signal })

  return readJson<PresetInfo[]>(response, 'load presets')
}
