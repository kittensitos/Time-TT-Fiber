import type { Priority, RequestType, TaskStatus } from './types'

export const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatDate(s: string): string {
  if (!s) return '—'
  const d = parseDate(s)
  return `${monthNames[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`
}

export function formatDateTime(ms?: number): string {
  if (!ms) return '—'
  const d = new Date(ms)
  let h = d.getHours()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${monthNames[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${h}:${min} ${ampm}`
}

export function timeAgo(ms?: number): string {
  if (!ms) return ''
  const diff = Date.now() - ms
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function businessDays(start: string, end: string): number {
  let count = 0
  const cur = parseDate(start)
  const last = parseDate(end)
  while (cur <= last) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

export function typeLabel(t: RequestType): string {
  return { powerhour: 'Power Hour', other: 'Other' }[t] ?? t
}

export function taskStatusLabel(s: TaskStatus): string {
  return { assigned: 'Assigned', in_progress: 'In Progress', completed: 'Completed' }[s] ?? s
}

export function priorityLabel(p: Priority): string {
  return { low: 'Low', medium: 'Medium', high: 'High' }[p] ?? p
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
