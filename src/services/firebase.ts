import { initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
} from 'firebase/auth'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import type { Backend } from './backend'
import type { AuthUser, NewRequest, NewTask, Person, Task, TaskStatus, Team, TimeOffRequest } from '../types'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
)

const PEOPLE = 'people'
const REQUESTS = 'requests'
const TASKS = 'tasks'
const TEAMS = 'teams'

// Firestore `in` queries accept at most 30 values; stay well under it.
const IN_CHUNK = 10

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export function createFirebaseBackend(): Backend {
  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const databaseId = import.meta.env.VITE_FIRESTORE_DATABASE_ID as string | undefined
  const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app)

  async function queryDocs<T>(col: string, personKey: string, personIds: string[]): Promise<T[]> {
    if (personIds.length === 0) return []
    const results: T[] = []
    for (const ids of chunk(personIds, IN_CHUNK)) {
      const snap = await getDocs(query(collection(db, col), where(personKey, 'in', ids)))
      snap.forEach((d) => results.push({ id: d.id, ...d.data() } as T))
    }
    return results
  }

  async function deletePersonCascade(personId: string): Promise<void> {
    const batch = writeBatch(db)
    const reqs = await getDocs(query(collection(db, REQUESTS), where('personId', '==', personId)))
    reqs.forEach((d) => batch.delete(d.ref))
    const tasks = await getDocs(query(collection(db, TASKS), where('assigneeId', '==', personId)))
    tasks.forEach((d) => batch.delete(d.ref))
    batch.delete(doc(db, PEOPLE, personId))
    await batch.commit()
  }

  async function ensurePersonInTeam(user: AuthUser, teamId: string): Promise<void> {
    const existing = await backend.getPersonByEmail(user.email)
    if (existing) {
      await updateDoc(doc(db, PEOPLE, existing.id), { teamId })
    } else {
      await addDoc(collection(db, PEOPLE), {
        name: user.name || user.email,
        email: user.email.toLowerCase(),
        teamId,
      })
    }
  }

  const backend: Backend = {
    onAuthChange(cb) {
      return onAuthStateChanged(auth, (u) => {
        cb(u && u.email ? { uid: u.uid, email: u.email, name: u.displayName ?? u.email } : null)
      })
    },

    async signInWithGoogle() {
      await signInWithPopup(auth, new GoogleAuthProvider())
    },

    async signOut() {
      await fbSignOut(auth)
    },

    async getTeam(teamId) {
      const snap = await getDoc(doc(db, TEAMS, teamId))
      return snap.exists() ? ({ id: snap.id, ...snap.data() } as Team) : null
    },

    async createTeam(name, user) {
      const ref = await addDoc(collection(db, TEAMS), {
        name,
        adminEmail: user.email.toLowerCase(),
      })
      await ensurePersonInTeam(user, ref.id)
      return { id: ref.id, name, adminEmail: user.email.toLowerCase() }
    },

    async joinTeam(name, user) {
      const snap = await getDocs(query(collection(db, TEAMS), where('name', '==', name), limit(1)))
      if (snap.empty) throw new Error('Team not found')
      const team = { id: snap.docs[0].id, ...snap.docs[0].data() } as Team
      await ensurePersonInTeam(user, team.id)
      return team
    },

    async leaveTeam(person) {
      await deletePersonCascade(person.id)
    },

    async getPersonByEmail(email) {
      const snap = await getDocs(
        query(collection(db, PEOPLE), where('email', '==', email.toLowerCase()), limit(1)),
      )
      return snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as Person)
    },

    async getPeople(teamId) {
      const snap = await getDocs(query(collection(db, PEOPLE), where('teamId', '==', teamId)))
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Person)
    },

    async addPerson(email, teamId) {
      const clean = email.trim().toLowerCase()
      const data = { name: clean.split('@')[0], email: clean, teamId }
      const ref = await addDoc(collection(db, PEOPLE), data)
      return { id: ref.id, ...data }
    },

    async removePerson(personId) {
      await deletePersonCascade(personId)
    },

    getRequestsForPeople(personIds) {
      return queryDocs<TimeOffRequest>(REQUESTS, 'personId', personIds)
    },

    async addRequest(data: NewRequest) {
      const docData = { ...data, status: 'pending' as const, createdAt: Date.now() }
      const ref = await addDoc(collection(db, REQUESTS), docData)
      return { id: ref.id, ...docData }
    },

    async updateRequest(id, data) {
      const { id: _omit, ...rest } = data
      await updateDoc(doc(db, REQUESTS, id), rest)
    },

    async deleteRequest(id) {
      await deleteDoc(doc(db, REQUESTS, id))
    },

    getTasksForPeople(personIds) {
      return queryDocs<Task>(TASKS, 'assigneeId', personIds)
    },

    async addTask(data: NewTask) {
      const docData = { ...data, status: 'assigned' as const }
      const ref = await addDoc(collection(db, TASKS), docData)
      return { id: ref.id, ...docData }
    },

    async updateTask(id, data) {
      const { id: _omit, ...rest } = data
      await updateDoc(doc(db, TASKS, id), rest)
    },

    async updateTaskStatus(id, status: TaskStatus) {
      await updateDoc(doc(db, TASKS, id), { status })
    },

    async deleteTask(id) {
      await deleteDoc(doc(db, TASKS, id))
    },
  }

  return backend
}
