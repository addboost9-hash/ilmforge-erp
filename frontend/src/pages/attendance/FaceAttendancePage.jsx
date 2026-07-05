/**
 * IlmForge — Face Recognition Attendance (Webcam Kiosk)
 * ═══════════════════════════════════════════════════════
 * Mode 1: ENROLL — student select → webcam photo capture → save
 * Mode 2: KIOSK  — camera on → student apna face dikhata hai →
 *          operator/auto match → confirm → attendance PRESENT auto
 * 🔗 LINKED: recognize-mark → punch record → attendance auto (first IN)
 */
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import { Camera, ScanFace, UserPlus, CheckCircle2, RefreshCw, Search } from 'lucide-react';

export default function FaceAttendancePage() {
  const qc = useQueryClient();
  const [mode, setMode] = useState('kiosk'); // kiosk | enroll
  const [camOn, setCamOn] = useState(false);
  const [captured, setCaptured] = useState(null);
  const [selStudent, setSelStudent] = useState(null);
  const [search, setSearch] = useState('');
  const [flash, setFlash] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const { data: students = [] } = useQuery({
    queryKey: ['face-students', search],
    queryFn: () => api.get('/students', { params: { search, limit: 20, status: 'active' } }).then(r => r.data.data || []),
    enabled: search.length >= 2,
  });
  const { data: enrollments = [] } = useQuery({
    queryKey: ['face-enrollments'],
    queryFn: () => api.get('/face/enrollments').then(r => r.data.data || []),
  });

  /* ── Webcam controls ── */
  const startCam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 360, facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCamOn(true);
    } catch { setFlash({ ok: false, msg: 'Camera access denied — browser permission dein' }); }
  };
  const stopCam = () => { streamRef.current?.getTracks().forEach(t => t.stop()); setCamOn(false); };
  useEffect(() => () => stopCam(), []);

  const capture = () => {
    const v = videoRef.current; if (!v) return;
    const cv = document.createElement('canvas');
    cv.width = 240; cv.height = 180;
    cv.getContext('2d').drawImage(v, 0, 0, 240, 180);
    setCaptured(cv.toDataURL('image/jpeg', 0.7));
  };

  /* ── Mutations ── */
  const enroll = useMutation({
    mutationFn: () => api.post('/face/enroll', { personId: selStudent.id, photoData: captured }),
    onSuccess: () => {
      setFlash({ ok: true, msg: `${selStudent.name} enrolled ✓` });
      setCaptured(null); setSelStudent(null); setSearch('');
      qc.invalidateQueries({ queryKey: ['face-enrollments'] });
      setTimeout(() => setFlash(null), 3000);
    },
  });
  const recognizeMark = useMutation({
    mutationFn: (personId) => api.post('/face/recognize-mark', { personId }),
    onSuccess: (r, personId) => {
      const p = enrollments.find(e => e.personId === personId)?.person;
      setFlash({ ok: true, msg: `${p?.name || 'Student'} — Attendance ${r.data.attendanceMarked ? 'MARKED ✓' : 'already marked today'}` });
      setTimeout(() => setFlash(null), 3500);
      qc.invalidateQueries({ queryKey: ['bio-punches'] });
    },
  });

  const btn = 'px-5 py-2.5 rounded-xl text-sm font-bold transition';
  const enrolledStudents = enrollments.filter(e => e.person);

  return (
    <div className="space-y-5">
      {/* Mode switch */}
      <div className="flex gap-2">
        <button onClick={() => setMode('kiosk')} className={`${btn} ${mode === 'kiosk' ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/25' : 'bg-white border border-slate-200 text-slate-600'}`}>
          <ScanFace className="w-4 h-4 inline mr-1.5" />Recognition Kiosk
        </button>
        <button onClick={() => setMode('enroll')} className={`${btn} ${mode === 'enroll' ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/25' : 'bg-white border border-slate-200 text-slate-600'}`}>
          <UserPlus className="w-4 h-4 inline mr-1.5" />Enroll Faces ({enrolledStudents.length})
        </button>
      </div>

      {flash && (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${flash.ok ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
          {flash.ok && <CheckCircle2 className="w-4 h-4" />}{flash.msg}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* ── Camera panel ── */}
        <div className="bg-gradient-to-br from-violet-950 to-slate-900 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold flex items-center gap-2"><Camera className="w-4 h-4 text-violet-400" /> Camera {mode === 'kiosk' ? '— Kiosk Mode' : '— Enrollment'}</span>
            {camOn
              ? <button onClick={stopCam} className="text-[11px] font-bold bg-red-500/20 text-red-300 px-3 py-1.5 rounded-lg">Stop</button>
              : <button onClick={startCam} className="text-[11px] font-bold bg-violet-500 px-3 py-1.5 rounded-lg">Start Camera</button>}
          </div>
          <div className="relative rounded-xl overflow-hidden bg-black/40 aspect-[4/3] flex items-center justify-center">
            <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${camOn ? '' : 'hidden'}`} />
            {!camOn && <div className="text-center text-slate-400 text-xs"><ScanFace className="w-10 h-10 mx-auto mb-2 opacity-40" />Camera off — Start dabayein</div>}
            {camOn && <div className="absolute inset-8 border-2 border-violet-400/60 rounded-2xl pointer-events-none" style={{ boxShadow: '0 0 0 999px rgba(0,0,0,0.25)' }} />}
          </div>
          {mode === 'enroll' && camOn && (
            <button onClick={capture} className="w-full mt-3 bg-violet-500 hover:bg-violet-400 font-bold text-sm py-2.5 rounded-xl transition">📸 Capture Photo</button>
          )}
          {captured && mode === 'enroll' && (
            <div className="mt-3 flex items-center gap-3 bg-white/10 rounded-xl p-2.5">
              <img src={captured} alt="captured" className="w-16 h-12 rounded-lg object-cover" />
              <span className="text-xs text-slate-300 flex-1">Photo captured — ab student select karke Enroll dabayein</span>
              <button onClick={() => setCaptured(null)} className="text-slate-400 hover:text-white"><RefreshCw className="w-4 h-4" /></button>
            </div>
          )}
        </div>

        {/* ── Right panel ── */}
        {mode === 'enroll' ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-800 text-sm mb-3">Student Select karein</h3>
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Naam ya roll no…"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 outline-none" />
            </div>
            <div className="space-y-1.5 max-h-52 overflow-y-auto mb-4">
              {students.map(s => (
                <button key={s.id} onClick={() => setSelStudent(s)}
                  className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition ${selStudent?.id === s.id ? 'border-violet-500 bg-violet-50' : 'border-slate-100 hover:border-slate-200'}`}>
                  <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-bold">{s.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                  <div><div className="text-sm font-semibold text-slate-700">{s.name}</div><div className="text-[10px] text-slate-400">{s.rollNo} · {s.class?.name}</div></div>
                  {enrollments.some(e => e.personId === s.id) && <span className="ml-auto text-[9px] font-bold bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full">ENROLLED</span>}
                </button>
              ))}
              {search.length >= 2 && !students.length && <p className="text-xs text-slate-400 text-center py-4">Koi student nahi mila</p>}
            </div>
            <button onClick={() => enroll.mutate()} disabled={!selStudent || !captured || enroll.isPending}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm py-3 rounded-xl disabled:opacity-40 transition">
              {enroll.isPending ? 'Saving…' : `✓ Enroll ${selStudent?.name || 'Student'}`}
            </button>
            <p className="text-[10px] text-slate-400 mt-2">Photo + face data save hoga. face-api.js descriptors optional plug-in ready hain.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-800 text-sm mb-1">Enrolled Students — tap to mark</h3>
            <p className="text-[11px] text-slate-400 mb-3">Camera mein face dekh kar student pe tap karein → attendance PRESENT auto. (Auto-match ke liye face-api.js models add ho sakte hain)</p>
            <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
              {enrolledStudents.map(e => (
                <button key={e.personId} onClick={() => recognizeMark.mutate(e.personId)}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-100 hover:border-violet-300 hover:bg-violet-50/50 text-left transition">
                  {e.photoData
                    ? <img src={e.photoData} alt={e.person.name} className="w-11 h-11 rounded-xl object-cover" />
                    : <div className="w-11 h-11 rounded-xl bg-violet-100" />}
                  <div className="min-w-0"><div className="text-xs font-bold text-slate-700 truncate">{e.person.name}</div><div className="text-[10px] text-slate-400">{e.person.rollNo}</div></div>
                </button>
              ))}
              {!enrolledStudents.length && <p className="col-span-2 text-xs text-slate-400 text-center py-8">Pehle "Enroll Faces" mode se students enroll karein</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
