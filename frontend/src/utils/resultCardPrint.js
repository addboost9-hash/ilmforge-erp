/**
 * Result cards and the result sheet, printed in the school's formal style
 * (utils/printKit.js). One student per A4 page, framed, with the logo faint
 * behind it.
 *
 *   pickSigners({ config, settings, stamp, pictures })
 *       who signs a card: the signatories of the result card settings (Exam
 *       Vault > Results), the parent after the first, the stamp on the
 *       principal's; plain Class teacher / Principal lines when none are set
 *   remarkFor(config, pct)          the final remark for a percentage
 *   printResultCards({ cards, exam, school, grading, signers, settings, provisional, color })
 *       cards: [{ row (a result-sheet row), classSize, classHighest, remark }]
 *   printAnnualCards({ data, students, signers, settings, remarkFor, color })
 *   printResultSheet({ rows, subjects, exam, school, label, signers, color })
 */
import { printHTML } from './print';
import {
  esc, pic, ordinal, longDate, fmtNum, kitCss, docColor, letterhead, titleRibbon, watermark, fields, stats,
  seal, bar, signatures, footer, scaleTable, docHTML, todayLong, GOLD,
} from './printKit';

const PRINCIPAL = /principal|head ?(mistress|master|teacher)/i;

export function pickSigners({ config, settings, stamp = '', pictures = true, parent = true }) {
  const show = (k) => settings?.[k] ?? true;
  const key = (s, i) => (s.name || `sig_${i}`).toLowerCase().replace(/\s+/g, '_');
  let list = (config?.signatures || [])
    .map((s, i) => ({ ...s, on: config?.signatureOptions?.[key(s, i)] !== false }))
    .filter((s) => s.on && (s.name || s.designation));
  if (!show('showPrincipalSignature')) list = list.filter((s) => !PRINCIPAL.test(`${s.designation} ${s.name}`));
  if (!show('showTeacherSignature')) list = list.filter((s) => !/teacher/i.test(`${s.designation} ${s.name}`) || PRINCIPAL.test(`${s.designation} ${s.name}`));
  if (!list.length) {
    list = [show('showTeacherSignature') && { designation: 'Class Teacher' }, show('showPrincipalSignature') && { designation: 'Principal' }].filter(Boolean);
  }
  const principalAt = list.findIndex((s) => PRINCIPAL.test(`${s.designation} ${s.name}`));
  const stampAt = principalAt >= 0 ? principalAt : list.length - 1;
  const out = list.map((s, i) => ({
    label: s.designation || s.name,
    name: s.name && s.designation && s.name !== s.designation ? s.name : '',
    img: pictures ? pic(s.signatureUrl) : '',
    stamp: pictures && i === stampAt ? stamp : '',
  }));
  if (parent) out.splice(Math.min(1, out.length), 0, { label: 'Parent / Guardian' });
  return out;
}

export const remarkFor = (config, pct) => (config?.finalRemarks || []).find((r) => Number(r.minPercent) <= pct && pct <= Number(r.maxPercent))?.remark || '';

const examLine = (exam) => {
  const title = exam?.title || 'Examination';
  const year = exam?.dateStart ? new Date(exam.dateStart).getFullYear() : null;
  const t = year && !/\b(19|20)\d{2}\b/.test(title) ? `${title} ${year}` : title;
  const a = longDate(exam?.dateStart); const b = longDate(exam?.dateEnd);
  const when = a && b && a !== b ? `${a} – ${b}` : a || b;
  return { title: t, when };
};
const pct1 = (n) => `${Math.round(Number(n || 0) * 10) / 10}%`;
const photoBox = (src) => `<div class="k-photo"><div>${pic(src) ? `<img src="${esc(pic(src))}" alt=""/>` : 'Photograph'}</div></div>`;
const idBox = (label, value) => `<div class="k-idbox"><small>${esc(label)}</small><b${String(value || '').length > 9 ? ' class="s"' : ''}>${esc(value || '—')}</b></div>`;
const classOf = (r) => [r.className, r.sectionName].filter(Boolean).join(' – ') || '—';

const CARD_CSS = `
  .k-in.card{min-height:270mm}
  .k-two{display:grid;grid-template-columns:1.45fr 1fr;gap:4mm;margin-top:3.5mm}
  .k-rmk{font:italic 10pt ${"Cambria, Georgia, serif"};color:#111827;min-height:5mm;margin-bottom:1mm}
  .k-tbl.dense td{padding:1mm 2mm;font-size:8.8pt}
  .k-tbl.roomy td{padding:2.5mm 2mm;font-size:10pt}
  .k-note{font-size:7.6pt;color:#6B7280;margin-top:1.4mm}
  .k-promo{margin-top:2mm;font-size:8.6pt;display:flex;gap:2mm;align-items:flex-end}
  .k-promo span:last-child{flex:1;border-bottom:.7pt dotted #9CA3AF;height:4.6mm}
`;

/* ── One exam ──────────────────────────────────────────────────────────── */
function examCard({ row: r, classSize, classHighest, remark }, ctx) {
  const { exam, school, grading, signers, provisional, show, title, header } = ctx;
  const e = examLine(exam);
  const showPct = show('showPercentageOnMarksheet');
  const showGrade = show('showGradeOnMarksheet');
  const showRank = show('showRankOnMarksheet');
  const body = r.subjects.map((s, i) => {
    const pct = s.isAbsent || !s.total ? null : (s.obtained / s.total) * 100;
    const fail = s.isAbsent || s.grade === 'F';
    return `<tr>
      <td class="num">${i + 1}</td>
      <td class="sub" dir="auto">${esc(s.subjectName)}</td>
      <td class="num">${fmtNum(s.total)}</td>
      <td class="num${fail ? ' bad' : ''}">${s.isAbsent ? '—' : fmtNum(s.obtained)}</td>
      ${showPct ? `<td class="num">${pct === null ? '—' : pct1(pct)}${pct === null ? '' : bar(pct, fail)}</td>` : ''}
      ${showGrade ? `<td class="num${fail ? ' bad' : ''}">${esc(s.isAbsent ? 'ABS' : s.grade || '—')}</td>` : ''}
      <td class="c${fail ? ' bad' : ''}">${s.isAbsent ? 'Absent' : fail ? 'Fail' : 'Pass'}</td>
    </tr>`;
  }).join('');
  const cols = 4 + (showPct ? 1 : 0) + (showGrade ? 1 : 0);
  return `<section class="k-page"><div class="k-frame"><div class="k-in card">
    ${watermark(school)}
    ${letterhead(school, { right: idBox('Roll No.', r.rollNo) })}
    ${titleRibbon(title || 'Result Card', header || [e.title, e.when].filter(Boolean).join('  ·  '))}
    <div class="k-who">
      ${fields([
        ["Student's name", r.name, { wide: true, big: true }],
        ["Father's name", r.fatherName || '—'],
        ['Class', classOf(r)],
        ['Roll number', r.rollNo || '—'],
        ['Examination', e.title],
      ])}
      ${photoBox(r.photoUrl)}
    </div>
    <table class="k-tbl${r.subjects.length > 11 ? ' dense' : r.subjects.length <= 7 ? ' roomy' : ''}" style="margin-top:4mm">
      <thead><tr><th class="c" style="width:7%">#</th><th>Subject</th><th class="c" style="width:12%">Max. marks</th><th class="c" style="width:12%">Obtained</th>${showPct ? '<th class="c" style="width:21%">Percentage</th>' : ''}${showGrade ? '<th class="c" style="width:9%">Grade</th>' : ''}<th class="c" style="width:11%">Remarks</th></tr></thead>
      <tbody>${body}</tbody>
      <tfoot><tr><td></td><td>Grand total</td><td class="num">${fmtNum(r.totalMarks)}</td><td class="num">${fmtNum(r.totalObtained)}</td>${showPct ? `<td class="num">${pct1(r.percentage)}</td>` : ''}${showGrade ? `<td class="num">${esc(r.grade)}</td>` : ''}<td class="c">${r.passed ? 'Pass' : 'Fail'}</td></tr></tfoot>
    </table>
    ${stats([
      [`${fmtNum(r.totalObtained)}<small> / ${fmtNum(r.totalMarks)}</small>`, 'Marks obtained'],
      showPct && [pct1(r.percentage), 'Percentage'],
      showGrade && [esc(r.grade || '—'), 'Grade'],
      showRank && r.position && [`${ordinal(r.position)}${classSize ? `<small> of ${classSize}</small>` : ''}`, 'Position', 'gold'],
      r.division && [esc(r.division), 'Division'],
      [seal(r.passed), 'Result'],
    ])}
    <div class="k-two">
      <div class="k-box"><h4>Remarks</h4>
        ${remark ? `<div class="k-rmk" dir="auto">${esc(remark)}</div>` : ''}
        <div class="k-lines"><div></div><div></div>${remark ? '' : '<div></div>'}</div>
        <div class="k-note">Class teacher's remarks</div>
      </div>
      <div class="k-box"><h4>Grading</h4>${scaleTable(grading)}${classHighest ? `<div class="k-note">Highest in the class: <b style="color:${GOLD}">${pct1(classHighest)}</b></div>` : ''}</div>
    </div>
    ${signatures(signers)}
    ${footer(`Result declared <b>${esc(todayLong())}</b>`, provisional ? 'Provisional copy for information. The signed and stamped card is issued by the school.' : 'This result card is computer generated.')}
  </div></div></section>`;
}

export function printResultCards({ cards, exam, school, grading, signers, settings, provisional = false, color, title }) {
  const c = docColor(color);
  const show = (k) => settings?.[k] ?? true;
  const header = String(settings?.resultCardHeader ?? '').trim();
  const ctx = { exam, school, grading, signers, provisional, show, title, header: /^(null|undefined)$/i.test(header) ? '' : header };
  const body = cards.map((card) => examCard(card, ctx)).join('');
  const docTitle = cards.length === 1 ? `Result Card — ${cards[0].row.name} — ${exam?.title || ''}` : `Result Cards — ${exam?.title || ''}`;
  printHTML(docHTML({ title: docTitle, css: kitCss(c) + CARD_CSS, body }), { title: docTitle });
}

/* ── The whole year ────────────────────────────────────────────────────── */
function annualCard(s, ctx) {
  const { data, school, signers, remark, showAttendance } = ctx;
  const exams = data.exams || [];
  const many = exams.length > 4;
  const head = exams.map((e) => `<th class="c">${esc(e.title)}</th>`).join('');
  const body = s.subjects.map((sub, i) => {
    const fail = sub.grade === 'F';
    const cells = exams.map((e) => {
      const m = sub.exams?.[e.id];
      if (!m) return '<td class="num muted">—</td>';
      const bad = !m.isAbsent && m.total && (m.obtained / m.total) * 100 < (ctx.passPct || 0);
      return `<td class="num${m.isAbsent || bad ? ' bad' : ''}">${m.isAbsent ? 'ABS' : fmtNum(m.obtained)}<span class="muted" style="font-size:7pt"> /${fmtNum(m.total)}</span></td>`;
    }).join('');
    return `<tr><td class="num">${i + 1}</td><td class="sub" dir="auto">${esc(sub.subjectName)}</td>${cells}<td class="num"><b>${fmtNum(sub.obtained)}</b><span class="muted" style="font-size:7pt"> /${fmtNum(sub.total)}</span></td><td class="num">${pct1(sub.percentage)}</td><td class="num${fail ? ' bad' : ''}">${esc(sub.grade)}</td></tr>`;
  }).join('');
  const examTotals = exams.map((e) => { const t = s.exams?.[e.id]; return `<td class="num">${t ? `${fmtNum(t.obtained)}<span style="font-size:7pt;font-weight:600"> /${fmtNum(t.total)}</span>` : '—'}</td>`; }).join('');
  const att = s.attendance && s.attendance.total ? s.attendance : null;
  const present = att ? att.present + (att.late || 0) : 0;
  return `<section class="k-page"><div class="k-frame"><div class="k-in card">
    ${watermark(school)}
    ${letterhead(school, { right: idBox('Roll No.', s.rollNo) })}
    ${titleRibbon('Annual Result Card', [data.session?.name && `Academic session ${data.session.name}`, data.class?.name].filter(Boolean).join('  ·  '))}
    <div class="k-who">
      ${fields([
        ["Student's name", s.name, { wide: true, big: true }],
        ["Father's name", s.fatherName || '—'],
        ['Class', classOf(s)],
        ['Roll number', s.rollNo || '—'],
        ['Date of birth', s.dob ? longDate(s.dob) : '—'],
      ])}
      ${photoBox(s.photoUrl)}
    </div>
    <table class="k-tbl${many || s.subjects.length > 11 ? ' dense' : ''}" style="margin-top:4mm">
      <thead><tr><th class="c" style="width:6%">#</th><th>Subject</th>${head}<th class="c">Total</th><th class="c" style="width:9%">%</th><th class="c" style="width:8%">Grade</th></tr></thead>
      <tbody>${body}</tbody>
      <tfoot><tr><td></td><td>Total</td>${examTotals}<td class="num">${fmtNum(s.totalObtained)} /${fmtNum(s.totalMarks)}</td><td class="num">${pct1(s.percentage)}</td><td class="num">${esc(s.grade)}</td></tr></tfoot>
    </table>
    ${stats([
      [`${fmtNum(s.totalObtained)}<small> / ${fmtNum(s.totalMarks)}</small>`, 'Marks obtained'],
      [pct1(s.percentage), 'Percentage'],
      [esc(s.grade || '—'), 'Grade'],
      s.position && [`${ordinal(s.position)}${s.classSize ? `<small> of ${s.classSize}</small>` : ''}`, 'Position', 'gold'],
      showAttendance && att && [`${present}<small> / ${att.total}</small>`, 'Days present'],
      [seal(s.passed), 'Result'],
    ])}
    <div class="k-two">
      <div class="k-box"><h4>Remarks</h4>
        ${remark ? `<div class="k-rmk" dir="auto">${esc(remark)}</div>` : ''}
        <div class="k-lines"><div></div><div></div>${remark ? '' : '<div></div>'}</div>
        <div class="k-note">Class teacher's remarks</div>
        ${s.passed ? '<div class="k-promo"><span>Promoted to class</span><span></span></div>' : `<div class="k-note" style="color:#B91C1C">Not passed${s.failedSubjects?.length ? `: ${esc(s.failedSubjects.join(', '))}` : ''}.</div>`}
      </div>
      <div class="k-box"><h4>Grading</h4>${scaleTable(data.grading?.grades || [])}${data.classHighest ? `<div class="k-note">Highest in the class: <b style="color:${GOLD}">${pct1(data.classHighest)}</b> · Class average ${pct1(data.classAverage)}</div>` : ''}</div>
    </div>
    ${signatures(signers)}
    ${footer(`Result declared <b>${esc(todayLong())}</b>`, `${exams.length} examination${exams.length === 1 ? '' : 's'} of the session · computer generated`)}
  </div></div></section>`;
}

export function printAnnualCards({ data, students, signers, settings, remarkFor: remarkOf = () => '', color }) {
  const c = docColor(color);
  const passPct = data.grading?.grades?.length ? Math.min(...data.grading.grades.map((g) => Number(g.minPercent))) : 40;
  const showAttendance = settings?.showAttendanceOnMarksheet ?? data.showAttendance ?? true;
  const body = students.map((s) => annualCard(s, { data, school: data.school || {}, signers, remark: remarkOf(s.percentage), showAttendance, passPct })).join('');
  const t = students.length === 1 ? `Annual Result Card — ${students[0].name}` : `Annual Result Cards — ${data.class?.name || ''}`;
  printHTML(docHTML({ title: t, css: kitCss(c) + CARD_CSS, body }), { title: t });
}

/* ── The class result sheet ────────────────────────────────────────────── */
export function printResultSheet({ rows, subjects, exam, school, label, signers, color }) {
  const c = docColor(color);
  const e = examLine(exam);
  const passed = rows.filter((r) => r.passed).length;
  const avg = rows.length ? rows.reduce((t, r) => t + r.percentage, 0) / rows.length : 0;
  const top = rows.reduce((m, r) => Math.max(m, r.percentage), 0);
  const body = rows.map((r) => `<tr>
      <td class="num"${r.position && r.position <= 3 ? ` style="color:${GOLD};font-weight:800"` : ''}>${ordinal(r.position)}</td>
      <td class="num" style="white-space:nowrap">${esc(r.rollNo || '')}</td>
      <td class="sub" dir="auto">${esc(r.name)}${r.fatherName ? `<div style="font-weight:400;font-size:7.4pt;color:#6B7280">${esc(r.fatherName)}</div>` : ''}</td>
      ${subjects.map((s) => { const m = r.subjects.find((x) => x.subjectId === s.id); return `<td class="num${m && (m.isAbsent || m.grade === 'F') ? ' bad' : ''}">${m ? (m.isAbsent ? 'A' : fmtNum(m.obtained)) : ''}</td>`; }).join('')}
      <td class="num"><b>${fmtNum(r.totalObtained)}</b>/${fmtNum(r.totalMarks)}</td>
      <td class="num">${pct1(r.percentage)}</td>
      <td class="num">${esc(r.grade)}</td>
      <td class="c${r.passed ? '' : ' bad'}">${r.passed ? 'Pass' : 'Fail'}</td>
    </tr>`).join('');
  const html = `<section class="k-page sheet">
    ${letterhead(school, { compact: true })}
    ${titleRibbon('Result Sheet', [e.title, label].filter(Boolean).join('  ·  '))}
    ${stats([[rows.length, 'Students'], [passed, 'Passed'], [rows.length - passed, 'Failed'], [pct1(rows.length ? (passed / rows.length) * 100 : 0), 'Pass percentage'], [pct1(avg), 'Class average'], [pct1(top), 'Highest', 'gold']])}
    <table class="k-tbl" style="margin-top:3.5mm">
      <thead><tr><th class="c" style="width:4.5%">Pos.</th><th class="c" style="width:9%">Roll No.</th><th>Name</th>${subjects.map((s) => `<th class="c">${esc(s.name)}<div style="font-weight:600;opacity:.8">/${fmtNum(s.total)}</div></th>`).join('')}<th class="c">Total</th><th class="c">%</th><th class="c">Grade</th><th class="c">Result</th></tr></thead>
      <tbody>${body}</tbody>
    </table>
    ${signatures(signers)}
    ${footer(`${esc(e.title)} · ${esc(label || '')}`, `Printed <b>${esc(todayLong())}</b>`)}
  </section>`;
  const css = `${kitCss(c)}
    .sheet .k-tbl td{padding:1.1mm 1.4mm;font-size:8.6pt}.sheet .k-tbl th{padding:1.4mm 1.2mm;font-size:7pt}
    .sheet .k-tbl thead{display:table-header-group}.sheet .k-tbl tr{break-inside:avoid}
    .sheet .k-signs{padding-top:12mm}`;
  printHTML(docHTML({ title: `${exam?.title || 'Result'} — Result sheet — ${label || ''}`, css, body: html, size: 'A4 landscape', margin: '8mm' }), { title: 'Result sheet' });
}

/* ── A parent's or student's own card (portals) ────────────────────────── */
/** Fetches GET /exams/:id/my-card and prints it as a provisional copy: no signature pictures or stamp. */
export async function printMyResultCard({ examId, studentId }) {
  const { default: api } = await import('../api/client');
  const d = (await api.get(`/exams/${examId}/my-card`, { params: studentId ? { studentId } : {} })).data.data;
  printResultCards({
    cards: [{ row: d.row, classSize: d.classSize, classHighest: d.classHighest, remark: remarkFor({ finalRemarks: d.finalRemarks }, d.row.percentage) }],
    exam: d.exam, school: d.school, grading: d.grading?.grades || [], settings: null, provisional: true,
    signers: pickSigners({ config: { signatures: d.signatures }, settings: null, pictures: false }),
  });
}
