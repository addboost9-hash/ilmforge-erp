/** SOPs & Manuals — school procedures library (auto-seeded 5 default SOPs) */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import { BookOpenCheck, Plus, ChevronDown } from 'lucide-react';

export default function SOPsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'General', content: '' });

  const { data: sops = [] } = useQuery({ queryKey: ['sops'], queryFn: () => api.get('/sops').then(r => r.data.data || []) });
  const add = useMutation({
    mutationFn: () => api.post('/sops', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sops'] }); setShowAdd(false); setForm({ title: '', category: 'General', content: '' }); },
  });

  const cats = [...new Set(sops.map(s => s.category))];
  const input = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-500';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><BookOpenCheck className="w-4 h-4 text-teal-600" /> SOPs & School Manuals ({sops.length})</h3>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1 bg-teal-600 text-white text-xs font-bold px-4 py-2 rounded-xl"><Plus className="w-3.5 h-3.5" /> New SOP</button>
      </div>

      {showAdd && (
        <div className="bg-white border border-teal-200 rounded-2xl p-4 space-y-2.5">
          <div className="grid sm:grid-cols-2 gap-2.5">
            <input className={input} placeholder="SOP title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <input className={input} placeholder="Category (Finance / Discipline…)" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
          </div>
          <textarea className={input + ' h-28'} placeholder="Steps likhein (har line ek step)…" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
          <button onClick={() => add.mutate()} disabled={!form.title || !form.content} className="bg-teal-600 text-white font-bold text-sm px-6 py-2.5 rounded-xl disabled:opacity-40">Save SOP</button>
        </div>
      )}

      {cats.map(cat => (
        <div key={cat}>
          <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide mb-2">{cat}</div>
          <div className="space-y-2">
            {sops.filter(s => s.category === cat).map(s => (
              <div key={s.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button onClick={() => setOpen(open === s.id ? null : s.id)} className="w-full flex items-center justify-between px-4 py-3 text-left">
                  <span className="text-sm font-bold text-slate-700">{s.title}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open === s.id ? 'rotate-180' : ''}`} />
                </button>
                {open === s.id && (
                  <div className="px-4 pb-4 text-sm text-slate-600 whitespace-pre-line border-t border-slate-50 pt-3 leading-relaxed">{s.content}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
