import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import toast from 'react-hot-toast';

const NAVY = '#1B2F6E';
const LIGHT_BG = '#f0f4ff';
const cardStyle = { background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(27,47,110,0.08)', marginBottom: 20 };
const btnStyle = (color = NAVY) => ({ background: color, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 13 });
const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box' };
const labelStyle = { fontWeight: 600, fontSize: 12, color: '#374151', marginBottom: 4, display: 'block' };

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const emptyMonths = MONTH_NAMES.map(name => ({ name, topics: '', hours: '', tests: '' }));

function printScheme(scheme, months, schoolName) {
  const rows = months.map(m => `<tr><td style="padding:8px 12px;border:1px solid #d1d5db;font-weight:600">${m.name}</td><td style="padding:8px 12px;border:1px solid #d1d5db">${m.topics || '-'}</td><td style="padding:8px 12px;border:1px solid #d1d5db;text-align:center">${m.hours || '-'}</td><td style="padding:8px 12px;border:1px solid #d1d5db;text-align:center">${m.tests || '-'}</td></tr>`).join('');
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${scheme.title}</title>
  <style>body{font-family:Arial,sans-serif;margin:30px}h1{color:#1B2F6E;text-align:center}table{width:100%;border-collapse:collapse;margin-top:16px}th{background:#1B2F6E;color:#fff;padding:10px 12px}@media print{button{display:none}}</style></head>
  <body>
    <h1>${schoolName || 'School'}</h1>
    <h2 style="text-align:center;color:#374151">${scheme.title}</h2>
    <p style="text-align:center;color:#6b7280">${scheme.meta?.academicYear || ''} | Class: ${scheme.className || '-'} | Subject: ${scheme.subjectName || '-'}</p>
    <table><thead><tr><th>Month</th><th>Topics / Units</th><th>Hours</th><th>Tests / Assessments</th></tr></thead><tbody>${rows}</tbody></table>
    <button onclick="window.print()" style="position:fixed;top:16px;right:16px;background:#1B2F6E;color:#fff;padding:8px 18px;border:none;border-radius:6px;cursor:pointer;font-weight:600">Print</button>
  </body></html>`;
  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(html);
  win.document.close();
}

export default function SchemeOfStudiesPage() {
  const qc = useQueryClient();
  const [view, setView] = useState('list');
  const [form, setForm] = useState({ classId: '', subjectId: '', title: '', academicYear: '', months: emptyMonths });
  const [detail, setDetail] = useState(null);
  const [filterClass, setFilterClass] = useState('');
  const [filterSubject, setFilterSubject] = useState('');

  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then(r => r.data.data || []) });
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects-all'], queryFn: () => api.get('/classes/subjects').then(r => r.data.data || []).catch(() => []) });
  const { data: schemes = [], isLoading } = useQuery({
    queryKey: ['schemes', filterClass, filterSubject],
    queryFn: () => api.get('/scheme', { params: { classId: filterClass || undefined, subjectId: filterSubject || undefined } }).then(r => r.data.data || []),
  });
  const { data: school } = useQuery({ queryKey: ['school-profile'], queryFn: () => api.get('/settings/school').then(r => r.data.data).catch(() => ({})) });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/scheme', data),
    onSuccess: () => {
      qc.invalidateQueries(['schemes']);
      toast.success('Scheme saved!');
      setView('list');
      setForm({ classId: '', subjectId: '', title: '', academicYear: '', months: emptyMonths });
    },
    onError: () => toast.error('Failed to save'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/scheme/${id}`),
    onSuccess: () => { qc.invalidateQueries(['schemes']); toast.success('Deleted!'); },
    onError: () => toast.error('Failed to delete'),
  });

  const updateMonth = (idx, field, val) => {
    setForm(f => ({ ...f, months: f.months.map((m, i) => i === idx ? { ...m, [field]: val } : m) }));
  };

  return (
    <div style={{ background: LIGHT_BG, minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ color: NAVY, margin: 0, fontSize: 24, fontWeight: 800 }}>Scheme of Studies</h1>
          <p style={{ color: '#6b7280', margin: '4px 0 0', fontSize: 13 }}>Academic curriculum planning by month</p>
        </div>

        {view === 'list' && (
          <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <select style={{ ...inputStyle, width: 160 }} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                <option value="">All Classes</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select style={{ ...inputStyle, width: 160 }} value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
                <option value="">All Subjects</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button style={btnStyle()} onClick={() => setView('create')}>+ New Scheme</button>
            </div>
            <div style={cardStyle}>
              {isLoading ? <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>Loading...</div> : schemes.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>No schemes found. Create one!</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: NAVY, color: '#fff' }}>
                      {['Title', 'Class', 'Subject', 'Academic Year', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {schemes.map((s, i) => (
                      <tr key={s.id} style={{ background: i % 2 === 0 ? '#f9fafb' : '#fff' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{s.title}</td>
                        <td style={{ padding: '10px 12px' }}>{s.className || '-'}</td>
                        <td style={{ padding: '10px 12px' }}>{s.subjectName || '-'}</td>
                        <td style={{ padding: '10px 12px' }}>{s.meta?.academicYear || '-'}</td>
                        <td style={{ padding: '10px 12px', display: 'flex', gap: 6 }}>
                          <button style={btnStyle('#6366f1')} onClick={() => { setDetail(s); setView('detail'); }}>View</button>
                          <button style={btnStyle('#059669')} onClick={() => printScheme(s, s.months || emptyMonths, school?.name)}>Print</button>
                          <button style={btnStyle('#ef4444')} onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(s.id); }}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {view === 'create' && (
          <div style={cardStyle}>
            <h3 style={{ color: NAVY, marginTop: 0 }}>Create Scheme of Studies</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={labelStyle}>Title *</label>
                <input style={inputStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Scheme title" />
              </div>
              <div>
                <label style={labelStyle}>Academic Year</label>
                <input style={inputStyle} value={form.academicYear} onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))} placeholder="e.g. 2025-2026" />
              </div>
              <div>
                <label style={labelStyle}>Class</label>
                <select style={inputStyle} value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value }))}>
                  <option value="">Select Class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Subject</label>
                <select style={inputStyle} value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}>
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <h4 style={{ color: NAVY, marginBottom: 12 }}>Monthly Curriculum Plan</h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: NAVY, color: '#fff' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', width: 130 }}>Month</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Topics / Units to Cover</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', width: 80 }}>Hours</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', width: 120 }}>Tests / Assessments</th>
                  </tr>
                </thead>
                <tbody>
                  {form.months.map((m, i) => (
                    <tr key={m.name} style={{ background: i % 2 === 0 ? '#f9fafb' : '#fff' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: NAVY }}>{m.name}</td>
                      <td style={{ padding: '6px 8px' }}>
                        <input style={inputStyle} value={m.topics} onChange={e => updateMonth(i, 'topics', e.target.value)} placeholder="Topics covered..." />
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <input style={{ ...inputStyle, textAlign: 'center' }} type="number" value={m.hours} onChange={e => updateMonth(i, 'hours', e.target.value)} placeholder="0" />
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <input style={{ ...inputStyle, textAlign: 'center' }} value={m.tests} onChange={e => updateMonth(i, 'tests', e.target.value)} placeholder="e.g. Monthly Test" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button style={btnStyle('#6b7280')} onClick={() => setView('list')}>Cancel</button>
              <button style={btnStyle()} onClick={() => { if (!form.title) return toast.error('Title required'); createMutation.mutate(form); }} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Saving...' : 'Save Scheme'}
              </button>
            </div>
          </div>
        )}

        {view === 'detail' && detail && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ color: NAVY, margin: 0 }}>{detail.title}</h2>
                <p style={{ color: '#6b7280', margin: '4px 0 0', fontSize: 13 }}>
                  {detail.meta?.academicYear || ''} | Class: {detail.className || '-'} | Subject: {detail.subjectName || '-'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={btnStyle('#059669')} onClick={() => printScheme(detail, detail.months || emptyMonths, school?.name)}>Print</button>
                <button style={btnStyle('#6b7280')} onClick={() => setView('list')}>Back</button>
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: NAVY, color: '#fff' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Month</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Topics / Units</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Hours</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Tests / Assessments</th>
                </tr>
              </thead>
              <tbody>
                {(detail.months || emptyMonths).map((m, i) => (
                  <tr key={m.name} style={{ background: i % 2 === 0 ? '#f9fafb' : '#fff' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: NAVY }}>{m.name}</td>
                    <td style={{ padding: '10px 14px' }}>{m.topics || '-'}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>{m.hours || '-'}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>{m.tests || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
