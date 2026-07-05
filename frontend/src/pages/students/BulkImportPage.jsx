/** Bulk Student Import — CSV paste/upload → preview → import (max 500) */
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../../api/client';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle } from 'lucide-react';

const parseCSV = (text) => {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const heads = lines[0].split(',').map(h => h.trim().toLowerCase());
  const idx = (names) => heads.findIndex(h => names.some(n => h.includes(n)));
  const iName = idx(['name', 'student']), iFather = idx(['father']), iGender = idx(['gender']),
        iDob = idx(['dob', 'birth']), iClass = idx(['class']), iPhone = idx(['phone', 'mobile', 'contact']);
  return lines.slice(1).map(l => {
    const c = l.split(',').map(x => x.trim());
    return { name: c[iName] || '', fatherName: c[iFather] || '', gender: c[iGender] || '', dob: c[iDob] || '', className: c[iClass] || '', phone: c[iPhone] || '' };
  }).filter(r => r.name);
};

export default function BulkImportPage() {
  const [raw, setRaw] = useState('');
  const [rows, setRows] = useState([]);
  const [result, setResult] = useState(null);

  const importMut = useMutation({
    mutationFn: () => api.post('/bulk/students', { rows }),
    onSuccess: (r) => setResult(r.data),
  });

  const handleFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => { setRaw(reader.result); setRows(parseCSV(reader.result)); };
    reader.readAsText(f);
  };

  if (result) return (
    <div className="max-w-lg mx-auto text-center py-10">
      <CheckCircle2 className="w-14 h-14 text-teal-600 mx-auto mb-3" />
      <h2 className="text-xl font-bold text-slate-800">{result.imported} Students Imported!</h2>
      {result.failed?.length > 0 && (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
          <div className="text-xs font-bold text-amber-700 mb-2 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {result.failed.length} rows failed:</div>
          {result.failed.slice(0, 8).map((f, i) => <div key={i} className="text-[11px] text-amber-800">Row {f.row}: {f.name || '(no name)'} — {f.error}</div>)}
        </div>
      )}
      <button onClick={() => { setResult(null); setRaw(''); setRows([]); }} className="mt-5 bg-teal-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm">+ Import More</button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-800 text-sm mb-1 flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-teal-600" /> Bulk Student Import (CSV)</h3>
        <p className="text-[11px] text-slate-400 mb-3">Columns: <code className="bg-slate-100 px-1 rounded">name, father, gender, dob, class, phone</code> — Excel se "Save as CSV" karein. Max 500 rows.</p>
        <div className="flex gap-2 mb-3">
          <label className="flex items-center gap-1.5 border-2 border-dashed border-teal-300 bg-teal-50/50 rounded-xl px-4 py-2.5 text-xs font-bold text-teal-700 cursor-pointer hover:bg-teal-50">
            <Upload className="w-4 h-4" /> Upload CSV file
            <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
          </label>
          <span className="text-[11px] text-slate-400 self-center">ya neeche paste karein:</span>
        </div>
        <textarea value={raw} onChange={e => { setRaw(e.target.value); setRows(parseCSV(e.target.value)); }}
          placeholder={"name,father,gender,dob,class,phone\nAhmed Ali,Muhammad Ali,Male,2015-03-10,Class 5,0300-1234567"}
          className="w-full h-32 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono outline-none focus:border-teal-500" />
      </div>

      {rows.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-slate-800">Preview — {rows.length} students</h4>
            <button onClick={() => importMut.mutate()} disabled={importMut.isPending}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl disabled:opacity-50">
              {importMut.isPending ? 'Importing…' : `✓ Import ${rows.length} Students`}
            </button>
          </div>
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-slate-400 border-b">{['#', 'Name', 'Father', 'Gender', 'DOB', 'Class', 'Phone'].map(h => <th key={h} className="py-2 pr-3 font-bold">{h}</th>)}</tr></thead>
              <tbody>{rows.slice(0, 100).map((r, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td className="py-1.5 pr-3 text-slate-400">{i + 1}</td>
                  <td className="py-1.5 pr-3 font-semibold text-slate-700">{r.name}</td>
                  <td className="py-1.5 pr-3">{r.fatherName}</td><td className="py-1.5 pr-3">{r.gender}</td>
                  <td className="py-1.5 pr-3">{r.dob}</td><td className="py-1.5 pr-3">{r.className}</td><td className="py-1.5 pr-3">{r.phone}</td>
                </tr>))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
