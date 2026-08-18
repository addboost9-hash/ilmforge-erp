/**
 * IlmForge — Complete User Manual v3.4
 * Updated: Smart Workflow Hub, BISE Result Cards, Homework Diary, POS,
 * Parent Wallet, Admin Permissions, Website Management, WhatsApp Types,
 * Annual Attendance Calendar, Online Payments.
 *
 * Structure:
 *   - Step({ n, text })            numbered step
 *   - Chapter({ chapter, ... })    collapsible accordion
 *   - UserManualPage()             default export (search, tabs, print)
 *   - SECTIONS (11 sections)
 *   - DEMO_SCRIPT (12 steps)
 *   - ROLE_QUICK_START (6 roles)
 *   - OPERATIONAL_CHECKLIST (8 items)
 */
import { useState } from 'react';
import {
  BookOpen, CheckCircle, AlertTriangle, Info, Printer,
  Search, ChevronDown, ChevronRight, Users, DollarSign,
  Award, Settings, Phone, Star, Zap, PlayCircle, ClipboardCheck,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   DEMO SCRIPT — 12-step client presentation (~26 minutes)
═══════════════════════════════════════════════════════════ */
const DEMO_SCRIPT = [
  { step: 1,  action: 'Login',            detail: 'Go to ilmforge-erp.vercel.app → Login as Admin (demo@ilmforge / Admin@123)', time: '1 min' },
  { step: 2,  action: 'Dashboard Tour',   detail: 'Show Smart Workflow Hub banner → KPI cards → Recent Activity feed', time: '2 min' },
  { step: 3,  action: 'Workflow Hub',     detail: 'Click 🔄 Smart Workflow Hub → walk the New Admission cycle step by step', time: '3 min' },
  { step: 4,  action: 'Admit Student',    detail: 'Admissions → Wizard → Fill form → capture live camera photo → show auto roll number', time: '3 min' },
  { step: 5,  action: 'Fee Voucher',      detail: 'Fees → Generate → Print 3-copy voucher (Bank / School / Parent) with HBL details', time: '2 min' },
  { step: 6,  action: 'Attendance',       detail: 'Attendance → Mark class attendance → show auto-SMS to parents toggle (03XX numbers)', time: '2 min' },
  { step: 7,  action: 'Exam & Result',    detail: 'Exams Hub → Create exam → Enter marks → View BISE result card + Merit List', time: '3 min' },
  { step: 8,  action: 'ID Cards',         detail: 'Students → ID Cards → Print with school logo & QR code, batch 30 at a time', time: '1 min' },
  { step: 9,  action: 'Parent Portal',    detail: 'Portal Management → Email/SMS credentials → open the parent view (fees + attendance)', time: '2 min' },
  { step: 10, action: 'Reports',          detail: 'Reports → Daily balance sheet → Fee defaulters → Export Excel', time: '2 min' },
  { step: 11, action: 'New Features',     detail: 'Show Parent Wallet top-up, POS quick-sale, and Homework Diary entry', time: '3 min' },
  { step: 12, action: 'Q&A + Close',      detail: 'Show Settings → School profile + DB backup → hand over pricing & onboarding plan', time: '2 min' },
];

/* ═══════════════════════════════════════════════════════════
   MANUAL SECTIONS (11)
═══════════════════════════════════════════════════════════ */
const SECTIONS = [
  /* ──────────────────────────────────────────
     0. SMART WORKFLOW HUB
  ────────────────────────────────────────── */
  {
    id: 'workflow',
    icon: '🔄',
    color: '#1B2F6E',
    title: 'Smart Workflow Hub',
    desc: 'From admission to leaving — the entire cycle in one place',
    chapters: [
      {
        title: 'What is the Workflow Hub?',
        steps: [
          { n:1, text:'Click the "🔄 Smart Workflow Hub" banner on the Dashboard, or use the "Smart Workflow Hub" link in the sidebar' },
          { n:2, text:'5 complete workflows: New Admission, Daily Routine, Exam Cycle, Class Promotion, Student Leaving' },
          { n:3, text:'Each workflow has step-by-step cards — every step includes a direct action button' },
          { n:4, text:'Click "Mark Done ✓" — the progress bar updates and the next step is highlighted' },
          { n:5, text:'No need to jump between separate hubs — everything is available in one place' },
        ],
        tip: 'When demoing to clients, show the Workflow Hub first — clients immediately understand how the system flows.',
      },
      {
        title: 'New Admission Flow (Admission)',
        steps: [
          { n:1, text:'Inquiry → Create a lead in the CRM (Admissions → CRM)' },
          { n:2, text:'Admit → Fill in the complete details through the wizard (Admissions → Admit Student)' },
          { n:3, text:'Fee Structure → Assign the fee for the class (Fees → Structure)' },
          { n:4, text:'Voucher → Generate and print the first fee voucher (Fees → Generate)' },
          { n:5, text:'ID Card → Print the student\'s ID card and gate pass' },
          { n:6, text:'Portal → Send parent and student portal credentials by email/SMS' },
          { n:7, text:'Welcome SMS → A welcome message is sent automatically to the parent\'s 03XX number' },
        ],
        note: 'The roll number and registration number are generated automatically as soon as the wizard is completed.',
      },
      {
        title: 'Daily Routine Flow',
        steps: [
          { n:1, text:'Attendance → Mark attendance class-wise; absent students\' parents receive an automatic SMS' },
          { n:2, text:'Homework Diary → Enter today\'s homework — it appears live on the parent portal' },
          { n:3, text:'Fee Collection → Receive fees at the counter/POS and print the receipt' },
          { n:4, text:'Notifications → Send out any announcements or alerts' },
          { n:5, text:'Day Close → Review the daily balance sheet and close out the day' },
        ],
        tip: 'The Daily Routine card brings both the teacher\'s and the accountant\'s everyday tasks onto a single screen.',
      },
      {
        title: 'Exam, Promotion & Leaving Flows',
        steps: [
          { n:1, text:'Exam Cycle → Create exam → Timetable → Enter marks → BISE result card → Merit list → Gazette' },
          { n:2, text:'Class Promotion → At the end of the session, promote the entire class to the next class' },
          { n:3, text:'During promotion, roll numbers are reassigned and the new fee structure is attached' },
          { n:4, text:'Student Leaving → Leaving certificate, dues clearance, portal deactivation' },
          { n:5, text:'On leaving, outstanding fees are checked for clearance — the system warns about any pending dues' },
        ],
        warning: 'Once Class Promotion has been run, it is difficult to undo — always take a database backup first (Settings → Backup).',
      },
    ],
  },

  /* ──────────────────────────────────────────
     1. GETTING STARTED
  ────────────────────────────────────────── */
  {
    id: 'getting-started',
    icon: '🚀',
    color: '#0F766E',
    title: 'Getting Started',
    desc: 'Registration, onboarding, and login — your first day',
    chapters: [
      {
        title: 'School Registration',
        steps: [
          { n:1, text:'Go to ilmforge-erp.vercel.app → click "Register School"' },
          { n:2, text:'Enter the school name, city, address, and the administrator\'s name' },
          { n:3, text:'Provide the admin\'s email and phone number (03XXXXXXXXX) — this account becomes the super-admin' },
          { n:4, text:'Choose a strong password (8+ characters, with at least one number and one capital letter)' },
          { n:5, text:'Click "Create School" — your own dedicated school workspace is created' },
        ],
        note: 'Each school\'s data is kept separate (multi-tenant) — data from different schools is never mixed together.',
      },
      {
        title: 'Onboarding Wizard (Initial Setup)',
        steps: [
          { n:1, text:'The onboarding wizard opens automatically on your first login' },
          { n:2, text:'School profile: logo upload, address, phone, current session (2025-2026)' },
          { n:3, text:'Create classes: from Play Group through Matric, along with sections (A/B/C)' },
          { n:4, text:'Fee structure: set each class\'s monthly fee (e.g. Rs. 3,500) and admission fee (Rs. 5,000)' },
          { n:5, text:'Add staff: at least one accountant and one teacher' },
          { n:6, text:'Click "Finish Setup" and your dashboard is ready' },
        ],
        tip: 'You can also skip onboarding — everything can be configured later from Settings.',
      },
      {
        title: 'Login & Roles',
        steps: [
          { n:1, text:'Enter your email and password on the login page' },
          { n:2, text:'Depending on your role, a different portal opens (Admin, Accountant, Teacher, Parent, Student, Gatekeeper)' },
          { n:3, text:'"Forgot Password" → a reset link is sent to your registered email' },
          { n:4, text:'Admins can reset other users\' passwords from Settings → Users' },
        ],
        warning: 'Be sure to change the default admin password after your first login.',
      },
    ],
  },

  /* ──────────────────────────────────────────
     2. STUDENTS
  ────────────────────────────────────────── */
  {
    id: 'students',
    icon: '👨‍🎓',
    color: '#0891B2',
    title: 'Student Management',
    desc: 'Students — classes, admission wizard, gate pass, CRM, promotion',
    chapters: [
      {
        title: 'Classes & Sections Setup',
        steps: [
          { n:1, text:'Academics → Classes (or /academics/classes)' },
          { n:2, text:'"Add Class" → enter the class name (Nursery, One, Two ... Matric)' },
          { n:3, text:'Add sections: A, B, C — assign a class teacher to each section' },
          { n:4, text:'Link a fee structure to each class' },
          { n:5, text:'Assign subjects — the result card will be based on these' },
        ],
        note: 'Set up classes before starting admissions, since the admission wizard requires a class and section.',
      },
      {
        title: 'Admission Wizard (Live Camera)',
        steps: [
          { n:1, text:'Admissions → Admit Student → step-by-step wizard' },
          { n:2, text:'Student details: name, B-Form/CNIC, date of birth, gender, class + section' },
          { n:3, text:'Parent/Guardian details: name, CNIC, phone (03XXXXXXXXX), occupation' },
          { n:4, text:'Photo: capture a live photo via webcam using "Use Camera", or upload a file' },
          { n:5, text:'Documents: attach scans of the B-Form and previous school certificate' },
          { n:6, text:'Review → Submit → the roll number and registration number are generated automatically' },
          { n:7, text:'The ID card and first fee voucher can be printed immediately' },
        ],
        tip: 'As soon as a photo is captured via the live camera, the same photo is used on the ID card and portal profile.',
      },
      {
        title: 'Gate Passes (QR)',
        steps: [
          { n:1, text:'Students → Gate Pass (or /gatepass)' },
          { n:2, text:'Select the student → choose a reason (early leave, half-day, visitor pickup)' },
          { n:3, text:'Click "Generate Pass" → a gate pass with a QR code is created' },
          { n:4, text:'The pass is verified by scanning the QR code on the Gatekeeper portal' },
          { n:5, text:'Every pass logs its timestamp and the staff member who issued it' },
        ],
        note: 'A gate pass QR code is valid for a single use only — scanning it again shows "already used".',
      },
      {
        title: 'Student CRM & Promotion',
        steps: [
          { n:1, text:'Admissions → CRM: inquiry leads (New → Contacted → Visited → Admitted/Lost)' },
          { n:2, text:'Add follow-up notes and reminders — conversion rate is tracked automatically' },
          { n:3, text:'Clicking "Convert to Admitted" opens the admission wizard directly' },
          { n:4, text:'Promotion: Academics → Promote Class → at the end of the session, move the entire class to the next one' },
          { n:5, text:'Failing/repeating students can be excluded from promotion' },
        ],
        warning: 'Finalize all exam results and fee dues before running promotion.',
      },
    ],
  },

  /* ──────────────────────────────────────────
     3. FEES
  ────────────────────────────────────────── */
  {
    id: 'fees',
    icon: '💰',
    color: '#D97706',
    title: 'Fee Management',
    desc: 'Structure, generate, collect, voucher, EMI, wallet, defaulters',
    chapters: [
      {
        title: 'Fee Structure',
        steps: [
          { n:1, text:'Fees → Structure (or /fees/structure)' },
          { n:2, text:'Select a class → add fee heads: Tuition (Rs. 3,500), Admission (Rs. 5,000), Exam (Rs. 800), Transport (Rs. 2,000)' },
          { n:3, text:'Set the frequency: monthly, quarterly, or annual' },
          { n:4, text:'Apply a sibling discount or scholarship percentage' },
          { n:5, text:'Save — this structure applies to every student in the class' },
        ],
        note: 'Once created, fee heads can be reused across all classes.',
      },
      {
        title: 'Generate & Collect',
        steps: [
          { n:1, text:'Fees → Generate → select the month → generate vouchers for a class or the whole school' },
          { n:2, text:'Fees → Collect → search for the student (name/roll number) → the outstanding amount is displayed' },
          { n:3, text:'Payment mode: Cash / Bank / Card / Wallet / Online' },
          { n:4, text:'Partial payments are allowed — the remaining balance carries forward' },
          { n:5, text:'Print the receipt and an automatic SMS confirming "Rs. X received" is sent to the parent' },
        ],
        tip: 'A late fee can be added automatically (e.g. Rs. 100/day) if the due date is missed — enable it from Settings → Fees.',
      },
      {
        title: '3-Copy Voucher',
        steps: [
          { n:1, text:'Fees → Generate → select a student or class → "Print Voucher"' },
          { n:2, text:'The voucher prints in 3 copies: Bank Copy, School Copy, Parent Copy' },
          { n:3, text:'Bank details are printed on the voucher (HBL / UBL account number + branch)' },
          { n:4, text:'The barcode/challan number makes reconciliation at the bank counter easy' },
          { n:5, text:'The due date, late fee warning, and QR code also appear on the voucher' },
        ],
        note: 'The school\'s logo and theme color are applied to the voucher automatically (Settings → School Profile).',
      },
      {
        title: 'EMI, Parent Wallet & Online Payment',
        steps: [
          { n:1, text:'EMI: split large fees (admission + annual) into 3-6 installments — Fees → EMI Plan' },
          { n:2, text:'Parent Wallet: parents can deposit an advance amount, and fees are auto-deducted from it' },
          { n:3, text:'Top up the wallet online through the parent portal, or with cash at the counter' },
          { n:4, text:'Online Payment: parents can pay fees via card or bank transfer through the parent portal (payment gateway)' },
          { n:5, text:'Every online transaction generates a receipt and an SMS confirmation' },
        ],
        tip: 'The Parent Wallet lets fees for multiple children be managed from a single balance — parents really appreciate this feature.',
      },
      {
        title: 'Defaulters',
        steps: [
          { n:1, text:'Fees → Defaulters (or /fees/defaulters)' },
          { n:2, text:'A list of overdue students: name, class, outstanding amount, days overdue' },
          { n:3, text:'Filter: class-wise, amount-wise, month-wise' },
          { n:4, text:'"Send Reminder" → sends bulk SMS/WhatsApp messages to defaulters\' parents' },
          { n:5, text:'Export to Excel/PDF for the principal\'s review' },
        ],
        warning: 'Review the list before sending bulk reminders — make sure parents who have already paid don\'t get a message by mistake.',
      },
    ],
  },

  /* ──────────────────────────────────────────
     4. EXAMS
  ────────────────────────────────────────── */
  {
    id: 'exams',
    icon: '📝',
    color: '#7C3AED',
    title: 'Exam Management',
    desc: 'Create exam, marks, BISE result card, merit list, gazette',
    chapters: [
      {
        title: 'Create Exam & Timetable',
        steps: [
          { n:1, text:'Exams → Exams Hub → "Create Exam"' },
          { n:2, text:'Exam type: Monthly, Mid-Term, Final, Pre-Board' },
          { n:3, text:'Select the classes and subjects, and set total and passing marks' },
          { n:4, text:'Timetable: add the date, time, and duration for each subject' },
          { n:5, text:'Print the timetable and publish it on the portals (students/parents can view it)' },
        ],
      },
      {
        title: 'Enter Marks',
        steps: [
          { n:1, text:'Exams → Enter Marks → select the exam, class, and subject' },
          { n:2, text:'Enter each student\'s marks in the class list grid' },
          { n:3, text:'Mark absent students as "AB"' },
          { n:4, text:'The system automatically assigns a grade (A+, A, B, C ...) and pass/fail status' },
          { n:5, text:'Subject teachers can also enter marks for their subject through the teacher portal' },
        ],
        tip: 'Marks can also be bulk-imported from Excel — this saves time for large classes.',
      },
      {
        title: 'BISE Result Card',
        steps: [
          { n:1, text:'Exams → Result Card → select a student or class' },
          { n:2, text:'BISE-style card: subject-wise marks, total, percentage, grade, position' },
          { n:3, text:'The school logo, principal\'s signature space, and remarks are printed automatically' },
          { n:4, text:'Batch print: generate result cards for an entire class at once' },
          { n:5, text:'Result cards are available for download on the parent portal' },
        ],
        note: 'The result card format closely resembles official cards issued by BISE boards (Lahore/Rawalpindi).',
      },
      {
        title: 'Merit List & Gazette',
        steps: [
          { n:1, text:'Exams → Merit List → select the exam and class → view top students by percentage' },
          { n:2, text:'1st, 2nd, and 3rd positions are highlighted — useful for prize distribution' },
          { n:3, text:'Gazette: a consolidated result sheet for the whole school (all classes)' },
          { n:4, text:'Print/export the gazette for records and the notice board' },
          { n:5, text:'Pass %, fail count, subject-wise average statistics' },
        ],
      },
    ],
  },

  /* ──────────────────────────────────────────
     5. STAFF
  ────────────────────────────────────────── */
  {
    id: 'staff',
    icon: '👨‍🏫',
    color: '#BE185D',
    title: 'Staff & Teacher Management',
    desc: 'Add staff, salary, attendance, appraisals',
    chapters: [
      {
        title: 'Add Staff',
        steps: [
          { n:1, text:'Staff → Add Staff (or /staff/add)' },
          { n:2, text:'Details: name, CNIC, phone (03XXXXXXXXX), designation, joining date' },
          { n:3, text:'Assign a role: Teacher / Accountant / Admin / Gatekeeper / Support' },
          { n:4, text:'If the staff member is a teacher, assign classes and subjects' },
          { n:5, text:'Portal login credentials are auto-generated and sent by email/SMS' },
        ],
      },
      {
        title: 'Salary Management',
        steps: [
          { n:1, text:'Staff → Salary → select the month' },
          { n:2, text:'Basic + allowances (house, transport) minus deductions (loan, absence)' },
          { n:3, text:'e.g. Basic Rs. 45,000 + Allowance Rs. 8,000 − Deduction Rs. 2,000 = Rs. 51,000' },
          { n:4, text:'Generate and print the payslip; it is also available on the staff portal' },
          { n:5, text:'Bank transfer sheet export (HBL/UBL bulk salary)' },
        ],
        tip: 'Absence deductions can be calculated automatically from the attendance module.',
      },
      {
        title: 'Staff Attendance & Appraisals',
        steps: [
          { n:1, text:'Staff → Attendance → mark daily present/absent/leave' },
          { n:2, text:'Sync attendance automatically from a biometric device (Settings → Biometric)' },
          { n:3, text:'Leave applications are submitted through the staff portal — admins approve/reject them' },
          { n:4, text:'Appraisals: Staff → Appraisals → performance rating + remarks' },
          { n:5, text:'The annual appraisal report supports increment decisions' },
        ],
      },
    ],
  },

  /* ──────────────────────────────────────────
     6. PORTALS
  ────────────────────────────────────────── */
  {
    id: 'portals',
    icon: '🔐',
    color: '#4338CA',
    title: 'Portal Access — Parents, Teachers, Students',
    desc: 'Teacher, Parent, Student, Accountant, Gatekeeper portals',
    chapters: [
      {
        title: 'Portal Credentials',
        steps: [
          { n:1, text:'Settings → Portal Management' },
          { n:2, text:'Generate bulk credentials: for students/parents, class-wise' },
          { n:3, text:'Use "Email Credentials" or "SMS Credentials" to send logins to 03XX numbers' },
          { n:4, text:'The parent\'s username is usually the child\'s registration number' },
          { n:5, text:'The admin can reset a password at any time' },
        ],
        isTable: true,
        content: [
          { role:'Admin',      username:'Registered email',        password:'Self-set',  example:'admin@school.edu.pk' },
          { role:'Teacher',    username:'Staff ID / email',         password:'Auto → change', example:'TCH-014' },
          { role:'Accountant', username:'Staff ID / email',         password:'Auto → change', example:'ACC-002' },
          { role:'Parent',     username:'Student reg. number',       password:'Auto → change', example:'REG-2026-108' },
          { role:'Student',    username:'Roll / reg. number',        password:'Auto → change', example:'STD-2026-108' },
          { role:'Gatekeeper', username:'Staff ID',                  password:'Auto → change', example:'GATE-01' },
        ],
      },
      {
        title: 'What Each Portal Shows',
        steps: [
          { n:1, text:'Teacher: attendance mark, marks entry, homework diary, class materials' },
          { n:2, text:'Parent: the child\'s fees + dues, attendance, results, homework, notices, wallet' },
          { n:3, text:'Student: homework, results, timetable, announcements, attendance' },
          { n:4, text:'Accountant: fee collection, defaulters, financial reports, POS' },
          { n:5, text:'Gatekeeper: barcode attendance + QR gate pass verify only (limited access)' },
        ],
        note: 'The Gatekeeper portal is minimal — only entry logs and pass verification, with no access to financial or student data.',
      },
    ],
  },

  /* ──────────────────────────────────────────
     7. COMMUNICATION
  ────────────────────────────────────────── */
  {
    id: 'communication',
    icon: '📢',
    color: '#059669',
    title: 'Communication & Notifications',
    desc: 'SMS, WhatsApp (5 types), Email, Push, Templates',
    chapters: [
      {
        title: 'SMS',
        steps: [
          { n:1, text:'Communication → SMS → select recipients (class / defaulters / custom)' },
          { n:2, text:'Message type: attendance alert, fee reminder, announcement, result' },
          { n:3, text:'Pakistani numbers in the 03XXXXXXXXX format are validated automatically' },
          { n:4, text:'Choose a template or write a custom message' },
          { n:5, text:'Send → a delivery report (sent/failed) is displayed' },
        ],
      },
      {
        title: 'WhatsApp — 5 Types',
        steps: [
          { n:1, text:'Type 1: Attendance — "Your child was absent today (attendance alert)"' },
          { n:2, text:'Type 2: Fee Reminder — "Rs. 3,500 due, please clear by 10th"' },
          { n:3, text:'Type 3: Result — sends the result card link/summary to the parent' },
          { n:4, text:'Type 4: Announcement — holiday, event, PTM notices' },
          { n:5, text:'Type 5: Homework — today\'s homework sent to the parent on WhatsApp' },
        ],
        tip: 'WhatsApp templates are pre-approved to keep delivery reliable.',
      },
      {
        title: 'Email, Push & Templates',
        steps: [
          { n:1, text:'Email: bulk email sent via Brevo integration (credentials, reports, receipts)' },
          { n:2, text:'Push notifications give real-time alerts to logged-in portal users' },
          { n:3, text:'Templates: Communication → Templates → create reusable SMS/WhatsApp/Email templates' },
          { n:4, text:'Placeholders: {student_name}, {amount}, {due_date}, {class}' },
          { n:5, text:'Sent history and delivery logs are retained for auditing' },
        ],
        note: 'Brevo (formerly Sendinblue) is used for email delivery — HBL/UBL voucher emails are also sent through it.',
      },
    ],
  },

  /* ──────────────────────────────────────────
     8. REPORTS
  ────────────────────────────────────────── */
  {
    id: 'reports',
    icon: '📊',
    color: '#0369A1',
    title: 'Reports & Printing',
    desc: '110+ reports — student info, attendance calendar, defaulters',
    chapters: [
      {
        title: 'Report Categories',
        steps: [
          { n:1, text:'Reports → 110+ reports across categories: Students, Fees, Exams, Staff, Attendance' },
          { n:2, text:'Financial: daily balance sheet, income/expense, fee collection, defaulters' },
          { n:3, text:'Academic: result gazette, merit list, subject analysis' },
          { n:4, text:'Every report supports Print and Export (PDF/Excel)' },
          { n:5, text:'Date range, class, and section filters are available on every report' },
        ],
      },
      {
        title: 'Student Info & Attendance Calendar',
        steps: [
          { n:1, text:'Reports → Student Info → complete profile: personal, parent, fee, exam, attendance' },
          { n:2, text:'Reports → Attendance Calendar → select a student and year' },
          { n:3, text:'12-month grid: P=Present (green), A=Absent (red), L=Leave (yellow), H=Holiday (purple)' },
          { n:4, text:'Monthly and yearly totals are calculated automatically' },
          { n:5, text:'"Print Calendar" → BISE-style annual attendance with signature spaces' },
        ],
        tip: 'The attendance calendar report is very useful for parent-teacher meetings.',
      },
      {
        title: 'Defaulters & Financial Reports',
        steps: [
          { n:1, text:'Reports → Defaulters → outstanding by class/amount/days overdue' },
          { n:2, text:'Daily Balance Sheet: the day\'s total collection, broken down by mode (cash/bank/online)' },
          { n:3, text:'Fee Collection report: month-wise trend + comparison' },
          { n:4, text:'Export to Excel for accountant reconciliation and auditing' },
          { n:5, text:'Principal dashboard shows key report summary widgets' },
        ],
      },
    ],
  },

  /* ──────────────────────────────────────────
     9. NEW FEATURES v3.4
  ────────────────────────────────────────── */
  {
    id: 'new-features',
    icon: '🆕',
    color: '#DB2777',
    title: 'New Features v3.4',
    desc: 'BISE cards, Homework Diary, POS, Wallet, Permissions, Website, Calendar',
    chapters: [
      {
        title: 'BISE Result Cards & Homework Diary',
        steps: [
          { n:1, text:'BISE Result Card: official board-style card with grade, position, percentage' },
          { n:2, text:'Batch-print result cards for an entire class in a single click' },
          { n:3, text:'Homework Diary: teachers enter daily homework by subject through the teacher portal' },
          { n:4, text:'Homework appears live on the parent and student portals' },
          { n:5, text:'Homework can be delivered to parents automatically via WhatsApp/SMS' },
        ],
      },
      {
        title: 'POS & Parent Wallet',
        steps: [
          { n:1, text:'POS: Accounting → POS → quick-sale counter (books, uniforms, stationery)' },
          { n:2, text:'Item scan/select → quantity → total → receipt print' },
          { n:3, text:'A POS sale can be linked to a student\'s account or wallet' },
          { n:4, text:'Parent Wallet: advance balance; fees + POS purchases are auto-deducted' },
          { n:5, text:'The wallet statement on the parent portal shows every transaction' },
        ],
        tip: 'The POS + Wallet combination brings the book shop and canteen into the same system.',
      },
      {
        title: 'Admin Permissions & Website Management',
        steps: [
          { n:1, text:'Settings → Admin Permissions → granular role-based access control' },
          { n:2, text:'Set view/edit/delete permissions per role for each module' },
          { n:3, text:'Website Management: edit the content of the school\'s public website' },
          { n:4, text:'9 color themes + custom color + logo, about, facilities, gallery' },
          { n:5, text:'Click "Save Changes" → branding updates across the website, portals, and documents' },
        ],
        note: 'As soon as the website theme color is changed, the branding updates across vouchers, ID cards, and portals.',
      },
      {
        title: 'Academic Calendar',
        steps: [
          { n:1, text:'Settings → Academic Calendar → session dates, terms, holidays' },
          { n:2, text:'Mark public holidays (14 August, Eid, etc.) and school events' },
          { n:3, text:'Holidays show up as H (purple) on the attendance calendar' },
          { n:4, text:'Publish events on the portals and notices' },
          { n:5, text:'Exam dates from the calendar can be linked to the timetable' },
        ],
      },
    ],
  },

  /* ──────────────────────────────────────────
     10. SETTINGS
  ────────────────────────────────────────── */
  {
    id: 'settings',
    icon: '⚙️',
    color: '#475569',
    title: 'Settings & Administration',
    desc: 'School profile, DB backup, SOPs, biometric, admin roles',
    chapters: [
      {
        title: 'School Profile',
        steps: [
          { n:1, text:'Settings → School Profile' },
          { n:2, text:'Name, address, city, phone (03XXXXXXXXX), email, website' },
          { n:3, text:'Upload a logo and choose a theme color (9 presets or custom)' },
          { n:4, text:'Set the current session (2025-2026) and currency (Rs. / PKR)' },
          { n:5, text:'Save → branding is applied to all documents (vouchers, cards, reports)' },
        ],
      },
      {
        title: 'Database Backup',
        steps: [
          { n:1, text:'Settings → Backup → "Create Backup Now"' },
          { n:2, text:'Download the full database snapshot (JSON/SQL) — store it in a safe location' },
          { n:3, text:'Scheduled automatic backups can be set to run daily or weekly' },
          { n:4, text:'Use "Restore" to load a backup back in (be careful — this replaces current data)' },
          { n:5, text:'Take a backup before every major operation (promotion, session close)' },
        ],
        warning: 'Restoring overwrites current data — take a backup of the current data before restoring.',
      },
      {
        title: 'SOPs, Biometric & Admin Roles',
        steps: [
          { n:1, text:'SOPs: Settings → SOPs → store standard operating procedure documents' },
          { n:2, text:'Biometric: Settings → Biometric → connect a device for staff/student attendance' },
          { n:3, text:'Admin Roles: create multiple admins with scoped permissions' },
          { n:4, text:'Audit log: tracks which user changed what — for accountability' },
          { n:5, text:'Users: reset password, deactivate, re-assign roles' },
        ],
        tip: 'Biometric attendance fully automates staff salary deductions.',
      },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════
   ROLE QUICK START (6 roles)
═══════════════════════════════════════════════════════════ */
const ROLE_QUICK_START = [
  { role: 'Admin',      color: '#0F766E', path: '/dashboard',           bullets: ['Start with the Smart Workflow Hub', 'Configure classes, fees, and staff', 'Manage settings and portals'] },
  { role: 'Accountant', color: '#1D4ED8', path: '/accountant-portal',   bullets: ['Collect and post fees (POS)', 'Track defaulters and reminders', 'Run the daily balance sheet'] },
  { role: 'Teacher',    color: '#7C3AED', path: '/teacher-portal',      bullets: ['Mark attendance', 'Enter marks and homework diary', 'Share class materials'] },
  { role: 'Parent',     color: '#D97706', path: '/parent-portal',       bullets: ['View your child\'s fees and dues', 'Track attendance and results', 'Top up the wallet, read notices'] },
  { role: 'Student',    color: '#0891B2', path: '/student-portal',      bullets: ['Check homework and results', 'View timetable and announcements', 'View attendance'] },
  { role: 'Gatekeeper', color: '#B91C1C', path: '/gatekeeper-portal',   bullets: ['Barcode attendance only', 'Verify QR gate passes', 'Live daily entry log'] },
];

/* ═══════════════════════════════════════════════════════════
   OPERATIONAL CHECKLIST (8 items)
═══════════════════════════════════════════════════════════ */
const OPERATIONAL_CHECKLIST = [
  'School Profile complete — logo, address, phone (03XXXXXXXXX), session 2025-2026',
  'All classes and sections created, with class teachers assigned',
  'Fee structure set for every class (Tuition Rs. 3,500, Admission Rs. 5,000, etc.)',
  'Bank details configured for vouchers (HBL / UBL account + branch)',
  'Staff added with roles — at least one accountant and teachers',
  'Portal credentials generated and sent via email/SMS (parents + staff)',
  'SMS/WhatsApp/Email (Brevo) gateway test message delivered successfully',
  'First database backup taken (Settings → Backup) and stored in a safe location',
];

/* ═══════════════════════════════════════════════════════════
   COMPONENTS
═══════════════════════════════════════════════════════════ */
function Step({ n, text }) {
  return (
    <div style={{ display:'flex', gap:10, marginBottom:8, alignItems:'flex-start' }}>
      <div style={{ width:24, height:24, borderRadius:'50%', background:'#0F766E', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:11, flexShrink:0, marginTop:1 }}>
        {n}
      </div>
      <span style={{ fontSize:13.5, color:'#374151', lineHeight:1.6 }}>{text}</span>
    </div>
  );
}

function Chapter({ chapter, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen || false);
  return (
    <div style={{ border:'1px solid #E5E7EB', borderRadius:10, marginBottom:10, overflow:'hidden' }}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', background:open?'#F0FDF9':'#FAFAFA', border:'none', cursor:'pointer', textAlign:'left' }}>
        <span style={{ fontWeight:700, fontSize:14, color:'#1E3A5F' }}>{chapter.title}</span>
        {open ? <ChevronDown size={16} color="#0F766E"/> : <ChevronRight size={16} color="#6B7280"/>}
      </button>
      {open && (
        <div style={{ padding:'16px 20px', borderTop:'1px solid #E5E7EB' }}>
          {chapter.steps && chapter.steps.map(s => <Step key={s.n} {...s}/>)}

          {chapter.isTable && chapter.content && (
            <div style={{ overflowX:'auto', marginTop:6 }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ background:'#F0FDF9' }}>
                    {['Role','Username / Login ID','Default Password','Example'].map(h=>(
                      <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontWeight:700, color:'#0F766E', borderBottom:'2px solid #CCFBF1' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chapter.content.map((row,i)=>(
                    <tr key={i} style={{ background:i%2===0?'#fff':'#F8FAFC' }}>
                      <td style={{ padding:'8px 12px', fontWeight:700, color:'#1E3A5F', borderBottom:'1px solid #E5E7EB' }}>{row.role}</td>
                      <td style={{ padding:'8px 12px', color:'#374151', borderBottom:'1px solid #E5E7EB' }}>{row.username}</td>
                      <td style={{ padding:'8px 12px', borderBottom:'1px solid #E5E7EB' }}>
                        <span style={{ fontFamily:'monospace', fontWeight:700, background:'#F0FDF9', color:'#0F766E', padding:'2px 8px', borderRadius:4 }}>{row.password}</span>
                      </td>
                      <td style={{ padding:'8px 12px', fontFamily:'monospace', fontSize:12, color:'#6B7280', borderBottom:'1px solid #E5E7EB' }}>{row.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {chapter.note && (
            <div style={{ background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:8, padding:'10px 14px', marginTop:12, display:'flex', gap:8, alignItems:'flex-start' }}>
              <Info size={14} color="#2563EB" style={{ flexShrink:0, marginTop:1 }}/>
              <span style={{ fontSize:12.5, color:'#1D4ED8', lineHeight:1.5 }}><strong>Note:</strong> {chapter.note}</span>
            </div>
          )}
          {chapter.warning && (
            <div style={{ background:'#FFF7ED', border:'1px solid #FED7AA', borderRadius:8, padding:'10px 14px', marginTop:12, display:'flex', gap:8, alignItems:'flex-start' }}>
              <AlertTriangle size={14} color="#C2410C" style={{ flexShrink:0, marginTop:1 }}/>
              <span style={{ fontSize:12.5, color:'#9A3412', lineHeight:1.5 }}><strong>Warning:</strong> {chapter.warning}</span>
            </div>
          )}
          {chapter.tip && (
            <div style={{ background:'#F0FDF9', border:'1px solid #CCFBF1', borderRadius:8, padding:'10px 14px', marginTop:12, display:'flex', gap:8, alignItems:'flex-start' }}>
              <CheckCircle size={14} color="#0D9488" style={{ flexShrink:0, marginTop:1 }}/>
              <span style={{ fontSize:12.5, color:'#0F766E', lineHeight:1.5 }}>💡 <strong>Tip:</strong> {chapter.tip}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function UserManualPage() {
  const [search, setSearch]     = useState('');
  const [showDemo, setShowDemo] = useState(false);
  const [checked, setChecked]   = useState({});

  const toggleCheck = (i) => setChecked(c => ({ ...c, [i]: !c[i] }));
  const doneCount = OPERATIONAL_CHECKLIST.filter((_, i) => checked[i]).length;

  const filteredSections = SECTIONS.map(sec => ({
    ...sec,
    chapters: sec.chapters.filter(ch =>
      !search ||
      ch.title.toLowerCase().includes(search.toLowerCase()) ||
      ch.steps?.some(s => s.text.toLowerCase().includes(search.toLowerCase())) ||
      ch.note?.toLowerCase().includes(search.toLowerCase()) ||
      ch.tip?.toLowerCase().includes(search.toLowerCase()) ||
      ch.warning?.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(sec => !search || sec.chapters.length > 0);

  return (
    <div className="page-content fade-up" id="user-manual">

      {/* ── Header ── */}
      <div style={{ background:'linear-gradient(135deg,#0F4C45,#0F766E)', borderRadius:16, padding:'28px 32px', marginBottom:20, color:'#fff' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ fontSize:40 }}>📖</div>
            <div>
              <h1 style={{ margin:0, fontSize:24, fontWeight:900, display:'flex', alignItems:'center', gap:10 }}>
                IlmForge User Manual
                <span style={{ background:'rgba(255,255,255,0.2)', padding:'3px 12px', borderRadius:99, fontSize:13, fontWeight:800 }}>v3.4</span>
              </h1>
              <p style={{ margin:'4px 0 0', opacity:0.8, fontSize:13 }}>11 sections · 60+ chapters · BISE cards · POS · Homework Diary · 12-step demo script</p>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button onClick={()=>setShowDemo(d=>!d)}
              style={{ background:'#f59e0b', border:'none', color:'#fff', padding:'8px 16px', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
              <PlayCircle size={14}/> Demo Script
            </button>
            <button onClick={()=>window.print()}
              style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)', color:'#fff', padding:'8px 16px', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
              <Printer size={14}/> Print Manual
            </button>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, marginTop:16, flexWrap:'wrap' }}>
          {['🔄 Workflow Hub','Admission','Fees','BISE Result Card','Homework Diary','POS','Parent Wallet','Admin Permissions','Website Mgmt','Online Payment'].map(tag => (
            <span key={tag} style={{ background:'rgba(255,255,255,0.15)', padding:'3px 10px', borderRadius:99, fontSize:11.5, fontWeight:600 }}>{tag}</span>
          ))}
        </div>
      </div>

      {/* ── Demo Script Panel ── */}
      {showDemo && (
        <div style={{ background:'#fff', border:'2px solid #f59e0b', borderRadius:12, padding:20, marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div style={{ fontSize:15, fontWeight:800, color:'#92400e', display:'flex', alignItems:'center', gap:8 }}>
              <Star size={16} color="#f59e0b"/> Client Demo Script — 12 steps · ~26 minutes
            </div>
            <button onClick={()=>setShowDemo(false)} style={{ border:'none', background:'none', cursor:'pointer', color:'#94a3b8', fontSize:18 }}>×</button>
          </div>
          <div style={{ display:'grid', gap:8 }}>
            {DEMO_SCRIPT.map(d => (
              <div key={d.step} style={{ display:'flex', gap:12, alignItems:'flex-start', padding:'10px 14px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8 }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:'#f59e0b', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:12, flexShrink:0 }}>{d.step}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:13.5, color:'#92400e' }}>{d.action}</div>
                  <div style={{ fontSize:12.5, color:'#374151', marginTop:2 }}>{d.detail}</div>
                </div>
                <div style={{ fontSize:11, fontWeight:700, color:'#d97706', background:'#fef3c7', padding:'3px 8px', borderRadius:99, flexShrink:0 }}>⏱ {d.time}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:12, padding:'10px 14px', background:'#ecfdf5', border:'1px solid #a7f3d0', borderRadius:8, fontSize:12.5, color:'#065f46' }}>
            💡 <strong>Demo Tip:</strong> Show the Workflow Hub first — clients immediately understand how the system flows. Then run the live admission wizard (camera photo) — it makes the strongest impression.
          </div>
        </div>
      )}

      {/* ── Search ── */}
      <div style={{ position:'relative', marginBottom:20 }}>
        <Search size={16} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#94A3B8' }}/>
        <input className="form-input" style={{ paddingLeft:42, fontSize:14, height:46, width:'100%' }}
          placeholder="Search any feature, step, or topic (e.g. voucher, attendance, wallet)..."
          value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      {/* ── Role Cards ── */}
      {!search && (
        <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, padding:'16px', marginBottom:20 }}>
          <div style={{ fontSize:15, fontWeight:800, color:'#1E3A5F', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
            <Users size={16} color="#0F766E"/> Role Quick Start
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:10 }}>
            {ROLE_QUICK_START.map(item => (
              <a key={item.role} href={item.path}
                style={{ border:`1px solid ${item.color}30`, background:`${item.color}10`, borderRadius:10, padding:'12px 14px', textDecoration:'none' }}>
                <div style={{ fontSize:13.5, fontWeight:800, color:item.color, marginBottom:6 }}>{item.role}</div>
                {item.bullets.map(b => (
                  <div key={b} style={{ fontSize:12, color:'#334155', lineHeight:1.5 }}>• {b}</div>
                ))}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── Operational Checklist ── */}
      {!search && (
        <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, padding:'16px', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, flexWrap:'wrap', gap:8 }}>
            <div style={{ fontSize:15, fontWeight:800, color:'#1E3A5F', display:'flex', alignItems:'center', gap:8 }}>
              <ClipboardCheck size={16} color="#0F766E"/> System Readiness Checklist
            </div>
            <span style={{ background:doneCount===OPERATIONAL_CHECKLIST.length?'#DCFCE7':'#F0FDF9', color:doneCount===OPERATIONAL_CHECKLIST.length?'#166534':'#0F766E', padding:'3px 12px', borderRadius:99, fontSize:12.5, fontWeight:800 }}>
              {doneCount} / {OPERATIONAL_CHECKLIST.length} done
            </span>
          </div>
          <div style={{ display:'grid', gap:8 }}>
            {OPERATIONAL_CHECKLIST.map((item, i) => (
              <label key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'10px 12px', background:checked[i]?'#F0FDF9':'#F8FAFC', border:`1px solid ${checked[i]?'#CCFBF1':'#E5E7EB'}`, borderRadius:8, cursor:'pointer' }}>
                <input type="checkbox" checked={!!checked[i]} onChange={()=>toggleCheck(i)} style={{ marginTop:2, width:16, height:16, accentColor:'#0F766E', flexShrink:0 }}/>
                <span style={{ fontSize:13, color:checked[i]?'#0F766E':'#374151', lineHeight:1.5, textDecoration:checked[i]?'line-through':'none' }}>{item}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ── Section Nav Pills ── */}
      {!search && (
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:24 }}>
          {SECTIONS.map(sec => (
            <a key={sec.id} href={`#${sec.id}`}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:99, background:`${sec.color}15`, border:`1px solid ${sec.color}30`, color:sec.color, textDecoration:'none', fontSize:12.5, fontWeight:700 }}>
              {sec.icon} {sec.title}
            </a>
          ))}
        </div>
      )}

      {/* ── Content ── */}
      {filteredSections.map(sec => (
        <div key={sec.id} id={sec.id} style={{ marginBottom:32 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, paddingBottom:12, borderBottom:`3px solid ${sec.color}` }}>
            <div style={{ width:42, height:42, borderRadius:11, background:`${sec.color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>
              {sec.icon}
            </div>
            <div>
              <h2 style={{ margin:0, fontSize:17, fontWeight:800, color:'#1E3A5F' }}>{sec.title}</h2>
              <p style={{ margin:0, fontSize:12.5, color:'#6B7280' }}>{sec.desc}</p>
            </div>
            <span style={{ marginLeft:'auto', background:`${sec.color}15`, color:sec.color, padding:'3px 10px', borderRadius:99, fontSize:12, fontWeight:700 }}>
              {sec.chapters.length} chapters
            </span>
          </div>
          {sec.chapters.map((ch,i) => <Chapter key={i} chapter={ch} defaultOpen={i===0 && !search}/>)}
        </div>
      ))}

      {filteredSections.length === 0 && (
        <div style={{ textAlign:'center', padding:'40px 20px', color:'#94A3B8', fontSize:14 }}>
          No results found for "<strong>{search}</strong>". Try a different keyword.
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{ background:'#F8FAFC', border:'1px solid #E5E7EB', borderRadius:12, padding:'20px 24px', textAlign:'center', marginTop:16 }}>
        <div style={{ fontSize:20, marginBottom:6 }}>🎓 🇵🇰</div>
        <div style={{ fontWeight:800, color:'#1E3A5F', fontSize:15 }}>IlmForge School Management System</div>
        <div style={{ fontSize:12, color:'#6B7280', marginTop:6 }}>
          Pakistan's #1 School ERP · Made in Pakistan · Live: <strong>https://ilmforge-erp.vercel.app</strong>
        </div>
        <div style={{ fontSize:12, color:'#6B7280', marginTop:4 }}>
          Support: interface_alerts@carecloud.com · Version 3.4
        </div>
      </div>

      <style>{`
        @media print {
          .sidebar, .top-header, .app-header { display: none !important; }
          .main-wrapper { margin-left: 0 !important; }
          button { display: none !important; }
          body { font-size: 11pt; }
        }
      `}</style>
    </div>
  );
}
