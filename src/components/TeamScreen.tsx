import { useState } from 'react'
import { useApp } from '../AppContext'
import { backend } from '../services'
import { isAuthorizedTeamLead } from '../services/teamLeads'

export default function TeamScreen() {
  const { authUser, refresh } = useApp()
  const [createName, setCreateName] = useState('')
  const [joinName, setJoinName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function run(fn: () => Promise<unknown>) {
    setError('')
    setBusy(true)
    try {
      await fn()
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="overlay-screen">
      <div className="overlay-box">
        <h1>Join or Create a Team</h1>
        <p className="muted">You need a team to get started</p>
        {error && <div className="form-error">{error}</div>}

        <div className="form-group">
          <label htmlFor="create-team-name">Create a new team</label>
          <input
            id="create-team-name"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder="e.g. Engineering"
          />
        </div>
        <button
          className="btn btn-primary block"
          disabled={busy || !createName.trim()}
          onClick={() =>
            void run(async () => {
              if (!(await isAuthorizedTeamLead(authUser.email))) {
                throw new Error('Only authorized team leads can create teams')
              }
              await backend.createTeam(createName.trim(), authUser)
            })
          }
        >
          Create Team
        </button>

        <div className="divider">or</div>

        <div className="form-group">
          <label htmlFor="join-team-name">Join an existing team</label>
          <input
            id="join-team-name"
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            placeholder="Enter team name"
          />
        </div>
        <button
          className="btn btn-secondary block"
          disabled={busy || !joinName.trim()}
          onClick={() => void run(() => backend.joinTeam(joinName.trim(), authUser))}
        >
          Join Team
        </button>

        <p className="small" style={{ marginTop: '1rem' }}>
          <a href="#" className="muted" onClick={(e) => { e.preventDefault(); void backend.signOut() }}>
            Sign out
          </a>
        </p>
      </div>
    </div>
  )
}
