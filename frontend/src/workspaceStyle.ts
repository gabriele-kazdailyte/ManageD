export const WS_TILES = [
  { bg: 'var(--ws-teal-bg)', fg: 'var(--ws-teal-text)' },
  { bg: 'var(--ws-mid-bg)', fg: 'var(--ws-mid-text)' },
  { bg: 'var(--ws-mint-bg)', fg: 'var(--ws-mint-text)' },
  { bg: 'var(--ws-blue-bg)', fg: 'var(--ws-blue-text)' },
]

export function iconLetter(name: string) {
  return name.trim().charAt(0).toUpperCase() || 'W'
}
