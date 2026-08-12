import { useEffect, useRef, useState } from 'react'
import { useApp } from '../AppContext'
import { backend } from '../services'
import { formatDateTime, timeAgo, typeLabel } from '../utils'
import type { Tab } from '../App'

const TABS: { id: Tab; label: string }[] = [
  { id: 'requests', label: 'Requests' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'team', label: 'Team' },
  { id: 'summary', label: 'Summary' },
]

export default function Navbar({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const { authUser, person, team, isAdmin, requests, refresh, personName } = useApp()
  const [open, setOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  const pendingCount = isAdmin ? requests.filter((r) => r.status === 'pending').length : 0

  // Member submissions awaiting review, newest first (admin notifications).
  const memberSubmissions = isAdmin
    ? requests
        .filter((r) => r.status === 'pending' && r.personId !== person?.id)
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
    : []

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (open && dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
      if (notifOpen && notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open, notifOpen])

  async function leaveTeam() {
    if (!person) return
    if (isAdmin) {
      alert('Team admins cannot leave their team.')
      return
    }
    if (!confirm('Leave this team? Your requests and tasks will be removed.')) return
    try {
      await backend.leaveTeam(person)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not leave the team.')
      return
    }
    await refresh()
  }

  const initial = (person?.name || authUser.email).charAt(0).toUpperCase()

  return (
    <nav className="navbar">
      <span className="nav-logo">
        <img src="/gfiber-icon.png" alt="" />
        GFiber
      </span>
      <div className="nav-links">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab-btn${tab === t.id ? ' active' : ''}`}
            onClick={() => onTab(t.id)}
          >
            {t.label}
            {t.id === 'requests' && pendingCount > 0 && (
              <span className="notif-badge">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>
      {isAdmin && (
        <div className="nav-notif" ref={notifRef}>
          <button
            className="notif-bell"
            title="Pending submissions"
            onClick={() => setNotifOpen((v) => !v)}
          >
            <img className="bell-icon" src="/notif-bell.png" alt="Notifications" />
            {memberSubmissions.length > 0 && (
              <span className="notif-badge bell-badge">{memberSubmissions.length}</span>
            )}
          </button>
          {notifOpen && (
            <div className="notif-dropdown">
              <div className="notif-title">Pending submissions</div>
              {memberSubmissions.length === 0 ? (
                <div className="notif-empty">No pending submissions from members.</div>
              ) : (
                memberSubmissions.map((r) => (
                  <button
                    key={r.id}
                    className="notif-item"
                    onClick={() => { setNotifOpen(false); onTab('requests') }}
                  >
                    <span className="notif-who">
                      {personName(r.personId)} · {typeLabel(r.type)}
                      {r.type === 'powerhour' && r.hours ? ` (${r.hours}h)` : ''}
                    </span>
                    <span className="notif-when">
                      Submitted {formatDateTime(r.createdAt)}
                      {r.createdAt ? ` · ${timeAgo(r.createdAt)}` : ''}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
      <div className="nav-user" ref={dropdownRef}>
        <button className="user-avatar" title="Account" onClick={() => setOpen((v) => !v)}>
          {initial}
        </button>
        {open && (
          <div className="user-dropdown">
            <div className="dropdown-name">{person?.name || authUser.name}</div>
            <div className="dropdown-email">{authUser.email}</div>
            <div className="dropdown-role">{isAdmin ? 'Team Admin' : 'Member'}</div>
            <div className="dropdown-email dropdown-team">{team?.name}</div>
            <button className="danger" onClick={() => void leaveTeam()}>Leave team</button>
            <button onClick={() => void backend.signOut()}>Sign out</button>
          </div>
        )}
      </div>
    </nav>
  )
}
