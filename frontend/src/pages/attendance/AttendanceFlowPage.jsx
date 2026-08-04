/**
 * IlmForge — LINKED ATTENDANCE FLOW (onboarding style)
 * ═══════════════════════════════════════════════════════
 * Step 1: Select Class + Date  →  Step 2: Mark (one-tap per student)
 * →  Step 3: Save & Auto-notify absent parents
 * Everything linked: class → students auto-load → absent → parent SMS
 * → dashboard stats → student portal → parent portal (sab jagah reflect).
 */
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import {
  CalendarDays, Users, CheckCircle2, XCircle, Clock3, Send,
  ChevronRight, ChevronLeft, UserCheck, MessageSquare, Sparkles,
} from 'lucide-react';

const todayStr = () => new Date().toISOString().split('T')[0];

export default function AttendanceFlowPage() {
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [date, setDate] = useState(todayStr());
  const [marks, setMarks] = useState({});      // studentId -> present|absent|late|leave
  const [notifyAbsent, setNotifyAbsent] = useState(true);
  const [saved, setSaved] = useState(null);

  const { data: classes = [] } = useQuery({
    queryKey: ['att-classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data || []),
  });
  const selectedClass = classes.find(c => String(c.id) === String(classId));
  const sections = selectedClass?.sections || [];

  const { data: students = [], isFetching } = useQuery({
    queryKey: ['att-students', classId, sectionId],
    queryFn: () => api.get('/students', { params: { classId, ...(sectionId && { sectionId }), status: 'active', limit: 200 } })
      .then(r => r.data.data || []),
    enabled: !!classId && step === 2,
  });

  // Pre-existing attendance for this date (edit mode)
  useQuery({
    queryKey: ['att-existing', classId, date],
    queryFn: () => api.get('/attendance', { params: { classId, date } }).then(r => {
      const existing = {};
      (r.data.data || []).forEach(a => { existing[a.studentId] = a.status; });
      if (Object.keys(existing).length) setMarks(m => ({ ...existing, ...m }));
      return r.data.data;
    }).catch(() => []),
    enabled: !!classId && step === 2,
  });

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, leave: 0, unmarked: 0 };
    students.forEach(s => { const st = marks[s.id]; if (st) c[st] = (c[st] || 0) + 1; else c.unmarked++; });
    return c;
  }, [students, marks]);

  const markAll = (status) => {
    const m = {};
    students.forEach(s => { m[s.id] = status; });
    setMarks(m);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const records = students
        .filter(s => marks[s.id])
        .map(s => ({ studentId: s.id, status: marks[s.id], date, classId: parseInt(classId) }));
      const res = await api.post('/attendance/save', { records, date, classId: parseInt(classId) });
      // LINKED: auto-notify absent parents
      let notified = 0;
      if (notifyAbsent) {
        const absentees = students.filter(s => marks[s.id] === 'absent' && s.emergencyPhone);
        for (const s of absentees.slice(0, 50)) {
          await api.post('/notifications/sms', {
            phone: s.emergencyPhone,
            message: `Dear Parent, aapka bachcha ${s.name} (${s.rollNo}) aaj ${date} ko school se ABSENT hai. — ${''}School`,
          }).then(() => notified++).catch(() => {});
        }
      }
      return { saved: records.length, notified, absent: counts.absent };
    },
    onSuccess: (data) => {
      setSaved(data);
      setStep(3);
      qc.invalidateQueries({ queryKey: ['att-existing'] });
    },
  });

  const STATUS = [
    { key: 'present', label: 'P', full: 'Present', color: 'bg-teal-500', ring: 'ring-teal-500', text: 'text-teal-700', bg: 'bg-teal-50' },
    { key: 'absent',  label: 'A', full: 'Absent',  color: 'bg-red-500',  ring: 'ring-red-500',  text: 'text-red-700',  bg: 'bg-red-50' },
    { key: 'late',    label: 'L', full: 'Late',    color: 'bg-amber-500', ring: 'ring-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
    { key: 'leave',   label: 'LV', full: 'Leave',  color: 'bg-blue-500', ring: 'ring-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
  ];

  /* ─────────── STEP 3: SUCCESS ─────────── */
  if (step === 3 && saved) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-9 h-9 text-teal-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-800">Attendance Saved!</h1>
        <p className="text-sm text-slate-500 mt-1">{selectedClass?.name} · {date}</p>

        <div className="grid grid-cols-3 gap-3 my-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-2xl font-bold text-slate-800">{saved.saved}</div>
            <div className="text-[11px] text-slate-500 font-semibold">Records Saved</div>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <div className="text-2xl font-bold text-red-600">{saved.absent}</div>
            <div className="text-[11px] text-red-500 font-semibold">Absent</div>
          </div>
          <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
            <div className="text-2xl font-bold text-teal-600">{saved.notified}</div>
            <div className="text-[11px] text-teal-600 font-semibold">Parents Notified</div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left mb-6">
          <div className="text-[11px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Auto-linked updates</div>
          <div className="space-y-1 text-xs text-slate-600">
            <div>✅ Dashboard attendance stats updated</div>
            <div>✅ Student portals — attendance visible</div>
            <div>✅ Parent portals — attendance visible</div>
            {saved.notified > 0 && <div>✅ {saved.notified} absent parents ko SMS gaya</div>}
            <div>✅ Attendance reports mein counted</div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => { setStep(1); setMarks({}); setSaved(null); setClassId(''); }}
            className="flex-1 border border-slate-300 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-50 transition">
            Mark Another Class
          </button>
          <button onClick={() => { setStep(2); setSaved(null); }}
            className="flex-1 bg-teal-600 text-white font-semibold py-3 rounded-xl hover:bg-teal-700 transition">
            Edit This Attendance
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">Mark Attendance</h1>
        <p className="text-sm text-slate-500">Class select karo → students auto → mark → absent parents auto-notify</p>
      </div>

      {/* Mini stepper */}
      <div className="flex items-center gap-2 mb-6">
        {['Class & Date', 'Mark Students', 'Save & Notify'].map((l, i) => (
          <div key={i} className="flex items-center gap-2 flex-1 last:flex-none">
            <div className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold transition
              ${step === i + 1 ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/25'
              : step > i + 1 ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-400'}`}>
              <span className="w-4.5 h-4.5 rounded-full bg-white/25 flex items-center justify-center text-[10px]" style={{width:18,height:18}}>{step > i + 1 ? '✓' : i + 1}</span>
              {l}
            </div>
            {i < 2 && <div className={`h-0.5 flex-1 rounded ${step > i + 1 ? 'bg-teal-400' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      {/* ─────────── STEP 1 ─────────── */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
              <CalendarDays className="w-3.5 h-3.5 inline mr-1" /> Date
            </label>
            <input type="date" value={date} max={todayStr()} onChange={e => setDate(e.target.value)}
              className="w-full sm:w-64 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
              <Users className="w-3.5 h-3.5 inline mr-1" /> Select Class
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {classes.map(c => (
                <button key={c.id} onClick={() => { setClassId(String(c.id)); setSectionId(''); }}
                  className={`p-3.5 rounded-xl border-2 text-left transition ${String(c.id) === classId
                    ? 'border-teal-500 bg-teal-50 shadow-sm' : 'border-slate-200 hover:border-teal-200 bg-white'}`}>
                  <div className="font-bold text-sm text-slate-800">{c.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{c._count?.students ?? c.studentCount ?? ''} {c._count?.students != null ? 'students' : ''}</div>
                </button>
              ))}
            </div>
          </div>
          {sections.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Section (optional)</label>
              <div className="flex gap-2 flex-wrap">
                {sections.map(s => (
                  <button key={s.id} onClick={() => setSectionId(sectionId === String(s.id) ? '' : String(s.id))}
                    className={`px-4 py-2 rounded-full text-xs font-bold border-2 transition ${sectionId === String(s.id)
                      ? 'border-teal-500 bg-teal-500 text-white' : 'border-slate-200 text-slate-600 hover:border-teal-300'}`}>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end pt-2">
            <button onClick={() => classId && setStep(2)} disabled={!classId}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/25 disabled:opacity-40 transition">
              Load Students <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─────────── STEP 2: MARK ─────────── */}
      {step === 2 && (
        <>
          {/* Sticky summary bar */}
          <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border border-slate-200 rounded-2xl p-3 mb-4 flex items-center gap-3 shadow-sm">
            <div className="flex gap-2 flex-1 flex-wrap">
              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-teal-50 text-teal-700">P {counts.present}</span>
              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-red-50 text-red-600">A {counts.absent}</span>
              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-amber-50 text-amber-600">L {counts.late}</span>
              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-500">— {counts.unmarked}</span>
            </div>
            <button onClick={() => markAll('present')}
              className="text-xs font-bold text-teal-600 hover:bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200 transition whitespace-nowrap">
              ✓ All Present
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-50 mb-4">
            {isFetching && <div className="p-8 text-center text-sm text-slate-400">Loading students…</div>}
            {!isFetching && students.map(s => {
              const cur = marks[s.id];
              return (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                    ${cur === 'present' ? 'bg-teal-100 text-teal-700' : cur === 'absent' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                    {s.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-800 truncate">{s.name}</div>
                    <div className="text-[11px] text-slate-400">{s.rollNo}</div>
                  </div>
                  <div className="flex gap-1.5">
                    {STATUS.map(st => (
                      <button key={st.key} onClick={() => setMarks(m => ({ ...m, [s.id]: st.key }))}
                        className={`w-9 h-9 rounded-lg text-[11px] font-bold border-2 transition
                          ${cur === st.key ? `${st.color} text-white border-transparent shadow` : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* LINKED: notify option */}
          <label className="flex items-center gap-3 bg-white border-2 border-teal-200 rounded-xl p-4 mb-4 cursor-pointer">
            <input type="checkbox" checked={notifyAbsent} onChange={e => setNotifyAbsent(e.target.checked)} className="w-5 h-5 accent-teal-600" />
            <MessageSquare className="w-4 h-4 text-teal-600" />
            <div>
              <div className="text-sm font-bold text-slate-800">🔗 Absent students ke parents ko auto SMS bhejo</div>
              <div className="text-xs text-slate-500">Save karte hi absent bachon ke parents ko notification chali jayegi</div>
            </div>
          </label>

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || counts.unmarked === students.length}
              className="flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/25 disabled:opacity-50 transition">
              <Send className="w-4 h-4" /> {saveMutation.isPending ? 'Saving…' : `Save ${students.length - counts.unmarked} Records`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
