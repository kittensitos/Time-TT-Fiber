import { useState } from 'react'
import { useApp } from '../AppContext'
import { monthNames, shortDays, toDateStr, typeLabel } from '../utils'
import type { Task, TimeOffRequest } from '../types'

type CalView = 'month' | 'week' | 'day'

// Scheduling starts in 2026 — the calendar never navigates earlier.
const MIN_DATE = new Date(2026, 0, 1)

function clampToMin(d: Date): Date {
  return d < MIN_DATE ? new Date(MIN_DATE) : d
}

export default function CalendarTab() {
  const { requests, tasks, personName } = useApp()
  const [view, setView] = useState<CalView>('month')
  const [date, setDate] = useState(() => clampToMin(new Date()))

  const todayStr = toDateStr(new Date())

  function eventsFor(dateStr: string) {
    return requests.filter((r) => r.status !== 'denied' && r.startDate <= dateStr && r.endDate >= dateStr)
  }

  function tasksFor(dateStr: string) {
    return tasks.filter((t) => t.dueDate === dateStr && t.status !== 'completed')
  }

  function shifted(dir: -1 | 1): Date {
    const d = new Date(date)
    if (view === 'month') d.setMonth(d.getMonth() + dir)
    else if (view === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setDate(d.getDate() + dir)
    return d
  }

  function nav(dir: -1 | 1) {
    setDate(clampToMin(shifted(dir)))
  }

  const prevDisabled = shifted(-1) < MIN_DATE

  function openDay(dateStr: string) {
    const [y, m, dd] = dateStr.split('-').map(Number)
    setDate(clampToMin(new Date(y, m - 1, dd)))
    setView('day')
  }

  let title = ''
  if (view === 'month') {
    title = `${monthNames[date.getMonth()]} ${date.getFullYear()}`
  } else if (view === 'week') {
    const start = new Date(date)
    start.setDate(start.getDate() - start.getDay())
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    title =
      start.getMonth() === end.getMonth()
        ? `${monthNames[start.getMonth()]} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`
        : `${monthNames[start.getMonth()]} ${start.getDate()} – ${monthNames[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`
  } else {
    title = `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
  }

  return (
    <div className="card glow-card">
      <div className="cal-toolbar">
        <div className="cal-nav">
          <button className="btn btn-outline btn-sm" disabled={prevDisabled} onClick={() => nav(-1)}>‹</button>
          <button className="btn btn-outline btn-sm" onClick={() => setDate(clampToMin(new Date()))}>Today</button>
          <button className="btn btn-outline btn-sm" onClick={() => nav(1)}>›</button>
          <h3 className="cal-title">{title}</h3>
        </div>
        <div className="cal-views">
          {(['month', 'week', 'day'] as CalView[]).map((v) => (
            <button
              key={v}
              className={`cal-view-btn${view === v ? ' active' : ''}`}
              onClick={() => setView(v)}
            >
              {v[0].toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {view === 'month' && (
        <MonthGrid date={date} todayStr={todayStr} eventsFor={eventsFor} tasksFor={tasksFor} personName={personName} onDay={openDay} />
      )}
      {view === 'week' && (
        <WeekGrid date={date} todayStr={todayStr} eventsFor={eventsFor} tasksFor={tasksFor} personName={personName} onDay={openDay} />
      )}
      {view === 'day' && (
        <DayList dateStr={toDateStr(date)} eventsFor={eventsFor} tasksFor={tasksFor} personName={personName} />
      )}
    </div>
  )
}

interface GridProps {
  date: Date
  todayStr: string
  eventsFor: (d: string) => TimeOffRequest[]
  tasksFor: (d: string) => Task[]
  personName: (id: string) => string
  onDay: (d: string) => void
}

function MonthGrid({ date, todayStr, eventsFor, tasksFor, personName, onDay }: GridProps) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} className="cal-day empty" />)
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push(
      <div
        key={dateStr}
        className={`cal-day${dateStr === todayStr ? ' today' : ''}`}
        onClick={() => onDay(dateStr)}
      >
        <div className="day-num">{d}</div>
        {eventsFor(dateStr).map((r) => (
          <div key={r.id} className={`cal-event type-${r.type}`} title={`${personName(r.personId)} — ${typeLabel(r.type)}`}>
            {personName(r.personId)}
          </div>
        ))}
        {tasksFor(dateStr).map((t) => (
          <div key={t.id} className="cal-event cal-task" title={t.title}>
            {t.title}
          </div>
        ))}
      </div>,
    )
  }

  return (
    <div className="calendar-grid">
      {shortDays.map((d) => <div key={d} className="cal-day-header">{d}</div>)}
      {cells}
    </div>
  )
}

function WeekGrid({ date, todayStr, eventsFor, tasksFor, personName, onDay }: GridProps) {
  const start = new Date(date)
  start.setDate(start.getDate() - start.getDay())

  return (
    <div className="calendar-grid cal-week-grid">
      {Array.from({ length: 7 }, (_, i) => {
        const day = new Date(start)
        day.setDate(day.getDate() + i)
        const dateStr = toDateStr(day)
        return (
          <div
            key={dateStr}
            className={`cal-week-day${dateStr === todayStr ? ' today' : ''}`}
            onClick={() => onDay(dateStr)}
          >
            <div className="day-label">{shortDays[i]}</div>
            <div className="day-num">{day.getDate()}</div>
            {eventsFor(dateStr).map((r) => (
              <div key={r.id} className={`cal-event type-${r.type}`}>
                <strong>{personName(r.personId)}</strong> – {typeLabel(r.type)}
                {r.type === 'powerhour' && r.hours ? ` (${r.hours}h)` : ''}
              </div>
            ))}
            {tasksFor(dateStr).map((t) => (
              <div key={t.id} className="cal-event cal-task">
                <strong>{t.title}</strong> – {personName(t.assigneeId)}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function DayList({
  dateStr,
  eventsFor,
  tasksFor,
  personName,
}: {
  dateStr: string
  eventsFor: GridProps['eventsFor']
  tasksFor: GridProps['tasksFor']
  personName: (id: string) => string
}) {
  const events = eventsFor(dateStr)
  const due = tasksFor(dateStr)
  if (events.length === 0 && due.length === 0) {
    return <p className="empty">Nothing scheduled for this day.</p>
  }
  return (
    <div className="cal-day-list">
      {events.map((r) => (
        <div key={r.id} className={`cal-event type-${r.type} big`}>
          <strong>{personName(r.personId)}</strong> — {typeLabel(r.type)}
          {r.type === 'powerhour' && r.hours ? ` (${r.hours}h)` : ''}
          {r.note ? ` · ${r.note}` : ''}
          <span className={`badge badge-${r.status}`} style={{ marginLeft: '0.5rem' }}>{r.status}</span>
        </div>
      ))}
      {due.map((t) => (
        <div key={t.id} className="cal-event cal-task big">
          <strong>{t.title}</strong> — {personName(t.assigneeId)}
          {t.description ? ` · ${t.description}` : ''}
        </div>
      ))}
    </div>
  )
}
