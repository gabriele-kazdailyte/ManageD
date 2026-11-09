import type { Viewer } from '../api/hub'
import { useUser } from '../context/UserContext'
import './OnlineViewers.css'

type OnlineViewersProps = {
  viewers: Viewer[]
}

function OnlineViewers({ viewers }: OnlineViewersProps) {
  const { identity } = useUser()
  const others = viewers.filter((viewer) => viewer.userId !== identity.userId)

  return (
    <p className="online-viewers">
      Online: {others.length === 0 ? '—' : others.map((viewer) => viewer.displayName).join(', ')}
    </p>
  )
}

export default OnlineViewers
