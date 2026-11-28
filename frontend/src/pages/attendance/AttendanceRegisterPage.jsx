/**
 * Attendance Register: a class's month the way the register book is kept,
 * a row per student and a column per day (P, A, L, Lt), the school's weekly
 * off days and holidays shaded, totals and percentage per student and per day.
 *
 * The percentage is of school days: the days the student's section was marked,
 * from the day the student joined. A day the section was marked but the
 * student was not shows "–" and counts against it (it used to be left out, so
 * a student marked once showed 100%). The administrator sets the weekly off
 * days here (Sunday, or Saturday and Sunday, or Friday…).
 *
 * It reads the attendance records themselves, so whatever is marked (the
 * daily register, the kiosk, a fingerprint, a correction) appears here; this
 * month's register refreshes itself every 30 seconds. The class teacher or
 * the admin corrects a day by clicking it. A student's name opens their
 * whole year as calendars. Both print, or save as PDF, with the stamp.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BookOpen, Printer, FileSpreadsheet, ChevronLeft, ChevronRight, RefreshCw, Search, X, CalendarDays, CalendarOff } from 'lucide-react';
import api from '../../api/client';
import useAuthStore from '../../store/auth.store';
import { downloadExcel } from '../../utils/export';
import { periodOptions } from '../../utils/feeYear';
import { useSchoolStamp, stampFor } from '../../utils/schoolStamp';
import { LETTER, LOOK, registerCounter, isOff, monthName, printAttendanceRegister, printAttendanceYear } from '../../utils/attendanceRegisterPrint';

const NAVY = '#1B2F6E';
const pkToday = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
const shiftMonth = (ym, by) => { const [y, m] = ym.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + by, 1)); return d.toISOString().slice(0, 7); };
const METHOD = { manual: 'register', barcode: 'ID card scan', qr: 'QR scan', biometric: 'fingerprint', face: 'photo check-in', correction: 'correction', import: 'import' };
const SHOW = [
  { id: 'all', label: 'All students' },
  { id: 'low', label: 'Attendance below 75%' },
  { id: 'absent3', label: 'Absent 3 or more days' },
  { id: 'todayAbsent', label: 'Absent today' },
  { id: 'todayUnmarked', label: 'Not marked today' },
];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const offWords = (days) => (days?.length ? days.map((d) => DAY_NAMES[d]).join(' and ') : 'Sunday');
const PRESETS = [[[0], 'Sunday'], [[0, 6], 'Saturday and Sunday'], [[5], 'Friday'], [[5, 6], 'Friday and Saturday']];
const ADMINS = ['admin', 'super_admin', 'principal'];

export default function AttendanceRegisterPage() {
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const school = useAuthStore((s) => s.school);
  const isAdmin = ADMINS.includes(useAuthStore((s) => s.user?.role));
  const [offOpen, setOffOpen] = useState(false);
  const stamp = stampFor(useSchoolStamp(), 'attendanceRegister');
  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then((r) => r.data.data || []), staleTime: 300_000 });
  const [classId, setClassId] = useState(params.get('classId') || '');
  const [sectionId, setSectionId] = useState(params.get('sectionId') || '');
  const [month, setMonth] = useState(params.get('month') || pkToday().slice(0, 7));
  const [show, setShow] = useState('all');
  const [q, setQ] = useState('');
  const [menu, setMenu] = useState(null); // { s, d, x, y }
  const [yearOf, setYearOf] = useState(null);
  const cls = classId || (classes[0] ? String(classes[0].id) : '');
  const sections = classes.find((c) => String(c.id) === cls)?.sections || [];
  const today = pkToday();
  const isNow = month === today.slice(0, 7);
  const todayDay = isNow ? Number(today.slice(8)) : null;

  const key = ['att-register', cls, sectionId, month];
  const { data, isLoading, isError, error, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: key,
    queryFn: () => api.get('/attendance/register', { params: { classId: cls, sectionId: sectionId || undefined, month } }).then((r) => r.data.data),
    enabled: !!cls,
    refetchInterval: isNow ? 30_000 : false,
    refetchOnWindowFocus: true,
  });

  const rows = useMemo(() => {
    if (!data) return [];
    const countOf = registerCounter(data);
    return data.students.map((s) => ({ ...s, marks: data.marks[s.id] || {}, c: countOf(s) }));
  }, [data]);
  const needle = q.trim().toLowerCase();
  const shown = rows.filter((r) => {
    if (needle && ![r.name, r.rollNo, r.fatherName].some((v) => String(v || '').toLowerCase().includes(needle))) return false;
    if (show === 'low') return r.c.pct !== null && r.c.pct < 75;
    if (show === 'absent3') return r.c.absent >= 3;
    if (show === 'todayAbsent') return todayDay && r.marks[todayDay]?.status === 'absent';
    if (show === 'todayUnmarked') return todayDay && !r.marks[todayDay];
    return true;
  });
  const groups = [];
  for (const r of shown) {
    const title = [data?.class?.name, r.sectionName].filter(Boolean).join(' — ');
    if (!groups.length || groups[groups.length - 1].title !== title) groups.push({ title, students: [] });
    groups[groups.length - 1].students.push(r);
  }

  const days = data?.days || [];
  const schoolDays = days.filter((d) => rows.some((r) => r.marks[d.day])).length;
  // Of every student's school days (not only the days they were marked).
  const counted = rows.reduce((n, r) => n + r.c.days, 0);
  const avg = counted ? Math.round((rows.reduce((n, r) => n + r.c.present + r.c.late, 0) / counted) * 100) : null;
  const todayCount = (st) => (todayDay ? rows.filter((r) => r.marks[todayDay]?.status === st).length : 0);
  const unmarkedToday = todayDay ? rows.filter((r) => !r.marks[todayDay]).length : 0;
  // Today a weekly off day or a holiday: nothing to mark.
  const todayInfo = todayDay ? days.find((d) => d.day === todayDay) : null;
  const todayOff = !!todayInfo && isOff(todayInfo) && !rows.some((r) => r.marks[todayDay]);

  // Close the day menu with Escape or a click elsewhere.
  useEffect(() => {
    if (!menu) return undefined;
    const close = (e) => { if (e.type === 'keydown' ? e.key === 'Escape' : !e.target.closest?.('[data-day-menu]')) setMenu(null); };
    window.addEventListener('keydown', close);
    window.addEventListener('mousedown', close);
    return () => { window.removeEventListener('keydown', close); window.removeEventListener('mousedown', close); };
  }, [menu]);

  const mark = async (s, d, status) => {
    setMenu(null);
    try {
      const r = await api.put('/attendance/register/mark', { studentId: s.id, date: d.date, status });
      qc.setQueryData(key, (old) => {
        if (!old) return old;
        const mine = { ...(old.marks[s.id] || {}) };
        if (r.data.data.status) mine[d.day] = { id: r.data.data.id, status: r.data.data.status, method: r.data.data.method, markedBy: r.data.data.markedBy };
        else delete mine[d.day];
        return { ...old, marks: { ...old.marks, [s.id]: mine } };
      });
      toast.success(r.data.message);
    } catch (e) {
      toast.error(e.response?.data?.message || 'The register could not be changed.');
    }
  };

  const print = () => {
    if (!data) return;
    const note = [show !== 'all' && SHOW.find((x) => x.id === show)?.label, needle && `Search: ${q.trim()}`].filter(Boolean).join(' · ');
    if (!printAttendanceRegister({ school, data, groups, stamp, note })) toast.error('No students to print.');
  };

  const toExcel = async () => {
    if (!shown.length) return toast.error('No students to export.');
    const sheet = shown.map((r) => {
      const o = { 'Roll No': r.rollNo || '', Student: r.name, Father: r.fatherName || '', Section: r.sectionName || '' };
      days.forEach((d) => { o[`${d.day} ${d.weekday}`] = r.marks[d.day] ? LETTER[r.marks[d.day].status] : d.holiday ? 'H' : r.c.missing.has(d.day) ? '–' : ''; });
      Object.assign(o, { Present: r.c.present, Absent: r.c.absent, Leave: r.c.leave, Late: r.c.late, 'Not marked': r.c.notMarked, 'School days': r.c.days, 'Attendance %': r.c.pct ?? '' });
      return o;
    });
    const file = `Attendance Register - ${data.class.name}${data.section ? ` ${data.section.name}` : ''} - ${monthName(month)}.xlsx`.replace(/[\\/:*?"<>|]/g, '-');
    try { await downloadExcel(sheet, file, 'Attendance'); } catch { toast.error('Could not make the Excel file.'); }
  };

  return (
    <div className="page-content fade-in">
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><BookOpen size={19} style={{ color: NAVY }} /> Attendance Register</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '3px 0 0' }}>A class's month day by day. Attendance marked anywhere shows here; click a day to correct it, or a name for the student's whole year.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {isAdmin && data && <button type="button" className="btn btn-outline btn-sm" aria-expanded={offOpen} onClick={() => setOffOpen((v) => !v)}><CalendarOff size={14} /> Weekly off: {offWords(data.weeklyOff)}</button>}
            <button type="button" className="btn btn-outline btn-sm" onClick={toExcel} disabled={!shown.length}><FileSpreadsheet size={14} /> Excel</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={print} disabled={!shown.length}><Printer size={14} /> Print / Save as PDF</button>
          </div>
        </div>
        {offOpen && isAdmin && data && <WeeklyOff days={data.weeklyOff || [0]} onDone={() => { setOffOpen(false); qc.invalidateQueries({ queryKey: ['att-register'] }); qc.invalidateQueries({ queryKey: ['weekly-off'] }); }} />}
        <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 215px), 1fr))', gap: 10 }}>
          <label style={lab}>Class
            <select className="form-select" aria-label="Class" value={cls} onChange={(e) => { setClassId(e.target.value); setSectionId(''); }}>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label style={lab}>Section
            <select className="form-select" aria-label="Section" value={sectionId} disabled={!sections.length} onChange={(e) => setSectionId(e.target.value)}>
              <option value="">All sections</option>
              {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <div style={lab}>Month
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <button type="button" className="btn btn-outline btn-sm btn-icon" aria-label="Previous month" onClick={() => setMonth((m) => shiftMonth(m, -1))}><ChevronLeft size={14} /></button>
              <input className="form-control" type="month" aria-label="Month" value={month} max={today.slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value)} style={{ minWidth: 0, flex: 1, paddingLeft: 8, paddingRight: 6 }} />
              <button type="button" className="btn btn-outline btn-sm btn-icon" aria-label="Next month" disabled={isNow} onClick={() => setMonth((m) => shiftMonth(m, 1))}><ChevronRight size={14} /></button>
            </div>
          </div>
          <label style={lab}>Show
            <select className="form-select" aria-label="Show" value={show} onChange={(e) => setShow(e.target.value)}>
              {SHOW.filter((s) => isNow || !s.id.startsWith('today')).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <label style={lab}>Find a student
            <span style={{ position: 'relative', display: 'block' }}>
              <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="form-control" aria-label="Find a student" placeholder="Name, roll no., father" style={{ paddingLeft: 28 }} value={q} onChange={(e) => setQ(e.target.value)} />
            </span>
          </label>
        </div>
      </div>

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
          <Stat label="Students" value={rows.length} />
          <Stat label="School days marked" value={schoolDays} />
          <Stat label="Average attendance" value={avg === null ? '—' : `${avg}%`} tone={avg !== null && avg < 75 ? '#991B1B' : '#166534'} />
          {isNow && todayOff && <Stat label="Today" value={todayInfo.holiday || 'Weekly off'} />}
          {isNow && !todayOff && <Stat label="Today: present / absent / leave" value={`${todayCount('present') + todayCount('late')} / ${todayCount('absent')} / ${todayCount('leave')}`} />}
          {isNow && !todayOff && <Stat label="Not marked today" value={unmarkedToday} tone={unmarkedToday ? '#92400E' : undefined} onClick={() => setShow('todayUnmarked')} />}
        </div>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', padding: '10px 14px', borderBottom: '1px solid var(--border-light)' }}>
          <strong style={{ color: NAVY }}>{data ? `${data.class.name}${data.section ? ` — ${data.section.name}` : ''} · ${monthName(month)}` : 'Register'}</strong>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            {isNow && <span aria-live="polite">● Live — updates every 30 seconds{dataUpdatedAt ? `, last at ${new Date(dataUpdatedAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ''}</span>}
            <button type="button" className="btn btn-outline btn-sm" onClick={() => refetch()} disabled={isFetching}><RefreshCw size={13} /> Refresh</button>
          </span>
        </div>
        {isLoading && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading the register…</div>}
        {isError && <div role="alert" style={{ padding: 20, color: '#991B1B' }}>{error?.response?.data?.message || 'Could not load the register.'}</div>}
        {data && !shown.length && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>{rows.length ? 'No student matches.' : 'No active students in this class.'}</div>}
        {shown.length > 0 && (
          <div style={{ overflow: 'auto', maxHeight: '70vh' }}>
            <table aria-label="Attendance register" style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 12, tableLayout: 'fixed', width: W.n + W.roll + W.name + days.length * W.day + TOTALS.length * W.tot }}>
              <colgroup>
                <col style={{ width: W.n }} /><col style={{ width: W.roll }} /><col style={{ width: W.name }} />
                {days.map((d) => <col key={d.day} style={{ width: W.day }} />)}
                {TOTALS.map((t) => <col key={`t${t}`} style={{ width: W.tot }} />)}
              </colgroup>
              <thead>
                <tr>
                  <th style={{ ...th, ...stick(0), zIndex: 3 }}>#</th>
                  <th style={{ ...th, ...stick(W.n), zIndex: 3 }}>Roll</th>
                  <th style={{ ...th, ...stick(W.n + W.roll), zIndex: 3, textAlign: 'left', boxShadow: 'inset -1px 0 0 #CBD5E1' }}>Student</th>
                  {days.map((d) => (
                    <th key={d.day} title={d.holiday || (isOff(d) ? `${DAY_NAMES[new Date(`${d.date}T00:00:00Z`).getUTCDay()]}: weekly off` : '')} style={{ ...th, padding: '5px 0', background: d.day === todayDay ? '#DBEAFE' : isOff(d) ? '#E2E8F0' : th.background }}>
                      {d.day}<div style={{ fontWeight: 400, fontSize: 9.5, color: 'var(--text-muted)' }}>{d.holiday ? 'Hol' : d.weekday.slice(0, 2)}</div>
                    </th>
                  ))}
                  {TOTALS.map((h) => <th key={h} style={th} title={TOTAL_TIPS[h]}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => [
                  groups.length > 1 ? (
                    <tr key={`g-${g.title}`}><td colSpan={3} style={{ ...td, ...stick(0), background: '#EEF2FF', fontWeight: 800, color: '#1E3A8A' }}>{g.title}</td><td colSpan={days.length + TOTALS.length} style={{ ...td, background: '#EEF2FF' }} /></tr>
                  ) : null,
                  ...g.students.map((r, n) => (
                    <tr key={r.id}>
                      <td style={{ ...td, ...stick(0), textAlign: 'center', color: 'var(--text-muted)' }}>{n + 1}</td>
                      <td style={{ ...td, ...stick(W.n), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.rollNo || ''}>{r.rollNo || '—'}</td>
                      <td style={{ ...td, ...stick(W.n + W.roll), boxShadow: 'inset -1px 0 0 #CBD5E1', overflow: 'hidden' }}>
                        <button type="button" onClick={() => setYearOf(r)} title="The student's whole year"
                          style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left', color: 'var(--text-primary)', fontWeight: 700, fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                          {r.name}
                        </button>
                      </td>
                      {days.map((d) => {
                        const m = r.marks[d.day];
                        const look = LOOK[m?.status];
                        const future = d.date > today;
                        const off = isOff(d);
                        const missing = r.c.missing.has(d.day);
                        return (
                          <td key={d.day} style={{ ...td, padding: 1, textAlign: 'center', background: d.day === todayDay ? '#EFF6FF' : off ? '#F1F5F9' : '#fff' }}>
                            <button type="button" data-status={m?.status || ''} disabled={!data.canEdit || future}
                              aria-label={`${r.name}, ${d.date}: ${look ? look.label : missing ? 'not marked (the class was marked)' : 'not marked'}`}
                              title={missing ? 'Not marked: the class was marked this day. It counts against the percentage.' : undefined}
                              onClick={(e) => { const b = e.currentTarget.getBoundingClientRect(); setMenu({ s: r, d, x: b.left, y: b.bottom }); }}
                              style={{ width: '100%', height: 26, border: look ? `1px solid ${look.fg}33` : '1px solid transparent', borderRadius: 4, background: look ? look.bg : missing ? '#FFFBEB' : 'transparent', color: look ? look.fg : missing ? '#B45309' : '#CBD5E1', fontWeight: 700, fontSize: 11, cursor: !data.canEdit || future ? 'default' : 'pointer', padding: 0 }}>
                              {m ? LETTER[m.status] : missing ? '–' : future ? '' : off ? '' : '·'}
                            </button>
                          </td>
                        );
                      })}
                      <td style={{ ...td, ...tot, color: '#166534' }}>{r.c.present}</td>
                      <td style={{ ...td, ...tot, color: r.c.absent ? '#991B1B' : 'var(--text-muted)' }}>{r.c.absent}</td>
                      <td style={{ ...td, ...tot }}>{r.c.leave}</td>
                      <td style={{ ...td, ...tot }}>{r.c.late}</td>
                      <td style={{ ...td, ...tot, color: r.c.notMarked ? '#B45309' : 'var(--text-muted)' }}>{r.c.notMarked}</td>
                      <td style={{ ...td, ...tot }}>{r.c.days}</td>
                      <td style={{ ...td, ...tot, color: r.c.pct !== null && r.c.pct < 75 ? '#991B1B' : '#166534' }}>{r.c.pct === null ? '—' : `${r.c.pct}%`}</td>
                    </tr>
                  )),
                ])}
              </tbody>
              <tfoot>
                {[['present', 'Present', '#166534'], ['absent', 'Absent', '#991B1B'], ['none', 'Not marked', '#B45309']].map(([st, label, color]) => (
                  <tr key={st}>
                    <td colSpan={3} style={{ ...tf, ...stick(0), zIndex: 1 }}>{label}</td>
                    {days.map((d) => {
                      const n = shown.filter((r) => (st === 'none' ? r.c.missing.has(d.day) : r.marks[d.day]?.status === st || (st === 'present' && r.marks[d.day]?.status === 'late'))).length;
                      return <td key={d.day} style={{ ...tf, textAlign: 'center', color }}>{n || ''}</td>;
                    })}
                    <td colSpan={TOTALS.length} style={tf} />
                  </tr>
                ))}
              </tfoot>
            </table>
          </div>
        )}
        {shown.length > 0 && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: '10px 14px', fontSize: 11.5, color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)' }}>
            {Object.entries(LOOK).map(([k, l]) => <span key={k}><b style={{ background: l.bg, color: l.fg, borderRadius: 3, padding: '0 4px' }}>{LETTER[k]}</b> {l.label}</span>)}
            <span><b style={{ background: '#FFFBEB', color: '#B45309', borderRadius: 3, padding: '0 4px' }}>–</b> not marked (the class was marked that day)</span>
            <span>Grey: weekly off ({offWords(data.weeklyOff)}) or holiday</span>
            <span>Days: the days the class was marked since the student joined · %: present (late counts) of those days</span>
            {data.canEdit ? <span>Click a day to correct it (no message is sent to parents from here).</span> : <span>Only the class teacher or the admin can correct the register.</span>}
          </div>
        )}
      </div>

      {menu && (
        <div data-day-menu role="menu" aria-label={`Mark ${menu.s.name} on ${menu.d.date}`}
          style={{ position: 'fixed', left: Math.min(menu.x, window.innerWidth - 220), top: Math.min(menu.y + 4, window.innerHeight - 260), zIndex: 2000, width: 210, background: '#fff', border: '1px solid #CBD5E1', borderRadius: 10, boxShadow: '0 10px 30px rgba(15,23,42,.18)', padding: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: NAVY, padding: '2px 4px 6px' }}>{menu.s.name}<div style={{ fontWeight: 400, color: 'var(--text-muted)' }}>{new Date(`${menu.d.date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}{menu.d.holiday ? ` · ${menu.d.holiday}` : ''}</div></div>
          {menu.s.marks[menu.d.day] && (
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', padding: '0 4px 6px' }}>
              {LOOK[menu.s.marks[menu.d.day].status]?.label} by {METHOD[menu.s.marks[menu.d.day].method] || menu.s.marks[menu.d.day].method}{data.markers?.[menu.s.marks[menu.d.day].markedBy] ? `, ${data.markers[menu.s.marks[menu.d.day].markedBy]}` : ''}
            </div>
          )}
          {Object.entries(LOOK).map(([st, l]) => (
            <button key={st} type="button" role="menuitem" onClick={() => mark(menu.s, menu.d, st)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', border: 0, background: menu.s.marks[menu.d.day]?.status === st ? l.bg : 'transparent', borderRadius: 6, padding: '6px 6px', cursor: 'pointer', fontSize: 13, textAlign: 'left' }}>
              <b style={{ width: 24, textAlign: 'center', background: l.bg, color: l.fg, borderRadius: 4 }}>{LETTER[st]}</b>{l.label}
            </button>
          ))}
          <button type="button" role="menuitem" onClick={() => mark(menu.s, menu.d, 'clear')} disabled={!menu.s.marks[menu.d.day]}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', border: 0, borderTop: '1px solid #F1F5F9', background: 'transparent', padding: '7px 6px 4px', cursor: 'pointer', fontSize: 13, color: '#64748B', textAlign: 'left' }}>
            <b style={{ width: 24, textAlign: 'center' }}>·</b>Not marked
          </button>
        </div>
      )}

      {yearOf && <StudentYear student={yearOf} school={school} stamp={stamp} onClose={() => setYearOf(null)} />}
    </div>
  );
}

/* One student's months as calendars, from GET /attendance/register/student/:id. */
function StudentYear({ student, school, stamp, onClose }) {
  const [periodId, setPeriodId] = useState('');
  const [range, setRange] = useState(null);
  const { data, isLoading } = useQuery({
    queryKey: ['att-year', student.id, range?.from, range?.to],
    queryFn: () => api.get(`/attendance/register/student/${student.id}`, { params: range || {} }).then((r) => r.data.data),
  });
  const { options } = useMemo(() => periodOptions(data?.sessions || []), [data?.sessions]);
  // Choices are sessions and calendar years of up to 12 months.
  const choices = options.filter((o) => o.kind === 'year' || (Number(o.to.slice(0, 4)) * 12 + Number(o.to.slice(5)) - (Number(o.from.slice(0, 4)) * 12 + Number(o.from.slice(5)))) < 12);
  const current = choices.find((o) => o.id === periodId) || choices.find((o) => data && o.from === data.from && o.to === data.to);
  const t = data?.totals;
  const base = t ? (t.schoolDays ?? t.marked) : 0;
  const pct = base ? Math.round(((t.present + t.late) / base) * 100) : null;
  const close = useRef(null);
  useEffect(() => { close.current?.focus(); }, []);

  return (
    <div className="modal-overlay" onClick={onClose} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="att-year-title" onClick={(e) => e.stopPropagation()} style={{ padding: 0, width: '100%', maxWidth: 900, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div className="card-header" style={{ borderRadius: '8px 8px 0 0', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div id="att-year-title" className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CalendarDays size={16} /> {student.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{[data?.student.className, data?.student.sectionName].filter(Boolean).join(' — ')}{student.rollNo ? ` · Roll ${student.rollNo}` : ''}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select className="form-select" aria-label="Year" style={{ width: 'auto', height: 32, fontSize: 13 }} value={current?.id || ''}
              onChange={(e) => { const o = choices.find((x) => x.id === e.target.value); setPeriodId(e.target.value); if (o) setRange({ from: o.from, to: o.to }); }}>
              {!current && <option value="">{data ? `${monthName(data.from)} – ${monthName(data.to)}` : '…'}</option>}
              {choices.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <button type="button" className="btn btn-primary btn-sm" disabled={!data} onClick={() => printAttendanceYear({ school, year: data, stamp })}><Printer size={13} /> Print / Save as PDF</button>
            <button ref={close} type="button" aria-label="Close" onClick={onClose} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
          </div>
        </div>
        <div className="card-body" style={{ overflowY: 'auto' }}>
          {isLoading && <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>}
          {data && (
            <>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, fontSize: 12.5 }}>
                {Object.entries(LOOK).map(([k, l]) => <span key={k} style={{ background: l.bg, color: l.fg, borderRadius: 999, padding: '3px 10px', fontWeight: 700 }}>{l.label} {t[k]}</span>)}
                {t.schoolDays !== undefined
                  ? <><span style={{ background: '#FFFBEB', color: '#B45309', borderRadius: 999, padding: '3px 10px', fontWeight: 700 }}>Not marked {t.notMarked}</span><span style={{ background: '#F1F5F9', borderRadius: 999, padding: '3px 10px', fontWeight: 700 }} title="The days the class was marked since the student joined">School days {t.schoolDays}</span></>
                  : <span style={{ background: '#F1F5F9', borderRadius: 999, padding: '3px 10px', fontWeight: 700 }}>Days marked {t.marked}</span>}
                {pct !== null && <span style={{ background: pct < 75 ? '#FEE2E2' : '#DCFCE7', color: pct < 75 ? '#991B1B' : '#166534', borderRadius: 999, padding: '3px 10px', fontWeight: 800 }}>Attendance {pct}%</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>
                {data.months.map((mo) => <MonthCalendar key={mo.month} mo={mo} today={data.today} />)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MonthCalendar({ mo, today }) {
  const lead = (new Date(`${mo.days[0].date}T00:00:00Z`).getUTCDay() + 6) % 7;
  const n = (st) => mo.days.filter((d) => d.status === st).length;
  return (
    <section aria-label={monthName(mo.month)} style={{ border: '1px solid var(--border-light, #E5E7EB)', borderRadius: 10, padding: 8 }}>
      <div style={{ fontWeight: 800, fontSize: 13, color: NAVY, textAlign: 'center', marginBottom: 4 }}>{monthName(mo.month)}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, fontSize: 11 }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x, i) => <div key={`h${i}`} style={{ textAlign: 'center', color: '#94A3B8', fontWeight: 700 }}>{x}</div>)}
        {Array.from({ length: lead }, (_, i) => <div key={`e${i}`} />)}
        {mo.days.map((d) => {
          const l = LOOK[d.status];
          return (
            <div key={d.day} title={[d.date, l?.label || (d.notMarked ? 'not marked (the class was marked)' : ''), d.holiday].filter(Boolean).join(' · ')}
              style={{ textAlign: 'center', borderRadius: 4, padding: '3px 0', lineHeight: 1.1, background: l ? l.bg : d.notMarked ? '#FFFBEB' : isOff(d) ? '#F1F5F9' : 'transparent', color: l ? l.fg : d.notMarked ? '#B45309' : d.date > today ? '#CBD5E1' : '#475569', fontWeight: l || d.notMarked ? 800 : 500, outline: d.date === today ? `2px solid ${NAVY}` : 'none' }}>
              {d.day}<div style={{ fontSize: 8.5 }}>{d.status ? LETTER[d.status] : d.holiday ? 'H' : d.notMarked ? '–' : ' '}</div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 4 }}>P {n('present')} · A {n('absent')} · L {n('leave')} · Lt {n('late')}{mo.days.some((d) => d.notMarked) ? ` · – ${mo.days.filter((d) => d.notMarked).length}` : ''}</div>
    </section>
  );
}

function Stat({ label, value, tone, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} className="card" style={{ padding: '12px 14px', textAlign: 'left', border: '1px solid var(--border-light)', cursor: onClick ? 'pointer' : 'default', background: '#fff' }}>
      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 800, color: tone || 'var(--text-primary)', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </Tag>
  );
}

/* The administrator's choice of weekly off days. */
function WeeklyOff({ days, onDone }) {
  const [sel, setSel] = useState(days);
  const [saving, setSaving] = useState(false);
  const toggle = (d) => setSel((v) => (v.includes(d) ? v.filter((x) => x !== d) : [...v, d].sort((a, b) => a - b)));
  const same = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
  const save = async () => {
    setSaving(true);
    try {
      const r = await api.put('/attendance/weekly-off', { days: sel });
      toast.success(r.data.message);
      onDone();
    } catch (e) {
      toast.error(e.response?.data?.message || 'It could not be saved.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div role="region" aria-label="Weekly off days" style={{ margin: '0 16px 4px', padding: 12, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, display: 'grid', gap: 10 }}>
      <div style={{ fontSize: 13, color: '#334155' }}>The days the school is closed every week. They are shaded in the register, never counted as school days, and auto-absent does not run on them.</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {PRESETS.map(([d, label]) => (
          <button key={label} type="button" className={`btn btn-sm ${same(sel, d) ? 'btn-primary' : 'btn-outline'}`} aria-pressed={same(sel, d)} onClick={() => setSel(d)}>{label}</button>
        ))}
      </div>
      <div role="group" aria-label="Or choose the days" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Or choose:</span>
        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
          <label key={d} style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 12.5, padding: '3px 8px', borderRadius: 999, border: '1px solid #CBD5E1', background: sel.includes(d) ? '#E2E8F0' : '#fff', cursor: 'pointer' }}>
            <input type="checkbox" checked={sel.includes(d)} onChange={() => toggle(d)} /> {DAY_NAMES[d].slice(0, 3)}
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" className="btn btn-primary btn-sm" disabled={saving || !sel.length || sel.length > 3 || same(sel, days)} onClick={save}>{saving ? 'Saving…' : `Save: ${offWords(sel)} off`}</button>
        <button type="button" className="btn btn-outline btn-sm" onClick={onDone}>Cancel</button>
        {(sel.length === 0 || sel.length > 3) && <span style={{ fontSize: 12, color: '#991B1B' }}>Choose one to three days.</span>}
        <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Staff shifts keep their own days (Fingerprint Machines → Rules).</span>
      </div>
    </div>
  );
}

const TOTALS = ['P', 'A', 'L', 'Lt', '–', 'Days', '%'];
const TOTAL_TIPS = { P: 'Present', A: 'Absent', L: 'Leave', Lt: 'Late (counts as present)', '–': 'Not marked on a day the class was marked', Days: 'School days: the days the class was marked since the student joined', '%': 'Present and late, of the school days' };
const W = { n: 32, roll: 92, name: 170, day: 32, tot: 40 };
const lab = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' };
const th = { position: 'sticky', top: 0, zIndex: 2, background: '#F1F5F9', color: '#1E293B', fontSize: 11, fontWeight: 700, padding: '6px 4px', borderBottom: '1px solid #CBD5E1', textAlign: 'center', whiteSpace: 'nowrap' };
const td = { padding: '4px 6px', borderBottom: '1px solid #E2E8F0', background: '#fff', verticalAlign: 'middle' };
const tot = { textAlign: 'center', fontWeight: 700, padding: '4px 2px' };
const tf = { padding: '5px 4px', borderTop: '1px solid #CBD5E1', background: '#F8FAFC', fontWeight: 700, fontSize: 11 };
const stick = (left) => ({ position: 'sticky', left, zIndex: 1 });
