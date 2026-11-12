import { useMemo, useState } from 'react'
import type { AssetSnapshot } from '../api/assets'
import { getDeadlineStatus, type DeadlineStatus } from '../utils/deadlineStatus'
import DeadlineStatusIndicator from './DeadlineStatusIndicator'
import './CalendarView.css'

type CalendarViewProps = {
  assets: AssetSnapshot[]
}

const deadlineLegend: { status: DeadlineStatus; label: string }[] = [
  { status: 'on-time', label: 'Done on time or early' },
  { status: 'late', label: 'Done late' },
  { status: 'missed', label: 'Not done and overdue' },
  { status: 'pending', label: 'Not done and not yet overdue' },
]

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function CalendarView({ assets }: CalendarViewProps) {
  const [month, setMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const todayKey = dateKey(new Date())
  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`

  const entriesByDate = useMemo(() => {
    const entries = new Map<string, {
      assetId: string
      assetTitle: string
      itemId: string
      text: string
      isDone: boolean
      deadlineDate: string | null
      completedDate: string | null
    }[]>()

    for (const asset of assets) {
      for (const item of asset.items) {
        if (!item.deadlineDate) {
          continue
        }

        const entry = {
          assetId: asset.id,
          assetTitle: asset.title,
          itemId: item.id,
          text: item.text,
          isDone: item.isDone,
          deadlineDate: item.deadlineDate,
          completedDate: item.completedDate,
        }
        entries.set(item.deadlineDate, [...(entries.get(item.deadlineDate) ?? []), entry])
      }
    }

    return entries
  }, [assets])

  const firstDayOffset = (month.getDay() + 6) % 7
  const start = new Date(month.getFullYear(), month.getMonth(), 1 - firstDayOffset)
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
    return { date, key: dateKey(date) }
  })
  const weeks = Array.from({ length: 6 }, (_, index) => days.slice(index * 7, index * 7 + 7))
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Date(2024, 0, index + 1).toLocaleDateString(undefined, { weekday: 'short' }),
  )

  return (
    <section className="calendar" aria-labelledby="calendar-title">
      <header className="calendar__header">
        <h1 id="calendar-title">Calendar</h1>
        <div className="calendar__navigation" aria-label="Calendar navigation">
          <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month">
            ‹
          </button>
          <h2 aria-live="polite">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
          <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month">
            ›
          </button>
          <button type="button" className="calendar__today" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
            Today
          </button>
        </div>
      </header>
      <ul className="calendar__legend" aria-label="Deadline status legend">
        {deadlineLegend.map(({ status, label }) => (
          <li key={status}>
            <DeadlineStatusIndicator item={{ isDone: false, deadlineDate: null, completedDate: null }} status={status} />
            <span>{label}</span>
          </li>
        ))}
      </ul>
      <div className="calendar__grid" role="table" aria-label={month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}>
        <div className="calendar__week" role="row">
          {weekdays.map((weekday, index) => (
            <div className="calendar__weekday" role="columnheader" key={`${weekday}-${index}`}>
              {weekday}
            </div>
          ))}
        </div>
        {weeks.map((week, weekIndex) => (
          <div className="calendar__week" role="row" key={weekIndex}>
            {week.map(({ date, key }) => {
              const entries = entriesByDate.get(key) ?? []
              const cellClasses = [
                'calendar__day',
                key.startsWith(monthKey) ? '' : 'calendar__day--outside',
                key === todayKey ? 'calendar__day--today' : '',
              ]
                .filter(Boolean)
                .join(' ')

              return (
                <div className={cellClasses} role="cell" key={key} aria-label={`${date.toLocaleDateString()}, ${entries.length} deadlines`}>
                  <span className="calendar__date">{date.getDate()}</span>
                  <div className="calendar__events">
                    {entries.map((entry) => {
                      const status = getDeadlineStatus(entry)

                      return (
                        <div
                          className={[
                            'calendar__event',
                            entry.isDone ? 'calendar__event--done' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          key={`${entry.assetId}-${entry.itemId}`}
                          title={`${entry.assetTitle}: ${entry.text}`}
                        >
                          <span className="calendar__event-asset">{entry.assetTitle}</span>
                          <span>{entry.text}</span>
                          <DeadlineStatusIndicator item={entry} status={status} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </section>
  )
}

export default CalendarView
