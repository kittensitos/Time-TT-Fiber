import { useMemo, useState } from 'react'
import { useApp } from '../AppContext'
import { businessDays, parseDate } from '../utils'
import type { RequestType } from '../types'

export default function SummaryTab() {
  const { people, requests } = useApp()
  const thisYear = new Date().getFullYear()
  const [year, setYear] = useState(thisYear)

  const years = useMemo(() => {
    const ys = new Set<number>([thisYear])
    requests.forEach((r) => ys.add(parseDate(r.startDate).getFullYear()))
    return [...ys].sort((a, b) => b - a)
  }, [requests, thisYear])

  const approved = requests.filter(
    (r) => r.status === 'approved' && parseDate(r.startDate).getFullYear() === year,
  )
  const pending = requests.filter(
    (r) => r.status === 'pending' && parseDate(r.startDate).getFullYear() === year,
  ).length
  const totalDays = approved.reduce((s, r) => s + businessDays(r.startDate, r.endDate), 0)

  function daysByType(personId: string, type: RequestType): number {
    return approved
      .filter((r) => r.personId === personId && r.type === type)
      .reduce((s, r) => s + businessDays(r.startDate, r.endDate), 0)
  }

  return (
    <>
      <div className="card glow-card">
        <div className="summary-header">
          <h2>Team Summary</h2>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Approved Requests</div>
            <div className="stat-value">{approved.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Days Off</div>
            <div className="stat-value">{totalDays}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pending Requests</div>
            <div className="stat-value">{pending}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Team Members</div>
            <div className="stat-value">{people.length}</div>
          </div>
        </div>
      </div>

      <div className="card glow-card">
        <h2>Per-Person Breakdown</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Person</th>
                <th>Power Hour</th>
                <th>Other</th>
                <th>Total Days</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => {
                const ph = daysByType(p.id, 'powerhour')
                const other = daysByType(p.id, 'other')
                return (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{ph}</td>
                    <td>{other}</td>
                    <td><strong>{ph + other}</strong></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
