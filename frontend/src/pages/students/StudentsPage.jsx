/**
 * Students — the class-wise directory.
 *
 * Every class in the school's order (School Settings → Classes), empty ones
 * included, each with its sections and how many students it has. Choosing a
 * class lists its students in roll-number order; the search finds any
 * student in any class by name, roll number, father's name, parent's phone,
 * B-Form or family number. A student opens their full record: details, fee
 * statement, attendance and results, and every detail can be corrected.
 *
 * The class, section and tab are kept in the address, so coming back from a
 * student's record returns to the same list.
 */
import { useMemo, useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams, Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Search, X, UserPlus, Upload, Printer, TrendingUp, Users, ChevronRight, GraduationCap, FolderOpen,
} from 'lucide-react';
import api from '../../api/client';
import { useDebounce } from '../../hooks/useDebounce';
import useAuthStore from '../../store/auth.store';
import StudentPhotoButton from '../../components/StudentPhotoButton';
import StudentRowActions, { MissingBadge } from '../../components/StudentRowActions';
import { printClassList } from '../../utils/studentPrint';

const ADMIN_ROLES = ['admin', 'super_admin', 'principal'];
const PAGE = 100;

/* ─── Promotion of one class (or section) ─────────────────────────── */
function PromoteModal({ row, classes, onClose }) {
  const qc = useQueryClient();
  const [toClassId, setToClassId] = useState('');
  const [toSectionId, setToSectionId] = useState('');
  const [selected, setSelected] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(null);

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students-for-promote', row.classId, row.sectionId],
    queryFn: () => api.get('/students', { params: { classId: row.classId, sectionId: row.sectionId || undefined, status: 'active', limit: 300, sort: 'roll' } }).then((r) => r.data.data || []),
    staleTime: 0,
  });
  useEffect(() => {
    // Everyone is ticked to start with: a whole class usually moves up.
    setSelected(Object.fromEntries(students.map((s) => [s.id, true])));
  }, [students]);

  const toClass = classes.find((c) => c.id === parseInt(toClassId, 10));
  const toSection = (toClass?.sections || []).find((s) => s.id === parseInt(toSectionId, 10));
  const ids = students.filter((s) => selected[s.id]).map((s) => s.id);
  const all = students.length > 0 && ids.length === students.length;

  const promote = useMutation({
    mutationFn: () => api.post('/students/promote', {
      records: ids.map((studentId) => ({ studentId, action: 'promote', toClassId: parseInt(toClassId, 10), toSectionId: toSectionId ? parseInt(toSectionId, 10) : undefined })),
    }),
    onSuccess: () => {
      setDone({ count: ids.length, to: `${toClass?.name || ''}${toSection ? ` – ${toSection.name}` : ''}` });
      qc.invalidateQueries({ predicate: (q) => /student|class-sections|directory/i.test(String(q.queryKey?.[0] || '')) });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'The promotion did not go through.'),
  });

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-900/50 grid place-items-center p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="promote-title" onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="bg-teal-700 text-white px-5 py-3.5 flex items-center justify-between">
          <h3 id="promote-title" className="font-bold text-sm">Promote {row.className}{row.sectionName ? ` – ${row.sectionName}` : ''}</h3>
          <button type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        {done ? (
          <div className="p-10 text-center">
            <GraduationCap className="mx-auto text-teal-600" size={44} />
            <h4 className="mt-3 text-lg font-bold text-slate-800">{done.count} student{done.count === 1 ? '' : 's'} moved to {done.to}</h4>
            <p className="text-sm text-slate-500 mt-1">Their records, fees and results move with them.</p>
            <button type="button" className="mt-5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm px-5 py-2 rounded-lg" onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            <div className="px-5 py-3 border-b border-slate-100 grid grid-cols-2 gap-3">
              <label className="text-xs font-semibold text-slate-600">Move to class
                <select className="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-2 text-sm" value={toClassId} onChange={(e) => { setToClassId(e.target.value); setToSectionId(''); }}>
                  <option value="">Choose a class</option>
                  {classes.filter((c) => c.id !== row.classId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">Section
                <select className="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-2 text-sm" value={toSectionId} onChange={(e) => setToSectionId(e.target.value)} disabled={!toClass}>
                  <option value="">No section</option>
                  {(toClass?.sections || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
            </div>
            <div className="flex-1 overflow-auto">
              {isLoading ? <p className="p-8 text-center text-sm text-slate-400">Loading students…</p> : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-2 w-10"><input type="checkbox" checked={all} aria-label="Select everyone" onChange={(e) => setSelected(Object.fromEntries(students.map((s) => [s.id, e.target.checked])))} /></th>
                      <th className="text-left px-2 py-2">Roll no</th><th className="text-left px-2 py-2">Name</th><th className="text-left px-2 py-2">Father's name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => (
                      <tr key={s.id} className="border-t border-slate-100">
                        <td className="px-4 py-1.5"><input type="checkbox" checked={!!selected[s.id]} aria-label={`Promote ${s.name}`} onChange={() => setSelected((p) => ({ ...p, [s.id]: !p[s.id] }))} /></td>
                        <td className="px-2 py-1.5 font-mono text-teal-700 font-semibold">{s.rollNo || '—'}</td>
                        <td className="px-2 py-1.5 font-medium text-slate-800">{s.name}</td>
                        <td className="px-2 py-1.5 text-slate-500">{s.fatherName || '—'}</td>
                      </tr>
                    ))}
                    {!students.length && <tr><td colSpan={4} className="p-8 text-center text-slate-400">No current students in this class.</td></tr>}
                  </tbody>
                </table>
              )}
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex items-center gap-2">
              <span className="text-xs text-slate-500 mr-auto">{ids.length} of {students.length} selected</span>
              <button type="button" className="text-sm font-semibold px-4 py-2 rounded-lg border border-slate-300" onClick={onClose}>Cancel</button>
              {confirming ? (
                <button type="button" disabled={promote.isPending} onClick={() => promote.mutate()}
                  className="text-sm font-semibold px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50">
                  {promote.isPending ? 'Promoting…' : `Yes, move ${ids.length} to ${toClass?.name}`}
                </button>
              ) : (
                <button type="button" disabled={!toClassId || !ids.length} onClick={() => setConfirming(true)}
                  className="text-sm font-semibold px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-40">
                  Promote
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── one count pill ─── */
const Count = ({ n, active }) => (
  <span className={`ml-auto min-w-[26px] text-center text-[11px] font-bold rounded-full px-1.5 py-0.5 tabular-nums ${active ? 'bg-white/25 text-white' : n ? 'bg-slate-100 text-slate-600' : 'text-slate-300'}`}>{n}</span>
);

export default function StudentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const school = useAuthStore((s) => s.school);
  const role = useAuthStore((s) => s.user?.role);
  const canManage = ADMIN_ROLES.includes(role);

  const tab = params.get('tab') === 'inactive' ? 'inactive' : 'active';
  const cls = params.get('class') || '';
  const sec = params.get('section') || '';
  const sort = params.get('sort') || 'roll';
  const [searchInput, setSearchInput] = useState(params.get('q') || '');
  const q = useDebounce(searchInput.trim(), 350);
  const [pages, setPages] = useState(1);
  const [promoteRow, setPromoteRow] = useState(null);
  const searchRef = useRef(null);

  const setParam = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
    setPages(1);
  };
  useEffect(() => { setParam({ q: q || '' }); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  // "/" jumps to the search box, as on most directories.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement?.tagName || '')) { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const { data: dir, isLoading: dirLoading } = useQuery({
    queryKey: ['students-directory', tab],
    queryFn: () => api.get('/students/directory', { params: { status: tab } }).then((r) => r.data.data),
  });
  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then((r) => r.data.data || []),
    staleTime: 5 * 60_000,
  });

  const dirClasses = dir?.classes || [];
  const duplicates = dir?.duplicates || [];
  const dupRolls = useMemo(() => new Set(duplicates.map((d) => d.rollNo)), [duplicates]);
  const dupGroups = useMemo(() => {
    const m = new Map();
    duplicates.forEach((d) => m.set(d.rollNo, [...(m.get(d.rollNo) || []), d]));
    return [...m.entries()];
  }, [duplicates]);
  const [showDups, setShowDups] = useState(false);
  // Open on the first class that has students, until the user picks one.
  const current = cls || (dirClasses.find((c) => c.total)?.classId ? String(dirClasses.find((c) => c.total).classId) : 'all');
  const currentClass = dirClasses.find((c) => String(c.classId) === current);
  const currentSection = currentClass?.sections.find((s) => String(s.sectionId) === sec);
  const searching = q.length > 0;

  const listParams = searching
    ? { search: q, status: tab, limit: Math.min(50 * pages, 300), sort: 'name' }
    : current === 'all'
      ? { status: tab, limit: Math.min(PAGE * pages, 300), sort: sort === 'roll' ? 'name' : sort }
      : { classId: current, sectionId: sec || undefined, status: tab, limit: 300, sort };
  const { data: list, isFetching, isLoading: listLoading } = useQuery({
    queryKey: ['students-list', listParams],
    queryFn: () => api.get('/students', { params: listParams }).then((r) => r.data),
    enabled: !dirLoading,
    placeholderData: (prev) => prev,
  });
  const students = list?.data || [];
  const total = list?.total ?? 0;

  const heading = searching
    ? `Search: “${q}”`
    : current === 'all' ? 'All students' : current === 'none' ? 'Students with no class'
      : `${currentClass?.name || 'Class'}${currentSection ? ` – ${currentSection.name}` : sec === 'none' ? ' – no section' : ''}`;
  const counts = searching ? null : current === 'all' ? dir?.totals : current === 'none' ? dir?.noClass
    : currentSection || (sec === 'none' ? currentClass?.noSection : currentClass);

  const open = (s) => navigate(`/students/${s.id}`, {
    state: { from: `${location.pathname}${location.search}`, list: students.map((x) => x.id), listTitle: heading },
  });
  const admitHere = () => navigate('/admissions/wizard', {
    state: { prefill: currentClass ? { classId: String(currentClass.classId), sectionId: currentSection ? String(currentSection.sectionId) : '' } : {} },
  });
  const printList = () => {
    const sub = [tab === 'inactive' ? 'Students who have left' : 'Current students', counts && `${counts.boys} boys · ${counts.girls} girls`].filter(Boolean).join(' · ');
    if (!printClassList({ school, title: heading, subtitle: sub, students })) toast.error('Printing was blocked. Allow pop-ups for IlmForge and try again.');
  };

  const classRow = (c) => {
    const isOn = !searching && current === String(c.classId);
    return (
      <div key={c.classId}>
        <button type="button" onClick={() => { setSearchInput(''); setParam({ class: String(c.classId), section: '', q: '' }); }}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition ${isOn ? 'bg-teal-700 text-white font-semibold shadow-sm' : 'text-slate-700 hover:bg-slate-100'}`}
          aria-current={isOn ? 'true' : undefined}>
          <span className="truncate">{c.name}</span>
          <Count n={c.total} active={isOn} />
        </button>
        {isOn && (c.sections.length > 0 || c.noSection) && (
          <div className="ml-3 pl-2 border-l-2 border-teal-100 my-1 space-y-0.5">
            <button type="button" onClick={() => setParam({ section: '' })}
              className={`w-full flex items-center px-2.5 py-1 rounded-md text-xs ${!sec ? 'text-teal-800 font-bold bg-teal-50' : 'text-slate-500 hover:bg-slate-50'}`}>
              All sections <Count n={c.total} />
            </button>
            {c.sections.map((x) => (
              <button key={x.sectionId} type="button" onClick={() => setParam({ section: String(x.sectionId) })}
                className={`w-full flex items-center px-2.5 py-1 rounded-md text-xs ${sec === String(x.sectionId) ? 'text-teal-800 font-bold bg-teal-50' : 'text-slate-500 hover:bg-slate-50'}`}>
                Section {x.name} <Count n={x.total} />
              </button>
            ))}
            {c.noSection && (
              <button type="button" onClick={() => setParam({ section: 'none' })}
                className={`w-full flex items-center px-2.5 py-1 rounded-md text-xs ${sec === 'none' ? 'text-amber-800 font-bold bg-amber-50' : 'text-amber-700 hover:bg-amber-50'}`}>
                No section yet <Count n={c.noSection.total} />
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-5 space-y-4 min-w-0">
      {/* ── Header ── */}
      <header className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 flex flex-wrap items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-teal-50 grid place-items-center text-teal-700"><Users size={22} /></div>
        <div className="min-w-[13rem] flex-1">
          <h1 className="text-lg font-bold text-slate-900">Students</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {dir ? <><b className="text-slate-700">{dir.totals.total}</b> {tab === 'inactive' ? 'who have left' : 'studying now'} · {dir.totals.boys} boys · {dir.totals.girls} girls{tab === 'active' && dir.totals.newThisMonth ? ` · ${dir.totals.newThisMonth} admitted this month` : ''}</> : 'Loading…'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && <button type="button" onClick={admitHere} className="inline-flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-3.5 py-2 rounded-lg"><UserPlus size={15} /> Admit student</button>}
          {canManage && <Link to="/students/bulk-import" className="inline-flex items-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-3.5 py-2 rounded-lg"><Upload size={15} /> Import &amp; Export</Link>}
        </div>
      </header>

      {/* ── Search and tabs ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[16rem] max-w-2xl">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input ref={searchRef} value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Find any student: name, roll no, father's name, parent's phone, B-Form or family no."
            aria-label="Search students"
            className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" />
          {searchInput
            ? <button type="button" onClick={() => setSearchInput('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"><X size={16} /></button>
            : <kbd className="hidden md:block absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 border border-slate-200 rounded px-1.5">/</kbd>}
        </div>
        <div className="inline-flex bg-slate-100 rounded-xl p-1 text-sm font-semibold" role="tablist" aria-label="Which students">
          {[['active', 'Current students'], ['inactive', 'Left & inactive']].map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setParam({ tab: k === 'active' ? '' : k, class: '', section: '' })}
              className={`px-3.5 py-1.5 rounded-lg ${tab === k ? 'bg-white shadow-sm text-teal-800' : 'text-slate-500 hover:text-slate-700'}`}>{label}</button>
          ))}
        </div>
      </div>

      {canManage && dupGroups.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-900">
          <div className="flex flex-wrap items-center gap-2">
            <b>{dupGroups.length} roll number{dupGroups.length === 1 ? ' is' : 's are'} given to more than one student.</b>
            <span className="text-red-800">Each student needs their own: open one and change it with Edit record.</span>
            <button type="button" onClick={() => setShowDups((v) => !v)} className="ml-auto text-xs font-bold underline">{showDups ? 'Hide' : 'Show them'}</button>
          </div>
          {showDups && (
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {dupGroups.map(([roll, list]) => (
                <li key={roll} className="bg-white/70 rounded-lg px-3 py-2">
                  <span className="font-mono font-bold">{roll}</span>
                  <span className="text-red-800">: </span>
                  {list.map((d, i) => (
                    <span key={d.id}>{i > 0 && ', '}<Link to={`/students/${d.id}`} className="font-semibold underline">{d.name}</Link><span className="text-red-700/80"> ({d.class?.name || 'no class'}{d.status !== 'active' ? `, ${d.status}` : ''})</span></span>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[230px_minmax(0,1fr)] items-start">
        {/* ── Classes ── */}
        <nav aria-label="Classes" className="hidden md:block bg-white rounded-2xl border border-slate-200 p-2 sticky top-3 max-h-[calc(100vh-7rem)] overflow-y-auto">
          <p className="px-3 pt-1.5 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Classes</p>
          <button type="button" onClick={() => { setSearchInput(''); setParam({ class: 'all', section: '', q: '' }); }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm ${!searching && current === 'all' ? 'bg-teal-700 text-white font-semibold' : 'text-slate-700 hover:bg-slate-100'}`}>
            All students <Count n={dir?.totals.total || 0} active={!searching && current === 'all'} />
          </button>
          <div className="my-1.5 border-t border-slate-100" />
          {dirLoading && <p className="px-3 py-4 text-xs text-slate-400">Loading classes…</p>}
          <div className="space-y-0.5">{dirClasses.map(classRow)}</div>
          {dir?.noClass && (
            <button type="button" onClick={() => setParam({ class: 'none', section: '' })}
              className={`mt-1 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm ${current === 'none' ? 'bg-amber-500 text-white font-semibold' : 'text-amber-700 hover:bg-amber-50'}`}>
              No class yet <Count n={dir.noClass.total} active={current === 'none'} />
            </button>
          )}
          {!dirLoading && !dirClasses.length && (
            <div className="p-3 text-xs text-slate-500">No classes yet. <Link to="/settings" className="text-teal-700 font-semibold underline">Add classes in School Settings</Link>.</div>
          )}
        </nav>

        {/* Small screens: classes as a list to choose from */}
        <div className="md:hidden grid grid-cols-2 gap-2">
          <select aria-label="Class" value={current} onChange={(e) => setParam({ class: e.target.value, section: '' })} className="border border-slate-300 rounded-lg px-2.5 py-2 text-sm bg-white">
            <option value="all">All students ({dir?.totals.total || 0})</option>
            {dirClasses.map((c) => <option key={c.classId} value={c.classId}>{c.name} ({c.total})</option>)}
            {dir?.noClass && <option value="none">No class yet ({dir.noClass.total})</option>}
          </select>
          <select aria-label="Section" value={sec} onChange={(e) => setParam({ section: e.target.value })} disabled={!currentClass?.sections.length} className="border border-slate-300 rounded-lg px-2.5 py-2 text-sm bg-white disabled:opacity-50">
            <option value="">All sections</option>
            {(currentClass?.sections || []).map((x) => <option key={x.sectionId} value={x.sectionId}>Section {x.name} ({x.total})</option>)}
            {currentClass?.noSection && <option value="none">No section yet</option>}
          </select>
        </div>

        {/* ── The list ── */}
        <section className="bg-white rounded-2xl border border-slate-200 min-w-0">
          <div className="px-4 md:px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center gap-3">
            <div className="min-w-0 mr-auto">
              <h2 className="text-base font-bold text-slate-900 truncate">{heading}</h2>
              <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                {searching
                  ? `${total} found in every class${total > students.length ? ` · showing ${students.length}` : ''}`
                  : counts ? `${counts.total} students · ${counts.boys} boys · ${counts.girls} girls${counts.newThisMonth ? ` · ${counts.newThisMonth} new this month` : ''}` : ''}
              </p>
            </div>
            {!searching && (
              <label className="text-xs text-slate-500 flex items-center gap-1.5">Order
                <select value={sort} onChange={(e) => setParam({ sort: e.target.value === 'roll' ? '' : e.target.value })} className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs bg-white">
                  <option value="roll">Roll number</option>
                  <option value="name">Name</option>
                  <option value="admission">Newest admission</option>
                </select>
              </label>
            )}
            <button type="button" onClick={printList} disabled={!students.length} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-40"><Printer size={14} /> Print list</button>
            {canManage && currentClass && !searching && tab === 'active' && (
              <button type="button" onClick={() => setPromoteRow({ classId: currentClass.classId, className: currentClass.name, sectionId: currentSection?.sectionId || null, sectionName: currentSection?.name || '' })}
                disabled={!counts?.total} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-40"><TrendingUp size={14} /> Promote</button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50">
                  <th className="text-left font-semibold px-4 py-2.5 w-10">#</th>
                  <th className="text-left font-semibold px-2 py-2.5">Student</th>
                  <th className="text-left font-semibold px-2 py-2.5">Roll no</th>
                  <th className="text-left font-semibold px-2 py-2.5">Father's name</th>
                  {(searching || current === 'all') && <th className="text-left font-semibold px-2 py-2.5">Class</th>}
                  <th className="text-left font-semibold px-2 py-2.5">Parent phone</th>
                  <th className="text-left font-semibold px-2 py-2.5">Record</th>
                  <th className="text-right font-semibold px-4 py-2.5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className={isFetching && !listLoading ? 'opacity-60 transition-opacity' : ''}>
                {students.map((s, i) => (
                  <tr key={s.id} onClick={() => open(s)} className="border-t border-slate-100 hover:bg-teal-50/50 cursor-pointer group">
                    <td className="px-4 py-2 text-slate-400 tabular-nums">{i + 1}</td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2.5 min-w-[12rem]">
                        <span onClick={(e) => e.stopPropagation()}><StudentPhotoButton student={s} size={34} showLabel={false} /></span>
                        <div className="min-w-0">
                          <Link to={`/students/${s.id}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); open(s); }} className="font-semibold text-slate-900 group-hover:text-teal-800 truncate block">{s.name}</Link>
                          <span className="text-[11px] text-slate-400 capitalize">{[s.gender, s.status !== 'active' && s.status].filter(Boolean).join(' · ')}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2 font-mono text-[13px] text-teal-700 font-semibold whitespace-nowrap">
                      {s.rollNo || '—'}
                      {dupRolls.has(s.rollNo) && <span title="Another student has the same roll number" className="ml-1.5 font-sans text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 rounded px-1 py-0.5">same roll no</span>}
                    </td>
                    <td className="px-2 py-2 text-slate-600">{s.fatherName || '—'}</td>
                    {(searching || current === 'all') && <td className="px-2 py-2 text-slate-600 whitespace-nowrap">{s.class?.name || <span className="text-amber-600">No class</span>}{s.section?.name ? ` – ${s.section.name}` : ''}</td>}
                    <td className="px-2 py-2 text-slate-600 whitespace-nowrap tabular-nums">{s.emergencyPhone || '—'}</td>
                    <td className="px-2 py-2"><MissingBadge student={s} /></td>
                    <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-1">
                        <StudentRowActions student={s} compact />
                        <ChevronRight size={16} className="text-slate-300 group-hover:text-teal-600" />
                      </div>
                    </td>
                  </tr>
                ))}
                {listLoading && <tr><td colSpan={8} className="p-10 text-center text-slate-400">Loading students…</td></tr>}
                {!listLoading && !students.length && (
                  <tr><td colSpan={8} className="p-10 text-center">
                    <FolderOpen className="mx-auto text-slate-300" size={36} />
                    <p className="mt-2 font-semibold text-slate-700">{searching ? 'No student matches that search.' : tab === 'inactive' ? 'No students here have left.' : `No students in ${heading} yet.`}</p>
                    <p className="text-sm text-slate-500 mt-1">{searching ? 'Check the spelling, or search by roll number or the parent\'s phone.' : canManage && tab === 'active' ? 'Admit the first one, or bring a whole class in from Excel.' : ''}</p>
                    {canManage && tab === 'active' && !searching && (
                      <div className="mt-4 flex justify-center gap-2">
                        <button type="button" onClick={admitHere} className="inline-flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-3.5 py-2 rounded-lg"><UserPlus size={15} /> Admit a student{currentClass ? ` to ${currentClass.name}` : ''}</button>
                        <Link to="/students/bulk-import" className="inline-flex items-center gap-1.5 border border-slate-300 text-sm font-semibold px-3.5 py-2 rounded-lg hover:bg-slate-50"><Upload size={15} /> Import from Excel</Link>
                      </div>
                    )}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          {students.length < total && (searching || current === 'all') && (
            <div className="p-3 border-t border-slate-100 text-center">
              {students.length >= 300
                ? <p className="text-xs text-slate-500">Showing the first 300. Choose a class, or search, to find the rest.</p>
                : <button type="button" onClick={() => setPages((p) => p + 1)} className="text-sm font-semibold text-teal-700 hover:underline">Show more ({total - students.length} more)</button>}
            </div>
          )}
        </section>
      </div>

      {promoteRow && <PromoteModal row={promoteRow} classes={classes} onClose={() => setPromoteRow(null)} />}
    </div>
  );
}
