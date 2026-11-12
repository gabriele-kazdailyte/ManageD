import type { TodoItem } from '../api/assets'
import { getDeadlineStatus, type DeadlineStatus } from '../utils/deadlineStatus'
import './DeadlineStatusIndicator.css'

type DeadlineStatusIndicatorProps = {
  item: Pick<TodoItem, 'isDone' | 'deadlineDate' | 'completedDate'>
  status?: DeadlineStatus | null
}

const statusDetails: Record<DeadlineStatus, { symbol: string; label: string }> = {
  pending: { symbol: '○', label: 'Not done, deadline not passed' },
  missed: { symbol: '●', label: 'Not done, deadline passed' },
  'on-time': { symbol: '●', label: 'Done on or before deadline' },
  late: { symbol: '●', label: 'Done after deadline' },
}

function DeadlineStatusIndicator({ item, status: explicitStatus }: DeadlineStatusIndicatorProps) {
  const status = explicitStatus === undefined ? getDeadlineStatus(item) : explicitStatus
  if (!status) {
    return null
  }

  const { symbol, label } = statusDetails[status]
  const colorStatus = status === 'pending' ? 'pending' : status === 'missed' ? 'missed' : status
  return (
    <span
      className={`deadline-status deadline-status--${colorStatus}`}
      role="img"
      aria-label={label}
      title={label}
    >
      {symbol}
    </span>
  )
}

export default DeadlineStatusIndicator
