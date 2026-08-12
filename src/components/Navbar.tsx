import { useEffect, useRef, useState } from 'react'
import { useApp } from '../AppContext'
import { backend } from '../services'
import { formatDate, formatDateTime, priorityLabel, timeAgo, typeLabel } from '../utils'
import type { Tab } from '../App'

const TABS: { id: Tab; label: string }[] = [
  { id: 'requests', label: 'Requests' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'team', label: 'Team' },
  { id: 'summary', label: 'Summary' },
]

interface MemberNotif {
  key: string
  tab: Tab
  title: string
  detail: string
}

export default function Navbar({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const { authUser, person, team, isAdmin, requests, tasks, refresh, personName } = useApp()
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

  // Member notifications: tasks assigned to me plus decisions on my requests.
  // The status is part of the key so a request re-notifies if it changes again.
  const memberNotifs: MemberNotif[] = !isAdmin && person
    ? [
        ...tasks
          .filter((t) => t.assigneeId === person.id && t.status === 'assigned')
          .map((t): MemberNotif => ({
            key: `task:${t.id}`,
            tab: 'tasks',
            title: `New task: ${t.title}`,
            detail: `${priorityLabel(t.priority)} priority${t.dueDate ? ` · due ${formatDate(t.dueDate)}` : ''}`,
          })),
        ...requests
          .filter((r) => r.personId === person.id && r.status !== 'pending')
          .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
          .map((r): MemberNotif => ({
            key: `req:${r.id}:${r.status}`,
            tab: 'requests',
            title: `${typeLabel(r.type)}${r.type === 'powerhour' && r.hours ? ` (${r.hours}h)` : ''} ${r.status}`,
            detail: `${formatDate(r.startDate)}${r.endDate && r.endDate !== r.startDate ? ` – ${formatDate(r.endDate)}` : ''}`,
          })),
      ]
    : []

  // Already-acknowledged notifications, remembered per person on this device.
  const seenKey = person ? `gfiber-notifs-seen:${person.id}` : null
  const [seen, setSeen] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!seenKey) return
    try {
      setSeen(new Set(JSON.parse(localStorage.getItem(seenKey) ?? '[]') as string[]))
    } catch {
      setSeen(new Set())
    }
  }, [seenKey])

  const unseenCount = memberNotifs.filter((n) => !seen.has(n.key)).length
  const bellCount = isAdmin ? memberSubmissions.length : unseenCount

  function toggleNotifs() {
    const opening = !notifOpen
    setNotifOpen(opening)
    // Opening the panel acknowledges everything currently in it.
    if (opening && !isAdmin && seenKey && unseenCount > 0) {
      const next = new Set(seen)
      memberNotifs.forEach((n) => next.add(n.key))
      setSeen(next)
      // Persist only keys for notifications that still exist, so the list
      // doesn't grow forever as old requests and tasks are deleted.
      localStorage.setItem(
        seenKey,
        JSON.stringify([...next].filter((k) => memberNotifs.some((n) => n.key === k))),
      )
    }
  }

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

  async function deleteTeam() {
    if (!team || !isAdmin) return
    if (!confirm(`Delete team "${team.name}"? All members and their requests and tasks will be permanently removed.`)) return
    try {
      await backend.deleteTeam(team.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not delete the team.')
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
      <div className="nav-notif" ref={notifRef}>
        <button
          className="notif-bell"
          title={isAdmin ? 'Pending submissions' : 'Notifications'}
          onClick={toggleNotifs}
        >
          <img className="bell-icon" src="/notif-bell.png" alt="Notifications" />
          {bellCount > 0 && (
            // Keyed by count so the pop animation replays whenever it changes.
            <span key={bellCount} className="notif-badge bell-badge">{bellCount}</span>
          )}
        </button>
        {notifOpen && (
          <div className="notif-dropdown">
            {isAdmin ? (
              <>
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
              </>
            ) : (
              <>
                <div className="notif-title">Notifications</div>
                {memberNotifs.length === 0 ? (
                  <div className="notif-empty">Nothing yet — approvals and new tasks show up here.</div>
                ) : (
                  memberNotifs.map((n) => (
                    <button
                      key={n.key}
                      className="notif-item"
                      onClick={() => { setNotifOpen(false); onTab(n.tab) }}
                    >
                      <span className="notif-who">{n.title}</span>
                      <span className="notif-when">{n.detail}</span>
                    </button>
                  ))
                )}
              </>
            )}
          </div>
        )}
      </div>
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
            {isAdmin ? (
              <button className="danger" onClick={() => void deleteTeam()}>Delete team</button>
            ) : (
              <button className="danger" onClick={() => void leaveTeam()}>Leave team</button>
            )}
            <button onClick={() => void backend.signOut()}>Sign out</button>
          </div>
        )}
      </div>
    </nav>
  )
}
