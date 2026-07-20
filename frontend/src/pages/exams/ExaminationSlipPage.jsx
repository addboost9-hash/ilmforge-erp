/**
 * IlmForge — Examination Slip (Admit Card) Generator  v2
 *
 * Enhancements over v1:
 *  - Fetches class+section-specific datesheet via GET /exams/:examId/datesheet
 *  - Displays exam name + year in the title band (ADMIT CARD — [EXAM NAME] [YEAR])
 *  - Shows Father Name on the slip
 *  - Photo box (3x4 cm) in print layout
 *  - Controller of Examinations signature line
 *  - "No admit card = No entry" warning footer
 *  - Dual schedule fetch: class-specific datesheet → fallback global timetable
 *  - On-screen preview mirrors the exact print layout
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer, GraduationCap, ArrowLeft, Info, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { buildWatermarkCss, buildWatermarkMarkup } from '../../utils/watermarkPrint';

/* ─── Helpers ──────────────────────────────────────────────────────── */

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
};

const getDayName = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-PK', { weekday: 'long' });
  } catch {
    return '—';
  }
};

/* Normalise a row coming from /exams/timetable (global) */
const normaliseGlobalRow = (row, index) => ({
  no:        index + 1,
  day:       row.day || getDayName(row.date),
  date:      row.date || row.examDate || '',
  subject:   row.subjectName || row.subject || '—',
  startTime: row.startTime || row.start || '—',
  endTime:   row.endTime   || row.end   || '—',
  room:      row.room      || row.venue || '—',
});

/* Normalise a row coming from /exams/:id/datesheet (class-specific) */
const normaliseDatesheetRow = (row, index) => ({
  no:        index + 1,
  day:       getDayName(row.date),
  date:      row.date || '',
  subject:   row.subject || row.subjectName || '—',
  startTime: row.timeFrom || row.startTime || '—',
  endTime:   row.timeTo   || row.endTime   || '—',
  room:      row.room     || '—',
});

/* ─── Print HTML builder ────────────────────────────────────────────── */
const buildPrintHTML = ({
  students, schedule, instructions, schoolName, schoolAddress,
  className, sectionName, logoSrc, printDateTime, examTitle, examYear,
}) => {
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
  const slipWatermarkHtml = buildWatermarkMarkup({
    logo: logoSrc,
    text: schoolName,
    containerClass: 'slip-watermark',
    imgAlt: 'School watermark',
  });

  const slipHTML = students.map((s) => {
    const rollNo    = s.rollNo || s.admissionNo || `ST-${String(s.id).padStart(4, '0')}`;
    const classInfo = className + (sectionName ? ` — ${sectionName}` : '');
    const fatherName = s.fatherName || s.parentName || '—';
    const photoUrl  = s.photoUrl || '';

    const scheduleRows = schedule.map(row => `
      <tr>
        <td style="text-align:center;padding:4px 6px;border:1px solid #D1D5DB;font-size:9pt;">${row.no}</td>
        <td style="padding:4px 6px;border:1px solid #D1D5DB;font-size:9pt;">${row.subject}</td>
        <td style="padding:4px 6px;border:1px solid #D1D5DB;font-size:9pt;white-space:nowrap;">${fmtDate(row.date)}</td>
        <td style="text-align:center;padding:4px 6px;border:1px solid #D1D5DB;font-size:9pt;white-space:nowrap;">${row.startTime} – ${row.endTime}</td>
        <td style="text-align:center;padding:4px 6px;border:1px solid #D1D5DB;font-size:9pt;">${row.room}</td>
      </tr>`).join('');

    const instructionsList = instructions.map((inst) => `
      <li style="font-size:8.5pt;color:#374151;margin-bottom:2px;line-height:1.4;">${inst}</li>`).join('');

    const logoEl = logoSrc
      ? `<img src="${logoSrc}" style="width:54px;height:54px;object-fit:contain;border-radius:4px;" alt="School Logo"/>`
      : `<div style="width:54px;height:54px;border-radius:50%;background:#0F766E;display:flex;align-items:center;justify-content:center;font-size:26px;color:#fff;flex-shrink:0;">&#127891;</div>`;

    const photoEl = photoUrl
      ? `<img src="${photoUrl}" style="width:3cm;height:4cm;object-fit:cover;border:1.5px solid #9CA3AF;border-radius:3px;" alt="Student Photo"/>`
      : `<div style="width:3cm;height:4cm;border:1.5px dashed #9CA3AF;border-radius:3px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#F9FAFB;">
           <div style="font-size:22px;color:#D1D5DB;">&#128100;</div>
           <div style="font-size:7pt;color:#9CA3AF;margin-top:4px;text-align:center;">Photo<br/>3 × 4 cm</div>
         </div>`;

    return `
    <div class="slip" style="width:190mm;border:2px solid #0F766E;border-radius:6px;padding:8mm 9mm;font-family:'Arial',sans-serif;background:#fff;box-sizing:border-box;page-break-after:always;break-after:page;position:relative;overflow:hidden;">
      ${slipWatermarkHtml}
      <div style="position:relative;z-index:2;">

      <!-- HEADER: logo + school name -->
      <div style="display:flex;align-items:center;gap:10px;border-bottom:2px solid #0F766E;padding-bottom:8px;margin-bottom:8px;">
        ${logoEl}
        <div style="flex:1;text-align:center;">
          <div style="font-size:15pt;font-weight:900;color:#0F4C45;line-height:1.2;">${schoolName}</div>
          <div style="font-size:9pt;color:#6B7280;margin-top:2px;">${schoolAddress}</div>
        </div>
        <!-- empty spacer same width as logo for centering -->
        <div style="width:54px;flex-shrink:0;"></div>
      </div>

      <!-- ADMIT CARD TITLE BAND -->
      <div style="text-align:center;background:#0F766E;color:#fff;padding:7px 12px;border-radius:4px;margin-bottom:10px;letter-spacing:1.5px;text-transform:uppercase;">
        <span style="font-size:12pt;font-weight:900;">Admit Card</span>
        <span style="font-size:10pt;font-weight:600;margin-left:10px;">— ${examTitle}${examYear ? ' ' + examYear : ''}</span>
      </div>

      <!-- SEPARATOR LINE -->
      <div style="border-top:2px double #0F766E;margin-bottom:10px;"></div>

      <!-- STUDENT INFO + PHOTO -->
      <div style="display:flex;gap:10px;margin-bottom:10px;align-items:flex-start;">

        <!-- Info table (left) -->
        <div style="flex:1;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:5px;padding:8px 10px;">
          <table style="width:100%;border-collapse:collapse;font-size:10pt;">
            <tr>
              <td style="color:#6B7280;padding:3px 0;width:110px;vertical-align:top;">Student Name</td>
              <td style="color:#111827;font-weight:700;padding:3px 0;vertical-align:top;">: ${s.name || '—'}</td>
            </tr>
            <tr>
              <td style="color:#6B7280;padding:3px 0;vertical-align:top;">Roll Number</td>
              <td style="color:#0F766E;font-weight:900;font-family:'Courier New',monospace;font-size:11pt;padding:3px 0;vertical-align:top;">: ${rollNo}</td>
            </tr>
            <tr>
              <td style="color:#6B7280;padding:3px 0;vertical-align:top;">Class</td>
              <td style="color:#111827;font-weight:700;padding:3px 0;vertical-align:top;">: ${classInfo}</td>
            </tr>
            <tr>
              <td style="color:#6B7280;padding:3px 0;vertical-align:top;">Section</td>
              <td style="color:#374151;font-weight:600;padding:3px 0;vertical-align:top;">: ${sectionName || '—'}</td>
            </tr>
            <tr>
              <td style="color:#6B7280;padding:3px 0;vertical-align:top;">Father Name</td>
              <td style="color:#374151;font-weight:600;padding:3px 0;vertical-align:top;">: ${fatherName}</td>
            </tr>
          </table>
        </div>

        <!-- Photo box (right) -->
        <div style="flex-shrink:0;text-align:center;">
          ${photoEl}
        </div>
      </div>

      <!-- EXAMINATION SCHEDULE -->
      <div style="margin-bottom:10px;">
        <div style="font-size:10pt;font-weight:800;color:#0F4C45;margin-bottom:5px;text-transform:uppercase;letter-spacing:0.5px;">Examination Schedule</div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#0F766E;color:#fff;">
              <th style="padding:5px 6px;border:1px solid #0F766E;font-weight:700;font-size:9pt;width:28px;">No.</th>
              <th style="padding:5px 6px;border:1px solid #0F766E;font-weight:700;font-size:9pt;text-align:left;">Subject</th>
              <th style="padding:5px 6px;border:1px solid #0F766E;font-weight:700;font-size:9pt;white-space:nowrap;">Date</th>
              <th style="padding:5px 6px;border:1px solid #0F766E;font-weight:700;font-size:9pt;">Time</th>
              <th style="padding:5px 6px;border:1px solid #0F766E;font-weight:700;font-size:9pt;">Room</th>
            </tr>
          </thead>
          <tbody>
            ${scheduleRows}
          </tbody>
        </table>
      </div>

      <!-- INSTRUCTIONS -->
      <div style="margin-bottom:10px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:5px;padding:7px 10px;">
        <div style="font-size:9.5pt;font-weight:800;color:#92400E;margin-bottom:4px;">Instructions for Candidates:</div>
        <ol style="margin:0;padding-left:16px;">
          ${instructionsList}
        </ol>
      </div>

      <!-- CONTROLLER OF EXAMINATIONS -->
      <div style="border-top:1px solid #D1D5DB;padding-top:8px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-end;">
          <div style="text-align:center;min-width:38%;">
            <div style="border-top:1.5px solid #374151;padding-top:4px;font-size:9.5pt;color:#374151;font-weight:600;">Class Incharge</div>
          </div>
          <div style="text-align:center;font-size:8.5pt;color:#9CA3AF;line-height:1.5;">
            <div>Printed: ${printDateTime}</div>
            <div style="font-family:'Courier New',monospace;color:#0F766E;font-size:8pt;">${rollNo}</div>
          </div>
          <div style="text-align:center;min-width:38%;">
            <div style="border-top:1.5px solid #374151;padding-top:4px;font-size:9.5pt;color:#374151;font-weight:600;">Controller of Examinations</div>
          </div>
        </div>
      </div>

      <!-- WARNING FOOTER -->
      <div style="text-align:center;background:#FEF2F2;border:1.5px solid #FECACA;border-radius:4px;padding:7px 12px;margin-top:4px;">
        <div style="font-size:9.5pt;font-weight:900;color:#991B1B;text-transform:uppercase;letter-spacing:0.5px;">
          IMPORTANT: Bring this card to every exam paper.
        </div>
        <div style="font-size:9pt;font-weight:700;color:#B91C1C;margin-top:2px;">
          No admit card = No entry to examination hall.
        </div>
      </div>

      </div>
    </div>`;
  }).join('\n    ');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Admit Cards — ${schoolName} — ${examTitle}</title>
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
    .slips-wrap { display: flex; flex-direction: column; gap: 10mm; }
    .slip { display: block; }
    ${slipWatermarkCss}
    @media print {
      body { background: #fff; padding: 0; }
      .controls { display: none !important; }
      .slips-wrap { gap: 0; }
      /* one slip per A4 page */
      @page { size: A4 portrait; margin: 8mm; }
      .slip { page-break-after: always; break-after: page; border-radius: 0 !important; }
      .slip:last-child { page-break-after: avoid; break-after: avoid; }
    }
  </style>
</head>
<body>
  <div class="controls">
    <div>
      <div style="font-size:15px;font-weight:800;color:#0F4C45;">${schoolName} — Admit Cards</div>
      <div style="font-size:11.5px;color:#9CA3AF;margin-top:2px;">${examTitle}${examYear ? ' ' + examYear : ''} &middot; ${students.length} card(s) &middot; ${printDateTime}</div>
    </div>
    <button class="print-btn" onclick="window.print()">&#128424; Print All Admit Cards</button>
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
  const [examId,    setExamId]    = useState('');
  const [classId,   setClassId]   = useState('');
  const [sectionId, setSectionId] = useState('');
  const [generated, setGenerated] = useState(false);

  /* ── Queries ── */

  /* All exams */
  const { data: exams, isLoading: loadingExams } = useQuery({
    queryKey: ['exams-list'],
    queryFn: () => api.get('/exams').then(r => r.data.data || []),
  });

  /* Classes */
  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data),
  });

  /* School settings */
  const { data: school } = useQuery({
    queryKey: ['school-settings'],
    queryFn: () => api.get('/settings/school').then(r => r.data.data),
  });

  /* Exam settings (for admit card instructions) */
  const { data: examSettings } = useQuery({
    queryKey: ['exam-settings'],
    queryFn: () => api.get('/settings/exam').then(r => r.data.data),
  });

  /* Class-specific datesheet via GET /exams/:examId/datesheet */
  const {
    data: datesheetRaw,
    isLoading: loadingDatesheet,
    isFetched: datesheetFetched,
  } = useQuery({
    queryKey: ['exam-datesheet', examId],
    queryFn: () => api.get(`/exams/${examId}/datesheet`).then(r => r.data.data || []),
    enabled: !!examId,
  });

  /* Fallback: global timetable (used when datesheet has no entries for this class) */
  const {
    data: timetableRaw,
    isLoading: loadingTimetable,
  } = useQuery({
    queryKey: ['exam-timetable', examId],
    queryFn: () => api.get('/exams/timetable', { params: { examId } }).then(r => r.data.data || []),
    enabled: !!examId,
  });

  /* ── Derived values ── */
  const selectedClass   = (classes || []).find(c => c.id === parseInt(classId));
  const selectedSection = selectedClass?.sections?.find(s => s.id === parseInt(sectionId));
  const selectedExam    = (exams || []).find(e => e.id === parseInt(examId));

  /* Pick schedule rows for the selected class+section from the datesheet */
  const scheduleFromDatesheet = (() => {
    if (!datesheetRaw || !classId) return [];
    // datesheetRaw is an array of { classId, className, sectionId, sectionName, entries[] }
    const matchedRow = datesheetRaw.find(row => {
      const classMatch   = row.classId === parseInt(classId);
      const sectionMatch = sectionId
        ? row.sectionId === parseInt(sectionId)
        : true; // if no section selected, use the first matching class row
      return classMatch && sectionMatch;
    }) || datesheetRaw.find(row => row.classId === parseInt(classId));

    if (!matchedRow || !matchedRow.entries?.length) return [];
    return matchedRow.entries.map(normaliseDatesheetRow);
  })();

  /* Use datesheet first; fall back to global timetable */
  const schedule = scheduleFromDatesheet.length > 0
    ? scheduleFromDatesheet
    : (timetableRaw || []).map(normaliseGlobalRow);

  const loadingSchedule = loadingDatesheet || loadingTimetable;
  const scheduleFetched = datesheetFetched;
  const noSchedule      = !!examId && scheduleFetched && !loadingSchedule && schedule.length === 0;

  /* Students */
  const { data: students, isLoading: loadingStudents } = useQuery({
    queryKey: ['students-for-slip', classId, sectionId],
    queryFn: () =>
      api.get('/students', {
        params: {
          classId:   classId   || undefined,
          sectionId: sectionId || undefined,
          status: 'active',
          limit: 300,
        },
      }).then(r => r.data.data || []),
    enabled: !!classId,
  });

  /* Shared values */
  const logoSrc    = typeof window !== 'undefined' ? localStorage.getItem('schoolLogoPreview') : null;
  const schoolName = school?.name    || 'IlmForge School';
  const schoolAddr = school?.address || school?.city || 'Islamabad, Pakistan';
  const examTitle  = selectedExam?.title || selectedExam?.name || 'Examination';
  const examYear   = selectedExam?.dateStart
    ? new Date(selectedExam.dateStart).getFullYear()
    : new Date().getFullYear();

  const rawInstructions = examSettings?.admitCardInstructions;
  const instructions = Array.isArray(rawInstructions) && rawInstructions.length > 0
    ? rawInstructions
    : typeof rawInstructions === 'string' && rawInstructions.trim()
      ? rawInstructions.split('\n').map(l => l.trim()).filter(Boolean)
      : [
          'Students must report to the examination hall at least 30 minutes before the commencement of the examination.',
          'Candidates must bring this Admit Card along with their School Identity Card on each day of the examination.',
          'Use of mobile phones, electronic devices, or any unfair means is strictly prohibited inside the examination hall.',
          'Candidates must follow all instructions given by the Invigilator/Supervisor during the examination.',
          'No manual correction or overwriting is allowed on this card. Any tampering will render it invalid.',
        ];

  const printDateTime = new Date().toLocaleString('en-PK', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  /* ── Handlers ── */
  const handleGenerate = () => {
    if (!classId || !examId) return;
    setGenerated(true);
  };

  const openPrint = (subset) => {
    if (!subset?.length || !schedule.length) return;
    const win = window.open('', '_blank');
    win.document.write(buildPrintHTML({
      students:      subset,
      schedule,
      instructions,
      schoolName,
      schoolAddress: schoolAddr,
      className:     selectedClass?.name  || `Class ${classId}`,
      sectionName:   selectedSection?.name || '',
      logoSrc,
      printDateTime,
      examTitle,
      examYear,
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
              Examination Admit Card Generator
            </h1>
            <p className="page-subtitle">Generate and print exam admit cards for all students in a class</p>
          </div>
        </div>
        {generated && students?.length > 0 && schedule.length > 0 && (
          <button className="btn btn-teal" onClick={() => openPrint(students)}>
            <Printer size={15}/> Print All ({students.length})
          </button>
        )}
      </div>

      {/* ── Filters Card ── */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 14, alignItems: 'flex-end' }}>

          {/* Exam */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Exam *</label>
            <select
              className="form-select"
              value={examId}
              onChange={e => { setExamId(e.target.value); setGenerated(false); }}
              disabled={loadingExams}
            >
              <option value="">{loadingExams ? 'Loading exams…' : 'Select Exam'}</option>
              {(exams || []).map(ex => (
                <option key={ex.id} value={ex.id}>{ex.title || ex.name}</option>
              ))}
            </select>
          </div>

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
            disabled={!classId || !examId || loadingStudents || loadingSchedule || noSchedule}
            style={{ height: 38 }}
          >
            <GraduationCap size={15}/>
            {loadingStudents || loadingSchedule ? 'Loading...' : 'Generate Cards'}
          </button>
        </div>

        {/* Schedule status strip */}
        {examId && !loadingSchedule && (
          <div style={{
            marginTop: 12,
            padding: '8px 12px',
            background: noSchedule ? '#FFF7ED' : '#F0FDF4',
            borderRadius: 6,
            border: `1px solid ${noSchedule ? '#FDBA74' : '#BBF7D0'}`,
            fontSize: 12.5,
            color: noSchedule ? '#C2410C' : '#0F766E',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            {noSchedule
              ? <><AlertTriangle size={14} style={{ flexShrink: 0 }}/> No exam timetable set for this class. Please add a date sheet in Exam Timetable first.</>
              : <><Info size={14} style={{ flexShrink: 0 }}/><strong>Schedule ready:</strong>&nbsp;{schedule.length} subject(s) loaded{scheduleFromDatesheet.length > 0 ? ' (class-specific date sheet)' : ' (global timetable)'}</>
            }
          </div>
        )}
        {loadingSchedule && (
          <div style={{ marginTop: 12, fontSize: 12.5, color: '#6B7280' }}>Loading schedule…</div>
        )}
      </div>

      {/* ── Empty state ── */}
      {!generated && (
        <div className="card">
          <div className="empty-state" style={{ padding: 60 }}>
            <div className="empty-state-icon">
              <GraduationCap size={52} style={{ opacity: 0.18 }}/>
            </div>
            <div className="empty-state-text">Select an exam and class to generate admit cards</div>
            <div className="empty-state-sub">
              Choose exam, class and optional section from the filters above, then click Generate Cards
            </div>
          </div>
        </div>
      )}

      {/* ── Generated Slips Preview ── */}
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
              {/* Action bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: '#374151' }}>
                  <strong style={{ color: '#0F766E' }}>{students.length}</strong> admit card(s) ready
                  &nbsp;&middot;&nbsp;
                  <span style={{ color: '#6B7280' }}>
                    {examTitle}{examYear ? ` ${examYear}` : ''}
                    &nbsp;&mdash;&nbsp;
                    {selectedClass?.name}{selectedSection ? ` — ${selectedSection.name}` : ''}
                  </span>
                </div>
                <button
                  className="btn btn-teal"
                  onClick={() => openPrint(students)}
                  disabled={schedule.length === 0}
                >
                  <Printer size={14}/> Print All Admit Cards
                </button>
              </div>

              {/* Cards grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 20 }}>
                {students.map((student) => {
                  const rollNo    = student.rollNo || student.admissionNo || `ST-${String(student.id).padStart(4, '0')}`;
                  const classInfo = (selectedClass?.name || `Class ${classId}`) + (selectedSection ? ` — ${selectedSection.name}` : '');
                  const fatherName = student.fatherName || student.parentName || '—';
                  const photoUrl  = student.photoUrl || '';

                  return (
                    <div key={student.id} className="card" style={{ padding: 0, overflow: 'hidden', border: '2px solid #0F766E', borderRadius: 8 }}>

                      {/* Card Header */}
                      <div style={{ background: '#0F766E', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        {logoSrc
                          ? <img src={logoSrc} alt="Logo" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 4, background: 'rgba(255,255,255,0.15)', padding: 2, flexShrink: 0 }}/>
                          : <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🎓</div>
                        }
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{schoolName}</div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.72)', marginTop: 1 }}>{schoolAddr}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.65)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Admit Card</div>
                          <div style={{ fontSize: 10, fontWeight: 800, color: '#BBF7D0', marginTop: 2, fontFamily: 'monospace' }}>{rollNo}</div>
                        </div>
                      </div>

                      {/* Exam title band */}
                      <div style={{ background: '#F0FDF4', borderBottom: '1px solid #BBF7D0', padding: '5px 14px', textAlign: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#0F4C45', textTransform: 'uppercase', letterSpacing: 1 }}>
                          {examTitle}{examYear ? ` ${examYear}` : ''}
                        </span>
                      </div>

                      <div style={{ padding: '12px 14px' }}>

                        {/* Student info + photo */}
                        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                          {/* Info */}
                          <div style={{ flex: 1, background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 6, padding: '8px 10px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '3px 8px', fontSize: 11.5 }}>
                              <span style={{ color: '#6B7280', whiteSpace: 'nowrap' }}>Student Name</span>
                              <span style={{ color: '#111827', fontWeight: 700 }}>: {student.name}</span>
                              <span style={{ color: '#6B7280', whiteSpace: 'nowrap' }}>Roll Number</span>
                              <span style={{ color: '#0F766E', fontWeight: 900, fontFamily: 'monospace' }}>: {rollNo}</span>
                              <span style={{ color: '#6B7280' }}>Class</span>
                              <span style={{ color: '#111827', fontWeight: 700 }}>: {classInfo}</span>
                              <span style={{ color: '#6B7280' }}>Section</span>
                              <span style={{ color: '#374151', fontWeight: 600 }}>: {selectedSection?.name || '—'}</span>
                              <span style={{ color: '#6B7280', whiteSpace: 'nowrap' }}>Father Name</span>
                              <span style={{ color: '#374151', fontWeight: 600 }}>: {fatherName}</span>
                            </div>
                          </div>

                          {/* Photo box */}
                          <div style={{ flexShrink: 0, textAlign: 'center' }}>
                            {photoUrl
                              ? <img src={photoUrl} alt="Student"
                                  style={{ width: 64, height: 80, objectFit: 'cover', border: '1.5px solid #D1D5DB', borderRadius: 4 }}/>
                              : (
                                <div style={{
                                  width: 64, height: 80,
                                  border: '1.5px dashed #9CA3AF', borderRadius: 4,
                                  display: 'flex', flexDirection: 'column',
                                  alignItems: 'center', justifyContent: 'center',
                                  background: '#F9FAFB', fontSize: 10, color: '#9CA3AF',
                                }}>
                                  <span style={{ fontSize: 20 }}>👤</span>
                                  <span style={{ fontSize: 9, marginTop: 2, textAlign: 'center' }}>Photo<br/>3×4</span>
                                </div>
                              )
                            }
                          </div>
                        </div>

                        {/* Schedule table */}
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 10.5, fontWeight: 800, color: '#0F4C45', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Examination Schedule
                          </div>
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                              <thead>
                                <tr style={{ background: '#F0FDF4' }}>
                                  <th style={{ padding: '4px 5px', border: '1px solid #D1D5DB', color: '#374151', fontWeight: 700, textAlign: 'center', width: 28 }}>No.</th>
                                  <th style={{ padding: '4px 5px', border: '1px solid #D1D5DB', color: '#374151', fontWeight: 700 }}>Subject</th>
                                  <th style={{ padding: '4px 5px', border: '1px solid #D1D5DB', color: '#374151', fontWeight: 700, whiteSpace: 'nowrap' }}>Date</th>
                                  <th style={{ padding: '4px 5px', border: '1px solid #D1D5DB', color: '#374151', fontWeight: 700 }}>Time</th>
                                  <th style={{ padding: '4px 5px', border: '1px solid #D1D5DB', color: '#374151', fontWeight: 700 }}>Room</th>
                                </tr>
                              </thead>
                              <tbody>
                                {schedule.map((row, i) => (
                                  <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#F9FAFB' }}>
                                    <td style={{ padding: '4px 5px', border: '1px solid #E5E7EB', textAlign: 'center', color: '#6B7280' }}>{row.no}</td>
                                    <td style={{ padding: '4px 5px', border: '1px solid #E5E7EB', color: '#111827', fontWeight: 600 }}>{row.subject}</td>
                                    <td style={{ padding: '4px 5px', border: '1px solid #E5E7EB', color: '#374151', whiteSpace: 'nowrap' }}>{fmtDate(row.date)}</td>
                                    <td style={{ padding: '4px 5px', border: '1px solid #E5E7EB', color: '#374151', whiteSpace: 'nowrap' }}>{row.startTime} – {row.endTime}</td>
                                    <td style={{ padding: '4px 5px', border: '1px solid #E5E7EB', color: '#374151', textAlign: 'center' }}>{row.room}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Instructions (collapsed preview) */}
                        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 5, padding: '7px 10px', marginBottom: 10 }}>
                          <div style={{ fontSize: 10.5, fontWeight: 800, color: '#92400E', marginBottom: 4 }}>Instructions for Candidates:</div>
                          <ol style={{ margin: 0, paddingLeft: 16 }}>
                            {instructions.slice(0, 3).map((inst, i) => (
                              <li key={i} style={{ fontSize: 10, color: '#374151', marginBottom: 2, lineHeight: 1.4 }}>{inst}</li>
                            ))}
                            {instructions.length > 3 && (
                              <li style={{ fontSize: 10, color: '#9CA3AF', listStyle: 'none', marginTop: 2 }}>
                                + {instructions.length - 3} more (shown on print)
                              </li>
                            )}
                          </ol>
                        </div>

                        {/* Signature row */}
                        <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 8, marginBottom: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            <div style={{ textAlign: 'center', minWidth: '38%' }}>
                              <div style={{ borderTop: '1.5px solid #374151', paddingTop: 4, fontSize: 10.5, color: '#374151', fontWeight: 600 }}>Class Incharge</div>
                            </div>
                            <div style={{ textAlign: 'center', fontSize: 9.5, color: '#9CA3AF', lineHeight: 1.4 }}>
                              <div>Printed: {printDateTime}</div>
                            </div>
                            <div style={{ textAlign: 'center', minWidth: '38%' }}>
                              <div style={{ borderTop: '1.5px solid #374151', paddingTop: 4, fontSize: 10.5, color: '#374151', fontWeight: 600 }}>Controller of Examinations</div>
                            </div>
                          </div>
                        </div>

                        {/* Warning footer */}
                        <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 4, padding: '5px 10px', marginBottom: 10, textAlign: 'center' }}>
                          <div style={{ fontSize: 10, fontWeight: 800, color: '#991B1B', textTransform: 'uppercase' }}>
                            IMPORTANT: Bring this card to every exam paper.
                          </div>
                          <div style={{ fontSize: 9.5, fontWeight: 700, color: '#B91C1C', marginTop: 2 }}>
                            No admit card = No entry to examination hall.
                          </div>
                        </div>

                        {/* Individual print button */}
                        <div style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => openPrint([student])}
                            disabled={schedule.length === 0}
                          >
                            <Printer size={11}/> Print This Card
                          </button>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom print bar */}
              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
                <button
                  className="btn btn-teal"
                  style={{ padding: '10px 32px', fontSize: 14 }}
                  onClick={() => openPrint(students)}
                  disabled={schedule.length === 0}
                >
                  <Printer size={16}/> Print All {students.length} Admit Cards
                </button>
              </div>
            </>
          )}
        </>
      )}

    </div>
  );
}
