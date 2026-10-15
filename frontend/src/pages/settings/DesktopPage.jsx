/**
 * This computer — IlmForge desktop.
 *
 * Where the school's data is, its backups (make one, save a copy elsewhere,
 * put one back), letting other computers in the school use IlmForge, and the
 * licence. Only in the desktop app; anywhere else it says where to go.
 */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  HardDrive, FolderOpen, ShieldCheck, Save, Copy, RotateCcw, Wifi, WifiOff, KeyRound, Monitor, History, FileText,
} from 'lucide-react';
import { desktop, formatBytes, localServer } from '../../utils/desktop';

const when = (iso) => (iso ? new Date(iso).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Never');
const ago = (iso) => {
  if (!iso) return '';
  const h = (Date.now() - new Date(iso).getTime()) / 3600000;
  if (h < 1) return 'less than an hour ago';
  if (h < 24) return `${Math.floor(h)} hour${Math.floor(h) === 1 ? '' : 's'} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
};

function Card({ icon: Icon, title, children, aside }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800"><Icon className="w-4 h-4 text-teal-600" aria-hidden="true" />{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

const btn = 'inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-lg transition disabled:opacity-50';
const primary = `${btn} bg-teal-600 hover:bg-teal-700 text-white`;
const ghost = `${btn} bg-white border border-slate-300 hover:bg-slate-50 text-slate-700`;

export default function DesktopPage() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState('');
  const info = useQuery({ queryKey: ['desktop-info'], queryFn: () => desktop.info(), enabled: !!desktop });
  const backups = useQuery({ queryKey: ['desktop-backups'], queryFn: () => desktop.backupList(), enabled: !!desktop });

  if (!desktop) {
    return (
      <div className="max-w-xl bg-white rounded-2xl border border-slate-200 p-6 space-y-2">
        <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Monitor className="w-5 h-5 text-teal-600" /> This computer</h1>
        <p className="text-sm text-slate-600">
          {localServer
            ? 'Backups, the licence and the school network are managed on the school\'s main computer, in the IlmForge app (Help → This computer).'
            : 'This page is part of IlmForge desktop, the edition that runs on the school\'s own computer without internet.'}
        </p>
      </div>
    );
  }

  const i = info.data;
  const refresh = () => { qc.invalidateQueries({ queryKey: ['desktop-info'] }); qc.invalidateQueries({ queryKey: ['desktop-backups'] }); };
  const run = async (key, fn) => {
    setBusy(key);
    try { await fn(); } catch { /* the app showed what went wrong */ } finally { setBusy(''); refresh(); }
  };
  const copy = async (text) => { await desktop.copyText(text); toast.success('Copied'); };

  const lic = i?.license;
  const days = lic?.daysLeft;
  const list = backups.data || [];

  return (
    <div className="max-w-4xl space-y-4">
      <header className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white flex flex-wrap items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-white/10 grid place-items-center"><Monitor className="w-6 h-6 text-teal-300" aria-hidden="true" /></div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold">This computer</h1>
          <p className="text-xs text-slate-300">IlmForge desktop {i?.version || ''} · the school's records are kept here and work without internet.</p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card icon={HardDrive} title="School data" aside={<button type="button" className={ghost} onClick={() => desktop.openDataFolder()}><FolderOpen className="w-3.5 h-3.5" /> Open folder</button>}>
          <dl className="text-xs space-y-2.5">
            <div><dt className="text-slate-400 font-semibold uppercase tracking-wide text-[10px]">Kept in</dt><dd className="text-slate-700 font-mono break-all mt-0.5">{i?.dataDir}</dd></div>
            <div className="flex gap-8">
              <div><dt className="text-slate-400 font-semibold uppercase tracking-wide text-[10px]">Database size</dt><dd className="text-slate-800 font-bold text-sm tabular-nums mt-0.5">{formatBytes(i?.dbSize)}</dd></div>
              <div><dt className="text-slate-400 font-semibold uppercase tracking-wide text-[10px]">Last automatic backup</dt><dd className="text-slate-800 font-bold text-sm mt-0.5">{ago(i?.lastAutoBackupAt) || 'Never'}</dd></div>
            </div>
          </dl>
          <p className="text-[11px] text-slate-500 mt-3">Installing, upgrading or uninstalling IlmForge never removes this folder.</p>
        </Card>

        <Card icon={KeyRound} title="Licence" aside={<button type="button" className={ghost} onClick={() => run('lic', () => desktop.licenseOpen())}>Enter a new licence</button>}>
          {lic?.valid ? (
            <dl className="text-xs grid grid-cols-2 gap-x-4 gap-y-2.5">
              <div className="col-span-2"><dt className="text-slate-400 font-semibold uppercase tracking-wide text-[10px]">Licensed to</dt><dd className="text-slate-800 font-bold text-sm mt-0.5">{lic.school}</dd></div>
              <div><dt className="text-slate-400 font-semibold uppercase tracking-wide text-[10px]">Valid until</dt>
                <dd className={`font-bold text-sm mt-0.5 ${days <= 14 ? 'text-amber-600' : 'text-slate-800'}`}>{lic.expires} <span className="font-normal text-xs">({days} day{days === 1 ? '' : 's'})</span></dd></div>
              <div><dt className="text-slate-400 font-semibold uppercase tracking-wide text-[10px]">Plan</dt><dd className="text-slate-800 font-bold text-sm mt-0.5 capitalize">{lic.plan}</dd></div>
              <div className="col-span-2"><dt className="text-slate-400 font-semibold uppercase tracking-wide text-[10px]">This computer's ID</dt>
                <dd className="mt-0.5 flex items-center gap-2"><code className="font-mono text-sm text-slate-800">{lic.machine}</code>
                  <button type="button" onClick={() => copy(lic.machine)} className="text-slate-400 hover:text-slate-700" aria-label="Copy the computer ID"><Copy className="w-3.5 h-3.5" /></button>
                  {lic.boundToComputer && <span className="text-[10px] font-bold text-teal-700 bg-teal-50 rounded px-1.5 py-0.5">For this computer only</span>}
                </dd></div>
            </dl>
          ) : (
            <p className="text-xs text-red-700 bg-red-50 rounded-lg p-3">{lic?.message || 'Checking…'}</p>
          )}
          <p className="text-[11px] text-slate-500 mt-3">Renewals: WhatsApp 0346-5146609, with the computer ID above.</p>
        </Card>
      </div>

      <Card
        icon={ShieldCheck}
        title="Backups"
        aside={(
          <div className="flex flex-wrap gap-2 justify-end">
            <button type="button" className={primary} disabled={!!busy} onClick={() => run('now', () => desktop.backupNow())}><Save className="w-3.5 h-3.5" /> {busy === 'now' ? 'Backing up…' : 'Back up now'}</button>
            <button type="button" className={ghost} disabled={!!busy} onClick={() => run('copy', () => desktop.backupSaveAs())}><Copy className="w-3.5 h-3.5" /> Save a copy to…</button>
            <button type="button" className={ghost} disabled={!!busy} onClick={() => run('restore', () => desktop.backupRestore())}><RotateCcw className="w-3.5 h-3.5" /> Restore from a file…</button>
          </div>
        )}
      >
        <p className="text-xs text-slate-600 mb-3">
          A complete backup is made every day while IlmForge is open, and the last 14 are kept on this computer.
          {' '}<b>Also save a copy to a USB drive every week</b>: a backup on the same computer does not survive a broken disk, theft or a virus.
        </p>
        <div className="border border-slate-100 rounded-xl overflow-hidden">
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 sticky top-0">
                <tr><th className="text-left font-semibold px-3 py-2">Backup</th><th className="text-left font-semibold px-3 py-2">Made</th><th className="text-right font-semibold px-3 py-2">Size</th><th className="px-3 py-2"><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {list.map((b) => (
                  <tr key={b.file} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {b.kind === 'automatic' ? <History className="w-3.5 h-3.5 text-slate-400" /> : <FileText className="w-3.5 h-3.5 text-amber-500" />}
                        <span className="font-medium text-slate-700">{b.kind === 'automatic' ? 'Daily backup' : b.name.startsWith('before-update') ? 'Before an update' : b.name.startsWith('before-restore') ? 'Before a restore' : b.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{when(b.at)}</td>
                    <td className="px-3 py-2 text-right text-slate-500 tabular-nums whitespace-nowrap">{formatBytes(b.size)}</td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" className="text-teal-700 hover:underline font-semibold disabled:opacity-50" disabled={!!busy} onClick={() => run('restore', () => desktop.backupRestore(b.file))}>Put back</button>
                    </td>
                  </tr>
                ))}
                {!list.length && <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-400">No backups yet. The first one is made today.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <Card icon={i?.lan ? Wifi : WifiOff} title="Other computers and phones in the school">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-1 min-w-[16rem] text-xs text-slate-600 space-y-2">
            <p>Teachers and office staff can use IlmForge on their own computer, tablet or phone through the school Wi-Fi or network, with no internet. This computer keeps the records; keep IlmForge open here while others use it.</p>
            {i?.lan && (i.addresses.length ? (
              <div className="bg-teal-50 rounded-lg p-3 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wide text-teal-800">On the other device, open</div>
                {i.addresses.map((a) => (
                  <div key={a} className="flex items-center gap-2">
                    <code className="font-mono text-sm font-bold text-teal-900">{a}</code>
                    <button type="button" onClick={() => copy(a)} className="text-teal-700 hover:text-teal-900" aria-label={`Copy ${a}`}><Copy className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            ) : <p className="text-amber-700 bg-amber-50 rounded-lg p-3">This computer is not connected to a network right now.</p>)}
          </div>
          <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
            <span className="text-xs font-semibold text-slate-700">{i?.lan ? 'On' : 'Off'}</span>
            <button
              type="button"
              role="switch"
              aria-checked={!!i?.lan}
              disabled={!!busy || !i}
              onClick={() => run('lan', () => desktop.setLan(!i.lan))}
              className={`relative w-11 h-6 rounded-full transition ${i?.lan ? 'bg-teal-600' : 'bg-slate-300'} disabled:opacity-50`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${i?.lan ? 'left-[22px]' : 'left-0.5'}`} />
              <span className="sr-only">Let other computers use IlmForge</span>
            </button>
          </label>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={ghost} onClick={() => desktop.openLogsFolder()}><FolderOpen className="w-3.5 h-3.5" /> Open the logs folder (for support)</button>
      </div>
    </div>
  );
}
