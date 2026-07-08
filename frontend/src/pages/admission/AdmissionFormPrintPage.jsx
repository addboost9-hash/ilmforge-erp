/**
 * IlmForge — Printable Admission Form
 * Blank + filled versions. Competitor-level quality.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { Printer, Search, FileText } from 'lucide-react';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

function FormField({ label, value, width = '100%', underline = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 8, width }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#1e3a5f', whiteSpace: 'nowrap', flexShrink: 0 }}>{label}:</span>
      <div style={{ flex: 1, borderBottom: underline ? '1px solid #374151' : 'none', minWidth: 60, padding: '0 4px', fontSize: 11, color: '#374151' }}>
        {value || ''}
      </div>
    </div>
  );
}

export default function AdmissionFormPrintPage() {
  const [search,    setSearch]    = useState('');
  const [studentId, setStudentId] = useState(null);
  const [student,   setStudent]   = useState(null);
  const [mode,      setMode]      = useState('blank'); // 'blank' | 'filled'

  const { data: students = [] } = useQuery({
    queryKey: ['adm-form-search', search],
    queryFn:  () => api.get('/students', { params: { search, limit: 8 } }).then(r => r.data.data || []).catch(() => []),
    enabled:  search.length >= 2,
  });

  const logo       = localStorage.getItem('schoolLogoPreview');
  const schoolName = localStorage.getItem('registeredSchoolName') || 'IlmForge School';

  const s = mode === 'filled' ? student : null;

  const handlePrint = () => {
    const el = document.getElementById('adm-form-print');
    if (!el) return;
    const w = window.open('', '_blank', 'width=900,height=700');
    w.document.write(`<html><head><title>Admission Form</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; padding: 20px; }
        .no-print { display: none; }
        table { width: 100%; border-collapse: collapse; }
        td, th { border: 1px solid #333; padding: 5px 7px; }
        .section-header { background: #1e3a5f; color: white; font-weight: 700; padding: 5px 8px; margin: 10px 0 5px; }
        .row { display: flex; gap: 16px; margin-bottom: 8px; }
        .field { display: flex; align-items: flex-end; gap: 4; flex: 1; }
        .field label { font-weight: 600; white-space: nowrap; font-size: 11px; }
        .field .line { border-bottom: 1px solid #333; flex: 1; min-width: 40px; height: 16px; padding: 0 4px; }
        @media print { body { -webkit-print-color-adjust: exact; } }
      </style>
    </head><body>${el.innerHTML}</body></html>`);
    w.document.close(); w.print();
  };

  return (
    <div className="page-content fade-in">
      <div className="page-header-band">
        <div className="page-header-left">
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={20} color="#0073b7" /> Admission Form
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>Print blank or filled admission forms</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={handlePrint}><Printer size={14} /> Print Form</button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`btn btn-sm ${mode === 'blank' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setMode('blank')}>Blank Form</button>
            <button className={`btn btn-sm ${mode === 'filled' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setMode('filled')}>Filled Form</button>
          </div>
          {mode === 'filled' && (
            <div style={{ flex: '1 1 260px', position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Search student…"
                value={search} onChange={e => { setSearch(e.target.value); setStudentId(null); }} />
              {students.length > 0 && !studentId && search.length >= 2 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: 200, overflowY: 'auto' }}>
                  {students.map(st => (
                    <div key={st.id} style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f1f5f9' }}
                      onClick={() => { setStudentId(st.id); setStudent(st); setSearch(st.name); }}>
                      <strong>{st.name}</strong> — {st.class?.name} | Roll: {st.rollNo}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Admission Form */}
      <div id="adm-form-print" className="card" style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #1e3a5f', paddingBottom: 12, marginBottom: 16 }}>
          {logo && <img src={logo} alt="" style={{ width: 60, height: 60, objectFit: 'contain', marginBottom: 6 }} />}
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f' }}>{schoolName}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginTop: 4 }}>STUDENT ADMISSION FORM</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Academic Year: {new Date().getFullYear()}-{new Date().getFullYear() + 1}</div>
        </div>

        {/* Photo + basic info */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
          <div style={{ border: '1px solid #374151', width: 80, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 11, textAlign: 'center', flexShrink: 0 }}>
            {s?.photoUrl ? <img src={s.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : 'Photo'}
          </div>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
            <FormField label="GR No" value={s?.grNo || s?.id} />
            <FormField label="Roll No" value={s?.rollNo} />
            <FormField label="Admission Date" value={fmtDate(s?.admissionDate || s?.createdAt)} />
            <FormField label="Class" value={s?.class?.name} />
            <FormField label="Section" value={s?.section?.name} />
            <FormField label="Campus" value={s?.campus?.name} />
          </div>
        </div>

        {/* Student info */}
        <div style={{ background: '#1e3a5f', color: 'white', fontWeight: 700, padding: '4px 8px', fontSize: 11, marginBottom: 8 }}>1. STUDENT INFORMATION</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px', marginBottom: 12 }}>
          <FormField label="01. Full Name (Urdu)" value="" />
          <FormField label="02. Full Name (English)" value={s?.name} />
          <FormField label="03. Date of Birth" value={fmtDate(s?.dob)} />
          <FormField label="04. Age (years/months)" value="" />
          <FormField label="05. Gender" value={s?.gender} />
          <FormField label="06. Religion" value={s?.religion} />
          <FormField label="07. Caste" value="" />
          <FormField label="08. Place of Birth" value={s?.placeOfBirth} />
          <FormField label="09. Nationality" value="Pakistani" />
          <FormField label="10. B-Form No" value={s?.bFormNo} />
        </div>

        {/* Guardian info */}
        <div style={{ background: '#1e3a5f', color: 'white', fontWeight: 700, padding: '4px 8px', fontSize: 11, marginBottom: 8 }}>2. GUARDIAN INFORMATION</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px', marginBottom: 12 }}>
          <FormField label="01. Father Name" value={s?.fatherName} />
          <FormField label="02. Father CNIC" value={s?.parent?.cnic} />
          <FormField label="03. Father Occupation" value={s?.parent?.profession} />
          <FormField label="04. Father Phone" value={s?.emergencyPhone} />
          <FormField label="05. Mother Name" value="" />
          <FormField label="06. Mother Phone" value="" />
          <FormField label="07. WhatsApp No" value={s?.parent?.phone} />
          <FormField label="08. Email" value={s?.parent?.email} />
        </div>
        <FormField label="09. Home Address" value={s?.address} />

        {/* Academic */}
        <div style={{ background: '#1e3a5f', color: 'white', fontWeight: 700, padding: '4px 8px', fontSize: 11, margin: '12px 0 8px' }}>3. PREVIOUS SCHOOL INFORMATION</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px', marginBottom: 12 }}>
          <FormField label="Previous School Name" value="" />
          <FormField label="Last Class Passed" value="" />
          <FormField label="Marks Obtained" value="" />
          <FormField label="Transfer Certificate No" value="" />
        </div>

        {/* Signature */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
          {['Parent / Guardian Signature', 'Class Teacher', 'Principal'].map(title => (
            <div key={title} style={{ textAlign: 'center' }}>
              <div style={{ height: 36 }} />
              <div style={{ borderTop: '1px solid #374151', width: 130, paddingTop: 4, fontSize: 10.5, fontWeight: 600, color: '#374151' }}>{title}</div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 9, color: '#94a3b8' }}>
          Generated by IlmForge School Management System • {new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' })}
        </div>
      </div>
    </div>
  );
}
