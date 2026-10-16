/**
 * Printed student documents: a class list, and one student's complete
 * record (details, fee statement, attendance and results) for the office
 * file or a parent meeting. Both carry the school's letterhead.
 */
import { printHTML, printDocumentShell } from './print';
import { schoolLogoOf } from './schoolBranding';
import { money } from './currency';
import { feePeriod } from './feeMonth';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const day = (d) => (d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

const STYLE = `
  .lh { display:flex; align-items:center; gap:14px; border-bottom:2.5px solid #0f766e; padding-bottom:10px; margin-bottom:14px; }
  .lh img { width:54px; height:54px; object-fit:contain; }
  .lh h1 { margin:0; font-size:19px; color:#0f3d3a; }
  .lh p { margin:2px 0 0; font-size:11px; color:#5b6472; }
  .lh .doc { margin-left:auto; text-align:right; }
  .lh .doc b { display:block; font-size:14px; color:#0f766e; text-transform:uppercase; letter-spacing:.06em; }
  .lh .doc span { font-size:11px; color:#5b6472; }
  h2 { font-size:13px; color:#0f766e; text-transform:uppercase; letter-spacing:.08em; margin:16px 0 6px; border-bottom:1px solid #d7e3e1; padding-bottom:3px; }
  table.list th { background:#0f766e; color:#fff; font-size:10.5px; text-align:left; padding:5px 6px; }
  table.list td { font-size:11px; padding:5px 6px; border-bottom:1px solid #e5e9ef; }
  table.list tr:nth-child(even) td { background:#f7faf9; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:2px 22px; }
  .kv { display:flex; font-size:11.5px; padding:3px 0; border-bottom:1px dotted #d9dee6; }
  .kv span:first-child { width:42%; color:#5b6472; }
  .kv span:last-child { font-weight:600; }
  .stats { display:flex; gap:8px; margin:6px 0 4px; }
  .stats div { flex:1; border:1px solid #d7e3e1; border-radius:6px; padding:6px 8px; }
  .stats b { display:block; font-size:14px; }
  .stats span { font-size:10px; color:#5b6472; text-transform:uppercase; letter-spacing:.05em; }
  .photo { width:86px; height:100px; object-fit:cover; border:1px solid #cfd6df; border-radius:4px; }
  .foot { margin-top:26px; display:flex; justify-content:space-between; font-size:10.5px; color:#5b6472; }
  .foot div { border-top:1px solid #8a94a3; padding-top:4px; width:150px; text-align:center; }
  .muted { color:#8a94a3; }
`;

function letterhead(school, docTitle, docSub) {
  const logo = schoolLogoOf(school);
  return `<div class="lh">
    ${logo ? `<img src="${esc(logo)}" alt="">` : ''}
    <div><h1>${esc(school?.name || 'School')}</h1><p>${esc([school?.address, school?.city, school?.phone].filter(Boolean).join(' · '))}</p></div>
    <div class="doc"><b>${esc(docTitle)}</b><span>${esc(docSub || '')}</span></div>
  </div>`;
}

/** A class (or search result) list: roll number, name, father, phone. */
export function printClassList({ school, title, subtitle, students }) {
  const rows = students.map((s, i) => `<tr>
    <td>${i + 1}</td><td>${esc(s.rollNo || '—')}</td><td><b>${esc(s.name)}</b></td><td>${esc(s.fatherName || '—')}</td>
    <td>${esc(s.class?.name || '')}${s.section?.name ? ` – ${esc(s.section.name)}` : ''}</td>
    <td>${esc(s.gender || '—')}</td><td>${esc(s.emergencyPhone || '—')}</td><td style="width:80px"></td></tr>`).join('');
  const body = `${letterhead(school, title, `${students.length} students · printed ${day(new Date())}`)}
    ${subtitle ? `<p style="font-size:11.5px;margin:0 0 8px;color:#5b6472">${esc(subtitle)}</p>` : ''}
    <table class="list"><thead><tr><th>#</th><th>Roll no</th><th>Name</th><th>Father's name</th><th>Class</th><th>Gender</th><th>Parent phone</th><th>Remarks</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="8" class="muted">No students</td></tr>'}</tbody></table>`;
  return printHTML(printDocumentShell({ title, body: `<style>${STYLE}</style>${body}` }), { title });
}

/** One student's complete record on A4. */
export function printStudentRecord({ school, student: s, fees, attendance, exams }) {
  const kv = (rows) => rows.filter(([, v]) => v !== null && v !== undefined && v !== '').map(([k, v]) => `<div class="kv"><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join('');
  const invoices = fees?.invoices || [];
  const billed = invoices.reduce((a, i) => a + (i.totalAmount || 0), 0);
  const paid = invoices.reduce((a, i) => a + (i.paidAmount || 0), 0);
  const due = invoices.reduce((a, i) => a + (i.dueAmount || 0), 0);
  const att = attendance?.summary;
  const body = `${letterhead(school, 'Student record', `Printed ${day(new Date())}`)}
    <div style="display:flex;gap:16px;align-items:flex-start">
      ${s.photoUrl ? `<img class="photo" src="${esc(s.photoUrl)}" alt="">` : ''}
      <div style="flex:1">
        <div style="font-size:18px;font-weight:700">${esc([s.name, s.lastName].filter(Boolean).join(' '))}</div>
        <div style="font-size:12px;color:#5b6472;margin:2px 0 8px">Roll no ${esc(s.rollNo || '—')} · ${esc(s.class?.name || 'No class')}${s.section?.name ? ` – ${esc(s.section.name)}` : ''} · ${esc(s.status || '')}</div>
        <div class="stats">
          ${att ? `<div><b>${att.percentage}%</b><span>Attendance (${att.total} days)</span></div>` : ''}
          ${fees ? `<div><b>${money(paid)}</b><span>Fee paid</span></div><div><b>${money(due)}</b><span>Outstanding</span></div>` : ''}
          ${exams?.[0] ? `<div><b>${exams[0].percentage}% ${esc(exams[0].grade)}</b><span>${esc(exams[0].title)}</span></div>` : ''}
        </div>
      </div>
    </div>
    <h2>Student</h2><div class="grid">${kv([
      ['Date of birth', s.dob && day(s.dob)], ['Gender', s.gender], ['B-Form / CNIC', s.bFormNo], ['Admission date', s.admissionDate && day(s.admissionDate)],
      ['Family no.', s.familyNo], ['Religion', s.religion], ['Nationality', s.nationality], ['Blood group', s.bloodGroup],
    ])}</div>
    <h2>Family and contact</h2><div class="grid">${kv([
      ["Father's name", s.fatherName], ["Father's CNIC", s.fatherCnic], ["Father's occupation", s.fatherOccupation], ["Mother's name", s.motherName],
      ['Parent phone', s.emergencyPhone], ["Mother's mobile", s.motherPhone], ['Email', s.parentInfo?.email || s.email], ['Address', [s.address, s.city].filter(Boolean).join(', ')],
    ])}</div>
    ${fees ? `<h2>Fee statement</h2>
      <table class="list"><thead><tr><th>Fee</th><th>Month</th><th>Amount</th><th>Discount</th><th>Paid</th><th>Due</th><th>Status</th></tr></thead><tbody>
      ${invoices.map((i) => `<tr><td>${esc(i.feeTitle || 'Fee')}</td><td>${esc(feePeriod(i) || '—')}</td><td>${money(i.totalAmount)}</td><td>${money(i.discount)}</td><td>${money(i.paidAmount)}</td><td>${money(i.dueAmount)}</td><td>${esc(i.status)}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">No fee bills</td></tr>'}
      <tr><td colspan="2"><b>Total</b></td><td><b>${money(billed)}</b></td><td></td><td><b>${money(paid)}</b></td><td><b>${money(due)}</b></td><td></td></tr>
      </tbody></table>` : ''}
    ${att ? `<h2>Attendance${attendance.range?.sessionName ? ` · session ${esc(attendance.range.sessionName)}` : ''}</h2>
      <div class="stats"><div><b>${att.present}</b><span>Present</span></div><div><b>${att.late}</b><span>Late</span></div><div><b>${att.absent}</b><span>Absent</span></div><div><b>${att.leave}</b><span>Leave</span></div><div><b>${att.percentage}%</b><span>Attended</span></div></div>` : ''}
    ${exams?.length ? `<h2>Results</h2>
      <table class="list"><thead><tr><th>Exam</th><th>Marks</th><th>%</th><th>Grade</th><th>Division</th><th>Position</th><th>Result</th></tr></thead><tbody>
      ${exams.map((e) => `<tr><td>${esc(e.title)}</td><td>${e.totalObtained}/${e.totalMarks}</td><td>${e.percentage}%</td><td>${esc(e.grade)}</td><td>${esc(e.division)}</td><td>${e.position} of ${e.classSize}</td><td>${e.passed ? 'Pass' : 'Fail'}</td></tr>`).join('')}
      </tbody></table>` : ''}
    <div class="foot"><div>Class teacher</div><div>Office</div><div>Principal</div></div>`;
  const title = `Student record — ${s.name}`;
  return printHTML(printDocumentShell({ title, body: `<style>${STYLE}</style>${body}` }), { title });
}
