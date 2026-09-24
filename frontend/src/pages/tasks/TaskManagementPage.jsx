/**
 * IlmForge — Task Management
 * Assign, track, and complete staff tasks with priority badges and status filters
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import {
  CheckSquare, Plus, Clock, AlertCircle,
  User, Trash2, Edit2, CheckCircle,
} from 'lucide-react';

/* Tasks live in the SchoolTask table via /api/v1/tasks. They were previously
   held in localStorage under 'ilmforge_tasks' and seeded with three sample
   tasks, so a task assigned by one user was invisible to everyone else. */

/* The API stores status/priority lower-case; this page displays them in
   title case. These translate between the two. */
const STATUS_TO_UI = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed' };
const STATUS_TO_API = { Pending: 'pending', 'In Progress': 'in_progress', Completed: 'completed' };
const PRIORITY_TO_UI = { low: 'Low', medium: 'Medium', high: 'High' };
const PRIORITY_TO_API = { Low: 'low', Medium: 'medium', High: 'high' };

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-PK', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return d; }
};

const isDue = (dateStr) => {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
};

/* ── Priority badge styles ────────────────────────── */
const priorityStyle = {
  High:   { background: '#FEE2E2', color: '#991B1B' },
  Medium: { background: '#FEF9C3', color: '#92400E' },
  Low:    { background: '#DCFCE7', color: '#166534' },
};

/* ── Status badge styles ──────────────────────────── */
const statusStyle = {
  Pending:     { background: '#FEF3C7', color: '#92400E' },
  'In Progress': { background: '#DBEAFE', color: '#1E3A8A' },
  Completed:   { background: '#D1FAE5', color: '#065F46' },
};

/* ── Empty form ───────────────────────────────────── */
const emptyForm = () => ({
  title: '',
  description: '',
  assignedToId: '',
  assignedToName: '',
  dueDate: '',
  priority: 'Medium',
  status: 'Pending',
});

/* ════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════ */
export default function TaskManagementPage() {
  const qc = useQueryClient();
  const [filter,    setFilter]    = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editTask,  setEditTask]  = useState(null);   // null = add mode
  const [form,      setForm]      = useState(emptyForm());

  /* Fetch staff list for the assign-to dropdown */
  const { data: staffList = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get('/staff', { params: { limit: 500 } })
      .then((r) => r.data?.data?.staff || r.data?.data || []),
    staleTime: 5 * 60 * 1000,
  });

  const { data: rawTasks = [], isLoading, isError, error } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.get('/tasks').then((r) => r.data?.data || []),
  });

  // Reshape server rows into the field names this page's markup uses.
  const tasks = rawTasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description || '',
    assignedTo: t.assignedToUser
      ? { id: t.assignedTo, name: t.assignedToUser.name }
      : { id: '', name: '' },
    dueDate: t.dueDate ? String(t.dueDate).slice(0, 10) : '',
    priority: PRIORITY_TO_UI[t.priority] || 'Medium',
    status: STATUS_TO_UI[t.status] || 'Pending',
    createdAt: t.createdAt,
  }));

  const invalidate = () => qc.invalidateQueries({ queryKey: ['tasks'] });
  const fail = (e) => toast.error(e?.response?.data?.message || 'Request failed');

  const createTask = useMutation({
    mutationFn: (body) => api.post('/tasks', body).then((r) => r.data),
    onSuccess: () => { toast.success('Task added successfully'); invalidate(); },
    onError: fail,
  });
  const patchTask = useMutation({
    mutationFn: ({ id, ...body }) => api.put(`/tasks/${id}`, body).then((r) => r.data),
    onSuccess: () => { toast.success('Task updated successfully'); invalidate(); },
    onError: fail,
  });
  const completeTask = useMutation({
    mutationFn: (id) => api.put(`/tasks/${id}/complete`).then((r) => r.data),
    onSuccess: () => { toast.success('Task marked as completed'); invalidate(); },
    onError: fail,
  });
  const removeTask = useMutation({
    mutationFn: (id) => api.delete(`/tasks/${id}`).then((r) => r.data),
    onSuccess: () => { toast.success('Task deleted'); invalidate(); },
    onError: fail,
  });
  const saving = createTask.isPending || patchTask.isPending;

  /* ── Stats ─────────────────────────────────────── */
  const total      = tasks.length;
  const pending    = tasks.filter((t) => t.status === 'Pending').length;
  const inProgress = tasks.filter((t) => t.status === 'In Progress').length;
  const completed  = tasks.filter((t) => t.status === 'Completed').length;

  /* ── Filtered list ─────────────────────────────── */
  const visible = filter === 'All'
    ? tasks
    : tasks.filter((t) => t.status === filter);

  /* ── Open add modal ────────────────────────────── */
  const openAdd = () => {
    setEditTask(null);
    setForm(emptyForm());
    setShowModal(true);
  };

  /* ── Open edit modal ───────────────────────────── */
  const openEdit = (task) => {
    setEditTask(task);
    setForm({
      title:          task.title,
      description:    task.description || '',
      assignedToId:   task.assignedTo?.id || '',
      assignedToName: task.assignedTo?.name || '',
      dueDate:        task.dueDate || '',
      priority:       task.priority || 'Medium',
      status:         task.status || 'Pending',
    });
    setShowModal(true);
  };

  /* ── Close modal ───────────────────────────────── */
  const closeModal = () => {
    setShowModal(false);
    setEditTask(null);
    setForm(emptyForm());
  };

  /* ── Handle staff select ────────────────────────── */
  // The API assigns tasks by USER id, while the dropdown lists staff records —
  // so carry the staff member's linked userId, not the staff row id.
  const handleStaffChange = (userId) => {
    const member = staffList.find((s) => String(s.userId) === String(userId));
    setForm((f) => ({
      ...f,
      assignedToId:   userId,
      assignedToName: member ? (member.name || '') : '',
    }));
  };

  /* ── Save (add or edit) ────────────────────────── */
  const handleSave = () => {
    if (!form.title.trim()) { toast.error('Task title is required'); return; }
    if (!form.dueDate)       { toast.error('Due date is required');   return; }

    const payload = {
      title:       form.title.trim(),
      description: form.description.trim(),
      assignedTo:  form.assignedToId || null,
      dueDate:     form.dueDate,
      priority:    PRIORITY_TO_API[form.priority] || 'medium',
    };

    if (editTask) {
      patchTask.mutate(
        { id: editTask.id, ...payload, status: STATUS_TO_API[form.status] || 'pending' },
        { onSuccess: closeModal },
      );
    } else {
      createTask.mutate(payload, { onSuccess: closeModal });
    }
  };

  /* ── Mark complete ─────────────────────────────── */
  const markComplete = (id) => completeTask.mutate(id);

  /* ── Delete ────────────────────────────────────── */
  const deleteTask = (id) => {
    if (!window.confirm('Delete this task?')) return;
    removeTask.mutate(id);
  };

  /* ── Tab config ────────────────────────────────── */
  const TABS = [
    { label: 'All',         count: total      },
    { label: 'Pending',     count: pending    },
    { label: 'In Progress', count: inProgress },
    { label: 'Completed',   count: completed  },
  ];

  /* ── Stat cards config ─────────────────────────── */
  const STATS = [
    {
      label:    'Total Tasks',
      value:    total,
      icon:     CheckSquare,
      gradient: 'linear-gradient(135deg,#0F4C45,#0F766E)',
      shadow:   '#0F766E',
    },
    {
      label:    'Pending',
      value:    pending,
      icon:     AlertCircle,
      gradient: 'linear-gradient(135deg,#B45309,#D97706)',
      shadow:   '#D97706',
    },
    {
      label:    'In Progress',
      value:    inProgress,
      icon:     Clock,
      gradient: 'linear-gradient(135deg,#1D4ED8,#3B82F6)',
      shadow:   '#3B82F6',
    },
    {
      label:    'Completed',
      value:    completed,
      icon:     CheckCircle,
      gradient: 'linear-gradient(135deg,#059669,#10B981)',
      shadow:   '#10B981',
    },
  ];

  return (
    <div className="page-content fade-up">

      {/* ── IlmForge Task Board Header ──────────────── */}
      <div className="ilm-page-header ilm-animate" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="ilm-page-title">📌 Task Board</h1>
          <p className="ilm-page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              background: 'linear-gradient(135deg,#1B2F6E,#0073b7)',
              color: 'white', fontSize: 10, fontWeight: 800,
              padding: '2px 8px', borderRadius: 999, letterSpacing: 0.5,
            }}>
              ilmفورج Task Manager
            </span>
            <span style={{ opacity: 0.85 }}>Assign and track school tasks across all staff</span>
          </p>
        </div>
        <button
          style={{
            background: 'linear-gradient(135deg,#1B2F6E,#0073b7)',
            color: 'white', border: 'none', borderRadius: 10,
            padding: '10px 18px', fontWeight: 700, fontSize: 13,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '0 4px 14px rgba(27,47,110,0.30)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 22px rgba(27,47,110,0.38)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 14px rgba(27,47,110,0.30)'; }}
          onClick={openAdd}
        >
          <Plus size={15} /> Add Task
          {pending > 0 && (
            <span style={{
              marginLeft: 2,
              background: '#EF4444',
              color: '#fff',
              borderRadius: '50%',
              fontSize: 10,
              fontWeight: 800,
              minWidth: 18,
              height: 18,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
            }}>
              {pending}
            </span>
          )}
        </button>
      </div>

      {/* ── Kanban-style status legend with IlmForge navy theme ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Pending', color: '#D97706', bg: '#FEF3C7' },
          { label: 'In Progress', color: '#1B2F6E', bg: '#EFF6FF' },
          { label: 'Completed', color: '#059669', bg: '#D1FAE5' },
        ].map(col => (
          <div key={col.label} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: col.bg, borderRadius: 8,
            padding: '5px 12px', fontSize: 12, fontWeight: 700, color: col.color,
            border: `1px solid ${col.color}33`,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, display: 'inline-block' }} />
            {col.label}
          </div>
        ))}
      </div>

      {/* ── Stat Cards ─────────────────────────────── */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {STATS.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="kpi-card"
              style={{ background: s.gradient, boxShadow: `0 6px 20px ${s.shadow}30`, cursor: 'default' }}
            >
              <div style={{ position: 'absolute', right: 16, top: 16, width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={22} color="rgba(255,255,255,0.95)" />
              </div>
              <div className="kpi-value">{s.value}</div>
              <div className="kpi-label">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* ── Filter Tabs + Table Card ─────────────────── */}
      <div className="card" style={{ padding: 0 }}>

        {/* Tabs header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderBottom: '1px solid #F3F4F6', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', gap: 0 }}>
            {TABS.map((tab) => {
              const active = filter === tab.label;
              return (
                <button
                  key={tab.label}
                  onClick={() => setFilter(tab.label)}
                  style={{
                    padding: '13px 16px',
                    border: 'none',
                    borderBottom: active ? '2px solid #0F766E' : '2px solid transparent',
                    background: 'none',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    color: active ? '#0F766E' : '#6B7280',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    whiteSpace: 'nowrap',
                    transition: 'color 0.13s',
                  }}
                >
                  {tab.label}
                  <span style={{
                    background: active ? '#0F766E' : '#E5E7EB',
                    color: active ? '#fff' : '#6B7280',
                    borderRadius: 20,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 7px',
                    minWidth: 20,
                    textAlign: 'center',
                  }}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
          <span style={{ fontSize: 12, color: '#9CA3AF', padding: '13px 0' }}>
            {visible.length} {visible.length === 1 ? 'task' : 'tasks'}
          </span>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="empty-state" style={{ padding: 60 }}>
            <div className="empty-state-text">Loading tasks…</div>
          </div>
        ) : isError ? (
          <div className="empty-state" style={{ padding: 60 }}>
            <div className="empty-state-icon">
              <AlertCircle size={40} color="#EF4444" />
            </div>
            <div className="empty-state-text">Could not load tasks</div>
            <div className="empty-state-sub">{error?.response?.data?.message || 'Please try again.'}</div>
          </div>
        ) : visible.length === 0 ? (
          <div className="empty-state" style={{ padding: 60 }}>
            <div className="empty-state-icon">
              <CheckSquare size={40} color="#D1D5DB" />
            </div>
            <div className="empty-state-text">No tasks found</div>
            <div className="empty-state-sub">
              {filter === 'All' ? 'Click "Add Task" to create your first task.' : `No ${filter.toLowerCase()} tasks at the moment.`}
            </div>
            {filter !== 'All' && (
              <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={() => setFilter('All')}>
                View All Tasks
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Title</th>
                  <th>Assigned To</th>
                  <th>Due Date</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th style={{ width: 140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((task, index) => {
                  const pStyle  = priorityStyle[task.priority]  || priorityStyle.Medium;
                  const stStyle = statusStyle[task.status] || statusStyle.Pending;
                  const overdue = task.status !== 'Completed' && isDue(task.dueDate);

                  return (
                    <tr key={task.id}>
                      <td style={{ color: '#9CA3AF', fontSize: 12, fontWeight: 600 }}>
                        {index + 1}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0F4C45', fontSize: 13, marginBottom: task.description ? 2 : 0 }}>
                          {task.title}
                        </div>
                        {task.description && (
                          <div style={{ fontSize: 11.5, color: '#9CA3AF', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {task.description}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F0FDFA', border: '1px solid #99F6E4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <User size={13} color="#0F766E" />
                          </div>
                          <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>
                            {task.assignedTo?.name || '—'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: 13, color: overdue ? '#DC2626' : '#374151', fontWeight: overdue ? 700 : 400 }}>
                          {fmtDate(task.dueDate)}
                          {overdue && (
                            <span style={{ marginLeft: 4, fontSize: 10, background: '#FEE2E2', color: '#991B1B', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>
                              Overdue
                            </span>
                          )}
                        </span>
                      </td>
                      <td>
                        <span className="badge" style={{ ...pStyle, borderRadius: 20, fontSize: 11, fontWeight: 700, padding: '3px 10px' }}>
                          {task.priority}
                        </span>
                      </td>
                      <td>
                        <span className="badge" style={{ ...stStyle, borderRadius: 20, fontSize: 11, fontWeight: 700, padding: '3px 10px' }}>
                          {task.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                          {task.status !== 'Completed' && (
                            <button
                              title="Mark as completed"
                              onClick={() => markComplete(task.id)}
                              style={{ background: '#D1FAE5', border: 'none', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#065F46' }}
                            >
                              <CheckCircle size={14} />
                            </button>
                          )}
                          <button
                            title="Edit task"
                            onClick={() => openEdit(task)}
                            style={{ background: '#EFF6FF', border: 'none', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#1D4ED8' }}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            title="Delete task"
                            onClick={() => deleteTask(task.id)}
                            style={{ background: '#FEE2E2', border: 'none', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#DC2626' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          ADD / EDIT MODAL
      ══════════════════════════════════════════════ */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ width: 540 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: '#F0FDFA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {editTask ? <Edit2 size={17} color="#0F766E" /> : <Plus size={17} color="#0F766E" />}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F4C45' }}>
                    {editTask ? 'Edit Task' : 'Add New Task'}
                  </h3>
                  <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>
                    {editTask ? 'Update task details below' : 'Fill in the task details below'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 20, lineHeight: 1, padding: 4 }}
              >
                &times;
              </button>
            </div>

            <div className="modal-body">
              {/* Title */}
              <div style={{ marginBottom: 14 }}>
                <label htmlFor="task-title" style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                  Task Title <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  id="task-title"
                  className="form-input"
                  placeholder="e.g. Prepare exam schedule"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>

              {/* Description */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                  Description
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                  placeholder="Brief description of the task..."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>

              {/* Assign To */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                  Assign To (Staff)
                </label>
                <select
                  id="task-assignee"
                  className="form-select"
                  value={form.assignedToId}
                  onChange={(e) => handleStaffChange(e.target.value)}
                >
                  <option value="">-- Select Staff Member --</option>
                  {/* value is the linked user id: that is what the task API
                      assigns against, and staff without a login cannot be
                      assigned a task at all. */}
                  {staffList.filter((s) => s.userId).map((s) => (
                    <option key={s.id} value={s.userId}>
                      {s.name || `Staff #${s.id}`}
                      {s.designation ? ` — ${s.designation}` : ''}
                    </option>
                  ))}
                  {staffList.length === 0 && (
                    <option value="" disabled>No staff loaded — type name below</option>
                  )}
                </select>
                {/* Manual name fallback if no staff from API */}
                {!form.assignedToId && (
                  <input
                    className="form-input"
                    style={{ marginTop: 7 }}
                    placeholder="Or type name manually"
                    value={form.assignedToName}
                    onChange={(e) => setForm((f) => ({ ...f, assignedToName: e.target.value }))}
                  />
                )}
              </div>

              {/* Due Date + Priority row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label htmlFor="task-due" style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                    Due Date <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    id="task-due"
                    type="date"
                    className="form-input"
                    value={form.dueDate}
                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                    Priority
                  </label>
                  <select
                    className="form-select"
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              {/* Status */}
              <div style={{ marginBottom: 4 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                  Status
                </label>
                <select
                  className="form-select"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn-teal" onClick={handleSave} disabled={saving}>
                {saving
                  ? 'Saving...'
                  : editTask
                    ? 'Update Task'
                    : 'Add Task'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
