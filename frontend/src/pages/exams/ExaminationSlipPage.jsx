/**
 * Roll number slips on a page of their own (/exams/exam-slip?examId=).
 * The same as the Roll No. Slips step of the Exam Vault.
 */
import { Link } from 'react-router-dom';
import { ArrowLeft, Ticket } from 'lucide-react';
import RollNoSlipsTab from './RollNoSlipsTab';

export default function ExaminationSlipPage() {
  const examId = new URLSearchParams(window.location.search).get('examId') || '';
  return (
    <div className="page-content fade-up">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <Link to="/examination?tab=roll-slips" className="btn btn-outline btn-sm btn-icon" aria-label="Back to the Exam Vault"><ArrowLeft size={15} /></Link>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Ticket size={22} color="#1B2F6E" /> Roll Number Slips</h1>
          <p className="page-subtitle">The subjects of each class, the slip's design, and the slips of every class to print or save as PDF.</p>
        </div>
      </div>
      <RollNoSlipsTab initialExamId={examId} />
    </div>
  );
}
