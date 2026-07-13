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
  { step: 6,  action: 'Attendance',       detail: 'Attendance → Mark class حاضری → show auto-SMS to parents toggle (03XX numbers)', time: '2 min' },
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
    desc: 'Admission se leaving tak — poora cycle ek jagah',
    chapters: [
      {
        title: 'Workflow Hub kya hai?',
        steps: [
          { n:1, text:'Dashboard pe "🔄 Smart Workflow Hub" banner click karo, ya sidebar mein "Smart Workflow Hub" link' },
          { n:2, text:'5 complete workflows: New Admission, Daily Routine, Exam Cycle, Class Promotion, Student Leaving' },
          { n:3, text:'Har workflow mein step-by-step cards hain — har step pe Direct Action Button hai' },
          { n:4, text:'"Mark Done ✓" button dabao — progress bar update hogi, next step highlight hoga' },
          { n:5, text:'Koi alag Hub pe jaane ki zaroorat nahi — sab kuch ek jagah milta hai' },
        ],
        tip: 'Client demo ke liye Workflow Hub sabse pehle dikhaiye — clients immediately samajh jaate hain system ka flow.',
      },
      {
        title: 'New Admission Flow (Admission)',
        steps: [
          { n:1, text:'Inquiry → CRM mein lead banao (Admissions → CRM)' },
          { n:2, text:'Admit → Wizard se poori detail bharo (Admissions → Admit Student)' },
          { n:3, text:'Fee Structure → Class ka fee assign karo (Fees → Structure)' },
          { n:4, text:'Voucher → Pehla fee voucher generate + print karo (Fees → Generate)' },
          { n:5, text:'ID Card → Student ka ID card + gate pass print karo' },
          { n:6, text:'Portal → Parent + student portal credentials email/SMS karo' },
          { n:7, text:'Welcome SMS → Parent ke 03XX number pe welcome message chala jaata hai' },
        ],
        note: 'Auto roll number aur registration number wizard complete hote hi generate ho jaata hai.',
      },
      {
        title: 'Daily Routine Flow',
        steps: [
          { n:1, text:'Attendance (حاضری) → Class-wise mark karo, absent parents ko auto-SMS' },
          { n:2, text:'Homework Diary → Aaj ka homework enter karo — parent portal pe live' },
          { n:3, text:'Fee Collection → Counter/POS pe fees receive karo, receipt print' },
          { n:4, text:'Notifications → Koi announcement ya alert bhejo' },
          { n:5, text:'Day Close → Daily balance sheet review karke din band karo' },
        ],
        tip: 'Daily Routine card teacher aur accountant dono ke roz ke kaam ek screen pe daal deta hai.',
      },
      {
        title: 'Exam, Promotion & Leaving Flows',
        steps: [
          { n:1, text:'Exam Cycle → Create exam → Timetable → Enter marks → BISE result card → Merit list → Gazette' },
          { n:2, text:'Class Promotion → Session end pe poori class ko next class mein promote karo' },
          { n:3, text:'Promotion ke waqt roll numbers re-assign aur naye fee structure attach hote hain' },
          { n:4, text:'Student Leaving → Leaving certificate, dues clearance, portal deactivate' },
          { n:5, text:'Leaving pe outstanding fees ka clearance check hota hai — pending dues warn karta hai' },
        ],
        warning: 'Class Promotion ek baar chalane ke baad undo mushkil hai — pehle DB backup zaroor lein (Settings → Backup).',
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
    desc: 'Registration, onboarding aur login — pehla din',
    chapters: [
      {
        title: 'School Registration',
        steps: [
          { n:1, text:'ilmforge-erp.vercel.app pe jao → "Register School" click karo' },
          { n:2, text:'School ka naam, city, address aur admin ka naam bharo' },
          { n:3, text:'Admin email aur phone (03XXXXXXXXX) do — yeh super-admin ban jaayega' },
          { n:4, text:'Password strong rakho (8+ characters, ek number + ek capital)' },
          { n:5, text:'"Create School" dabao — tumhara alag school workspace ban jaata hai' },
        ],
        note: 'Har school ka data alag (multi-tenant) hota hai — dusre schools ka data kabhi mix nahi hota.',
      },
      {
        title: 'Onboarding Wizard (Pehli Setup)',
        steps: [
          { n:1, text:'Pehli baar login pe onboarding wizard khulta hai' },
          { n:2, text:'School profile: logo upload, address, phone, current session (2025-2026)' },
          { n:3, text:'Classes banao: Play Group se Matric tak, sections (A/B/C) ke saath' },
          { n:4, text:'Fee structure: har class ka monthly fee (e.g. Rs. 3,500), admission fee (Rs. 5,000)' },
          { n:5, text:'Staff add karo: kam se kam ek accountant aur ek teacher' },
          { n:6, text:'"Finish Setup" pe dashboard ready ho jaata hai' },
        ],
        tip: 'Onboarding skip bhi kar sakte ho — baad mein Settings se sab configure ho jaata hai.',
      },
      {
        title: 'Login & Roles',
        steps: [
          { n:1, text:'Login page pe email + password dalo' },
          { n:2, text:'Role ke hisaab se alag portal khulta hai (Admin, Accountant, Teacher, Parent, Student, Gatekeeper)' },
          { n:3, text:'"Forgot Password" → registered email pe reset link jaata hai' },
          { n:4, text:'Admin dusre users ke passwords Settings → Users se reset kar sakta hai' },
        ],
        warning: 'Default admin password pehli login ke baad zaroor change karein.',
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
    desc: 'طلباء — classes, admission wizard, gate pass, CRM, promotion',
    chapters: [
      {
        title: 'Classes & Sections Setup',
        steps: [
          { n:1, text:'Academics → Classes (ya /academics/classes)' },
          { n:2, text:'"Add Class" → class ka naam (Nursery, One, Two ... Matric)' },
          { n:3, text:'Sections add karo: A, B, C — har section ka class teacher assign karo' },
          { n:4, text:'Har class ka fee structure link karo' },
          { n:5, text:'Subjects assign karo — result card in par based hoga' },
        ],
        note: 'Classes pehle banayen, phir admission — kyunki admission wizard class + section maangta hai.',
      },
      {
        title: 'Admission Wizard (Live Camera)',
        steps: [
          { n:1, text:'Admissions → Admit Student → step-by-step wizard' },
          { n:2, text:'Student detail: naam, B-Form/CNIC, DOB, gender, class + section' },
          { n:3, text:'Parent/Guardian detail: naam, CNIC, phone (03XXXXXXXXX), occupation' },
          { n:4, text:'Photo: "Use Camera" se live webcam se photo capture karo, ya file upload' },
          { n:5, text:'Documents: B-Form, previous school certificate scan attach karo' },
          { n:6, text:'Review → Submit → auto roll number + registration number generate' },
          { n:7, text:'Turant ID card aur pehla fee voucher print ho sakta hai' },
        ],
        tip: 'Live camera se photo lete hi ID card aur portal profile pe same photo lag jaati hai.',
      },
      {
        title: 'Gate Passes (QR)',
        steps: [
          { n:1, text:'Students → Gate Pass (ya /gatepass)' },
          { n:2, text:'Student select karo → reason (early leave, half-day, visitor pickup)' },
          { n:3, text:'"Generate Pass" → QR code wala gate pass ban jaata hai' },
          { n:4, text:'Gatekeeper portal pe QR scan karke pass verify hota hai' },
          { n:5, text:'Har pass ki timestamp + issuing staff log hoti hai' },
        ],
        note: 'Gate pass QR sirf ek baar valid hota hai — dobara scan pe "already used" dikhata hai.',
      },
      {
        title: 'Student CRM & Promotion',
        steps: [
          { n:1, text:'Admissions → CRM: inquiry leads (New → Contacted → Visited → Admitted/Lost)' },
          { n:2, text:'Follow-up notes aur reminders lagao — conversion rate track hoti hai' },
          { n:3, text:'"Convert to Admitted" seedha admission wizard khol deta hai' },
          { n:4, text:'Promotion: Academics → Promote Class → session end pe poori class next mein' },
          { n:5, text:'Fail/repeat students ko promotion se exclude kar sakte ho' },
        ],
        warning: 'Promotion se pehle sab exam results aur fee dues finalize kar lein.',
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
          { n:1, text:'Fees → Structure (ya /fees/structure)' },
          { n:2, text:'Class select karo → heads add karo: Tuition (Rs. 3,500), Admission (Rs. 5,000), Exam (Rs. 800), Transport (Rs. 2,000)' },
          { n:3, text:'Monthly / quarterly / annual frequency set karo' },
          { n:4, text:'Sibling discount ya scholarship % lagao' },
          { n:5, text:'Save — yeh structure class ke sab students pe apply hota hai' },
        ],
        note: 'Fee heads ek baar bana ke sab classes mein reuse kar sakte ho.',
      },
      {
        title: 'Generate & Collect',
        steps: [
          { n:1, text:'Fees → Generate → month select karo → class ya whole school ke vouchers generate' },
          { n:2, text:'Fees → Collect → student search (naam/roll) → outstanding amount dikhta hai' },
          { n:3, text:'Payment mode: Cash / Bank / Card / Wallet / Online' },
          { n:4, text:'Partial payment allowed — baaki balance carry forward hoti hai' },
          { n:5, text:'Receipt print + auto-SMS parent ko "Rs. X received" confirmation' },
        ],
        tip: 'Late fee auto-add ho sakti hai (e.g. Rs. 100/day) agar due date miss ho — Settings → Fees se on karo.',
      },
      {
        title: '3-Copy Voucher',
        steps: [
          { n:1, text:'Fees → Generate → student ya class select → "Print Voucher"' },
          { n:2, text:'Voucher 3 copies pe print hota hai: Bank Copy, School Copy, Parent Copy' },
          { n:3, text:'Bank details voucher pe print (HBL / UBL account number + branch)' },
          { n:4, text:'Barcode/challan number se bank counter reconciliation aasan' },
          { n:5, text:'Due date, late fee warning aur QR bhi voucher pe hota hai' },
        ],
        note: 'Voucher pe school ka logo + theme color automatically aata hai (Settings → School Profile).',
      },
      {
        title: 'EMI, Parent Wallet & Online Payment',
        steps: [
          { n:1, text:'EMI: bari fees (admission + annual) ko 3-6 installments mein todo — Fees → EMI Plan' },
          { n:2, text:'Parent Wallet: parent advance amount jama kar sakta hai, fees usme se auto-deduct' },
          { n:3, text:'Wallet top-up parent portal se online ya counter pe cash se' },
          { n:4, text:'Online Payment: parent portal se card/bank transfer se fee pay (payment gateway)' },
          { n:5, text:'Har online transaction receipt + SMS confirmation deta hai' },
        ],
        tip: 'Parent Wallet se multiple bachon ki fees ek balance se manage hoti hai — parents ko bohot pasand aata hai.',
      },
      {
        title: 'Defaulters',
        steps: [
          { n:1, text:'Fees → Defaulters (ya /fees/defaulters)' },
          { n:2, text:'Overdue students ki list: naam, class, outstanding amount, days overdue' },
          { n:3, text:'Filter: class-wise, amount-wise, month-wise' },
          { n:4, text:'"Send Reminder" → bulk SMS/WhatsApp defaulter parents ko' },
          { n:5, text:'Export Excel/PDF → principal review ke liye' },
        ],
        warning: 'Bulk reminder bhejne se pehle list review karein — jo pay kar chuke hain unko galti se message na jaaye.',
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
          { n:3, text:'Classes + subjects select karo, total + passing marks set karo' },
          { n:4, text:'Timetable: har subject ki date, time, duration add karo' },
          { n:5, text:'Timetable print + portals pe publish (students/parents dekh sakte hain)' },
        ],
      },
      {
        title: 'Enter Marks',
        steps: [
          { n:1, text:'Exams → Enter Marks → exam + class + subject select' },
          { n:2, text:'Class list grid mein har student ke marks enter karo' },
          { n:3, text:'Absent students ko "AB" mark karo' },
          { n:4, text:'System auto grade lagata hai (A+, A, B, C ...) aur pass/fail' },
          { n:5, text:'Teacher portal se subject teacher apne subject ke marks bhi daal sakta hai' },
        ],
        tip: 'Excel se bulk marks import bhi ho sakta hai — bare classes ke liye time bachta hai.',
      },
      {
        title: 'BISE Result Card',
        steps: [
          { n:1, text:'Exams → Result Card → student ya class select' },
          { n:2, text:'BISE-style card: subject-wise marks, total, percentage, grade, position' },
          { n:3, text:'School logo, principal signature space, remarks auto-print' },
          { n:4, text:'Batch print: poori class ke result cards ek saath' },
          { n:5, text:'Parent portal pe result card download available' },
        ],
        note: 'Result card ka format BISE boards (Lahore/Rawalpindi) jaise official cards se milta-julta hai.',
      },
      {
        title: 'Merit List & Gazette',
        steps: [
          { n:1, text:'Exams → Merit List → exam + class select → top students by percentage' },
          { n:2, text:'Position 1st, 2nd, 3rd highlight — prize distribution ke liye' },
          { n:3, text:'Gazette: poore school ka consolidated result sheet (all classes)' },
          { n:4, text:'Gazette print/export — record aur notice board ke liye' },
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
          { n:1, text:'Staff → Add Staff (ya /staff/add)' },
          { n:2, text:'Detail: naam, CNIC, phone (03XXXXXXXXX), designation, joining date' },
          { n:3, text:'Role assign: Teacher / Accountant / Admin / Gatekeeper / Support' },
          { n:4, text:'Teacher ho to classes + subjects assign karo' },
          { n:5, text:'Portal login credentials auto-generate ho ke email/SMS' },
        ],
      },
      {
        title: 'Salary Management',
        steps: [
          { n:1, text:'Staff → Salary → month select' },
          { n:2, text:'Basic + allowances (house, transport) minus deductions (loan, absence)' },
          { n:3, text:'e.g. Basic Rs. 45,000 + Allowance Rs. 8,000 − Deduction Rs. 2,000 = Rs. 51,000' },
          { n:4, text:'Payslip generate + print, staff portal pe available' },
          { n:5, text:'Bank transfer sheet export (HBL/UBL bulk salary)' },
        ],
        tip: 'Absence deduction attendance module se auto-calculate ho sakti hai.',
      },
      {
        title: 'Staff Attendance & Appraisals',
        steps: [
          { n:1, text:'Staff → Attendance → daily present/absent/leave mark' },
          { n:2, text:'Biometric device se auto attendance sync (Settings → Biometric)' },
          { n:3, text:'Leave application staff portal se — admin approve/reject' },
          { n:4, text:'Appraisals: Staff → Appraisals → performance rating + remarks' },
          { n:5, text:'Annual appraisal report increment decision ke liye' },
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
          { n:2, text:'Bulk credentials generate: class-wise students/parents' },
          { n:3, text:'"Email Credentials" ya "SMS Credentials" — 03XX numbers pe login bhejo' },
          { n:4, text:'Parent username usually child ka registration number hota hai' },
          { n:5, text:'Reset password kabhi bhi admin se possible' },
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
          { n:2, text:'Parent: child ki fees + dues, attendance, results, homework, notices, wallet' },
          { n:3, text:'Student: homework, results, timetable, announcements, attendance' },
          { n:4, text:'Accountant: fee collection, defaulters, financial reports, POS' },
          { n:5, text:'Gatekeeper: barcode attendance + QR gate pass verify only (limited access)' },
        ],
        note: 'Gatekeeper portal minimal hai — sirf entry log aur pass verification, koi financial ya student data nahi.',
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
          { n:1, text:'Communication → SMS → recipients select (class / defaulters / custom)' },
          { n:2, text:'Message type: attendance alert, fee reminder, announcement, result' },
          { n:3, text:'Pakistani numbers format 03XXXXXXXXX automatically validate hote hain' },
          { n:4, text:'Template pick karo ya custom message likho' },
          { n:5, text:'Send → delivery report (sent/failed) dikhti hai' },
        ],
      },
      {
        title: 'WhatsApp — 5 Types',
        steps: [
          { n:1, text:'Type 1: Attendance — "Aap ka bacha aaj absent tha (حاضری alert)"' },
          { n:2, text:'Type 2: Fee Reminder — "Rs. 3,500 due, please clear by 10th"' },
          { n:3, text:'Type 3: Result — result card link/summary parent ko' },
          { n:4, text:'Type 4: Announcement — holiday, event, PTM notices' },
          { n:5, text:'Type 5: Homework — aaj ka homework parent WhatsApp pe' },
        ],
        tip: 'WhatsApp templates approved hote hain taake delivery reliable rahe.',
      },
      {
        title: 'Email, Push & Templates',
        steps: [
          { n:1, text:'Email: Brevo integration se bulk email (credentials, reports, receipts)' },
          { n:2, text:'Push notifications portal pe login users ko real-time alerts' },
          { n:3, text:'Templates: Communication → Templates → reusable SMS/WhatsApp/Email banao' },
          { n:4, text:'Placeholders: {student_name}, {amount}, {due_date}, {class}' },
          { n:5, text:'Sent history + delivery logs audit ke liye rehte hain' },
        ],
        note: 'Brevo (pehle Sendinblue) email delivery ke liye use hota hai — HBL/UBL voucher emails bhi isi se jaate hain.',
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
          { n:4, text:'Every report Print + Export (PDF/Excel) support karta hai' },
          { n:5, text:'Date range + class + section filters har report pe' },
        ],
      },
      {
        title: 'Student Info & Attendance Calendar',
        steps: [
          { n:1, text:'Reports → Student Info → complete profile: personal, parent, fee, exam, attendance' },
          { n:2, text:'Reports → Attendance Calendar → student + year select' },
          { n:3, text:'12-month grid: P=Present (green), A=Absent (red), L=Leave (yellow), H=Holiday (purple)' },
          { n:4, text:'Monthly + yearly totals auto-calculate' },
          { n:5, text:'"Print Calendar" → BISE-style annual attendance with signature spaces' },
        ],
        tip: 'Attendance calendar report parent-teacher meetings mein bohot kaam aati hai.',
      },
      {
        title: 'Defaulters & Financial Reports',
        steps: [
          { n:1, text:'Reports → Defaulters → outstanding by class/amount/days overdue' },
          { n:2, text:'Daily Balance Sheet: din ki total collection, mode-wise (cash/bank/online)' },
          { n:3, text:'Fee Collection report: month-wise trend + comparison' },
          { n:4, text:'Export Excel → accountant reconciliation aur audit ke liye' },
          { n:5, text:'Principal dashboard pe key reports summary widgets' },
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
          { n:2, text:'Batch print poori class ke result cards ek click mein' },
          { n:3, text:'Homework Diary: Teacher portal → daily homework subject-wise enter' },
          { n:4, text:'Homework live parent + student portal pe dikhta hai' },
          { n:5, text:'WhatsApp/SMS se homework parents tak auto pohanch sakta hai' },
        ],
      },
      {
        title: 'POS & Parent Wallet',
        steps: [
          { n:1, text:'POS: Accounting → POS → quick-sale counter (books, uniforms, stationery)' },
          { n:2, text:'Item scan/select → quantity → total → receipt print' },
          { n:3, text:'POS sale student account ya wallet se link ho sakti hai' },
          { n:4, text:'Parent Wallet: advance balance, fees + POS auto-deduct' },
          { n:5, text:'Wallet statement parent portal pe — har transaction visible' },
        ],
        tip: 'POS + Wallet combo se book shop aur canteen bhi ek system mein aa jaate hain.',
      },
      {
        title: 'Admin Permissions & Website Management',
        steps: [
          { n:1, text:'Settings → Admin Permissions → granular role-based access control' },
          { n:2, text:'Har module ke liye view/edit/delete permissions per role set karo' },
          { n:3, text:'Website Management: school ka public website content edit' },
          { n:4, text:'9 color themes + custom color + logo, about, facilities, gallery' },
          { n:5, text:'"Save Changes" → website + portals + documents pe branding update' },
        ],
        note: 'Website theme color change karte hi vouchers, ID cards aur portals sab pe branding update hoti hai.',
      },
      {
        title: 'Academic Calendar',
        steps: [
          { n:1, text:'Settings → Academic Calendar → session dates, terms, holidays' },
          { n:2, text:'Public holidays (14 August, Eid, etc.) + school events mark karo' },
          { n:3, text:'Holidays attendance calendar mein H (purple) dikhte hain' },
          { n:4, text:'Events portals + notices pe publish' },
          { n:5, text:'Exam dates calendar se timetable pe link ho sakte hain' },
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
          { n:2, text:'Naam, address, city, phone (03XXXXXXXXX), email, website' },
          { n:3, text:'Logo upload + theme color (9 presets ya custom)' },
          { n:4, text:'Current session (2025-2026) aur currency (Rs. / PKR)' },
          { n:5, text:'Save → sab documents (vouchers, cards, reports) pe branding apply' },
        ],
      },
      {
        title: 'Database Backup',
        steps: [
          { n:1, text:'Settings → Backup → "Create Backup Now"' },
          { n:2, text:'Full DB snapshot download (JSON/SQL) — safe location pe rakho' },
          { n:3, text:'Scheduled auto-backup daily/weekly set kar sakte ho' },
          { n:4, text:'"Restore" se backup wapas load (careful — current data replace)' },
          { n:5, text:'Har bare operation (promotion, session close) se pehle backup lo' },
        ],
        warning: 'Restore current data overwrite karta hai — restore se pehle current ka bhi backup lein.',
      },
      {
        title: 'SOPs, Biometric & Admin Roles',
        steps: [
          { n:1, text:'SOPs: Settings → SOPs → standard operating procedures documents store' },
          { n:2, text:'Biometric: Settings → Biometric → device connect for staff/student attendance' },
          { n:3, text:'Admin Roles: multiple admins with scoped permissions banao' },
          { n:4, text:'Audit log: kis user ne kya change kiya — accountability ke liye' },
          { n:5, text:'Users: reset password, deactivate, re-assign roles' },
        ],
        tip: 'Biometric attendance staff salary deduction ko fully automate kar deti hai.',
      },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════
   ROLE QUICK START (6 roles)
═══════════════════════════════════════════════════════════ */
const ROLE_QUICK_START = [
  { role: 'Admin',      color: '#0F766E', path: '/dashboard',           bullets: ['Smart Workflow Hub se start karo', 'Classes, fees, staff configure karo', 'Settings aur portals manage karo'] },
  { role: 'Accountant', color: '#1D4ED8', path: '/accountant-portal',   bullets: ['Fees collect aur post karo (POS)', 'Defaulters aur reminders track karo', 'Daily balance sheet run karo'] },
  { role: 'Teacher',    color: '#7C3AED', path: '/teacher-portal',      bullets: ['حاضری (attendance) mark karo', 'Marks aur homework diary enter karo', 'Class materials share karo'] },
  { role: 'Parent',     color: '#D97706', path: '/parent-portal',       bullets: ['Child ki fees aur dues dekho', 'Attendance + results track karo', 'Wallet top-up karo, notices parho'] },
  { role: 'Student',    color: '#0891B2', path: '/student-portal',      bullets: ['Homework aur results check karo', 'Timetable + announcements dekho', 'Attendance dekho'] },
  { role: 'Gatekeeper', color: '#B91C1C', path: '/gatekeeper-portal',   bullets: ['Barcode attendance sirf', 'QR gate pass verify karo', 'Live daily entry log'] },
];

/* ═══════════════════════════════════════════════════════════
   OPERATIONAL CHECKLIST (8 items)
═══════════════════════════════════════════════════════════ */
const OPERATIONAL_CHECKLIST = [
  'School Profile complete — logo, address, phone (03XXXXXXXXX), session 2025-2026',
  'Sab classes + sections banaye aur class teachers assign hue',
  'Har class ka fee structure set (Tuition Rs. 3,500, Admission Rs. 5,000, etc.)',
  'Bank details configured for vouchers (HBL / UBL account + branch)',
  'Staff added with roles — kam se kam ek accountant + teachers',
  'Portal credentials generate + email/SMS ho gaye (parents + staff)',
  'SMS/WhatsApp/Email (Brevo) gateway test message deliver ho gaya',
  'Pehla DB backup liya gaya (Settings → Backup) aur safe location pe rakha',
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
            💡 <strong>Demo Tip:</strong> Pehle Workflow Hub dikhaiye — clients seedha samajh jaate hain system ka flow. Phir live admission wizard (camera photo) run karo — sabse zyada impress karta hai.
          </div>
        </div>
      )}

      {/* ── Search ── */}
      <div style={{ position:'relative', marginBottom:20 }}>
        <Search size={16} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#94A3B8' }}/>
        <input className="form-input" style={{ paddingLeft:42, fontSize:14, height:46, width:'100%' }}
          placeholder="Search any feature, step, or topic (e.g. voucher, حاضری, wallet)..."
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
          Koi result nahi mila "<strong>{search}</strong>" ke liye. Doosra keyword try karo.
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{ background:'#F8FAFC', border:'1px solid #E5E7EB', borderRadius:12, padding:'20px 24px', textAlign:'center', marginTop:16 }}>
        <div style={{ fontSize:20, marginBottom:6 }}>🎓 🇵🇰</div>
        <div style={{ fontWeight:800, color:'#1E3A5F', fontSize:15 }}>IlmForge School Management System</div>
        <div style={{ fontSize:12, color:'#6B7280', marginTop:6 }}>
          Pakistan ka #1 School ERP · Made in Pakistan · Live: <strong>https://ilmforge-erp.vercel.app</strong>
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
