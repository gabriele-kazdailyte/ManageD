import type { Viewer } from '../api/hub'
import { useUser } from '../context/UserContext'
import './OnlineViewers.css'

type OnlineViewersProps = {
  viewers: Viewer[]
}

function OnlineViewers({ viewers }: OnlineViewersProps) {
  const { identity } = useUser()
  const others = viewers.filter((viewer) => viewer.userId !== identity.userId)

  if (others.length === 0) {
    return null
  }

  return (
    <p className="online-viewers">
      Online: {others.map((viewer) => viewer.displayName).join(', ')}
    </p>
  )
}

export default OnlineViewers
