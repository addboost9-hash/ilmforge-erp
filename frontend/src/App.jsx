import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/auth.store';
import AdminLayout from './layouts/AdminLayout';
import LandingPage from './pages/public/LandingPage';
import PublicAdmissionPage from './pages/public/PublicAdmissionPage';
import PublicFeeVoucherPage from './pages/public/PublicFeeVoucherPage';
import LoginPage from './pages/auth/LoginPage';
import BrandedLoginPage from './pages/auth/BrandedLoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import VerifyPhonePage from './pages/auth/VerifyPhonePage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import ForcePasswordChangePage from './pages/auth/ForcePasswordChangePage';
import OnboardingPage from './pages/auth/OnboardingPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import StudentsPage from './pages/students/StudentsPage';
import StudentProfilePage from './pages/students/StudentProfilePage';
import BirthdaysPage from './pages/students/BirthdaysPage';
import ParentsPage from './pages/students/ParentsPage';
import AdmissionsPage from './pages/admission/AdmissionsPage';
import AdmissionWizardPage from './pages/admission/AdmissionWizardPage';
import AttendanceFlowPage from './pages/attendance/AttendanceFlowPage';
import AdmissionInquiriesPage from './pages/admission/AdmissionInquiriesPage';
import FeeDashboardPage from './pages/fees/FeeDashboardPage';
import FeeCollectionPage from './pages/fees/FeeCollectionPage';
import FeeGeneratePage from './pages/fees/FeeGeneratePage';
import FeeDefaultersPage from './pages/fees/FeeDefaultersPage';
import FeeStructurePage from './pages/fees/FeeStructurePage';
import AttendancePage from './pages/attendance/AttendancePage';
import BarcodeScanPage from './pages/attendance/BarcodeScanPage';
import AttendanceReportPage from './pages/attendance/AttendanceReportPage';
import StaffAttendancePage from './pages/attendance/StaffAttendancePage';
import StaffPage from './pages/staff/StaffPage';
import StaffFormPage from './pages/staff/StaffFormPage';
import SalaryPage from './pages/salary/SalaryPage';
import ExamsPage from './pages/exams/ExamsPage';
import ExamMarksPage from './pages/exams/ExamMarksPage';
import ExamResultsPage from './pages/exams/ExamResultsPage';
import ExpensesPage from './pages/expenses/ExpensesPage';
import StockPage from './pages/stock/StockPage';
import HomeworkPage from './pages/homework/HomeworkPage';
import TransportPage from './pages/transport/TransportPage';
import TimetablePage from './pages/timetable/TimetablePage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import SMSPage from './pages/notifications/SMSPage';
import WhatsAppPage from './pages/notifications/WhatsAppPage';
import ReportsPage from './pages/reports/ReportsPage';
import ComplaintsPage from './pages/complaints/ComplaintsPage';
import SettingsPage from './pages/settings/SettingsPage';
import ClassesPage from './pages/settings/ClassesPage';
import SessionsPage from './pages/settings/SessionsPage';
import SMSTemplatesPage from './pages/settings/SMSTemplatesPage';
import EmailSettingsPage from './pages/settings/EmailSettingsPage';
import WhatsAppSettingsPage from './pages/settings/WhatsAppSettingsPage';
import AutomationPage from './pages/settings/AutomationPage';
import CampusesPage from './pages/settings/CampusesPage';
import AdminsPage from './pages/settings/AdminsPage';
import NoticeboardPage from './pages/settings/NoticeboardPage';
import PaymentSettingsPage from './pages/settings/PaymentSettingsPage';
import ProfilePage from './pages/settings/ProfilePage';
import SchoolProfilePage from './pages/settings/SchoolProfilePage';
import CertificatesPage from './pages/certificates/CertificatesPage';
import IDCardsPage from './pages/idcards/IDCardsPage';
import FamilyVoucherPage from './pages/fees/FamilyVoucherPage';
import ExamSettingsPage from './pages/settings/ExamSettingsPage';
import BiometricSettingsPage from './pages/settings/BiometricSettingsPage';
import ThermalPrinterPage from './pages/settings/ThermalPrinterPage';
import ThemeSettingsPage from './pages/settings/ThemeSettingsPage';
import OnlineClassesPage from './pages/academics/OnlineClassesPage';
import StudyMaterialsPage from './pages/academics/StudyMaterialsPage';
import EmailManagementPage from './pages/email/EmailManagementPage';
import GeneralSettingsPage from './pages/settings/GeneralSettingsPage';
import WebsiteSettingsPage from './pages/settings/WebsiteSettingsPage';
import LeavePage from './pages/leaves/LeavePage';
import AnnouncementsPage from './pages/announcements/AnnouncementsPage';
import VideoTutorialsPage from './pages/tutorials/VideoTutorialsPage';
import PortalManagementPage from './pages/portal/PortalManagementPage';
import UserManualPage from './pages/manual/UserManualPage';
import ParentPortalPage from './pages/portal/ParentPortalPage';
import TeacherPortalPage from './pages/portal/TeacherPortalPage';
import StudentPortalPage from './pages/portal/StudentPortalPage';
import AccountantPortalPage from './pages/portal/AccountantPortalPage';
import GatekeeperPortalPage from './pages/portal/GatekeeperPortalPage';
import HolidayCalendarPage from './pages/calendar/HolidayCalendarPage';
import BehaviourPage from './pages/behaviour/BehaviourPage';
import QuizPage from './pages/quiz/QuizPage';
import SubjectsPage from './pages/settings/SubjectsPage';
import AccountingPage from './pages/accounting/AccountingPage';
import LoanManagementPage from './pages/salary/LoanManagementPage';
import ExaminationSlipPage from './pages/exams/ExaminationSlipPage';
import TaskManagementPage from './pages/tasks/TaskManagementPage';
import TestManagementPage from './pages/exams/TestManagementPage';
import ReportingAreaPage from './pages/reports/ReportingAreaPage';
import ParentAccountsPage from './pages/students/ParentAccountsPage';
import ExpenseManagementPage from './pages/expenses/ExpenseManagementPage';
import FeeTypesPage from './pages/fees/FeeTypesPage';
import DiscountedStudentsPage from './pages/fees/DiscountedStudentsPage';
import FeeIncrementPage from './pages/fees/FeeIncrementPage';
import AttendanceAwardsPage from './pages/attendance/AttendanceAwardsPage';
import FeatureMatrixPage from './pages/governance/FeatureMatrixPage';
import MentorAIToolsPage from './pages/ai/MentorAIToolsPage';
import HeadOfficeSupportPage from './pages/support/HeadOfficeSupportPage';
import AuditLogsPage from './pages/settings/AuditLogsPage';
import StaffAppraisalsPage from './pages/staff/StaffAppraisalsPage';
import PermissionsMatrixPage from './pages/settings/PermissionsMatrixPage';

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,            // cache 1 min — avoids re-fetching on every navigation
      gcTime: 300_000,              // keep unused cache 5 min
      refetchOnWindowFocus: false,  // don't re-fetch when tab regains focus
      refetchOnReconnect: false,    // don't auto-refetch on network reconnect
    },
  },
});

/* Parent/Student portal guard */
const ParentRoute = ({ children }) => {
  const ok = useAuthStore(s => s.isAuthenticated);
  return ok ? children : <Navigate to="/login" replace />;
};

/* ── Role-based portal routing table ── */
const ROLE_PORTALS = {
  parent:     '/parent-portal',
  student:    '/student-portal',
  teacher:    '/teacher-portal',
  accountant: '/accountant-portal',
  gatekeeper: '/gatekeeper-portal',
  // admin/super_admin use admin panel
};


/* ═══ RoleRoute — STRICT role isolation. Each portal only for its own role. ═══ */
const RoleRoute = ({ allow, children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // Default-password / admin-reset accounts must change their password
  // before reaching any portal — this was previously set on the backend
  // but never actually checked anywhere on the frontend.
  if (user?.mustChangePassword) return <Navigate to="/change-password-required" replace />;
  if (allow.includes(user?.role)) return children;
  // Wrong portal → send user to their own home
  const home = ROLE_PORTALS[user?.role] || '/dashboard';
  return <Navigate to={home} replace />;
};

/* Route guards */
const Protected = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.mustChangePassword) return <Navigate to="/change-password-required" replace />;
  // Non-admin roles → redirect to their dedicated portal
  const portal = ROLE_PORTALS[user?.role];
  if (portal) return <Navigate to={portal} replace />;
  return children;
};

/* FinanceProtected — same AdminLayout shell as Protected, but also lets
   'accountant' through for the finance-specific pages their own portal links
   to (fee collection, defaulters, expenses, salary, reports, loans). Without
   this, every link on AccountantPortalPage bounced straight back to
   /accountant-portal because Protected treats any non-admin role as
   belonging to its own dedicated portal only. */
const FinanceProtected = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.mustChangePassword) return <Navigate to="/change-password-required" replace />;
  if (user?.role === 'accountant') return children;
  const portal = ROLE_PORTALS[user?.role];
  if (portal) return <Navigate to={portal} replace />;
  return children;
};
const Public = ({ children }) => {
  const ok = useAuthStore(s => s.isAuthenticated);
  return ok ? <Navigate to="/dashboard" replace /> : children;
};
/* Home: landing if logged out, dashboard if logged in */
const Home = () => {
  const ok = useAuthStore(s => s.isAuthenticated);
  return ok ? <Navigate to="/dashboard" replace /> : <LandingPage />;
};
/**
 * SmartLogin — routes to BrandedLoginPage if ?slug= is present,
 * otherwise shows the generic LoginPage.
 * Both are public-only (redirect to /dashboard if already logged in).
 */
const SmartLogin = () => {
  const ok = useAuthStore(s => s.isAuthenticated);
  if (ok) return <Navigate to="/dashboard" replace />;
  const slug = new URLSearchParams(window.location.search).get('slug');
  return slug ? <BrandedLoginPage /> : <LoginPage />;
};

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              borderRadius: '9px',
              fontSize: '13px',
              fontFamily: "'Inter', system-ui, sans-serif",
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            },
            success: { iconTheme: { primary: '#0D9488', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
          }}
        />
        <Routes>
          {/* ── Public ──────────────────────────── */}
          <Route path="/"                element={<Home />} />
          <Route path="/login"           element={<SmartLogin />} />
          <Route path="/register"        element={<Public><RegisterPage /></Public>} />
          <Route path="/verify-phone"    element={<VerifyPhonePage />} />
          <Route path="/forgot-password" element={<Public><ForgotPasswordPage /></Public>} />
          <Route path="/reset-password"  element={<Public><ResetPasswordPage /></Public>} />
          <Route path="/setup"             element={<Protected><OnboardingPage /></Protected>} />
          <Route path="/change-password-required" element={<ParentRoute><ForcePasswordChangePage /></ParentRoute>} />
          <Route path="/apply-admission"   element={<PublicAdmissionPage />} />
          <Route path="/fee-voucher"       element={<PublicFeeVoucherPage />} />

          {/* ── Role-specific portals — auth required, NO admin layout ─ */}
          <Route path="/parent-portal"     element={<RoleRoute allow={['parent']}><ParentPortalPage /></RoleRoute>}/>
          <Route path="/teacher-portal"    element={<RoleRoute allow={['teacher']}><TeacherPortalPage /></RoleRoute>}/>
          <Route path="/student-portal"    element={<RoleRoute allow={['student']}><StudentPortalPage /></RoleRoute>}/>
          <Route path="/accountant-portal" element={<RoleRoute allow={['accountant']}><AccountantPortalPage /></RoleRoute>}/>
          <Route path="/gatekeeper-portal" element={<RoleRoute allow={['gatekeeper']}><GatekeeperPortalPage /></RoleRoute>}/>

          {/* ── Protected — wrapped in AdminLayout ─ */}
          {/* NOTE: No path on the wrapper — avoids duplicate "/" */}
          <Route element={<Protected><AdminLayout /></Protected>}>

            {/* Dashboard */}
            <Route path="/dashboard"                  element={<DashboardPage />} />

            {/* Students */}
            <Route path="/students"                   element={<StudentsPage />} />
            <Route path="/students/birthdays"         element={<BirthdaysPage />} />
            <Route path="/students/:id"               element={<StudentProfilePage />} />
            <Route path="/parents"                    element={<ParentsPage />} />

            {/* Admissions */}
            <Route path="/admissions"                 element={<AdmissionsPage />} />
            <Route path="/admissions/wizard"          element={<AdmissionWizardPage />} />
            <Route path="/attendance/flow"            element={<AttendanceFlowPage />} />
            <Route path="/admissions/inquiries"       element={<AdmissionInquiriesPage />} />

            {/* Fees */}
            <Route path="/fees"                       element={<FeeDashboardPage />} />
            <Route path="/fees/generate"              element={<FeeGeneratePage />} />
            <Route path="/fees/structure"             element={<FeeStructurePage />} />

            {/* Attendance */}
            <Route path="/attendance"                 element={<AttendancePage />} />
            <Route path="/attendance/barcode"         element={<BarcodeScanPage />} />
            <Route path="/attendance/report"          element={<AttendanceReportPage />} />
            <Route path="/attendance/staff"           element={<StaffAttendancePage />} />

            {/* Staff */}
            <Route path="/staff"                      element={<StaffPage />} />
            <Route path="/staff/new"                  element={<StaffFormPage />} />
            <Route path="/staff/:id/edit"             element={<StaffFormPage />} />

            {/* Academics */}
            <Route path="/exams"                      element={<ExamsPage />} />
            <Route path="/exams/:id/marks"            element={<ExamMarksPage />} />
            <Route path="/exams/:id/results"          element={<ExamResultsPage />} />
            <Route path="/timetable"                  element={<TimetablePage />} />
            <Route path="/homework"                   element={<HomeworkPage />} />

            {/* Finance */}
            <Route path="/stock"                      element={<StockPage />} />

            {/* Communication */}
            <Route path="/notifications"              element={<NotificationsPage />} />
            <Route path="/notifications/sms"          element={<SMSPage />} />
            <Route path="/notifications/whatsapp"     element={<WhatsAppPage />} />
            <Route path="/complaints"                 element={<ComplaintsPage />} />

            {/* Misc */}
            <Route path="/transport"                  element={<TransportPage />} />
            <Route path="/certificates"               element={<CertificatesPage />} />
            <Route path="/id-cards"                   element={<IDCardsPage />} />
            <Route path="/fees/family-voucher"        element={<FamilyVoucherPage />} />

            {/* Settings */}
            <Route path="/settings"                   element={<SchoolProfilePage />} />
            <Route path="/settings/classes"           element={<ClassesPage />} />
            <Route path="/settings/sessions"          element={<SessionsPage />} />
            <Route path="/settings/sms-templates"     element={<SMSTemplatesPage />} />
            <Route path="/settings/email"             element={<EmailSettingsPage />} />
            <Route path="/settings/whatsapp"          element={<WhatsAppSettingsPage />} />
            <Route path="/settings/automation"        element={<AutomationPage />} />
            <Route path="/settings/campuses"          element={<CampusesPage />} />
            <Route path="/settings/admins"            element={<AdminsPage />} />
            <Route path="/settings/noticeboard"       element={<NoticeboardPage />} />
            <Route path="/settings/payments"          element={<PaymentSettingsPage />} />
            <Route path="/settings/exam-settings"     element={<ExamSettingsPage />} />
            <Route path="/settings/biometric"         element={<BiometricSettingsPage />} />
            <Route path="/settings/thermal-printer"   element={<ThermalPrinterPage />} />
            <Route path="/settings/theme"             element={<ThemeSettingsPage />} />
            <Route path="/settings/website"           element={<WebsiteSettingsPage />} />
            <Route path="/settings/general"           element={<GeneralSettingsPage />} />
            <Route path="/online-classes"             element={<OnlineClassesPage />} />
            <Route path="/study-materials"            element={<StudyMaterialsPage />} />
            <Route path="/email"                      element={<EmailManagementPage />} />
            <Route path="/admissions/requests"        element={<AdmissionInquiriesPage />} />
            <Route path="/students/promote"           element={<StudentsPage />} />
            <Route path="/students/id-cards"          element={<IDCardsPage />} />
            <Route path="/staff/id-cards"             element={<IDCardsPage />} />
            <Route path="/exams/admit-cards"          element={<ExamsPage />} />
            <Route path="/leaves"                     element={<LeavePage />} />
            <Route path="/announcements"              element={<AnnouncementsPage />} />
            <Route path="/tutorials"                  element={<VideoTutorialsPage />} />
            <Route path="/profile"                    element={<ProfilePage />} />
            <Route path="/portal-management"          element={<PortalManagementPage />} />
            <Route path="/manual"                     element={<UserManualPage />} />
            <Route path="/holiday-calendar"           element={<HolidayCalendarPage />} />
            <Route path="/behaviour"                  element={<BehaviourPage />} />
            <Route path="/quiz"                       element={<QuizPage />} />
            <Route path="/settings/subjects"          element={<SubjectsPage />} />
            <Route path="/accounting"                 element={<AccountingPage />} />
            <Route path="/exams/exam-slip"            element={<ExaminationSlipPage />} />
            <Route path="/tasks"                      element={<TaskManagementPage />} />
            <Route path="/tests"                      element={<TestManagementPage />} />
            <Route path="/reporting-area"             element={<ReportingAreaPage />} />
            <Route path="/parents/requests"           element={<ParentAccountsPage />} />
            <Route path="/parents/gate-passes"        element={<ParentAccountsPage />} />
            <Route path="/parents/dues-report"        element={<ParentAccountsPage />} />
            <Route path="/expense-management"         element={<ExpenseManagementPage />} />
            <Route path="/admissions/bulk"            element={<AdmissionsPage />} />
            <Route path="/admissions/reports"         element={<AdmissionInquiriesPage />} />
            <Route path="/students/transfer"          element={<StudentsPage />} />
            <Route path="/staff/departments"          element={<StaffPage />} />
            <Route path="/staff/birthdays"            element={<StaffPage />} />
            <Route path="/staff/cv-bank"              element={<StaffPage />} />
            <Route path="/staff/appraisals"           element={<StaffAppraisalsPage />} />
            <Route path="/attendance/awards"          element={<AttendanceAwardsPage />} />
            <Route path="/fees/types"                element={<FeeTypesPage />} />
            <Route path="/fees/discounted"           element={<DiscountedStudentsPage />} />
            <Route path="/fees/increment"            element={<FeeIncrementPage />} />
            <Route path="/fees/decrement"            element={<FeeIncrementPage />} />
            <Route path="/platform/features"         element={<FeatureMatrixPage />} />
            <Route path="/mentor-ai"                 element={<MentorAIToolsPage />} />
            <Route path="/support-center"            element={<HeadOfficeSupportPage />} />
            <Route path="/settings/audit-logs"       element={<AuditLogsPage />} />
            <Route path="/settings/permissions-matrix" element={<PermissionsMatrixPage />} />
          </Route>

          {/* ── Finance routes — admin AND accountant can reach these ─ */}
          <Route element={<FinanceProtected><AdminLayout /></FinanceProtected>}>
            <Route path="/fees/collect"      element={<FeeCollectionPage />} />
            <Route path="/fees/defaulters"   element={<FeeDefaultersPage />} />
            <Route path="/expenses"          element={<ExpensesPage />} />
            <Route path="/salary"            element={<SalaryPage />} />
            <Route path="/salary/loans"      element={<LoanManagementPage />} />
            <Route path="/reports"           element={<ReportsPage />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
