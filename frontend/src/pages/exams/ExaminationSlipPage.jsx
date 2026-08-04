/**
 * IlmForge — Examination Slip (Admit Card) Generator
 * Generates printable admit cards for all students in a class
 * 2 slips per page layout, exam schedule table, instructions
 */
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer, GraduationCap, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { buildWatermarkCss, buildWatermarkMarkup } from '../../utils/watermarkPrint';

/* ─── Demo exam schedule (5 subjects) ─────────────── */
const DEMO_SCHEDULE = [
  { no: 1, day: 'Monday',    date: '2025-03-03', subject: 'Mathematics',      startTime: '09:00 AM', endTime: '11:00 AM', room: 'Room 101' },
  { no: 2, day: 'Tuesday',   date: '2025-03-04', subject: 'English Language', startTime: '09:00 AM', endTime: '11:00 AM', room: 'Room 102' },
  { no: 3, day: 'Wednesday', date: '2025-03-05', subject: 'Science',          startTime: '09:00 AM', endTime: '11:00 AM', room: 'Room 103' },
  { no: 4, day: 'Thursday',  date: '2025-03-06', subject: 'Social Studies',   startTime: '09:00 AM', endTime: '11:00 AM', room: 'Room 104' },
  { no: 5, day: 'Friday',    date: '2025-03-07', subject: 'Urdu Language',    startTime: '09:00 AM', endTime: '11:00 AM', room: 'Room 105' },
];

const INSTRUCTIONS = [
  'Students must report to the examination hall at least 30 minutes before the commencement of the examination.',
  'Candidates must bring this Examination Slip along with their School Identity Card on each day of the examination.',
  'Use of mobile phones, electronic devices, or any unfair means is strictly prohibited inside the examination hall.',
  'Candidates must follow all instructions given by the Invigilator/Supervisor during the examination.',
  'No manual correction or overwriting is allowed on this slip. Any tampering will render this slip invalid.',
];

/* ─── Format date for display ────────────────────── */
const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
};

/* ─── Build printable HTML for all slips ─────────── */
const buildPrintHTML = ({ students, schedule, schoolName, schoolAddress, className, sectionName, logoSrc, printDateTime }) => {
  const slipWatermarkCss = buildWatermarkCss({
    mode: 'compact',
    position: 'absolute',
    color: '#0F766E',
    containerClass: 'slip-watermark',
    logoSize: '76px',
    fallbackFontSize: '38px',
    textSize: '11px',
    textMarginTop: '6px',
  });
  const slipWatermarkHtml = buildWatermarkMarkup({ logo: logoSrc, text: schoolName, containerClass: 'slip-watermark', imgAlt: 'School watermark' });
  const slipHTML = students.map((s) => {
    const rollNo    = s.rollNo || s.admissionNo || `ST-${String(s.id).padStart(4, '0')}`;
    const classInfo = className + (sectionName ? ` — ${sectionName}` : '');
    const campus    = s.campus || s.branch || 'Main Campus';

    const scheduleRows = schedule.map(row => `
      <tr>
        <td style="text-align:center;padding:4px 6px;border:1px solid #D1D5DB;font-size:9.5pt;">${row.no}</td>
        <td style="padding:4px 6px;border:1px solid #D1D5DB;font-size:9.5pt;">${row.day}</td>
        <td style="padding:4px 6px;border:1px solid #D1D5DB;font-size:9.5pt;white-space:nowrap;">${fmtDate(row.date)}</td>
        <td style="padding:4px 6px;border:1px solid #D1D5DB;font-size:9.5pt;font-weight:600;">${row.subject}</td>
        <td style="text-align:center;padding:4px 6px;border:1px solid #D1D5DB;font-size:9.5pt;white-space:nowrap;">${row.startTime}</td>
        <td style="text-align:center;padding:4px 6px;border:1px solid #D1D5DB;font-size:9.5pt;white-space:nowrap;">${row.endTime}</td>
        <td style="text-align:center;padding:4px 6px;border:1px solid #D1D5DB;font-size:9.5pt;">${row.room}</td>
      </tr>`).join('');

    const instructionsList = INSTRUCTIONS.map((inst, i) => `
      <li style="font-size:9pt;color:#374151;margin-bottom:3px;line-height:1.4;">${inst}</li>`).join('');

    const logoEl = logoSrc
      ? `<img src="${logoSrc}" style="width:52px;height:52px;object-fit:contain;border-radius:4px;" alt="School Logo"/>`
      : `<div style="width:52px;height:52px;border-radius:50%;background:#0F766E;display:flex;align-items:center;justify-content:center;font-size:24px;color:#fff;flex-shrink:0;">&#127891;</div>`;

    return `
    <div style="width:92mm;border:2px solid #0F766E;border-radius:6px;padding:9mm;font-family:'Arial',sans-serif;background:#fff;box-sizing:border-box;display:inline-block;vertical-align:top;page-break-inside:avoid;break-inside:avoid;position:relative;overflow:hidden;">
      ${slipWatermarkHtml}
      <div style="position:relative;z-index:2;">

      <!-- HEADER -->
      <div style="display:flex;align-items:center;gap:9px;border-bottom:2px solid #0F766E;padding-bottom:7px;margin-bottom:9px;">
        ${logoEl}
        <div style="flex:1;text-align:center;">
          <div style="font-size:13pt;font-weight:900;color:#0F4C45;line-height:1.2;">${schoolName}</div>
          <div style="font-size:8.5pt;color:#6B7280;margin-top:2px;">${schoolAddress}</div>
          <div style="font-size:9.5pt;font-weight:800;color:#0F766E;margin-top:3px;letter-spacing:1px;text-transform:uppercase;">Examination Admit Card</div>
        </div>
      </div>

      <!-- STUDENT INFO -->
      <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:5px;padding:7px 9px;margin-bottom:9px;">
        <table style="width:100%;border-collapse:collapse;font-size:9.5pt;">
          <tr>
            <td style="color:#6B7280;padding:2px 0;width:88px;">Student Name</td>
            <td style="color:#111827;font-weight:700;padding:2px 0;">: ${s.name || '—'}</td>
            <td style="color:#6B7280;padding:2px 0;width:65px;">Roll No.</td>
            <td style="color:#0F766E;font-weight:900;font-family:'Courier New',monospace;font-size:10.5pt;padding:2px 0;">: ${rollNo}</td>
          </tr>
          <tr>
            <td style="color:#6B7280;padding:2px 0;">Class / Section</td>
            <td style="color:#111827;font-weight:700;padding:2px 0;">: ${classInfo}</td>
            <td style="color:#6B7280;padding:2px 0;">Campus</td>
            <td style="color:#374151;font-weight:600;padding:2px 0;">: ${campus}</td>
          </tr>
        </table>
      </div>

      <!-- SCHEDULE TABLE -->
      <div style="margin-bottom:9px;">
        <div style="font-size:9.5pt;font-weight:800;color:#0F4C45;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">Examination Schedule</div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#0F766E;color:#fff;">
              <th style="padding:4px 5px;border:1px solid #0F766E;font-weight:700;font-size:8.5pt;width:26px;">No.</th>
              <th style="padding:4px 5px;border:1px solid #0F766E;font-weight:700;font-size:8.5pt;">Day</th>
              <th style="padding:4px 5px;border:1px solid #0F766E;font-weight:700;font-size:8.5pt;">Date</th>
              <th style="padding:4px 5px;border:1px solid #0F766E;font-weight:700;font-size:8.5pt;">Subject</th>
              <th style="padding:4px 5px;border:1px solid #0F766E;font-weight:700;font-size:8.5pt;">Start</th>
              <th style="padding:4px 5px;border:1px solid #0F766E;font-weight:700;font-size:8.5pt;">End</th>
              <th style="padding:4px 5px;border:1px solid #0F766E;font-weight:700;font-size:8.5pt;">Room</th>
            </tr>
          </thead>
          <tbody>
            ${scheduleRows}
          </tbody>
        </table>
      </div>

      <!-- INSTRUCTIONS -->
      <div style="margin-bottom:9px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:5px;padding:7px 9px;">
        <div style="font-size:9.5pt;font-weight:800;color:#92400E;margin-bottom:4px;">Instructions for Candidates:</div>
        <ol style="margin:0;padding-left:15px;">
          ${instructionsList}
        </ol>
      </div>

      <!-- NOTE -->
      <div style="text-align:center;font-size:8.5pt;color:#6B7280;font-style:italic;margin-bottom:9px;padding:4px 0;border-top:1px dashed #D1D5DB;border-bottom:1px dashed #D1D5DB;">
        NOTE: This is a computer generated document
      </div>

      <!-- SIGNATURES -->
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:6px;">
        <div style="text-align:center;width:36%;">
          <div style="border-top:1.5px solid #374151;padding-top:3px;font-size:9pt;color:#374151;font-weight:600;">Class Incharge</div>
        </div>
        <div style="text-align:center;font-size:8pt;color:#9CA3AF;line-height:1.4;">
          <div>Printed: ${printDateTime}</div>
          <div style="font-family:'Courier New',monospace;color:#0F766E;font-size:7.5pt;">${rollNo}</div>
        </div>
        <div style="text-align:center;width:36%;">
          <div style="border-top:1.5px solid #374151;padding-top:3px;font-size:9pt;color:#374151;font-weight:600;">Principal</div>
        </div>
      </div>

      </div>
    </div>`;
  }).join('\n    ');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Examination Slips — ${schoolName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #F3F4F6;
      font-family: 'Arial', sans-serif;
      padding: 10mm;
    }
    .controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
      background: #fff;
      border-radius: 8px;
      padding: 11px 16px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
    }
    .print-btn {
      background: #0F766E;
      color: #fff;
      border: none;
      padding: 10px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 700;
    }
    .slips-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 8mm;
      justify-content: flex-start;
    }
    ${slipWatermarkCss}
    @media print {
      body { background: #fff; padding: 5mm; }
      .controls { display: none !important; }
      .slips-wrap {
        display: flex;
        flex-wrap: wrap;
        gap: 4mm;
        justify-content: flex-start;
      }
      /* 2 slips side by side on A4 */
      @page { size: A4 portrait; margin: 6mm; }
    }
  </style>
</head>
<body>
  <div class="controls">
    <div>
      <div style="font-size:15px;font-weight:800;color:#0F4C45;">${schoolName} — Examination Slips</div>
      <div style="font-size:11.5px;color:#9CA3AF;margin-top:2px;">${students.length} slip(s) generated &middot; ${printDateTime}</div>
    </div>
    <button class="print-btn" onclick="window.print()">&#128424; Print All Slips</button>
  </div>
  <div class="slips-wrap">
    ${slipHTML}
  </div>
</body>
</html>`;
};

/* ════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════ */
export default function ExaminationSlipPage() {
  const [classId,   setClassId]   = useState('');
  const [sectionId, setSectionId] = useState('');
  const [generated, setGenerated] = useState(false);
  const [schedule,  setSchedule]  = useState([]);

  /* Load exam schedule from localStorage or use demo data */
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ilmforge_exam_schedule');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSchedule(parsed);
          return;
        }
      }
    } catch {}
    setSchedule(DEMO_SCHEDULE);
  }, []);

  /* ── Queries ── */
  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data),
  });

  const { data: school } = useQuery({
    queryKey: ['school-settings'],
    queryFn: () => api.get('/settings/school').then(r => r.data.data),
  });

  const selectedClass   = (classes || []).find(c => c.id === parseInt(classId));
  const selectedSection = selectedClass?.sections?.find(s => s.id === parseInt(sectionId));

  const { data: students, isLoading: loadingStudents } = useQuery({
    queryKey: ['students-for-slip', classId, sectionId],
    queryFn: () => api.get('/students', {
      params: {
        classId:   classId   || undefined,
        sectionId: sectionId || undefined,
        status: 'active',
        limit: 500,
      },
    }).then(r => r.data.data || []),
    enabled: !!classId,
  });

  const logoSrc    = typeof window !== 'undefined' ? localStorage.getItem('schoolLogoPreview') : null;
  const schoolName = school?.name    || 'IlmForge School';
  const schoolAddr = school?.address || school?.city || 'Islamabad, Pakistan';

  const printDateTime = new Date().toLocaleString('en-PK', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  /* ── Generate slips ── */
  const handleGenerate = () => {
    if (!classId) return;
    setGenerated(true);
  };

  /* ── Open print window ── */
  const openPrint = (subset) => {
    if (!subset?.length) return;
    const win = window.open('', '_blank');
    win.document.write(buildPrintHTML({
      students:      subset,
      schedule,
      schoolName,
      schoolAddress: schoolAddr,
      className:     selectedClass?.name   || `Class ${classId}`,
      sectionName:   selectedSection?.name || '',
      logoSrc,
      printDateTime,
    }));
    win.document.close();
  };

  /* ════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════ */
  return (
    <div className="page-content fade-up">

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/exams" className="btn btn-outline btn-sm">
            <ArrowLeft size={13}/> Back
          </Link>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <GraduationCap size={22} color="#0F766E"/>
              Examination Slip (Admit Card)
            </h1>
            <p className="page-subtitle">Generate and print examination admit cards for all students in a class</p>
          </div>
        </div>
        {generated && students?.length > 0 && (
          <button className="btn btn-teal" onClick={() => openPrint(students)}>
            <Printer size={15}/> Print All ({students.length})
          </button>
        )}
      </div>

      {/* ── Filters Card ── */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 14, alignItems: 'flex-end' }}>

          {/* Class */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Class *</label>
            <select
              className="form-select"
              value={classId}
              onChange={e => { setClassId(e.target.value); setSectionId(''); setGenerated(false); }}
            >
              <option value="">Select Class</option>
              {(classes || []).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Section</label>
            <select
              className="form-select"
              value={sectionId}
              onChange={e => { setSectionId(e.target.value); setGenerated(false); }}
              disabled={!selectedClass?.sections?.length}
            >
              <option value="">All Sections</option>
              {(selectedClass?.sections || []).map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Generate button */}
          <button
            className="btn btn-teal"
            onClick={handleGenerate}
            disabled={!classId || loadingStudents}
            style={{ height: 38 }}
          >
            <GraduationCap size={15}/>
            {loadingStudents ? 'Loading...' : 'Generate Slips'}
          </button>
        </div>

        {/* Schedule info strip */}
        <div style={{ marginTop: 12, padding: '8px 12px', background: '#F0FDF4', borderRadius: 6, border: '1px solid #BBF7D0', fontSize: 12.5, color: '#0F766E' }}>
          <strong>Exam Schedule:</strong> {schedule.length} subject(s) loaded
          {schedule === DEMO_SCHEDULE
            ? <span style={{ color: '#D97706', marginLeft: 8 }}>
                Demo data — save actual schedule to localStorage key: <code style={{ background: '#FEF3C7', padding: '1px 4px', borderRadius: 3 }}>ilmforge_exam_schedule</code>
              </span>
            : <span style={{ color: '#059669', marginLeft: 8 }}>from saved schedule</span>
          }
        </div>
      </div>

      {/* ── Empty state (before generate) ── */}
      {!generated && (
        <div className="card">
          <div className="empty-state" style={{ padding: 60 }}>
            <div className="empty-state-icon">
              <GraduationCap size={52} style={{ opacity: 0.18 }}/>
            </div>
            <div className="empty-state-text">Select a class to generate examination slips</div>
            <div className="empty-state-sub">Choose class and optional section from the filters above, then click Generate Slips</div>
          </div>
        </div>
      )}

      {/* ── Generated Slips ── */}
      {generated && (
        <>
          {loadingStudents ? (
            <div className="loading-center"><div className="spinner"/></div>
          ) : !students?.length ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon"><GraduationCap size={44} style={{ opacity: 0.2 }}/></div>
                <div className="empty-state-text">No students found</div>
                <div className="empty-state-sub">Try a different class or section</div>
              </div>
            </div>
          ) : (
            <>
              {/* Top action bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: '#374151' }}>
                  <strong style={{ color: '#0F766E' }}>{students.length}</strong> slip(s) ready &nbsp;&middot;&nbsp;
                  <span style={{ color: '#6B7280' }}>
                    {selectedClass?.name}{selectedSection ? ` — ${selectedSection.name}` : ''}
                  </span>
                </div>
                <button className="btn btn-teal" onClick={() => openPrint(students)}>
                  <Printer size={14}/> Print All Slips
                </button>
              </div>

              {/* 2-column slips grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                {students.map((student) => {
                  const rollNo    = student.rollNo || student.admissionNo || `ST-${String(student.id).padStart(4, '0')}`;
                  const classInfo = (selectedClass?.name || `Class ${classId}`) + (selectedSection ? ` — ${selectedSection.name}` : '');
                  const campus    = student.campus || student.branch || 'Main Campus';

                  return (
                    <div key={student.id} className="card" style={{ padding: 0, overflow: 'hidden', border: '2px solid #0F766E' }}>

                      {/* Slip Header */}
                      <div style={{ background: '#0F766E', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        {logoSrc
                          ? <img src={logoSrc} alt="Logo" style={{ width: 42, height: 42, objectFit: 'contain', borderRadius: 4, background: 'rgba(255,255,255,0.15)', padding: 2, flexShrink: 0 }}/>
                          : <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🎓</div>
                        }
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{schoolName}</div>
                          <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.72)', marginTop: 1 }}>{schoolAddr}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.65)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Admit Card</div>
                          <div style={{ fontSize: 11, fontWeight: 800, color: '#BBF7D0', marginTop: 2, fontFamily: 'monospace' }}>{rollNo}</div>
                        </div>
                      </div>

                      <div style={{ padding: '12px 14px' }}>

                        {/* Student info */}
                        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 6, padding: '8px 10px', marginBottom: 10 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 12px', fontSize: 12 }}>
                            <div><span style={{ color: '#6B7280' }}>Student:</span> <strong style={{ color: '#111827' }}>{student.name}</strong></div>
                            <div><span style={{ color: '#6B7280' }}>Roll No:</span> <strong style={{ color: '#0F766E', fontFamily: 'monospace' }}>{rollNo}</strong></div>
                            <div><span style={{ color: '#6B7280' }}>Class:</span> <strong style={{ color: '#111827' }}>{classInfo}</strong></div>
                            <div><span style={{ color: '#6B7280' }}>Campus:</span> <strong style={{ color: '#111827' }}>{campus}</strong></div>
                          </div>
                        </div>

                        {/* Exam schedule table */}
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: '#0F4C45', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Exam Schedule</div>
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                              <thead>
                                <tr style={{ background: '#F0FDF4' }}>
                                  <th style={{ padding: '4px 5px', border: '1px solid #D1D5DB', color: '#374151', fontWeight: 700, textAlign: 'center', width: 28 }}>No.</th>
                                  <th style={{ padding: '4px 5px', border: '1px solid #D1D5DB', color: '#374151', fontWeight: 700 }}>Day</th>
                                  <th style={{ padding: '4px 5px', border: '1px solid #D1D5DB', color: '#374151', fontWeight: 700 }}>Date</th>
                                  <th style={{ padding: '4px 5px', border: '1px solid #D1D5DB', color: '#374151', fontWeight: 700 }}>Subject</th>
                                  <th style={{ padding: '4px 5px', border: '1px solid #D1D5DB', color: '#374151', fontWeight: 700 }}>Start</th>
                                  <th style={{ padding: '4px 5px', border: '1px solid #D1D5DB', color: '#374151', fontWeight: 700 }}>End</th>
                                  <th style={{ padding: '4px 5px', border: '1px solid #D1D5DB', color: '#374151', fontWeight: 700 }}>Room</th>
                                </tr>
                              </thead>
                              <tbody>
                                {schedule.map((row, i) => (
                                  <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#F9FAFB' }}>
                                    <td style={{ padding: '4px 5px', border: '1px solid #E5E7EB', textAlign: 'center', color: '#6B7280' }}>{row.no}</td>
                                    <td style={{ padding: '4px 5px', border: '1px solid #E5E7EB', color: '#374151' }}>{row.day}</td>
                                    <td style={{ padding: '4px 5px', border: '1px solid #E5E7EB', color: '#374151', whiteSpace: 'nowrap' }}>{fmtDate(row.date)}</td>
                                    <td style={{ padding: '4px 5px', border: '1px solid #E5E7EB', color: '#111827', fontWeight: 600 }}>{row.subject}</td>
                                    <td style={{ padding: '4px 5px', border: '1px solid #E5E7EB', color: '#374151', textAlign: 'center', whiteSpace: 'nowrap' }}>{row.startTime}</td>
                                    <td style={{ padding: '4px 5px', border: '1px solid #E5E7EB', color: '#374151', textAlign: 'center', whiteSpace: 'nowrap' }}>{row.endTime}</td>
                                    <td style={{ padding: '4px 5px', border: '1px solid #E5E7EB', color: '#374151', textAlign: 'center' }}>{row.room}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Instructions */}
                        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 5, padding: '7px 10px', marginBottom: 10 }}>
                          <div style={{ fontSize: 10.5, fontWeight: 800, color: '#92400E', marginBottom: 4 }}>Instructions for Candidates:</div>
                          <ol style={{ margin: 0, paddingLeft: 16 }}>
                            {INSTRUCTIONS.map((inst, i) => (
                              <li key={i} style={{ fontSize: 10, color: '#374151', marginBottom: 2, lineHeight: 1.4 }}>{inst}</li>
                            ))}
                          </ol>
                        </div>

                        {/* NOTE */}
                        <div style={{ textAlign: 'center', fontSize: 10, color: '#9CA3AF', fontStyle: 'italic', borderTop: '1px dashed #D1D5DB', paddingTop: 6, marginBottom: 8 }}>
                          NOTE: This is a computer generated document
                        </div>

                        {/* Signatures + print date */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                          <div style={{ textAlign: 'center', width: '36%' }}>
                            <div style={{ borderTop: '1.5px solid #374151', paddingTop: 4, fontSize: 10.5, color: '#374151', fontWeight: 600 }}>Class Incharge</div>
                          </div>
                          <div style={{ textAlign: 'center', fontSize: 9.5, color: '#9CA3AF', lineHeight: 1.4 }}>
                            <div>Printed: {printDateTime}</div>
                          </div>
                          <div style={{ textAlign: 'center', width: '36%' }}>
                            <div style={{ borderTop: '1.5px solid #374151', paddingTop: 4, fontSize: 10.5, color: '#374151', fontWeight: 600 }}>Principal</div>
                          </div>
                        </div>

                        {/* Individual print button */}
                        <div style={{ marginTop: 10, textAlign: 'right' }}>
                          <button className="btn btn-outline btn-sm" onClick={() => openPrint([student])}>
                            <Printer size={11}/> Print This Slip
                          </button>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom print bar */}
              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
                <button
                  className="btn btn-teal"
                  style={{ padding: '10px 32px', fontSize: 14 }}
                  onClick={() => openPrint(students)}
                >
                  <Printer size={16}/> Print All {students.length} Examination Slips
                </button>
              </div>
            </>
          )}
        </>
      )}

    </div>
  );
}
