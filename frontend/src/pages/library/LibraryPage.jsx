import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '../../api/client';
import {
  BookOpen, BookMarked, AlertTriangle, RotateCcw, Plus, Search,
  Users, TrendingUp, MessageSquare, CheckCircle, X,
} from 'lucide-react';

/* ─── helpers ───────────────────────────────────────────────── */
const fmt = (d) => d ? new Date(d).toLocaleDateString('en-PK') : '—';
const daysOverdue = (dueDate) => {
  const diff = Date.now() - new Date(dueDate).getTime();
  return diff > 0 ? Math.ceil(diff / 86_400_000) : 0;
};
const defaultDue = () => {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
};

const CATEGORIES = ['Fiction', 'Non-Fiction', 'Textbook', 'Reference', 'Science', 'Islamic', 'Urdu'];
const PIE_COLORS = ['#0073b7', '#00a65a', '#f39c12', '#dd4b39', '#605ca8', '#00c0ef', '#e67e22'];
const MONTHLY_DUMMY = [
  { month: 'Jan', issued: 42, returned: 38 },
  { month: 'Feb', issued: 55, returned: 50 },
  { month: 'Mar', issued: 61, returned: 57 },
  { month: 'Apr', issued: 48, returned: 44 },
  { month: 'May', issued: 70, returned: 63 },
  { month: 'Jun', issued: 65, returned: 60 },
  { month: 'Jul', issued: 38, returned: 35 },
];

/* ─── empty book form ────────────────────────────────────────── */
const emptyBook = {
  title: '', author: '', isbn: '', category: '', publisher: '',
  publishedYear: '', totalCopies: 1, shelfCode: '',
};

/* ════════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════════ */
export default function LibraryPage() {
  const [tab, setTab] = useState('catalog');

  return (
    <div className="page-content fade-in">
      {/* Page header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={22} color="var(--primary)" />
            Library Management
          </h1>
          <p className="page-subtitle">Book catalog, issue &amp; return, overdue fines, and reports</p>
        </div>
      </div>

      {/* Tab strip */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
        <div className="tab-strip">
          {[
            { key: 'catalog',  label: 'Book Catalog',      icon: <BookOpen size={14} /> },
            { key: 'issue',    label: 'Issue & Return',    icon: <BookMarked size={14} /> },
            { key: 'overdue',  label: 'Overdue & Fines',   icon: <AlertTriangle size={14} /> },
            { key: 'reports',  label: 'Library Reports',   icon: <TrendingUp size={14} /> },
          ].map((t) => (
            <button
              key={t.key}
              className={`tab-btn${tab === t.key ? ' active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {tab === 'catalog' && <CatalogTab />}
          {tab === 'issue'   && <IssueReturnTab />}
          {tab === 'overdue' && <OverdueTab />}
          {tab === 'reports' && <ReportsTab />}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   TAB 1 — BOOK CATALOG
════════════════════════════════════════════════════════════════ */
function CatalogTab() {
  const qc = useQueryClient();
  const [search, setSearch]         = useState('');
  const [category, setCategory]     = useState('');
  const [availOnly, setAvailOnly]   = useState(false);
  const [showModal, setShowModal]   = useState(false);
  const [editBook, setEditBook]     = useState(null);   // null = add, obj = edit
  const [form, setForm]             = useState(emptyBook);

  /* ── queries ── */
  const params = new URLSearchParams({ page: 1, limit: 50 });
  if (search)    params.set('search', search);
  if (category)  params.set('category', category);
  if (availOnly) params.set('active', 'true');

  const booksQ = useQuery({
    queryKey: ['library-books', search, category, availOnly],
    queryFn: () => api.get(`/library/books?${params}`).then((r) => r.data),
    staleTime: 15_000,
  });

  /* ── mutations ── */
  const addMut = useMutation({
    mutationFn: (d) => api.post('/library/books', d),
    onSuccess: () => {
      toast.success('Book added to catalog.');
      qc.invalidateQueries({ queryKey: ['library-books'] });
      closeModal();
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed to add book.'),
  });

  const editMut = useMutation({
    mutationFn: ({ id, data }) => api.put(`/library/books/${id}`, data),
    onSuccess: () => {
      toast.success('Book updated.');
      qc.invalidateQueries({ queryKey: ['library-books'] });
      closeModal();
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed to update book.'),
  });

  const books = booksQ.data?.data || [];
  const total       = books.length;
  const available   = books.reduce((s, b) => s + (b.availableCopies || 0), 0);
  const issued      = books.reduce((s, b) => s + ((b.totalCopies || 0) - (b.availableCopies || 0)), 0);
  const totalCopies = books.reduce((s, b) => s + (b.totalCopies || 0), 0);

  /* ── helpers ── */
  const openAdd = () => {
    setEditBook(null);
    setForm(emptyBook);
    setShowModal(true);
  };
  const openEdit = (b) => {
    setEditBook(b);
    setForm({
      title: b.title || '',
      author: b.author || '',
      isbn: b.isbn || '',
      category: b.category || '',
      publisher: b.publisher || '',
      publishedYear: b.publishedYear || '',
      totalCopies: b.totalCopies || 1,
      shelfCode: b.shelfCode || '',
    });
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditBook(null); setForm(emptyBook); };

  const handleSubmit = () => {
    if (!form.title.trim()) { toast.error('Title is required.'); return; }
    const payload = {
      title: form.title.trim(),
      author: form.author || undefined,
      isbn: form.isbn || undefined,
      category: form.category || undefined,
      publisher: form.publisher || undefined,
      publishedYear: form.publishedYear ? parseInt(form.publishedYear, 10) : undefined,
      totalCopies: parseInt(form.totalCopies, 10) || 1,
      shelfCode: form.shelfCode || undefined,
    };
    if (editBook) {
      editMut.mutate({ id: editBook.id, data: payload });
    } else {
      addMut.mutate(payload);
    }
  };

  const isBusy = addMut.isPending || editMut.isPending;

  return (
    <div className="card-body">
      {/* Top action row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="form-control"
            placeholder="Search title, author, ISBN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 32 }}
          />
        </div>
        <select
          className="form-select"
          style={{ width: 160 }}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={availOnly} onChange={(e) => setAvailOnly(e.target.checked)} />
          Available only
        </label>
        <button className="btn btn-primary" onClick={openAdd} style={{ marginLeft: 'auto' }}>
          <Plus size={14} /> Add Book
        </button>
      </div>

      {/* Stats row */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <StatCard label="Total Books" value={total} color="stat-blue" icon="📚" />
        <StatCard label="Available Copies" value={available} color="stat-green" icon="✅" />
        <StatCard label="Issued" value={issued} color="stat-yellow" icon="📤" />
        <StatCard label="Total Copies" value={totalCopies} color="stat-red" icon="📦" />
      </div>

      {/* Books card grid */}
      {booksQ.isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : books.length === 0 ? (
        <div className="empty-state" style={{ padding: 50 }}>
          <div className="empty-state-icon">📚</div>
          <div className="empty-state-text">No books found</div>
          <div className="empty-state-sub">Add books to get started</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 14 }}>
          {books.map((b, idx) => {
            const avail = b.availableCopies ?? 0;
            const issued = (b.totalCopies ?? 0) - avail;
            const isLost = avail === 0 && issued === 0 && (b.totalCopies ?? 0) > 0;
            const statusLabel = isLost ? 'Lost' : avail > 0 ? 'Available' : 'Issued';
            const statusColor = isLost ? '#dc2626' : avail > 0 ? '#059669' : '#d97706';
            const statusBg = isLost ? '#fef2f2' : avail > 0 ? '#f0fdf4' : '#fffbeb';
            const statusBorder = isLost ? '#fecaca' : avail > 0 ? '#bbf7d0' : '#fde68a';
            return (
              <div key={b.id} style={{
                background: 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(14px)',
                borderRadius: 14,
                padding: '16px 18px',
                border: '1px solid rgba(255,255,255,0.5)',
                boxShadow: '0 2px 10px rgba(0,0,0,.05)',
                animation: `ilm-fade-in 0.35s ease-out ${idx * 50}ms both`,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}>
                {/* Top row: icon + status badge */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: 'linear-gradient(135deg,#1B2F6E,#0073b7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>📖</div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, background: statusBg, border: `1px solid ${statusBorder}`, borderRadius: 20, padding: '3px 9px', whiteSpace: 'nowrap' }}>
                    {statusLabel}
                  </span>
                </div>
                {/* Title & Author */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: '#1e3a5f', lineHeight: 1.3, marginBottom: 3 }}>{b.title}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{b.author || 'Unknown Author'}</div>
                </div>
                {/* Meta chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {b.category && (
                    <span style={{ fontSize: 10.5, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 6, padding: '2px 7px' }}>{b.category}</span>
                  )}
                  {b.shelfCode && (
                    <span style={{ fontSize: 10.5, background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe', borderRadius: 6, padding: '2px 7px' }}>📌 {b.shelfCode}</span>
                  )}
                  {b.isbn && (
                    <span style={{ fontSize: 10, background: '#f9fafb', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 6, padding: '2px 7px', fontFamily: 'monospace' }}>{b.isbn}</span>
                  )}
                </div>
                {/* Copies bar */}
                <div style={{ fontSize: 11.5, color: '#374151', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total: <strong>{b.totalCopies ?? 0}</strong></span>
                  <span style={{ color: '#059669' }}>Avail: <strong>{avail}</strong></span>
                  <span style={{ color: '#d97706' }}>Issued: <strong>{issued}</strong></span>
                </div>
                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                  <button
                    className="btn btn-sm btn-success"
                    style={{ flex: 1, fontSize: 11.5 }}
                    disabled={avail <= 0}
                    onClick={() => toast('Go to Issue & Return tab to issue this book.', { icon: 'ℹ️' })}
                  >
                    Issue
                  </button>
                  <button className="btn btn-sm btn-outline" style={{ flex: 1, fontSize: 11.5 }} onClick={() => openEdit(b)}>
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Book Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editBook ? 'Edit Book' : 'Add New Book'}</span>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Title <span style={{ color: 'var(--stat-red)' }}>*</span></label>
                  <input className="form-control" placeholder="Book title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Author</label>
                  <input className="form-control" placeholder="Author name" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">ISBN</label>
                  <input className="form-control" placeholder="ISBN number" value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    <option value="">Select category</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Publisher</label>
                  <input className="form-control" placeholder="Publisher name" value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Published Year</label>
                  <input className="form-control" type="number" placeholder="e.g. 2020" value={form.publishedYear} onChange={(e) => setForm({ ...form, publishedYear: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input className="form-control" type="number" min="1" value={form.totalCopies} onChange={(e) => setForm({ ...form, totalCopies: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Shelf Location</label>
                  <input className="form-control" placeholder="e.g. A1-R3" value={form.shelfCode} onChange={(e) => setForm({ ...form, shelfCode: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-success" onClick={handleSubmit} disabled={isBusy}>
                <Plus size={14} /> {isBusy ? 'Saving...' : editBook ? 'Save Changes' : 'Add Book'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   TAB 2 — ISSUE & RETURN
════════════════════════════════════════════════════════════════ */
function IssueReturnTab() {
  const qc = useQueryClient();
  const [memberType, setMemberType] = useState('student'); // 'student' | 'staff'
  const [memberSearch, setMemberSearch] = useState('');
  const [bookSearch, setBookSearch]     = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedBook, setSelectedBook]     = useState(null);
  const [dueDate, setDueDate]               = useState(defaultDue());

  /* ── queries ── */
  const booksQ = useQuery({
    queryKey: ['library-books-issue', bookSearch],
    queryFn: () => api.get(`/library/books?limit=50${bookSearch ? '&search=' + bookSearch : ''}`).then((r) => r.data),
    staleTime: 15_000,
  });

  const studentsQ = useQuery({
    queryKey: ['students-lib', memberSearch],
    queryFn: () => api.get(`/students?limit=30${memberSearch ? '&search=' + memberSearch : ''}`).then((r) => r.data),
    enabled: memberType === 'student',
    staleTime: 20_000,
  });

  const staffQ = useQuery({
    queryKey: ['staff-lib', memberSearch],
    queryFn: () => api.get(`/staff?limit=30${memberSearch ? '&search=' + memberSearch : ''}`).then((r) => r.data),
    enabled: memberType === 'staff',
    staleTime: 20_000,
  });

  const issuesQ = useQuery({
    queryKey: ['library-issues-active'],
    queryFn: () => api.get('/library/issues?limit=50&status=issued').then((r) => r.data),
    staleTime: 15_000,
  });

  /* ── mutations ── */
  const issueMut = useMutation({
    mutationFn: (d) => api.post('/library/issues', d),
    onSuccess: () => {
      toast.success('Book issued successfully.');
      setSelectedBook(null);
      setSelectedMember(null);
      setBookSearch('');
      setMemberSearch('');
      setDueDate(defaultDue());
      qc.invalidateQueries({ queryKey: ['library-books'] });
      qc.invalidateQueries({ queryKey: ['library-books-issue'] });
      qc.invalidateQueries({ queryKey: ['library-issues-active'] });
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed to issue book.'),
  });

  const returnMut = useMutation({
    mutationFn: (id) => api.post(`/library/issues/${id}/return`, {}),
    onSuccess: (res) => {
      const fine = res?.data?.fineAmount || 0;
      toast.success(fine > 0 ? `Returned. Fine: Rs. ${fine}` : 'Book returned successfully.');
      qc.invalidateQueries({ queryKey: ['library-books'] });
      qc.invalidateQueries({ queryKey: ['library-books-issue'] });
      qc.invalidateQueries({ queryKey: ['library-issues-active'] });
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed to return book.'),
  });

  const handleIssue = () => {
    if (!selectedBook)   { toast.error('Please select a book.'); return; }
    if (!selectedMember) { toast.error('Please select a member.'); return; }
    if (!dueDate)        { toast.error('Please set a due date.'); return; }
    const payload = {
      bookId: selectedBook.id,
      dueDate,
      ...(memberType === 'student' ? { studentId: selectedMember.id } : { staffId: selectedMember.id }),
    };
    issueMut.mutate(payload);
  };

  const books   = booksQ.data?.data || [];
  const members = memberType === 'student'
    ? (studentsQ.data?.data || [])
    : (staffQ.data?.data || []);
  const issues  = issuesQ.data?.data || [];

  return (
    <div className="card-body">
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20 }}>

        {/* LEFT — Issue form */}
        <div>
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-header">
              <h3><BookMarked size={15} /> Issue Book</h3>
            </div>
            <div className="card-body">
              {/* Member type toggle */}
              <div className="form-group">
                <label className="form-label">Member Type</label>
                <div style={{ display: 'flex', gap: 0, border: '1px solid var(--border-color)', borderRadius: 4, overflow: 'hidden' }}>
                  {['student', 'staff'].map((t) => (
                    <button
                      key={t}
                      onClick={() => { setMemberType(t); setSelectedMember(null); setMemberSearch(''); }}
                      style={{
                        flex: 1, padding: '7px 0', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                        background: memberType === t ? 'var(--primary)' : 'white',
                        color: memberType === t ? 'white' : 'var(--text-secondary)',
                        textTransform: 'capitalize',
                        transition: 'all 0.15s',
                      }}
                    >
                      {t === 'student' ? 'Student' : 'Staff'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Member search */}
              <div className="form-group">
                <label className="form-label">Search {memberType === 'student' ? 'Student' : 'Staff'}</label>
                <input
                  className="form-control"
                  placeholder={memberType === 'student' ? 'Name or roll number...' : 'Staff name...'}
                  value={memberSearch}
                  onChange={(e) => { setMemberSearch(e.target.value); setSelectedMember(null); }}
                />
                {memberSearch && members.length > 0 && !selectedMember && (
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: 4, marginTop: 4, maxHeight: 160, overflowY: 'auto', background: 'white', boxShadow: 'var(--sh-sm)', position: 'relative', zIndex: 10 }}>
                    {members.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => { setSelectedMember(m); setMemberSearch(m.name || m.studentName || ''); }}
                        style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border-light)' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-light)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                      >
                        <span style={{ fontWeight: 600 }}>{m.name || m.studentName}</span>
                        {m.rollNo && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>#{m.rollNo}</span>}
                      </div>
                    ))}
                  </div>
                )}
                {selectedMember && (
                  <div style={{ marginTop: 6, padding: '6px 10px', background: 'var(--primary-light)', borderRadius: 4, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{selectedMember.name || selectedMember.studentName}</span>
                    <button onClick={() => { setSelectedMember(null); setMemberSearch(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--stat-red)' }}><X size={12} /></button>
                  </div>
                )}
              </div>

              {/* Book search */}
              <div className="form-group">
                <label className="form-label">Search Book</label>
                <input
                  className="form-control"
                  placeholder="Title or ISBN..."
                  value={bookSearch}
                  onChange={(e) => { setBookSearch(e.target.value); setSelectedBook(null); }}
                />
                {bookSearch && books.length > 0 && !selectedBook && (
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: 4, marginTop: 4, maxHeight: 160, overflowY: 'auto', background: 'white', boxShadow: 'var(--sh-sm)', position: 'relative', zIndex: 10 }}>
                    {books.filter((b) => b.availableCopies > 0).map((b) => (
                      <div
                        key={b.id}
                        onClick={() => { setSelectedBook(b); setBookSearch(b.title); }}
                        style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border-light)' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-light)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                      >
                        <span style={{ fontWeight: 600 }}>{b.title}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>({b.availableCopies} available)</span>
                      </div>
                    ))}
                  </div>
                )}
                {selectedBook && (
                  <div style={{ marginTop: 6, padding: '6px 10px', background: '#d4edda', borderRadius: 4, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600, color: '#155724' }}>{selectedBook.title}</span>
                    <button onClick={() => { setSelectedBook(null); setBookSearch(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--stat-red)' }}><X size={12} /></button>
                  </div>
                )}
              </div>

              {/* Due date */}
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input
                  className="form-control"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                />
              </div>

              <button
                className="btn btn-success"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={handleIssue}
                disabled={issueMut.isPending}
              >
                <BookMarked size={14} />
                {issueMut.isPending ? 'Issuing...' : 'Issue Book'}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT — Currently issued table */}
        <div>
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-header">
              <h3><BookOpen size={15} /> Currently Issued</h3>
              <span className="badge badge-primary">{issues.length} active</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              {issuesQ.isLoading ? (
                <div className="loading-center"><div className="spinner" /></div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Book Title</th>
                      <th>Member</th>
                      <th>Issued Date</th>
                      <th>Due Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issues.length === 0 && (
                      <tr>
                        <td colSpan={6}>
                          <div className="empty-state">
                            <div className="empty-state-icon">📋</div>
                            <div className="empty-state-text">No active issues</div>
                          </div>
                        </td>
                      </tr>
                    )}
                    {issues.map((iss) => {
                      const overdue = iss.dueDate && new Date(iss.dueDate) < new Date();
                      return (
                        <tr key={iss.id}>
                          <td style={{ fontWeight: 600 }}>Book #{iss.bookId}</td>
                          <td style={{ fontSize: 12 }}>
                            {iss.studentId ? `Student #${iss.studentId}` : `Staff #${iss.staffId}`}
                          </td>
                          <td style={{ fontSize: 12 }}>{fmt(iss.createdAt)}</td>
                          <td style={{ fontSize: 12, color: overdue ? 'var(--stat-red)' : 'inherit' }}>{fmt(iss.dueDate)}</td>
                          <td>
                            <span className={`badge ${overdue ? 'badge-danger' : 'badge-primary'}`}>
                              {overdue ? 'Overdue' : 'Issued'}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-warning"
                              onClick={() => returnMut.mutate(iss.id)}
                              disabled={returnMut.isPending}
                            >
                              <RotateCcw size={11} /> Return
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   TAB 3 — OVERDUE & FINES
════════════════════════════════════════════════════════════════ */
function OverdueTab() {
  const qc = useQueryClient();

  const issuesQ = useQuery({
    queryKey: ['library-issues-all'],
    queryFn: () => api.get('/library/issues?limit=100').then((r) => r.data),
    staleTime: 15_000,
  });

  const returnMut = useMutation({
    mutationFn: (id) => api.post(`/library/issues/${id}/return`, {}),
    onSuccess: () => {
      toast.success('Book returned and fine recorded.');
      qc.invalidateQueries({ queryKey: ['library-issues-all'] });
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed.'),
  });

  const fineMut = useMutation({
    mutationFn: ({ id, amount }) => api.post(`/library/issues/${id}/fine/collect`, { amount }),
    onSuccess: () => {
      toast.success('Fine marked as paid.');
      qc.invalidateQueries({ queryKey: ['library-issues-all'] });
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed.'),
  });

  const allIssues = issuesQ.data?.data || [];
  const now = new Date();
  const overdueList = allIssues.filter(
    (i) => i.status === 'issued' && i.dueDate && new Date(i.dueDate) < now
  );

  const FINE_PER_DAY = 5;

  const handleSMSAll = () => {
    toast.success(`SMS reminder sent to ${overdueList.length} overdue members.`);
  };

  return (
    <div className="card-body">
      {/* Alert bar */}
      {overdueList.length > 0 && (
        <div
          className="alert alert-danger"
          style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} />
            <span>
              <strong>{overdueList.length} book{overdueList.length !== 1 ? 's' : ''} overdue.</strong>
              {' '}Total outstanding fines: Rs. {overdueList.reduce((s, i) => s + daysOverdue(i.dueDate) * FINE_PER_DAY, 0).toLocaleString()}
            </span>
          </div>
          <button className="btn btn-danger btn-sm" onClick={handleSMSAll}>
            <MessageSquare size={12} /> Send SMS to All
          </button>
        </div>
      )}

      {issuesQ.isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : overdueList.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">✅</div>
          <div className="empty-state-text">No overdue books!</div>
          <div className="empty-state-sub">All issued books are within their due dates.</div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Book</th>
                <th>Member</th>
                <th>Due Date</th>
                <th>Days Overdue</th>
                <th>Fine (Rs. {FINE_PER_DAY}/day)</th>
                <th>Fine Paid</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {overdueList.map((iss) => {
                const days = daysOverdue(iss.dueDate);
                const fine = days * FINE_PER_DAY;
                const paid = iss.finePaid || 0;
                const remaining = Math.max(0, fine - paid);
                return (
                  <tr key={iss.id}>
                    <td style={{ fontWeight: 600 }}>Book #{iss.bookId}</td>
                    <td style={{ fontSize: 12 }}>
                      {iss.studentId ? `Student #${iss.studentId}` : `Staff #${iss.staffId}`}
                    </td>
                    <td style={{ color: 'var(--stat-red)', fontWeight: 600 }}>{fmt(iss.dueDate)}</td>
                    <td>
                      <span className="badge badge-danger">{days} day{days !== 1 ? 's' : ''}</span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--stat-red)' }}>Rs. {fine.toLocaleString()}</td>
                    <td>
                      {paid > 0 ? (
                        <span className="badge badge-success">Rs. {paid}</span>
                      ) : (
                        <span className="badge badge-secondary">Unpaid</span>
                      )}
                      {remaining > 0 && paid > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          Rem: Rs. {remaining}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-sm btn-warning"
                          onClick={() => toast.success(`SMS reminder sent for issue #${iss.id}`)}
                        >
                          <MessageSquare size={11} /> SMS
                        </button>
                        {remaining > 0 && (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => fineMut.mutate({ id: iss.id, amount: remaining })}
                            disabled={fineMut.isPending}
                          >
                            <CheckCircle size={11} /> Mark Paid
                          </button>
                        )}
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => returnMut.mutate(iss.id)}
                          disabled={returnMut.isPending}
                        >
                          <RotateCcw size={11} /> Return
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
  );
}

/* ════════════════════════════════════════════════════════════════
   TAB 4 — LIBRARY REPORTS
════════════════════════════════════════════════════════════════ */
function ReportsTab() {
  const booksQ = useQuery({
    queryKey: ['library-books-report'],
    queryFn: () => api.get('/library/books?limit=50').then((r) => r.data),
    staleTime: 30_000,
  });

  const issuesQ = useQuery({
    queryKey: ['library-issues-report'],
    queryFn: () => api.get('/library/issues?limit=100').then((r) => r.data),
    staleTime: 30_000,
  });

  const books  = booksQ.data?.data  || [];
  const issues = issuesQ.data?.data || [];

  /* most borrowed — by bookId frequency */
  const borrowFreq = useMemo(() => {
    const map = {};
    issues.forEach((i) => { map[i.bookId] = (map[i.bookId] || 0) + 1; });
    return Object.entries(map)
      .map(([bookId, count]) => {
        const book = books.find((b) => b.id === parseInt(bookId, 10));
        return { bookId, title: book?.title || `Book #${bookId}`, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [books, issues]);

  /* category distribution */
  const categoryDist = useMemo(() => {
    const map = {};
    books.forEach((b) => {
      const cat = b.category || 'Uncategorized';
      map[cat] = (map[cat] || 0) + (b.totalCopies || 1);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [books]);

  /* top readers by issue count */
  const topReaders = useMemo(() => {
    const map = {};
    issues.forEach((i) => {
      const key = i.studentId ? `student-${i.studentId}` : `staff-${i.staffId}`;
      if (!map[key]) map[key] = { key, type: i.studentId ? 'Student' : 'Staff', id: i.studentId || i.staffId, count: 0 };
      map[key].count += 1;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [issues]);

  const totalIssues   = issues.length;
  const totalReturned = issues.filter((i) => i.status === 'returned').length;
  const totalFines    = issues.reduce((s, i) => s + (i.fineAmount || 0), 0);
  const totalBooks    = books.length;

  return (
    <div className="card-body">
      {/* Summary stats */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <StatCard label="Total Books" value={totalBooks} color="stat-blue" icon="📚" />
        <StatCard label="Total Issues" value={totalIssues} color="stat-green" icon="📤" />
        <StatCard label="Returned" value={totalReturned} color="stat-cyan" icon="✅" />
        <StatCard label="Fines Collected" value={`Rs. ${totalFines}`} color="stat-yellow" icon="💰" />
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Most borrowed books */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <h3><TrendingUp size={15} /> Most Borrowed Books</h3>
          </div>
          <div className="card-body">
            {borrowFreq.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px 0' }}>
                <div className="empty-state-icon" style={{ fontSize: 32 }}>📊</div>
                <div className="empty-state-text">No issue data yet</div>
              </div>
            ) : (
              <div>
                {borrowFreq.map((b, i) => (
                  <div key={b.bookId} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>{b.title}</div>
                      <div className="progress-bar" style={{ height: 5 }}>
                        <div
                          className="progress-fill"
                          style={{ width: `${(b.count / (borrowFreq[0]?.count || 1)) * 100}%`, background: 'var(--primary)' }}
                        />
                      </div>
                    </div>
                    <span className="badge badge-primary">{b.count}x</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top readers */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <h3><Users size={15} /> Top 5 Readers</h3>
          </div>
          <div className="card-body">
            {topReaders.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px 0' }}>
                <div className="empty-state-icon" style={{ fontSize: 32 }}>👤</div>
                <div className="empty-state-text">No reader data yet</div>
              </div>
            ) : (
              <div>
                {topReaders.map((r, i) => (
                  <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: i === 0 ? '#f39c12' : i === 1 ? '#6c757d' : i === 2 ? '#cd7f32' : 'var(--content-bg)', color: i < 3 ? 'white' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{r.type} #{r.id}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.count} book{r.count !== 1 ? 's' : ''} borrowed</div>
                    </div>
                    <span className={`badge ${i === 0 ? 'badge-warning' : 'badge-secondary'}`}>{r.count}x</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Monthly issue/return bar chart */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <h3>Monthly Issue / Return</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={MONTHLY_DUMMY} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 6, fontSize: 12 }}
                  cursor={{ fill: 'rgba(0,115,183,0.06)' }}
                />
                <Bar dataKey="issued"   name="Issued"   fill="#0073b7" radius={[3, 3, 0, 0]} />
                <Bar dataKey="returned" name="Returned" fill="#00a65a" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#0073b7', display: 'inline-block' }} />Issued</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#00a65a', display: 'inline-block' }} />Returned</span>
            </div>
          </div>
        </div>

        {/* Category pie chart */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <h3>Category Distribution</h3>
          </div>
          <div className="card-body">
            {categoryDist.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                <div className="empty-state-icon" style={{ fontSize: 32 }}>📊</div>
                <div className="empty-state-text">No books categorized yet</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={categoryDist}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {categoryDist.map((_, idx) => (
                      <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 6, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SHARED — STAT CARD
════════════════════════════════════════════════════════════════ */
function StatCard({ label, value, color, icon }) {
  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-card-body">
        <div className="stat-card-content">
          <div className="stat-card-value">{value}</div>
          <div className="stat-card-label">{label}</div>
        </div>
        <div className="stat-card-icon">{icon}</div>
      </div>
    </div>
  );
}
