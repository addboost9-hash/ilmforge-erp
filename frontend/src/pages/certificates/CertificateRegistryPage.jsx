/** Certificate Registry — track all issued certificates with serial numbers */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { FileText, Search, Printer } from 'lucide-react';

export default function CertificateRegistryPage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['cert-registry', search, type],
    queryFn: () => api.get('/certificates/registry', { params: { search, type, limit: 50 } }).then(r => r.data.data || []).catch(() => []),
  });

  const TYPES = ['Leaving Certificate', 'Character Certificate', 'Date of Birth Certificate', 'Transfer Certificate', 'Enrollment Certificate'];

  return (
    <div className="page-content fade-in">
      <div className="page-header-band">
        <div className="page-header-left">
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={20} color="#6366f1" /> Certificate Registry
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>All issued certificates with serial numbers and dates</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => window.print()}><Printer size={14} /> Print Register</button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px', position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Search by name or roll no…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{ flex: '0 0 220px' }} value={type} onChange={e => setType(e.target.value)}>
            <option value="">All Types</option>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : records.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><FileText size={40} /></div>
            <div className="empty-state-text">No certificates found</div>
            <div className="empty-state-sub">Issue certificates from the Certificates module — they will appear here</div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="table-modern">
            <thead>
              <tr>{['Serial #', 'Student', 'Class', 'Type', 'Issue Date', 'Issued By', 'Status'].map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={r.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.serialNo || `CERT-${String(i + 1).padStart(4, '0')}`}</td>
                  <td style={{ fontWeight: 600 }}>{r.student?.name || r.studentName || '—'}</td>
                  <td>{r.class?.name || r.className || '—'}</td>
                  <td><span className="chip chip-purple">{r.type || r.certificateType}</span></td>
                  <td>{r.issuedAt ? new Date(r.issuedAt).toLocaleDateString('en-PK') : '—'}</td>
                  <td>{r.issuedBy?.name || '—'}</td>
                  <td><span className={`chip ${r.revoked ? 'chip-red' : 'chip-green'}`}>{r.revoked ? 'Revoked' : 'Valid'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
