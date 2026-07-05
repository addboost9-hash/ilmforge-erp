/** Exams & Tests Hub — schedule, marks, results, merit list, gazette, annual report cards */
import { lazy, Suspense } from 'react';
import HubShell from './HubShell';
import { Award, FileText, Calendar, BarChart2, List, TrendingDown, Newspaper, ClipboardList } from 'lucide-react';

const ExamsPage           = lazy(() => import('../exams/ExamsPage'));
const TestMgmt            = lazy(() => import('../exams/TestManagementPage'));
const ExamSlip            = lazy(() => import('../exams/ExaminationSlipPage'));
const Certificates        = lazy(() => import('../certificates/CertificatesPage'));
const QuizPage            = lazy(() => import('../quiz/QuizPage'));
const ExamTimetablePage   = lazy(() => import('../exams/ExamTimetablePage'));
const MeritListPage       = lazy(() => import('../exams/MeritListPage'));
const GazetteSheetPage    = lazy(() => import('../exams/GazetteSheetPage'));
const AnnualReportCard    = lazy(() => import('../exams/AnnualReportCardPage'));
const FailedStudentsPage  = lazy(() => import('../exams/FailedStudentsPage'));
const SubjectAnalysisPage = lazy(() => import('../exams/SubjectAnalysisPage'));
const ResultPublication   = lazy(() => import('../exams/ResultPublicationPage'));

const L = (C) => () => (
  <Suspense fallback={<div className="empty-state"><span className="spinner" /></div>}>
    <C />
  </Suspense>
);

export default function ExamsHub() {
  return (
    <HubShell
      title="Exams & Tests Hub"
      subtitle="Exam schedule, marks, results, merit list, gazette, annual report cards — sab ek jagah"
      accent="#dc2626"
      quickActions={[
        { label: 'Exams & Marks',    tab: 'exams',        icon: Award },
        { label: 'Exam Timetable',   tab: 'timetable',    icon: Calendar },
        { label: 'Merit List',       tab: 'merit',        icon: List },
        { label: 'Certificates',     tab: 'certificates', icon: FileText },
        { label: 'Annual Report',    tab: 'annual',       icon: ClipboardList },
      ]}
      tabs={[
        { id: 'exams',       label: 'Exams',           hint: 'Schedule + marks + results',       render: L(ExamsPage) },
        { id: 'timetable',   label: 'Exam Timetable',  hint: 'Date sheet & hall planner',        render: L(ExamTimetablePage) },
        { id: 'merit',       label: 'Merit List',      hint: 'Rank list by class/section',       render: L(MeritListPage) },
        { id: 'gazette',     label: 'Gazette Sheet',   hint: 'Official result gazette',          render: L(GazetteSheetPage) },
        { id: 'annual',      label: 'Annual Report',   hint: 'Full year report cards',           render: L(AnnualReportCard) },
        { id: 'failed',      label: 'Failed Students', hint: 'Repeater & detained list',        render: L(FailedStudentsPage) },
        { id: 'analysis',    label: 'Subject Analysis',hint: 'Per-subject performance trends',   render: L(SubjectAnalysisPage) },
        { id: 'publication', label: 'Result Publication', hint: 'Publish results to portals',   render: L(ResultPublication) },
        { id: 'tests',       label: 'Tests',           hint: 'Class tests + tabulation',         render: L(TestMgmt) },
        { id: 'slips',       label: 'Admit Cards',     hint: 'Exam slips printing',              render: L(ExamSlip) },
        { id: 'quiz',        label: 'Quizzes',         hint: 'Quick assessments',                render: L(QuizPage) },
        { id: 'certificates',label: 'Certificates',    hint: 'Leaving, character, DOB certs',   render: L(Certificates) },
      ]}
    />
  );
}
