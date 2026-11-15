import type { TodoItem } from '../api/assets'

export type DeadlineStatus = 'pending' | 'missed' | 'on-time' | 'late'

function localDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getDeadlineStatus(
  item: Pick<TodoItem, 'isDone' | 'deadlineDate' | 'completedDate'>,
  today = localDateKey(new Date()),
): DeadlineStatus | null {
  if (!item.deadlineDate) {
    return null
  }

  if (!item.isDone) {
    return item.deadlineDate < today ? 'missed' : 'pending'
  }

  if (!item.completedDate) {
    return 'on-time'
  }

  return item.completedDate <= item.deadlineDate ? 'on-time' : 'late'
}
