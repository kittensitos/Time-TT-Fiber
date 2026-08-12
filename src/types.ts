export type RequestType = 'powerhour' | 'other'
export type RequestStatus = 'pending' | 'approved' | 'denied'
export type TaskStatus = 'assigned' | 'in_progress' | 'completed'
export type Priority = 'low' | 'medium' | 'high'

export interface AuthUser {
  uid: string
  email: string
  name: string
}

export interface Team {
  id: string
  name: string
  adminEmail: string
}

export interface Person {
  id: string
  name: string
  email: string
  teamId: string
}

export interface TimeOffRequest {
  id: string
  personId: string
  type: RequestType
  startDate: string
  endDate: string
  note: string
  status: RequestStatus
  hours: number
  /** Submission time in epoch ms; set by the backend on creation. */
  createdAt?: number
}

export interface Task {
  id: string
  title: string
  description: string
  assigneeId: string
  priority: Priority
  status: TaskStatus
  dueDate: string
}

export type NewRequest = Omit<TimeOffRequest, 'id' | 'status' | 'createdAt'>
export type NewTask = Omit<Task, 'id' | 'status'>
