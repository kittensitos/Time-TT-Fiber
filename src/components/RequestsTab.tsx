import { useState } from 'react'
import type { FormEvent } from 'react'
import { useApp } from '../AppContext'
import { backend } from '../services'
import { businessDays, capitalize, formatDate, typeLabel } from '../utils'
import type { RequestStatus, RequestType, TimeOffRequest } from '../types'
import Modal from './Modal'

// Members can hold at most this many requests at once; deleting an old one
// frees a slot. Admins are exempt.
const MAX_REQUESTS_PER_MEMBER = 3
// Scheduling starts in 2026 — matches the calendar's floor.
const MIN_REQUEST_DATE = '2026-01-01'

export default function RequestsTab() {
  const { person, isAdmin, people, requests, personName } = useApp()

  // submit form
  const [type, setType] = useState<RequestType>('powerhour')
  const [hours, setHours] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [note, setNote] = useState('')
  const [formError, setFormError] = useState('')

  // filters
  const [filterPerson, setFilterPerson] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')

  const [editing, setEditing] = useState<TimeOffRequest | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!person) return
    if (!startDate || !endDate || endDate < startDate) {
      setFormError('Invalid date range.')
      return
    }
    if (startDate < MIN_REQUEST_DATE) {
      setFormError('Requests must be for dates in 2026 or later.')
      return
    }
    if (!isAdmin && requests.filter((r) => r.personId === person.id).length >= MAX_REQUESTS_PER_MEMBER) {
      setFormError(`You can only have ${MAX_REQUESTS_PER_MEMBER} requests at a time. Delete one of your existing requests to submit a new one.`)
      return
    }
    const h = type === 'powerhour' ? parseInt(hours, 10) || 0 : 0
    if (type === 'powerhour' && !h) {
      setFormError('Please enter the number of hours.')
      return
    }
    const overlap = requests.some(
      (r) =>
        r.personId === person.id &&
        r.status === 'pending' &&
        startDate <= r.endDate &&
        endDate >= r.startDate,
    )
    if (overlap) {
      setFormError('You already have a pending request for those dates. Please pick different days or wait for it to be reviewed.')
      return
    }
    try {
      await backend.addRequest({ personId: person.id, type, startDate, endDate, note, hours: h })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not submit the request. Please try again.')
      return
    }
    setHours(''); setStartDate(''); setEndDate(''); setNote('')
  }

  async function setStatus(id: string, status: RequestStatus) {
    try {
      await backend.updateRequest(id, { status })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not update the request.')
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this request?')) return
    try {
      await backend.deleteRequest(id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not delete the request.')
    }
  }

  const filtered = requests.filter(
    (r) =>
      (!filterPerson || r.personId === filterPerson) &&
      (!filterStatus || r.status === filterStatus) &&
      (!filterType || r.type === filterType),
  )

  return (
    <>
      <div className="card glow-card">
        <h2>Submit Time Off Request</h2>
        {!isAdmin && person && (
          <p className="muted small">
            {requests.filter((r) => r.personId === person.id).length} of {MAX_REQUESTS_PER_MEMBER} request
            slots used — delete an old request to free one up.
          </p>
        )}
        <form onSubmit={submit}>
          {formError && <div className="form-error">{formError}</div>}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="req-type">Type</label>
              <select id="req-type" value={type} onChange={(e) => setType(e.target.value as RequestType)}>
                <option value="powerhour">Power Hour</option>
                <option value="other">Other</option>
              </select>
            </div>
            {type === 'powerhour' && (
              <div className="form-group narrow">
                <label htmlFor="req-hours">Hours</label>
                <input id="req-hours" type="number" min={1} max={24} value={hours} onChange={(e) => setHours(e.target.value)} placeholder="e.g. 2" />
              </div>
            )}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="req-start">Start Date</label>
              <input id="req-start" type="date" required min={MIN_REQUEST_DATE} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="req-end">End Date</label>
              <input id="req-end" type="date" required min={MIN_REQUEST_DATE} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="req-note">Note</label>
            <textarea id="req-note" rows={2} required value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any details..." />
          </div>
          <button type="submit" className="btn btn-primary">Submit Request</button>
        </form>
      </div>

      <div className="card">
        <h2>{isAdmin ? 'All Requests' : 'My Requests'}</h2>
        <div className="filter-row">
          {isAdmin && (
            <select value={filterPerson} onChange={(e) => setFilterPerson(e.target.value)}>
              <option value="">All people</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="denied">Denied</option>
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">All types</option>
            <option value="powerhour">Power Hour</option>
            <option value="other">Other</option>
          </select>
        </div>
        {filtered.length === 0 ? (
          <p className="empty">No requests found.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Type</th>
                  <th>Dates</th>
                  <th>Days</th>
                  <th>Status</th>
                  <th>Note</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>{personName(r.personId)}</td>
                    <td>
                      <span className={`badge type-${r.type}`}>
                        {typeLabel(r.type)}{r.type === 'powerhour' && r.hours ? ` (${r.hours}h)` : ''}
                      </span>
                    </td>
                    <td>{formatDate(r.startDate)} – {formatDate(r.endDate)}</td>
                    <td>{businessDays(r.startDate, r.endDate)}</td>
                    <td><span className={`badge badge-${r.status}`}>{capitalize(r.status)}</span></td>
                    <td>{r.note || '—'}</td>
                    <td className="actions">
                      {isAdmin ? (
                        <>
                          {r.status === 'pending' && (
                            <>
                              <button className="btn btn-success btn-sm" onClick={() => void setStatus(r.id, 'approved')}>Approve</button>
                              <button className="btn btn-danger btn-sm" onClick={() => void setStatus(r.id, 'denied')}>Deny</button>
                            </>
                          )}
                          <button className="btn btn-outline btn-sm" onClick={() => setEditing(r)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => void remove(r.id)}>Del</button>
                        </>
                      ) : (
                        // Members may withdraw their own requests (the Firestore
                        // rules already permit this) — freeing up a request slot.
                        r.personId === person?.id && (
                          <button className="btn btn-danger btn-sm" onClick={() => void remove(r.id)}>Del</button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && <EditRequestModal request={editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function EditRequestModal({ request, onClose }: { request: TimeOffRequest; onClose: () => void }) {
  const { personName } = useApp()
  const [type, setType] = useState<RequestType>(request.type)
  const [hours, setHours] = useState(String(request.hours || ''))
  const [startDate, setStartDate] = useState(request.startDate)
  const [endDate, setEndDate] = useState(request.endDate)
  const [note, setNote] = useState(request.note)
  const [status, setStatus] = useState<RequestStatus>(request.status)
  const [error, setError] = useState('')

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!startDate || !endDate || endDate < startDate) {
      setError('Invalid date range.')
      return
    }
    try {
      await backend.updateRequest(request.id, {
        type,
        status,
        startDate,
        endDate,
        note,
        hours: type === 'powerhour' ? parseInt(hours, 10) || 0 : 0,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the request.')
      return
    }
    onClose()
  }

  return (
    <Modal title={`Edit Request — ${personName(request.personId)}`} onClose={onClose}>
      <form onSubmit={save}>
        {error && <div className="form-error">{error}</div>}
        <div className="form-row">
          <div className="form-group">
            <label>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as RequestType)}>
              <option value="powerhour">Power Hour</option>
              <option value="other">Other</option>
            </select>
          </div>
          {type === 'powerhour' && (
            <div className="form-group narrow">
              <label>Hours</label>
              <input type="number" min={1} max={24} value={hours} onChange={(e) => setHours(e.target.value)} />
            </div>
          )}
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Start Date</label>
            <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>End Date</label>
            <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label>Note</label>
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as RequestStatus)}>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="denied">Denied</option>
          </select>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">Save</button>
        </div>
      </form>
    </Modal>
  )
}
