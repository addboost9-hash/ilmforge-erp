import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { LibraryBig, BookOpen, RefreshCw } from 'lucide-react';

export default function LibraryManagementPage() {
  const qc = useQueryClient();

  const [book, setBook] = useState({ title: '', author: '', category: '', totalCopies: 1, issueDays: 14, finePerDay: 20 });
  const [issue, setIssue] = useState({ bookId: '', staffId: '', dueDate: '' });

  const booksQ = useQuery({ queryKey: ['library-books'], queryFn: () => api.get('/library/books?page=1&limit=30').then((r) => r.data), staleTime: 15_000 });
  const issuesQ = useQuery({ queryKey: ['library-issues'], queryFn: () => api.get('/library/issues?page=1&limit=30').then((r) => r.data), staleTime: 15_000 });
  const staffQ = useQuery({ queryKey: ['library-staff'], queryFn: () => api.get('/staff?limit=100').then((r) => r.data), staleTime: 30_000 });

  const createBook = useMutation({
    mutationFn: () => api.post('/library/books', {
      title: book.title,
      author: book.author || undefined,
      category: book.category || undefined,
      totalCopies: parseInt(book.totalCopies, 10),
      issueDays: parseInt(book.issueDays, 10),
      finePerDay: parseInt(book.finePerDay, 10),
    }),
    onSuccess: () => {
      toast.success('Book created.');
      setBook({ title: '', author: '', category: '', totalCopies: 1, issueDays: 14, finePerDay: 20 });
      qc.invalidateQueries({ queryKey: ['library-books'] });
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Could not create book.'),
  });

  const issueBook = useMutation({
    mutationFn: () => api.post('/library/issues', {
      bookId: parseInt(issue.bookId, 10),
      staffId: issue.staffId ? parseInt(issue.staffId, 10) : undefined,
      dueDate: issue.dueDate || undefined,
    }),
    onSuccess: () => {
      toast.success('Book issued.');
      setIssue({ bookId: '', staffId: '', dueDate: '' });
      qc.invalidateQueries({ queryKey: ['library-books'] });
      qc.invalidateQueries({ queryKey: ['library-issues'] });
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Could not issue book.'),
  });

  const returnBook = useMutation({
    mutationFn: (id) => api.post(`/library/issues/${id}/return`, {}),
    onSuccess: (res, id) => {
      const fine = res?.data?.fineAmount || 0;
      toast.success(fine > 0 ? `Returned with fine Rs. ${fine}` : 'Book returned.');
      qc.invalidateQueries({ queryKey: ['library-books'] });
      qc.invalidateQueries({ queryKey: ['library-issues'] });
      if (fine > 0) {
        api.post(`/library/issues/${id}/fine/collect`, { amount: fine }).then(() => {
          toast.success('Fine collected.');
          qc.invalidateQueries({ queryKey: ['library-issues'] });
        }).catch(() => null);
      }
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Could not return book.'),
  });

  const books = booksQ.data?.data || [];
  const issues = issuesQ.data?.data || [];
  const staff = staffQ.data?.data || [];

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LibraryBig size={18} color="#15803D" />
          </div>
          <div>
            <div style={{ fontWeight: 800, color: '#0F172A', fontSize: 18 }}>Library Management</div>
            <div style={{ color: '#64748B', fontSize: 12 }}>Catalog, issue/return, and fines</div>
          </div>
        </div>
        <button onClick={() => { booksQ.refetch(); issuesQ.refetch(); }} style={{ border: '1px solid #CBD5E1', background: '#fff', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <section style={card}>
          <div style={title}>Add Book</div>
          <div style={grid3}>
            <input placeholder="Title" value={book.title} onChange={(e) => setBook((p) => ({ ...p, title: e.target.value }))} style={inputStyle} />
            <input placeholder="Author" value={book.author} onChange={(e) => setBook((p) => ({ ...p, author: e.target.value }))} style={inputStyle} />
            <input placeholder="Category" value={book.category} onChange={(e) => setBook((p) => ({ ...p, category: e.target.value }))} style={inputStyle} />
            <input placeholder="Copies" type="number" value={book.totalCopies} onChange={(e) => setBook((p) => ({ ...p, totalCopies: e.target.value }))} style={inputStyle} />
            <input placeholder="Issue Days" type="number" value={book.issueDays} onChange={(e) => setBook((p) => ({ ...p, issueDays: e.target.value }))} style={inputStyle} />
            <input placeholder="Fine/Day" type="number" value={book.finePerDay} onChange={(e) => setBook((p) => ({ ...p, finePerDay: e.target.value }))} style={inputStyle} />
          </div>
          <button
            style={btn('#15803D')}
            disabled={createBook.isPending}
            onClick={() => {
              if (!book.title.trim()) return toast.error('Title is required.');
              createBook.mutate();
            }}
          >
            {createBook.isPending ? 'Saving...' : 'Create Book'}
          </button>
        </section>

        <section style={card}>
          <div style={title}>Issue Book</div>
          <div style={grid3}>
            <select value={issue.bookId} onChange={(e) => setIssue((p) => ({ ...p, bookId: e.target.value }))} style={inputStyle}>
              <option value="">Select Book</option>
              {books.map((b) => <option key={b.id} value={b.id}>{b.title} ({b.availableCopies})</option>)}
            </select>
            <select value={issue.staffId} onChange={(e) => setIssue((p) => ({ ...p, staffId: e.target.value }))} style={inputStyle}>
              <option value="">Select Staff</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input type="datetime-local" value={issue.dueDate} onChange={(e) => setIssue((p) => ({ ...p, dueDate: e.target.value }))} style={inputStyle} />
          </div>
          <button
            style={btn('#0D9488')}
            disabled={issueBook.isPending}
            onClick={() => {
              if (!issue.bookId || !issue.staffId) return toast.error('Book and staff are required.');
              issueBook.mutate();
            }}
          >
            {issueBook.isPending ? 'Issuing...' : 'Issue'}
          </button>
        </section>
      </div>

      <section style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={title}>Current Issues</div>
          <div style={{ color: '#64748B', fontSize: 12 }}>{issues.length} records</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['Book ID', 'Staff ID', 'Due', 'Status', 'Fine', 'Action'].map((h) => <th key={h} style={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {issues.map((i) => (
                <tr key={i.id}>
                  <td style={td}>{i.bookId}</td>
                  <td style={td}>{i.staffId || '-'}</td>
                  <td style={td}>{new Date(i.dueDate).toLocaleString()}</td>
                  <td style={td}><span style={{ background: i.status === 'issued' ? '#FEF3C7' : '#DCFCE7', color: i.status === 'issued' ? '#B45309' : '#15803D', padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{i.status}</span></td>
                  <td style={td}>{i.fineAmount || 0}</td>
                  <td style={td}>
                    <button style={chip('#1D4ED8')} disabled={i.status !== 'issued' || returnBook.isPending} onClick={() => returnBook.mutate(i.id)}>Return</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ ...card, marginTop: 12 }}>
        <div style={title}>Books</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8 }}>
          {books.map((b) => (
            <div key={b.id} style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <BookOpen size={14} color="#2563EB" />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{b.title}</span>
              </div>
              <div style={{ fontSize: 11, color: '#64748B' }}>{b.author || 'Unknown'} | {b.category || 'General'}</div>
              <div style={{ marginTop: 6, fontSize: 11, color: '#334155' }}>Available: {b.availableCopies}/{b.totalCopies}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const card = { background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 16 };
const title = { fontSize: 14, fontWeight: 800, color: '#0F172A', marginBottom: 8 };
const grid3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 };
const inputStyle = { border: '1px solid #CBD5E1', borderRadius: 8, padding: '9px 10px', fontSize: 13, outline: 'none' };
const th = { textAlign: 'left', padding: '10px 8px', fontSize: 11, color: '#64748B', fontWeight: 700, borderBottom: '1px solid #E2E8F0' };
const td = { padding: '10px 8px', fontSize: 12.5, color: '#1F2937', borderBottom: '1px solid #F1F5F9' };
const btn = (bg) => ({ border: 'none', background: bg, color: '#fff', borderRadius: 8, padding: '8px 12px', fontWeight: 700, cursor: 'pointer' });
const chip = (c) => ({ border: `1px solid ${c}33`, background: `${c}15`, color: c, borderRadius: 999, fontSize: 11, padding: '4px 8px', fontWeight: 700, cursor: 'pointer' });
