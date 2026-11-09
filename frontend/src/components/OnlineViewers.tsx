import type { Viewer } from '../api/hub'

type OnlineViewersProps = {
  viewers: Viewer[]
}

function OnlineViewers({ viewers }: OnlineViewersProps) {
  return (
    <p className="online-viewers" style={{ margin: 0, padding: '6px 16px', fontSize: 13 }}>
      Online: {viewers.length === 0 ? '—' : viewers.map((viewer) => viewer.displayName).join(', ')}
    </p>
  )
}

export default OnlineViewers
