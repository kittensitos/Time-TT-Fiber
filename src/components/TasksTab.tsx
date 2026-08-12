import { useState } from 'react'
import type { FormEvent } from 'react'
import { useApp } from '../AppContext'
import { backend } from '../services'
import { formatDate, priorityLabel, taskStatusLabel } from '../utils'
import type { Priority, Task, TaskStatus } from '../types'
import Modal from './Modal'

const STATUS_ORDER: Record<TaskStatus, number> = { assigned: 0, in_progress: 1, completed: 2 }
const PRIO_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 }

export default function TasksTab() {
  const { person, isAdmin, people, tasks, personName } = useApp()

  // create form (admin)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [formError, setFormError] = useState('')

  // filters
  const [filterAssignee, setFilterAssignee] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')

  const [editing, setEditing] = useState<Task | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!title.trim()) return
    // Tasks are fetched per assignee, so an unassigned task would be invisible.
    if (!assigneeId) {
      setFormError('Please pick an assignee.')
      return
    }
    try {
      await backend.addTask({ title: title.trim(), description, assigneeId, priority, dueDate })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create the task. Please try again.')
      return
    }
    setTitle(''); setDescription(''); setAssigneeId(''); setPriority('medium'); setDueDate('')
  }

  async function changeStatus(task: Task, status: TaskStatus) {
    try {
      await backend.updateTaskStatus(task.id, status)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not update the task.')
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this task?')) return
    try {
      await backend.deleteTask(id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not delete the task.')
    }
  }

  const filtered = tasks
    .filter(
      (t) =>
        (!filterAssignee || t.assigneeId === filterAssignee) &&
        (!filterStatus || t.status === filterStatus) &&
        (!filterPriority || t.priority === filterPriority),
    )
    .sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority],
    )

  return (
    <>
      {isAdmin && (
        <div className="card glow-card">
          <h2>Assign a Task</h2>
          <form onSubmit={submit}>
            {formError && <div className="form-error">{formError}</div>}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="task-title">Title</label>
                <input id="task-title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" />
              </div>
              <div className="form-group">
                <label htmlFor="task-assignee">Assignee</label>
                <select id="task-assignee" required value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                  <option value="">Select assignee…</option>
                  {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="task-priority">Priority</label>
                <select id="task-priority" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="task-due">Due Date</label>
                <input id="task-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="task-desc">Description</label>
              <textarea id="task-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details (optional)" />
            </div>
            <button type="submit" className="btn btn-primary">Assign Task</button>
          </form>
        </div>
      )}

      <div className="card">
        <h2>Task List</h2>
        <div className="filter-row">
          {isAdmin && (
            <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}>
              <option value="">All assignees</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
            <option value="">All priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <p className="empty">No tasks found.</p>
        ) : (
          <div className="task-list">
            {filtered.map((t) => {
              const mine = person?.id === t.assigneeId
              return (
                <div key={t.id} className={`task-item glow-card status-${t.status}`}>
                  <div className="task-main">
                    <div className="task-title-row">
                      <strong className={t.status === 'completed' ? 'strike' : ''}>{t.title}</strong>
                      <span className={`badge prio-${t.priority}`}>{priorityLabel(t.priority)}</span>
                      <span className={`badge task-${t.status}`}>{taskStatusLabel(t.status)}</span>
                    </div>
                    {t.description && <div className="task-desc">{t.description}</div>}
                    <div className="task-meta">
                      {personName(t.assigneeId)}
                      {t.dueDate ? ` · Due ${formatDate(t.dueDate)}` : ''}
                    </div>
                  </div>
                  <div className="task-actions">
                    {(mine || isAdmin) && (
                      <select
                        value={t.status}
                        onChange={(e) => void changeStatus(t, e.target.value as TaskStatus)}
                      >
                        <option value="assigned">Assigned</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    )}
                    {isAdmin && (
                      <>
                        <button className="btn btn-outline btn-sm" onClick={() => setEditing(t)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => void remove(t.id)}>Del</button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {editing && <EditTaskModal task={editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function EditTaskModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const { people } = useApp()
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description)
  const [assigneeId, setAssigneeId] = useState(task.assigneeId)
  const [priority, setPriority] = useState<Priority>(task.priority)
  const [status, setStatus] = useState<TaskStatus>(task.status)
  const [dueDate, setDueDate] = useState(task.dueDate)
  const [error, setError] = useState('')

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !assigneeId) return
    try {
      await backend.updateTask(task.id, { title: title.trim(), description, assigneeId, priority, status, dueDate })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the task.')
      return
    }
    onClose()
  }

  return (
    <Modal title="Edit Task" onClose={onClose}>
      <form onSubmit={save}>
        {error && <div className="form-error">{error}</div>}
        <div className="form-group">
          <label>Title</label>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Assignee</label>
            <select required value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">Select assignee…</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="form-group">
            <label>Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">Save</button>
        </div>
      </form>
    </Modal>
  )
}
