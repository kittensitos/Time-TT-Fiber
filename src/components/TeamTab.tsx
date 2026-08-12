import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useApp } from '../AppContext'
import { backend } from '../services'
import { allowedDomainsLabel, isAllowedDomain, isListedTeamLead } from '../services/teamLeads'

export default function TeamTab() {
  const { team, isAdmin, people, person, refresh } = useApp()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // Allowlisted team leads count as admins too (same rule as AppContext's isAdmin).
  const [leadEmails, setLeadEmails] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    void Promise.all(
      people.map(async (p) => ((await isListedTeamLead(p.email)) ? p.email.toLowerCase() : null)),
    ).then((emails) => {
      if (!cancelled) setLeadEmails(new Set(emails.filter((e): e is string => e !== null)))
    })
    return () => {
      cancelled = true
    }
  }, [people])

  async function addMember(e: FormEvent) {
    e.preventDefault()
    setError('')
    const clean = email.trim().toLowerCase()
    if (!clean || !team) return
    if (people.some((p) => p.email === clean)) {
      setError('That person is already on the team.')
      return
    }
    if (!isAllowedDomain(clean)) {
      setError(`Only ${allowedDomainsLabel()} accounts can join.`)
      return
    }
    setBusy(true)
    try {
      await backend.addPerson(clean, team.id)
      setEmail('')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the member. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function removeMember(personId: string, name: string) {
    if (!confirm(`Remove ${name} from the team? Their requests and tasks will be deleted.`)) return
    await backend.removePerson(personId)
    await refresh()
  }

  return (
    <>
      {isAdmin && (
        <div className="card">
          <h2>Add Team Member</h2>
          <form onSubmit={addMember} className="form-row inline">
            <div className="form-group">
              <label htmlFor="member-email">Email</label>
              <input
                id="member-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@example.com"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Adding…' : 'Add Member'}
            </button>
          </form>
          {error && <div className="form-error">{error}</div>}
        </div>
      )}

      <div className="card">
        <h2>Team Members{team ? ` — ${team.name}` : ''}</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {people.map((p) => {
                const memberIsAdmin =
                  team?.adminEmail.toLowerCase() === p.email.toLowerCase() ||
                  leadEmails.has(p.email.toLowerCase())
                return (
                  <tr key={p.id}>
                    <td>{p.name}{p.id === person?.id ? ' (you)' : ''}</td>
                    <td>{p.email}</td>
                    <td>{memberIsAdmin ? <span className="badge badge-approved">Admin</span> : 'Member'}</td>
                    {isAdmin && (
                      <td>
                        {!memberIsAdmin && (
                          <button className="btn btn-danger btn-sm" onClick={() => void removeMember(p.id, p.name)}>
                            Remove
                          </button>
                        )}
                      </td>
                    )}
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
