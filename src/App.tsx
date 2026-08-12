import { useEffect, useState } from 'react'
import { AppProvider, useApp } from './AppContext'
import { backend } from './services'
import { allowedDomainsLabel, isAllowedDomain } from './services/teamLeads'
import type { AuthUser } from './types'
import AuthScreen from './components/AuthScreen'
import TeamScreen from './components/TeamScreen'
import Navbar from './components/Navbar'
import RequestsTab from './components/RequestsTab'
import TasksTab from './components/TasksTab'
import CalendarTab from './components/CalendarTab'
import TeamTab from './components/TeamTab'
import SummaryTab from './components/SummaryTab'

export type Tab = 'requests' | 'tasks' | 'calendar' | 'team' | 'summary'

function Spinner() {
  return (
    <div className="loading-screen">
      <div className="spinner" />
    </div>
  )
}

function Main() {
  const { person, loading } = useApp()
  const [tab, setTab] = useState<Tab>('requests')

  if (loading) return <Spinner />
  if (!person || !person.teamId) return <TeamScreen />

  return (
    <>
      <Navbar tab={tab} onTab={setTab} />
      <div className="container">
        {tab === 'requests' && <RequestsTab />}
        {tab === 'tasks' && <TasksTab />}
        {tab === 'calendar' && <CalendarTab />}
        {tab === 'team' && <TeamTab />}
        {tab === 'summary' && <SummaryTab />}
      </div>
    </>
  )
}

export default function App() {
  // undefined = auth state still resolving
  const [authUser, setAuthUser] = useState<AuthUser | null | undefined>(undefined)
  const [domainError, setDomainError] = useState('')

  useEffect(
    () =>
      backend.onAuthChange((user) => {
        // Domain gate applies to every provider, including Google SSO:
        // accounts outside the allowed domains are signed out immediately.
        if (user && !isAllowedDomain(user.email)) {
          setDomainError(`Only ${allowedDomainsLabel()} accounts can use this app.`)
          setAuthUser(null)
          void backend.signOut()
          return
        }
        // The forced sign-out above re-fires this callback with null; keep the
        // domain error visible then, and clear it only on a successful sign-in.
        if (user) setDomainError('')
        setAuthUser(user)
      }),
    [],
  )

  if (authUser === undefined) return <Spinner />
  if (!authUser) return <AuthScreen externalError={domainError} />

  return (
    <AppProvider authUser={authUser}>
      <Main />
    </AppProvider>
  )
}
