/**
 * Choosing the exam in an Exam Vault step: the term, then the exam of that
 * term. Opens on the exam the step was opened for, else the newest.
 *
 *   const pick = useExamPick(initialExamId);   // { exam, examId, ... }
 *   <ExamPickerBar pick={pick}>…more fields…</ExamPickerBar>
 */
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { buildTerms, examMatchesTerm } from '../../utils/terms';
import { useTermsCount } from '../../hooks/useExamTerms';

const NAVY = '#1B2F6E';
const label = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#374151' };

export function useExamPick(initialExamId = '') {
  const termsCount = useTermsCount();
  const { data: allExams = [], isLoading } = useQuery({ queryKey: ['exams'], queryFn: () => api.get('/exams').then((r) => r.data.data || []) });
  // Until the number is known: as many terms as the exams use.
  const termNo = (t) => ['1st', '2nd', '3rd', '4th', '5th', '6th'].indexOf(String(t || '').toLowerCase()) + 1;
  const terms = buildTerms(termsCount ?? Math.max(2, ...allExams.map((e) => termNo(e.term))));
  const [term, setTerm] = useState('');
  const [examId, setExamId] = useState(initialExamId ? String(initialExamId) : '');
  useEffect(() => {
    if (term || !allExams.length) return;
    const start = allExams.find((e) => String(e.id) === examId) || allExams[0];
    setTerm((terms.find((t) => examMatchesTerm(start, t.key)) || terms[0]).key);
  }, [allExams, term, examId, terms]);
  const exams = allExams.filter((e) => !term || examMatchesTerm(e, term));
  useEffect(() => { if (exams.length && !exams.some((e) => String(e.id) === examId)) setExamId(String(exams[0].id)); }, [exams, examId]);
  const exam = exams.find((e) => String(e.id) === examId) || null;
  return { terms, term, setTerm: (t) => { setTerm(t); setExamId(''); }, exams, allExams, examId, setExamId, exam, isLoading };
}

/** The classes an exam is for (its classIds), from the school's classes. */
export function classesOfExam(exam, classes) {
  if (!exam) return [];
  let ids = [];
  try { ids = JSON.parse(exam.classIds || '[]').map((c) => Number(c.classId ?? c)); } catch { ids = []; }
  if (!ids.length && exam.classId) ids = [exam.classId];
  return ids.length ? classes.filter((c) => ids.includes(c.id)) : classes;
}

export function ExamPickerBar({ pick, children }) {
  const { terms, term, setTerm, exams, examId, setExamId, isLoading } = pick;
  return (
    <div className="card" style={{ padding: 14, marginBottom: 14, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
      <div style={label}>Term
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {terms.map((t) => (
            <button key={t.key} type="button" aria-pressed={term === t.key} onClick={() => setTerm(t.key)}
              className={term === t.key ? 'btn btn-teal btn-sm' : 'btn btn-outline btn-sm'} style={term === t.key ? { background: NAVY } : undefined}>{t.label}</button>
          ))}
        </div>
      </div>
      <label style={{ ...label, flex: '1 1 240px' }}>Exam
        <select aria-label="Exam" className="form-select" value={examId} onChange={(e) => setExamId(e.target.value)} disabled={!exams.length}>
          {!exams.length && <option value="">{isLoading ? 'Loading…' : 'No exam in this term yet: add one in Exam Setup'}</option>}
          {exams.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
      </label>
      {children}
    </div>
  );
}
