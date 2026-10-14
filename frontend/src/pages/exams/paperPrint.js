/**
 * A question paper as an A4 page to print: school letterhead, exam, class,
 * subject, time and marks, boxes for the student's name and roll number,
 * instructions, then each part with its questions (numbered straight
 * through, marks on the right, MCQ options in two columns). Urdu text runs
 * right to left on its own.
 *
 * The answer key prints the same paper with every answer filled in, for the
 * teacher checking the papers.
 */
import { printHTML } from '../../utils/print';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lines = (v) => esc(v).replace(/\n/g, '<br/>');
const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f'];

export function buildPaperHTML(paper, school = {}, { answerKey = false } = {}) {
  const schoolName = school.name || localStorage.getItem('schoolName') || 'School';
  const logo = school.logoUrl || localStorage.getItem('schoolLogoPreview') || '';
  const sections = paper.sections || [];
  let n = 0;

  const body = sections.map((sec) => {
    const qs = (sec.questions || []).map((q) => {
      n += 1;
      let extra = '';
      if (q.type === 'mcq') {
        extra = `<div class="opts">${(q.options || []).map((o, i) => `<div class="opt${answerKey && q.answer === i ? ' right' : ''}" dir="auto">(${LETTERS[i]}) ${esc(o)}</div>`).join('')}</div>`;
      } else if (q.type === 'truefalse') {
        extra = answerKey
          ? `<div class="key">Answer: <b>${q.answer === true ? 'True' : q.answer === false ? 'False' : '—'}</b></div>`
          : '<div class="tf">True &nbsp;/&nbsp; False</div>';
      } else if (answerKey && q.answer) {
        extra = `<div class="key" dir="auto">Answer: ${lines(q.answer)}</div>`;
      }
      if (answerKey && q.type === 'mcq') {
        extra += `<div class="key">Answer: <b>${q.answer !== null && q.answer !== undefined ? `(${LETTERS[q.answer]}) ${esc(q.options?.[q.answer])}` : '—'}</b></div>`;
      }
      return `<div class="q"><div class="qn">${n}.</div><div class="qt"><div dir="auto">${lines(q.text)}</div>${extra}</div><div class="qm">[${q.marks}]</div></div>`;
    }).join('');
    const total = sec.questions?.length || 0;
    const attempt = sec.attempt && sec.attempt < total ? `<div class="att">Attempt any ${sec.attempt} of the following ${total} questions.</div>` : '';
    return `<div class="sec"><div class="sh"><span dir="auto">${esc(sec.title)}</span><span>Marks: ${sec.marks ?? ''}</span></div>${sec.note ? `<div class="note" dir="auto">${lines(sec.note)}</div>` : ''}${attempt}${qs || '<div class="note">No questions in this part.</div>'}</div>`;
  }).join('');

  const where = [paper.className, paper.sectionName].filter(Boolean).join(' — ');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(paper.title)}${answerKey ? ' — Answer key' : ''}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,'Jameel Noori Nastaleeq','Noto Nastaliq Urdu',sans-serif;color:#000;font-size:12.5px;padding:10mm}
  .head{display:flex;align-items:center;gap:12px;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:8px}
  .head img{width:58px;height:58px;object-fit:contain}
  .sch{font-size:19px;font-weight:800}
  .ex{font-size:13px;font-weight:600;margin-top:2px}
  .badge{margin-left:auto;border:2px solid #000;padding:4px 10px;font-weight:800;font-size:12px}
  table.info{width:100%;border-collapse:collapse;margin:6px 0}
  table.info td{border:1px solid #000;padding:5px 8px;font-size:12px}
  .stu td{height:28px}
  .ins{border:1px dashed #555;padding:6px 9px;margin:8px 0;font-size:11.5px}
  .sec{margin-top:12px}
  .sh{display:flex;justify-content:space-between;font-weight:800;font-size:13.5px;background:#eee;border:1px solid #000;padding:5px 9px}
  .note{font-style:italic;margin:5px 2px;font-size:11.5px}
  .att{font-weight:700;margin:5px 2px;font-size:12px}
  .q{display:flex;gap:6px;padding:6px 2px;border-bottom:1px dotted #bbb;page-break-inside:avoid}
  .qn{width:26px;font-weight:700;flex-shrink:0}
  .qt{flex:1;min-width:0;line-height:1.5}
  .qm{width:38px;text-align:right;font-weight:700;flex-shrink:0}
  .opts{display:grid;grid-template-columns:1fr 1fr;gap:3px 14px;margin-top:4px}
  .opt.right{font-weight:800;text-decoration:underline}
  .tf{margin-top:3px;font-weight:600}
  .key{margin-top:4px;color:#0a5;font-size:12px}
  .foot{display:flex;justify-content:space-between;margin-top:18px;font-size:11.5px}
  @page{size:A4;margin:8mm}
  @media print{body{padding:0}}
</style></head><body>
<div class="head">
  ${logo ? `<img src="${esc(logo)}" alt=""/>` : ''}
  <div><div class="sch">${esc(schoolName)}</div><div class="ex">${esc(paper.examTitle || paper.title)}</div></div>
  ${answerKey ? '<div class="badge">ANSWER KEY</div>' : ''}
</div>
<table class="info"><tr>
  <td><b>Class:</b> ${esc(where || '—')}</td>
  <td><b>Subject:</b> <span dir="auto">${esc(paper.subjectName || '—')}</span></td>
  <td><b>Time:</b> ${paper.durationMin ? `${paper.durationMin} minutes` : '—'}</td>
  <td><b>Total Marks:</b> ${paper.totalMarks ?? ''}</td>
</tr></table>
${answerKey ? '' : '<table class="info stu"><tr><td style="width:50%"><b>Name:</b></td><td><b>Roll No:</b></td><td><b>Marks obtained:</b> ______ / ' + esc(paper.totalMarks ?? '') + '</td></tr></table>'}
${paper.instructions ? `<div class="ins" dir="auto"><b>Instructions:</b><br/>${lines(paper.instructions)}</div>` : ''}
${body}
${answerKey ? '' : '<div class="foot"><span>Examiner: ____________</span><span>Checked by: ____________</span></div>'}
</body></html>`;
}

export function printPaper(paper, school, opts) {
  printHTML(buildPaperHTML(paper, school, opts), { title: paper.title });
}
