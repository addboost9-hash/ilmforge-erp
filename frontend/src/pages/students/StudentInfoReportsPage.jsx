/**
 * IlmForge — Student Info Reports
 * Printable: All Active, All Inactive, Class-wise, Passout students
 * Matches competitor's "Student Info Reports" page exactly
 */
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import api from '../../api/client';
import { Printer, Users, UserX, GraduationCap, LogOut } from 'lucide-react';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

function printStudentList(students, title, school) {
  const sName = school?.name || localStorage.getItem('registeredSchoolName') || 'IlmForge School';
  const rows = students.map((s, i) => `
    <tr style="background:${i%2===0?'#fff':'#f9f9f9'}">
      <td>${i+1}</td>
      <td>${s.rollNo || '—'}</td>
      <td style="font-weight:600">${s.name || '—'}</td>
      <td>${s.fatherName || '—'}</td>
      <td>${s.class?.name || '—'}</td>
      <td>${s.section?.name || '—'}</td>
      <td>${s.gender || '—'}</td>
      <td>${s.emergencyPhone || s.parent?.phone || '—'}</td>
      <td>${fmtDate(s.admissionDate || s.createdAt)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html><head><title>${title} — ${sName}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; padding: 16px; }
      h2,h3 { text-align: center; margin: 3px 0; }
      .header { border-bottom: 2px solid #1B2F6E; padding-bottom: 10px; margin-bottom: 12px; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #1B2F6E; color: white; padding: 6px 8px; text-align: left; font-size: 11px; }
      td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
      .stats { display: flex; gap: 16px; justify-content: center; margin: 8px 0; }
      .stat { background: #f0f4ff; padding: 4px 14px; border-radius: 99px; font-size: 11px; font-weight: 600; color: #1B2F6E; }
      @media print { body { -webkit-print-color-adjust: exact; } }
    </style>
  </head><body>
    <div class="header">
      <h2>${sName}</h2>
      <h3>${title}</h3>
      <div class="stats">
        <span class="stat">Total: ${students.length}</span>
        <span class="stat">Male: ${students.filter(s=>s.gender?.toLowerCase()==='male').length}</span>
        <span class="stat">Female: ${students.filter(s=>s.gender?.toLowerCase()==='female').length}</span>
        <span class="stat">Print Date: ${new Date().toLocaleDateString('en-PK')}</span>
      </div>
    </div>
    <table>
      <thead>
        <tr><th>#</th><th>Roll No</th><th>Student Name</th><th>Father Name</th><th>Class</th><th>Section</th><th>Gender</th><th>Phone</th><th>Admission Date</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="text-align:center;margin-top:20px;font-size:9px;color:#666">
      Powered by IlmForge School Management System | ${new Date().toLocaleString('en-PK')}
    </div>
  </body></html>`;
  const w = window.open('', '_blank', 'width=1000,height=700');
  w.document.write(html); w.document.close();
}

export default function StudentInfoReportsPage() {
  const [classId, setClassId] = useState('');

  const { data: allStudents = [] } = useQuery({
    queryKey: ['all-students-reports'],
    queryFn: () => api.get('/students?limit=2000').then(r => r.data.data || []).catch(() => []),
    staleTime: 5 * 60_000,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data || []).catch(() => []),
  });

  const { data: school } = useQuery({
    queryKey: ['school-settings-bise'],
    queryFn: () => api.get('/settings/school').then(r => r.data.data).catch(() => null),
  });

  const active   = allStudents.filter(s => s.status === 'active');
  const inactive = allStudents.filter(s => s.status !== 'active' && s.status !== 'passout');
  const passout  = allStudents.filter(s => s.status === 'passout');
  const classWise = classId ? allStudents.filter(s => s.classId === parseInt(classId) && s.status === 'active') : active;

  const REPORTS = [
    {
      title: 'All Active Students',
      desc: 'List of all active students from all classes/sections',
      icon: Users,
      color: '#0073b7',
      bg: '#eff6ff',
      count: active.length,
      onPrint: () => printStudentList(active, 'All Active Students', school),
    },
    {
      title: 'All Inactive Students',
      desc: 'List of all deactivated students from all classes/sections',
      icon: UserX,
      color: '#dc2626',
      bg: '#fef2f2',
      count: inactive.length,
      onPrint: () => printStudentList(inactive, 'All Inactive Students', school),
    },
    {
      title: 'Class Wise Student Report',
      desc: 'Active students filtered by class/section',
      icon: GraduationCap,
      color: '#7c3aed',
      bg: '#f5f3ff',
      count: classWise.length,
      onPrint: () => printStudentList(classWise, `Class Wise Student Report${classId ? ` — ${classes.find(c=>c.id===parseInt(classId))?.name||''}` : ''}`, school),
      extra: (
        <select className="form-select" style={{ marginTop: 8, fontSize: 12 }} value={classId} onChange={e => setClassId(e.target.value)}>
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      ),
    },
    {
      title: 'All Passout Students',
      desc: 'List of all graduated/passout students',
      icon: LogOut,
      color: '#15803d',
      bg: '#f0fdf4',
      count: passout.length,
      onPrint: () => printStudentList(passout, 'All Passout Students', school),
    },
  ];

  const male   = active.filter(s => s.gender?.toLowerCase() === 'male').length;
  const female = active.filter(s => s.gender?.toLowerCase() === 'female').length;

  return (
    <div className="page-content fade-in">
      <div className="page-header-band">
        <div className="page-header-left">
          <h1 className="page-title">Student Info Reports</h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>Printable student information reports by status and class</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total Students',  v: allStudents.length, color: '#1B2F6E', bg: '#eff6ff' },
          { label: 'Male Students',   v: male,               color: '#0073b7', bg: '#dbeafe' },
          { label: 'Female Students', v: female,             color: '#7c3aed', bg: '#ede9fe' },
          { label: 'Pass-out Students',v: passout.length,    color: '#64748b', bg: '#f1f5f9' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}22`, borderRadius: 10, padding: 16, position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: s.color }}>{s.v}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: 600 }}>{s.label}</div>
            <div style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 11, color: s.color, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>View Report →</div>
          </div>
        ))}
      </div>

      {/* Printable Reports */}
      <div className="card">
        <div className="card-header">
          <h3>Printable Student Information Reports</h3>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>A4 size recommended</span>
        </div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {REPORTS.map(r => {
            const Icon = r.icon;
            return (
              <div key={r.title} style={{ background: r.bg, border: `1px solid ${r.color}30`, borderRadius: 10, padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: r.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={20} color={r.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {r.title}
                      <span style={{ background: r.color, color: 'white', fontSize: 11, padding: '1px 8px', borderRadius: 99, fontWeight: 700 }}>{r.count}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>{r.desc}</div>
                    {r.extra}
                    <button onClick={r.onPrint} className="btn btn-sm"
                      style={{ marginTop: 12, background: r.color, color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 7, cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
                      <Printer size={13} /> Print
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ padding: '10px 20px', background: '#fafafa', borderTop: '1px solid #f1f5f9', fontSize: 11.5, color: '#94a3b8' }}>
          ⚠️ Please ensure all reports are printed in A4 size for optimal viewing. Adjust your printer settings accordingly.
        </div>
      </div>
    </div>
  );
}
