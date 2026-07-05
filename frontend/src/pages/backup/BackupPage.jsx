/** Database Backup — full school data export (JSON download) + history */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { Database, Download, ShieldCheck } from 'lucide-react';

export default function BackupPage() {
  const qc = useQueryClient();
  const [restorePayload, setRestorePayload] = useState(null);
  const [dryRun, setDryRun] = useState(true);
  const [useClasses, setUseClasses] = useState(true);
  const [useStudents, setUseStudents] = useState(true);
  const [restoreResult, setRestoreResult] = useState(null);
  const { data: backups = [] } = useQuery({ queryKey: ['backups'], queryFn: () => api.get('/backups').then(r => r.data.data || []) });

  const create = useMutation({
    mutationFn: async () => {
      const res = await api.post('/backups/create', {}, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = `ilmforge-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['backups'] }),
  });

  const restore = useMutation({
    mutationFn: () => {
      const modules = [useClasses ? 'classes' : null, useStudents ? 'students' : null].filter(Boolean);
      return api.post('/backups/restore', {
        backup: restorePayload,
        modules,
        dryRun,
      });
    },
    onSuccess: (res) => {
      setRestoreResult(res.data?.data || null);
      toast.success(res.data?.message || 'Restore completed');
      qc.invalidateQueries({ queryKey: ['backups'] });
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Restore failed'),
  });

  const onFileChange = async (evt) => {
    const file = evt.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      setRestorePayload(parsed);
      toast.success('Backup file loaded');
    } catch {
      setRestorePayload(null);
      toast.error('Invalid backup JSON file');
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-2 mb-2"><Database className="w-5 h-5 text-teal-400" /><span className="font-bold">Full Data Backup</span></div>
        <p className="text-xs text-slate-300 mb-4">Students, staff, classes, fees, attendance, exams — sab kuch ek JSON file mein download hoga. Har week backup lena best practice hai.</p>
        <button onClick={() => create.mutate()} disabled={create.isPending}
          className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 font-bold text-sm px-5 py-2.5 rounded-xl disabled:opacity-50 transition">
          <Download className="w-4 h-4" /> {create.isPending ? 'Exporting…' : 'Create & Download Backup'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Restore Backup</h4>
        <input type="file" accept="application/json,.json" onChange={onFileChange} className="block w-full text-sm mb-3" />
        <div className="flex flex-wrap gap-4 mb-3 text-xs text-slate-600">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={useClasses} onChange={e => setUseClasses(e.target.checked)} />
            Classes
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={useStudents} onChange={e => setUseStudents(e.target.checked)} />
            Students
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} />
            Dry run only
          </label>
        </div>
        <button
          onClick={() => restore.mutate()}
          disabled={!restorePayload || restore.isPending || (!useClasses && !useStudents)}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-lg disabled:opacity-40"
        >
          {restore.isPending ? 'Running restore...' : dryRun ? 'Run Restore Dry-Run' : 'Run Restore'}
        </button>
        {restoreResult && (
          <div className="mt-3 text-xs bg-slate-50 rounded-lg p-3 border border-slate-200">
            <div>Classes: restored {restoreResult.classes?.restored || 0}, skipped {restoreResult.classes?.skipped || 0}</div>
            <div>Students: restored {restoreResult.students?.restored || 0}, skipped {restoreResult.students?.skipped || 0}</div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Backup History</h4>
        {backups.map(b => {
          const counts = b.recordCounts ? JSON.parse(b.recordCounts) : {};
          return (
            <div key={b.id} className="flex items-center gap-3 py-2.5 border-b border-slate-50 text-sm">
              <Database className="w-4 h-4 text-slate-300" />
              <div className="flex-1"><div className="font-semibold text-slate-700 text-xs">{b.fileName}</div>
                <div className="text-[10px] text-slate-400">{counts.students || 0} students · {counts.feeInvoices || 0} invoices · {(b.sizeBytes / 1024).toFixed(0)} KB</div></div>
              <span className="text-[11px] text-slate-400">{new Date(b.createdAt).toLocaleString('en-PK')}</span>
            </div>
          );
        })}
        {!backups.length && <p className="text-xs text-slate-400 text-center py-6">Abhi koi backup nahi liya gaya</p>}
      </div>
    </div>
  );
}
