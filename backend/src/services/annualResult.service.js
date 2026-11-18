/**
 * The annual result: every exam of a class in a session, subject by subject.
 *
 *   sessionExams(exams, session, classId)   the class's exams of that session, oldest first:
 *                                           those saved with the session, and those saved
 *                                           without one that were held (or made) within it
 *   annualRows({ exams, marks, gradeOf, divisionOf })
 *       pure: one row per student with each subject's marks in each exam, the
 *       subject's and the year's totals, percentage, grade, division, pass or
 *       fail and position in the class (tied percentages share a position)
 *
 * A paper missed (absent) counts its marks in the total, none obtained, and
 * the subject is graded on what was obtained, as the exam result sheet does.
 */

const examClassIds = (exam) => {
  let list = [];
  try {
    list = JSON.parse(exam.classIds || '[]').map((c) => parseInt(c && typeof c === 'object' ? c.classId : c)).filter(Number.isInteger);
  } catch { list = []; }
  if (!list.length && exam.classId) list = [exam.classId];
  return [...new Set(list)];
};

const timeOf = (d) => (d ? new Date(d).getTime() : 0);

/* The session an exam saved without one belongs to: the session it was held
   (or made) in; else the current session, so a school that has not added
   this year's session yet still gets its annual cards. */
function ownerSession(exam, sessions) {
  const t = timeOf(exam.dateStart || exam.createdAt);
  return sessions.find((s) => t >= timeOf(s.startDate) && t <= timeOf(s.endDate) + 864e5 - 1)
    || sessions.find((s) => s.isActive)
    || [...sessions].sort((a, b) => timeOf(b.startDate) - timeOf(a.startDate))[0]
    || null;
}

function sessionExams(exams, session, classId, sessions = session ? [session] : []) {
  return exams
    .filter((e) => examClassIds(e).includes(classId))
    .filter((e) => {
      if (!session) return true;
      if (e.sessionId) return e.sessionId === session.id;
      return ownerSession(e, sessions)?.id === session.id;
    })
    .sort((a, b) => (timeOf(a.dateStart || a.createdAt) - timeOf(b.dateStart || b.createdAt)) || a.id - b.id);
}

const round2 = (n) => Math.round(n * 100) / 100;

function annualRows({ exams, marks, gradeOf, divisionOf }) {
  const examIds = new Set(exams.map((e) => e.id));
  const students = new Map();
  const subjectOrder = new Map();
  for (const m of marks) {
    if (!examIds.has(m.examId) || !m.student) continue;
    const name = m.subject?.name || 'Subject';
    const key = m.subjectId ?? `n:${name}`;
    if (!subjectOrder.has(key)) subjectOrder.set(key, { id: m.subjectId ?? null, name });
    let s = students.get(m.studentId);
    if (!s) {
      const st = m.student;
      s = {
        studentId: m.studentId, name: st.name, rollNo: st.rollNo || '', fatherName: st.fatherName || '',
        dob: st.dob || null, photoUrl: st.photoUrl || null, classId: st.classId, sectionId: st.sectionId,
        className: st.class?.name || '', sectionName: st.section?.name || '',
        subjects: new Map(), exams: {},
      };
      students.set(m.studentId, s);
    }
    let sub = s.subjects.get(key);
    if (!sub) { sub = { subjectId: m.subjectId ?? null, subjectName: name, exams: {}, obtained: 0, total: 0 }; s.subjects.set(key, sub); }
    const total = Number(m.totalMarks) || 0;
    const obtained = m.isAbsent ? 0 : Number(m.obtainedMarks) || 0;
    sub.exams[m.examId] = { obtained: m.isAbsent ? null : obtained, total, isAbsent: !!m.isAbsent };
    sub.obtained += obtained;
    sub.total += total;
    const ex = s.exams[m.examId] || (s.exams[m.examId] = { obtained: 0, total: 0 });
    ex.obtained += obtained;
    ex.total += total;
  }

  const order = [...subjectOrder.keys()];
  const rows = [...students.values()].map((s) => {
    const subjects = order.filter((k) => s.subjects.has(k)).map((k) => {
      const sub = s.subjects.get(k);
      return { ...sub, obtained: round2(sub.obtained), percentage: sub.total ? round2((sub.obtained / sub.total) * 100) : 0, grade: gradeOf(sub.obtained, sub.total) };
    });
    const obtained = round2(subjects.reduce((t, x) => t + x.obtained, 0));
    const total = subjects.reduce((t, x) => t + x.total, 0);
    const percentage = total ? round2((obtained / total) * 100) : 0;
    const grade = gradeOf(obtained, total);
    return {
      ...s, subjects, totalObtained: obtained, totalMarks: total, percentage, grade,
      division: divisionOf(percentage),
      passed: grade !== 'F' && !subjects.some((x) => x.grade === 'F'),
      failedSubjects: subjects.filter((x) => x.grade === 'F').map((x) => x.subjectName),
    };
  });

  // Position in the class: highest percentage first; equal percentages share it.
  const byClass = new Map();
  for (const r of rows) byClass.set(r.classId || 0, [...(byClass.get(r.classId || 0) || []), r]);
  for (const list of byClass.values()) {
    list.sort((a, b) => b.percentage - a.percentage);
    let rank = 0; let prev = null;
    list.forEach((r, i) => { if (r.percentage !== prev) rank = i + 1; r.position = rank; r.classSize = list.length; prev = r.percentage; });
  }
  return { rows, subjects: order.map((k) => subjectOrder.get(k)) };
}

module.exports = { examClassIds, ownerSession, sessionExams, annualRows };
