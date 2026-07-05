/** Admissions CRM — lead pipeline (new→contacted→visited→admitted) + follow-ups */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { Plus, Phone, TrendingUp, MessageCircle } from 'lucide-react';

const STAGES = [
  { id: 'new',       label: 'New Leads',  color: '#3B82F6' },
  { id: 'contacted', label: 'Contacted',  color: '#F59E0B' },
  { id: 'visited',   label: 'Visited',    color: '#8B5CF6' },
  { id: 'admitted',  label: 'Admitted ✓', color: '#10B981' },
  { id: 'lost',      label: 'Lost',       color: '#94A3B8' },
];

export default function AdmissionCRMPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ studentName: '', parentName: '', phone: '', classApplied: '', source: 'walk-in', notes: '' });
  const [fuLead, setFuLead] = useState(null);
  const [fuNote, setFuNote] = useState('');
  const [convertLeadRow, setConvertLeadRow] = useState(null);
  const [convertForm, setConvertForm] = useState({ classId: '', sectionId: '', remarks: 'Converted from CRM' });

  const { data } = useQuery({ queryKey: ['crm-leads'], queryFn: () => api.get('/crm/leads').then(r => r.data) });
  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then(r => r.data.data || []) });
  const leads = data?.data || [];
  const stats = data?.stats || {};

  const addLead = useMutation({
    mutationFn: () => api.post('/crm/leads', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm-leads'] }); setShowAdd(false); setForm({ studentName: '', parentName: '', phone: '', classApplied: '', source: 'walk-in', notes: '' }); },
  });
  const moveStage = useMutation({
    mutationFn: ({ id, stage }) => api.put(`/crm/leads/${id}/stage`, { stage }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-leads'] }),
  });
  const addFollowUp = useMutation({
    mutationFn: () => api.post(`/crm/leads/${fuLead.id}/followup`, { note: fuNote }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm-leads'] }); setFuLead(null); setFuNote(''); },
  });
  const convertLead = useMutation({
    mutationFn: ({ id, payload }) => api.post(`/crm/leads/${id}/convert`, payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['crm-leads'] });
      const studentName = res?.data?.data?.student?.name || 'Lead';
      toast.success(`${studentName} converted to student`);
      setConvertLeadRow(null);
      setConvertForm({ classId: '', sectionId: '', remarks: 'Converted from CRM' });
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Lead conversion failed'),
  });

  const selectedClass = classes.find(c => String(c.id) === String(convertForm.classId));
  const selectedSections = selectedClass?.sections || [];

  const submitConvertLead = () => {
    if (!convertLeadRow) return;
    const payload = { remarks: convertForm.remarks || undefined };
    if (convertForm.classId) payload.classId = parseInt(convertForm.classId);
    if (convertForm.sectionId) payload.sectionId = parseInt(convertForm.sectionId);
    convertLead.mutate({ id: convertLeadRow.id, payload });
  };

  const input = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-500';
  const conversionRate = stats.admitted && leads.length ? Math.round(stats.admitted / leads.length * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Stats + add */}
      <div className="flex items-center gap-3 flex-wrap">
        {STAGES.map(s => (
          <div key={s.id} className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-xs font-bold text-slate-600">{s.label}</span>
            <span className="text-sm font-extrabold text-slate-800">{stats[s.id] || 0}</span>
          </div>
        ))}
        <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-teal-600" /><span className="text-xs font-bold text-teal-700">Conversion {conversionRate}%</span>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="ml-auto flex items-center gap-1.5 bg-teal-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl">
          <Plus className="w-4 h-4" /> New Lead
        </button>
      </div>

      {showAdd && (
        <div className="bg-white border border-teal-200 rounded-2xl p-4 grid sm:grid-cols-3 gap-2.5">
          <input className={input} placeholder="Student name *" value={form.studentName} onChange={e => setForm({ ...form, studentName: e.target.value })} />
          <input className={input} placeholder="Parent name *" value={form.parentName} onChange={e => setForm({ ...form, parentName: e.target.value })} />
          <input className={input} placeholder="Phone *" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          <input className={input} placeholder="Class applied (Class 5)" value={form.classApplied} onChange={e => setForm({ ...form, classApplied: e.target.value })} />
          <select className={input} value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
            <option value="walk-in">Walk-in</option><option value="call">Phone Call</option><option value="website">Website</option><option value="referral">Referral</option>
          </select>
          <button onClick={() => addLead.mutate()} disabled={!form.studentName || !form.phone} className="bg-teal-600 text-white font-bold text-sm rounded-xl disabled:opacity-40">Save Lead</button>
        </div>
      )}

      {/* Pipeline columns */}
      <div className="grid md:grid-cols-5 gap-3 items-start">
        {STAGES.map(stage => (
          <div key={stage.id} className="bg-slate-50 rounded-2xl p-2.5 min-h-[200px]">
            <div className="text-[11px] font-extrabold uppercase tracking-wide px-2 py-1.5 mb-2" style={{ color: stage.color }}>{stage.label}</div>
            <div className="space-y-2">
              {leads.filter(l => l.stage === stage.id).map(l => (
                <div key={l.id} className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                  <div className="text-sm font-bold text-slate-800">{l.studentName}</div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{l.parentName} · {l.phone}</div>
                  {l.classApplied && <span className="inline-block mt-1.5 text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{l.classApplied}</span>}
                  {l.followUps?.[0] && <div className="text-[10px] text-slate-400 mt-1.5 italic">"{l.followUps[0].note.slice(0, 40)}…"</div>}
                  <div className="flex gap-1 mt-2.5">
                    <button onClick={() => setFuLead(l)} className="flex-1 text-[10px] font-bold border border-slate-200 rounded-lg py-1.5 text-slate-500 hover:border-teal-300"><MessageCircle className="w-3 h-3 inline" /> Follow-up</button>
                    {l.stage !== 'admitted' && l.stage !== 'lost' && (
                      <button
                        onClick={() => {
                          setConvertLeadRow(l);
                          setConvertForm({ classId: '', sectionId: '', remarks: 'Converted from CRM' });
                        }}
                        disabled={convertLead.isPending}
                        className="flex-1 text-[10px] font-bold border border-emerald-200 rounded-lg py-1.5 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                      >
                        Convert
                      </button>
                    )}
                    <select value={l.stage} onChange={e => moveStage.mutate({ id: l.id, stage: e.target.value })}
                      className="text-[10px] font-bold border border-slate-200 rounded-lg px-1 outline-none">
                      {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Follow-up modal */}
      {fuLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={() => setFuLead(null)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-slate-800 mb-1">Follow-up — {fuLead.studentName}</h3>
            <p className="text-xs text-slate-400 mb-3">{fuLead.parentName} · {fuLead.phone}</p>
            <textarea className={input + ' h-24'} placeholder="Call notes / outcome…" value={fuNote} onChange={e => setFuNote(e.target.value)} />
            <button onClick={() => addFollowUp.mutate()} disabled={!fuNote} className="w-full mt-3 bg-teal-600 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-40">Save Follow-up</button>
          </div>
        </div>
      )}

      {convertLeadRow && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={() => setConvertLeadRow(null)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-slate-800 mb-1">Convert Lead — {convertLeadRow.studentName}</h3>
            <p className="text-xs text-slate-400 mb-3">Select class/section if available, then confirm conversion.</p>

            <label className="text-xs font-bold text-slate-600 mb-1 block">Class (optional)</label>
            <select
              className={input + ' mb-3'}
              value={convertForm.classId}
              onChange={e => setConvertForm(v => ({ ...v, classId: e.target.value, sectionId: '' }))}
            >
              <option value="">Select class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <label className="text-xs font-bold text-slate-600 mb-1 block">Section (optional)</label>
            <select
              className={input + ' mb-3'}
              value={convertForm.sectionId}
              onChange={e => setConvertForm(v => ({ ...v, sectionId: e.target.value }))}
              disabled={!convertForm.classId}
            >
              <option value="">{convertForm.classId ? 'Select section' : 'Select class first'}</option>
              {selectedSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <label className="text-xs font-bold text-slate-600 mb-1 block">Remarks</label>
            <textarea
              className={input + ' h-20'}
              value={convertForm.remarks}
              onChange={e => setConvertForm(v => ({ ...v, remarks: e.target.value }))}
              placeholder="Converted from CRM"
            />

            <div className="flex gap-2 mt-3">
              <button onClick={() => setConvertLeadRow(null)} className="flex-1 border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-sm">Cancel</button>
              <button
                onClick={submitConvertLead}
                disabled={convertLead.isPending}
                className="flex-1 bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-40"
              >
                {convertLead.isPending ? 'Converting...' : 'Convert Lead'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
