/**
 * RoboBuddy 🇵🇰 — WhatsApp Bot Assistant
 * Pakistan-flag-waving mascot + bot configuration (DB-backed).
 * Auto: fee reminders, absent alerts, result sharing.
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import { RoboBuddyMascot } from '../../components/brand/Brand';
import { Bot, Save, MessageCircle, CheckCircle2 } from 'lucide-react';

export default function RoboBuddyPage() {
  const qc = useQueryClient();
  const [cfg, setCfg] = useState(null);
  const [saved, setSaved] = useState(false);

  const { data } = useQuery({ queryKey: ['robobuddy'], queryFn: () => api.get('/robobuddy').then(r => r.data.data) });
  useEffect(() => { if (data && !cfg) setCfg(data); }, [data]);

  const save = useMutation({
    mutationFn: () => api.put('/robobuddy', cfg),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['robobuddy'] }); setSaved(true); setTimeout(() => setSaved(false), 2500); },
  });

  if (!cfg) return <div className="p-10 text-center text-slate-400 text-sm">Loading RoboBuddy…</div>;

  const Toggle = ({ k, label, desc }) => (
    <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-100 hover:border-teal-200 cursor-pointer transition">
      <input type="checkbox" checked={!!cfg[k]} onChange={e => setCfg({ ...cfg, [k]: e.target.checked })} className="w-5 h-5 accent-teal-600" />
      <span><span className="block text-sm font-bold text-slate-700">{label}</span><span className="block text-[11px] text-slate-400">{desc}</span></span>
    </label>
  );
  const input = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-500';

  return (
    <div className="grid lg:grid-cols-5 gap-5">
      {/* Mascot showcase */}
      <div className="lg:col-span-2 bg-gradient-to-br from-teal-50 via-white to-emerald-50 rounded-2xl border border-teal-100 p-6 flex flex-col items-center justify-center text-center">
        <RoboBuddyMascot size={200} />
        <h2 className="text-lg font-extrabold text-slate-800 mt-2">{cfg.botName || 'RoboBuddy'} <span className="text-base">🇵🇰</span></h2>
        <p className="text-xs text-slate-500 mt-1 max-w-[240px]">"{cfg.welcomeMessage}"</p>
        <span className={`mt-3 text-[10px] font-extrabold px-3 py-1.5 rounded-full ${cfg.isEnabled ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500'}`}>
          {cfg.isEnabled ? '● BOT ACTIVE' : '○ BOT OFF'}
        </span>
      </div>

      {/* Config */}
      <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><Bot className="w-4 h-4 text-teal-600" /> WhatsApp Bot Configuration</h3>

        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className="text-[11px] font-bold text-slate-500 uppercase">Bot Name</label>
            <input className={input} value={cfg.botName || ''} onChange={e => setCfg({ ...cfg, botName: e.target.value })} /></div>
          <div><label className="text-[11px] font-bold text-slate-500 uppercase">WhatsApp Number</label>
            <input className={input} placeholder="+92 300 1234567" value={cfg.whatsappNumber || ''} onChange={e => setCfg({ ...cfg, whatsappNumber: e.target.value })} /></div>
        </div>
        <div><label className="text-[11px] font-bold text-slate-500 uppercase">Welcome Message</label>
          <textarea className={input + ' h-20'} value={cfg.welcomeMessage || ''} onChange={e => setCfg({ ...cfg, welcomeMessage: e.target.value })} /></div>

        <div className="space-y-2">
          <Toggle k="isEnabled" label="Bot Enable karo" desc="Master switch — WhatsApp integration active" />
          <Toggle k="autoFeeReminder" label="Auto Fee Reminders" desc="Due date se 3 din pehle parents ko WhatsApp reminder" />
          <Toggle k="autoAbsentAlert" label="Auto Absent Alerts" desc="Attendance absent → parent ko turant message" />
          <Toggle k="autoResultShare" label="Auto Result Share" desc="Result publish hote hi parent ko marks card" />
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => save.mutate()} disabled={save.isPending}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm px-6 py-3 rounded-xl disabled:opacity-50 transition">
            <Save className="w-4 h-4" /> {save.isPending ? 'Saving…' : 'Save Configuration'}
          </button>
          {saved && <span className="flex items-center gap-1 text-teal-600 text-xs font-bold"><CheckCircle2 className="w-4 h-4" /> Saved!</span>}
        </div>

        <div className="bg-slate-50 rounded-xl p-3.5 text-[11px] text-slate-500 leading-relaxed">
          <MessageCircle className="w-3.5 h-3.5 inline mr-1 text-teal-600" />
          <b>Integration note:</b> WhatsApp Business API key Settings Hub → WhatsApp API mein add karein. RoboBuddy wahan se messages bhejta hai — yeh page uske behaviors control karta hai.
        </div>
      </div>
    </div>
  );
}
