/**
 * IlmForge — Biometric (Thumb) Attendance
 * Device management (ZKTeco-style) + live punch feed + manual punch kiosk.
 * 🔗 LINKED: har punch se attendance AUTO mark hoti hai (first IN = present).
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import { Fingerprint, Plus, Wifi, WifiOff, Radio, CheckCircle2, MapPin } from 'lucide-react';

export default function BiometricAttendancePage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [dev, setDev] = useState({ name: '', deviceType: 'thumb', ipAddress: '', port: '4370', location: '' });
  const [punchRoll, setPunchRoll] = useState('');
  const [lastPunch, setLastPunch] = useState(null);

  const { data: devices = [] } = useQuery({
    queryKey: ['bio-devices'],
    queryFn: () => api.get('/biometric/devices').then(r => r.data.data || []),
  });
  const { data: punches = [] } = useQuery({
    queryKey: ['bio-punches'],
    queryFn: () => api.get('/biometric/punches').then(r => r.data.data || []),
    refetchInterval: 8000, // live feed
  });

  const addDevice = useMutation({
    mutationFn: () => api.post('/biometric/devices', dev),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bio-devices'] }); setShowAdd(false); setDev({ name: '', deviceType: 'thumb', ipAddress: '', port: '4370', location: '' }); },
  });
  const punch = useMutation({
    mutationFn: () => api.post('/biometric/punch', { rollNo: punchRoll, method: 'thumb' }),
    onSuccess: (r) => { setLastPunch({ ok: true, marked: r.data.attendanceMarked }); setPunchRoll(''); qc.invalidateQueries({ queryKey: ['bio-punches'] }); setTimeout(() => setLastPunch(null), 3500); },
    onError: (e) => { setLastPunch({ ok: false, msg: e.response?.data?.message }); setTimeout(() => setLastPunch(null), 3500); },
  });

  const input = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 outline-none';

  return (
    <div className="space-y-5">
      {/* Kiosk punch simulator + webhook info */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="absolute w-40 h-40 rounded-full bg-teal-500/10 -top-10 -right-10" />
          <div className="flex items-center gap-2 mb-4"><Fingerprint className="w-5 h-5 text-teal-400" /><span className="font-bold text-sm">Thumb Punch Kiosk</span></div>
          <p className="text-xs text-slate-300 mb-4">Roll number enter karke punch simulate karein (real device isi endpoint pe POST karta hai). Pehla IN punch = attendance PRESENT auto.</p>
          <div className="flex gap-2">
            <input value={punchRoll} onChange={e => setPunchRoll(e.target.value)} placeholder="Roll No (e.g. C5-001)"
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-sm placeholder:text-slate-400 outline-none focus:border-teal-400" 
              onKeyDown={e => e.key === 'Enter' && punchRoll && punch.mutate()} />
            <button onClick={() => punch.mutate()} disabled={!punchRoll || punch.isPending}
              className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 font-bold text-sm disabled:opacity-40 transition">
              {punch.isPending ? '…' : 'PUNCH'}
            </button>
          </div>
          {lastPunch && (
            <div className={`mt-3 flex items-center gap-2 text-xs font-bold rounded-xl px-3 py-2.5 ${lastPunch.ok ? 'bg-teal-500/20 text-teal-300' : 'bg-red-500/20 text-red-300'}`}>
              {lastPunch.ok ? <><CheckCircle2 className="w-4 h-4" /> Punch OK {lastPunch.marked && '— Attendance MARKED ✓'}</> : `✕ ${lastPunch.msg || 'Failed'}`}
            </div>
          )}
          <div className="mt-4 text-[10px] text-slate-400 font-mono bg-black/25 rounded-lg p-2.5">
            Device webhook: POST /api/v1/biometric/punch<br/>{'{ rollNo, method: "thumb", deviceId }'}
          </div>
        </div>

        {/* Devices */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-sm">Devices ({devices.length})</h3>
            <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1 text-xs font-bold text-teal-600 hover:bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200 transition">
              <Plus className="w-3.5 h-3.5" /> Add Device
            </button>
          </div>
          {showAdd && (
            <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-slate-50 rounded-xl">
              <input className={input} placeholder="Device name *" value={dev.name} onChange={e => setDev({ ...dev, name: e.target.value })} />
              <select className={input} value={dev.deviceType} onChange={e => setDev({ ...dev, deviceType: e.target.value })}>
                <option value="thumb">Thumb / Fingerprint</option><option value="face">Face Device</option><option value="card">RFID Card</option>
              </select>
              <input className={input} placeholder="IP (192.168.1.201)" value={dev.ipAddress} onChange={e => setDev({ ...dev, ipAddress: e.target.value })} />
              <input className={input} placeholder="Port" value={dev.port} onChange={e => setDev({ ...dev, port: e.target.value })} />
              <input className={input + ' col-span-2'} placeholder="Location (Main Gate)" value={dev.location} onChange={e => setDev({ ...dev, location: e.target.value })} />
              <button onClick={() => addDevice.mutate()} disabled={!dev.name} className="col-span-2 bg-teal-600 text-white font-bold text-sm py-2.5 rounded-xl disabled:opacity-40">Save Device</button>
            </div>
          )}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {devices.map(d => (
              <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-teal-200 transition">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${d.isActive ? 'bg-teal-50 text-teal-600' : 'bg-slate-100 text-slate-400'}`}>
                  {d.isActive ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-800">{d.name} <span className="text-[10px] font-semibold text-slate-400 uppercase">({d.deviceType})</span></div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    {d.ipAddress && <span className="font-mono">{d.ipAddress}:{d.port}</span>}
                    {d.location && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{d.location}</span>}
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${d.isActive ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-500'}`}>{d.isActive ? 'ONLINE' : 'OFF'}</span>
              </div>
            ))}
            {!devices.length && !showAdd && <p className="text-xs text-slate-400 text-center py-6">Koi device nahi — "Add Device" se ZKTeco/thumb device register karein</p>}
          </div>
        </div>
      </div>

      {/* Live punch feed */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Radio className="w-4 h-4 text-red-500 animate-pulse" />
          <h3 className="font-bold text-slate-800 text-sm">Live Punches — Today ({punches.length})</h3>
          <span className="text-[10px] text-slate-400">auto-refresh 8s</span>
        </div>
        <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
          {punches.map(p => (
            <div key={p.id} className="flex items-center gap-3 py-2.5">
              <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center text-[10px] font-bold">
                {(p.person?.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-slate-700">{p.person?.name || `#${p.personId}`}</span>
                <span className="text-[11px] text-slate-400 ml-2">{p.person?.rollNo}</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.method === 'face' ? 'bg-violet-50 text-violet-700' : 'bg-teal-50 text-teal-700'}`}>{p.method.toUpperCase()}</span>
              <span className="text-[11px] text-slate-400 font-mono">{new Date(p.punchTime).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ))}
          {!punches.length && <p className="text-xs text-slate-400 text-center py-8">Aaj koi punch nahi hui</p>}
        </div>
      </div>
    </div>
  );
}
