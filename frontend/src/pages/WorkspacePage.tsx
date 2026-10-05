import { useParams } from 'react-router-dom'

function WorkspacePage() {
  const { workspaceId } = useParams()

  return (
    <div>
      <h1>Workspace</h1>
      <p>workspaceId: {workspaceId}</p>
    </div>
  )
}

export default WorkspacePage
