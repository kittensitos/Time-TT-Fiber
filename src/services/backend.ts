import type { AuthUser, NewRequest, NewTask, Person, Task, TaskStatus, Team, TimeOffRequest } from '../types'

/**
 * Data access contract for the Firebase implementation. Mirrors the reference
 * Flask API surface.
 */
export interface Backend {
  // --- auth ---
  onAuthChange(cb: (user: AuthUser | null) => void): () => void
  signInWithGoogle(): Promise<void>
  signOut(): Promise<void>

  // --- teams ---
  getTeam(teamId: string): Promise<Team | null>
  createTeam(name: string, user: AuthUser): Promise<Team>
  joinTeam(name: string, user: AuthUser): Promise<Team>
  /** Removes the person and cascades their requests and tasks. */
  leaveTeam(person: Person): Promise<void>

  // --- people ---
  getPersonByEmail(email: string): Promise<Person | null>
  getPeople(teamId: string): Promise<Person[]>
  addPerson(email: string, teamId: string): Promise<Person>
  /** Removes the person and cascades their requests and tasks. */
  removePerson(personId: string): Promise<void>

  // --- time-off requests ---
  getRequestsForPeople(personIds: string[]): Promise<TimeOffRequest[]>
  addRequest(data: NewRequest): Promise<TimeOffRequest>
  updateRequest(id: string, data: Partial<TimeOffRequest>): Promise<void>
  deleteRequest(id: string): Promise<void>

  // --- tasks ---
  getTasksForPeople(personIds: string[]): Promise<Task[]>
  addTask(data: NewTask): Promise<Task>
  updateTask(id: string, data: Partial<Task>): Promise<void>
  updateTaskStatus(id: string, status: TaskStatus): Promise<void>
  deleteTask(id: string): Promise<void>
}
