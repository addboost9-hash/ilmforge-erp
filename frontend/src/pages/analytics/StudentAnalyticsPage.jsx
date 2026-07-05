/** Student Performance Analytics — class averages, attendance trends, top performers */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { TrendingUp, Award, Users } from 'lucide-react';

export default function StudentAnalyticsPage() {
  const [classId, setClassId] = useState('');
  const { data: classes = [] } = useQuery({ queryKey: ['an-classes'], queryFn: () => api.get('/classes').then(r => r.data.data || []) });
  const { data: exams = [] } = useQuery({ queryKey: ['an-exams'], queryFn: () => api.get('/exams').then(r => r.data.data || []) });
  const { data: dash } = useQuery({ queryKey: ['an-dash'], queryFn: () => api.get('/dashboard/stats').then(r => r.data.data || r.data) });

  // Exam results for selected class exams
  const classExams = exams.filter(e => !classId || String(e.classId) === String(classId)).slice(0, 6);
  const { data: resultSets = [] } = useQuery({
    queryKey: ['an-results', classExams.map(e => e.id).join(',')],
    queryFn: async () => {
      const out = [];
      for (const ex of classExams) {
        const r = await api.get(`/exams/${ex.id}/results`).then(r => r.data.data || []).catch(() => []);
        if (r.length) out.push({ exam: ex.title?.slice(0, 14), avg: Math.round(r.reduce((a, x) => a + (x.percentage || 0), 0) / r.length), results: r });
      }
      return out;
    },
    enabled: classExams.length > 0,
  });

  // Top performers from latest exam
  const latest = resultSets[0]?.results || [];
  const top5 = [...latest].sort((a, b) => (b.percentage || 0) - (a.percentage || 0)).slice(0, 5);

  const att = dash?.attendance || {};
  const attData = [
    { name: 'Present', v: att.present || 0 }, { name: 'Absent', v: att.absent || 0 },
    { name: 'Late', v: att.late || 0 }, { name: 'Leave', v: att.leave || 0 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-teal-600" /> Performance Analytics</h3>
        <select value={classId} onChange={e => setClassId(e.target.value)} className="ml-auto px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none">
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h4 className="text-xs font-bold text-slate-500 uppercase mb-4">Exam-wise Average % (trend)</h4>
          <div style={{ height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={[...resultSets].reverse()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="exam" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                <Tooltip /><Line type="monotone" dataKey="avg" stroke="#0D9488" strokeWidth={2.5} dot={{ r: 4, fill: '#0D9488' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {!resultSets.length && <p className="text-xs text-slate-400 text-center -mt-24">Results enter hone ke baad trend yahan dikhega</p>}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h4 className="text-xs font-bold text-slate-500 uppercase mb-4">Today's Attendance Split</h4>
          <div style={{ height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={attData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} />
                <Tooltip /><Bar dataKey="v" radius={[8, 8, 0, 0]} fill="#0D9488" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-amber-500" /> Top Performers — {resultSets[0]?.exam || 'Latest Exam'}</h4>
        <div className="grid sm:grid-cols-5 gap-2.5">
          {top5.map((s, i) => (
            <div key={i} className={`rounded-xl p-3 text-center border ${i === 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
              <div className="text-lg">{['🥇', '🥈', '🥉', '🏅', '🏅'][i]}</div>
              <div className="text-xs font-bold text-slate-800 truncate">{s.studentName || s.student?.name}</div>
              <div className="text-[11px] font-extrabold" style={{ color: '#0D9488' }}>{s.percentage}%</div>
            </div>
          ))}
          {!top5.length && <p className="col-span-5 text-xs text-slate-400 text-center py-4">Marks entry ke baad top performers yahan aayenge</p>}
        </div>
      </div>
    </div>
  );
}
