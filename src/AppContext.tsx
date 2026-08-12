import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { backend } from './services'
import { isListedTeamLead } from './services/teamLeads'
import type { AuthUser, Person, Task, Team, TimeOffRequest } from './types'

interface AppState {
  authUser: AuthUser
  person: Person | null
  team: Team | null
  isAdmin: boolean
  people: Person[]
  requests: TimeOffRequest[]
  tasks: Task[]
  loading: boolean
  refresh: () => Promise<void>
  personName: (personId: string) => string
}

const AppContext = createContext<AppState | null>(null)

export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}

export function AppProvider({ authUser, children }: { authUser: AuthUser; children: ReactNode }) {
  const [person, setPerson] = useState<Person | null>(null)
  const [team, setTeam] = useState<Team | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [people, setPeople] = useState<Person[]>([])
  const [visibleIds, setVisibleIds] = useState<string[]>([])
  const [requests, setRequests] = useState<TimeOffRequest[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const me = await backend.getPersonByEmail(authUser.email)
    if (!me || !me.teamId) {
      setPerson(me)
      setTeam(null)
      setIsAdmin(false)
      setPeople([])
      setVisibleIds([])
      setLoading(false)
      return
    }
    const myTeam = await backend.getTeam(me.teamId)
    // Admin = the team's owner, or an allowlisted team lead (hashed env var) —
    // recognized regardless of sign-in provider, including Google SSO.
    const admin =
      myTeam?.adminEmail.toLowerCase() === authUser.email.toLowerCase() ||
      (await isListedTeamLead(authUser.email))
    const teamPeople = await backend.getPeople(me.teamId)
    setPerson(me)
    setTeam(myTeam)
    setIsAdmin(admin)
    setPeople(teamPeople)
    // Admins see the whole team's data; members only their own (as in the reference app).
    setVisibleIds(admin ? teamPeople.map((p) => p.id) : [me.id])
    setLoading(false)
  }, [authUser.email])

  useEffect(() => {
    setLoading(true)
    void refresh()
  }, [refresh])

  // Requests and tasks stream in over live listeners: a mutation is a single
  // write, and Firestore pushes the change to every open session — which is
  // also what makes the notification bell pop without a reload.
  const visibleKey = visibleIds.join(',')
  useEffect(() => {
    const ids = visibleKey ? visibleKey.split(',') : []
    if (ids.length === 0) {
      setRequests([])
      setTasks([])
      return
    }
    const unsubRequests = backend.subscribeRequestsForPeople(ids, (reqs) =>
      setRequests([...reqs].sort((a, b) => (a.startDate < b.startDate ? 1 : -1))),
    )
    const unsubTasks = backend.subscribeTasksForPeople(ids, setTasks)
    return () => {
      unsubRequests()
      unsubTasks()
    }
  }, [visibleKey])

  const personName = useCallback(
    (personId: string) => people.find((p) => p.id === personId)?.name ?? 'Unassigned',
    [people],
  )

  const value = useMemo(
    () => ({ authUser, person, team, isAdmin, people, requests, tasks, loading, refresh, personName }),
    [authUser, person, team, isAdmin, people, requests, tasks, loading, refresh, personName],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
