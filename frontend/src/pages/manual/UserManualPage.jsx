/**
 * IlmForge — Complete User Manual v3.4
 * Updated: BISE Result Cards, Homework Diary, POS, Parent Wallet,
 * Admin Permissions, Website Management, WhatsApp Types, Annual Calendar
 */
import { useState } from 'react';
import {
  BookOpen, CheckCircle, AlertTriangle, Info, Printer,
  Search, ChevronDown, ChevronRight, Users, DollarSign,
  Award, Settings, Phone, Star, Zap, PlayCircle,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   DEMO SCRIPT — for client presentations
═══════════════════════════════════════════════════════════ */
const DEMO_SCRIPT = [
  { step: 1, action: 'Login', detail: 'Go to ilmforge-erp.vercel.app → Login as Admin', time: '1 min' },
  { step: 2, action: 'Dashboard Tour', detail: 'Show Smart Workflow Hub banner → KPI cards → Recent Activity', time: '2 min' },
  { step: 3, action: 'Workflow Hub', detail: 'Click 🔄 Smart Workflow Hub → show New Admission cycle step by step', time: '3 min' },
  { step: 4, action: 'Admit Student', detail: 'Admissions → Wizard → Fill form → Show auto roll number', time: '3 min' },
  { step: 5, action: 'Fee Voucher', detail: 'Fees → Generate → Print 3-copy voucher (Bank/School/Parent)', time: '2 min' },
  { step: 6, action: 'Attendance', detail: 'Attendance → Mark class → Show auto-SMS to parents toggle', time: '2 min' },
  { step: 7, action: 'Exam & Result', detail: 'Exams Hub → Create exam → Enter marks → View result + Merit List', time: '3 min' },
  { step: 8, action: 'ID Cards', detail: 'Students → ID Cards → Print with school logo & QR code', time: '1 min' },
  { step: 9, action: 'Parent Portal', detail: 'Portal Management → Email credentials → Show parent view', time: '2 min' },
  { step: 10, action: 'Reports', detail: 'Reports → Daily balance sheet → Fee defaulters → Export Excel', time: '2 min' },
];

/* ═══════════════════════════════════════════════════════════
   MANUAL SECTIONS
═══════════════════════════════════════════════════════════ */
const SECTIONS = [
  /* ──────────────────────────────────────────
     0. SMART WORKFLOW HUB (NEW)
  ────────────────────────────────────────── */
  {
    id: 'workflow',
    icon: '🔄',
    color: '#1B2F6E',
    title: 'Smart Workflow Hub',
    desc: 'Admission se leaving tak — poora cycle ek jagah (NEW in v3.3)',
    chapters: [
      {
        title: 'Workflow Hub kya hai?',
        steps: [
          { n:1, text:'Dashboard pe "🔄 Smart Workflow Hub" banner click karo, ya sidebar mein "Smart Workflow Hub" link' },
          { n:2, text:'5 complete workflows mile hue hain: New Admission, Daily Routine, Exam Cycle, Class Promotion, Student Leaving' },
          { n:3, text:'Har workflow mein step-by-step cards hain — har step pe Direct Action Button hai' },
          { n:4, text:'"Mark Done ✓" button dabao — progress bar update hogi, next step highlight hoga' },
          { n:5, text:'Koi alag Hub pe jane ki zaroorat nahi — sab kuch ek jagah milta hai' },
        ],
        tip: 'Client demo ke liye: Workflow Hub sabse pehle dikhaiye — clients immediately samajh jaate hain system ka flow.',
      },
      {
        title: 'New Admission Flow (7 Steps)',
        steps: [
          { n:1, text:'Inquiry → CRM mein lead banao (Admissions → CRM)' },
          { n:2, text:'Admit → Wizard se poori detail bharo (Admissions → Admit Student)' },
          { n:3, text:'Fee Structure → Class ka fee assign karo (Fees → Structure)' },
          { n:4, text:'Voucher → Pehla fee voucher generate + print karo (Fees → Generate)' },
          { n:5, text:'ID Card → Photo upload, card print karo (Students → ID Cards)' },
          { n:6, text:'Parent Portal → Parent ko login credentials bhejo (Portal Management)' },
          { n:7, text:'Welcome SMS → Parent ko school info SMS bhejo (Notifications → SMS)' },
        ],
        tip: 'Workflow Hub → "New Admission" tab se in sab steps ke direct links milte hain.',
      },
      {
        title: 'Daily Routine Flow (6 Steps)',
        steps: [
          { n:1, text:'Attendance → Subah attendance mark karo (Attendance page)' },
          { n:2, text:'Fees Collect → Aane wale students ki fees receive karo (Fees → Collect)' },
          { n:3, text:'Defaulters → Due fees wale students ki list check karo (Fees → Defaulters)' },
          { n:4, text:'Parent SMS → Absent students ke parents ko reminder bhejo (Notifications → SMS)' },
          { n:5, text:'Homework → Teachers homework assign karein (Homework page)' },
          { n:6, text:'Announcements → School notice post karo (Announcements page)' },
        ],
      },
      {
        title: 'Student Leaving Flow (6 Steps)',
        steps: [
          { n:1, text:'Fee Clearance → Saari pending fees clear karwao (Fees → Defaulters)' },
          { n:2, text:'Gate Pass → Final QR gate pass issue karo (Gate Passes page)' },
          { n:3, text:'Leaving Certificate → Official LC generate karo (Certificates)' },
          { n:4, text:'Transfer Certificate → Doosre school ke liye TC issue karo (Certificates)' },
          { n:5, text:'Alumni → Student ko alumni database mein add karo (Alumni page)' },
          { n:6, text:'Archive → Student ko inactive mark karo — data safe rahega (Students)' },
        ],
        warning: 'Fee clearance kiye baghair certificate issue mat karo.',
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
    desc: 'Register, verify, and set up your school',
    chapters: [
      {
        title: 'Register Your School',
        steps: [
          { n:1, text:'Go to https://ilmforge-erp.vercel.app and click "Register Your School — Free"' },
          { n:2, text:'Enter: School Name, Your Name, Email Address, Phone Number' },
          { n:3, text:'Click Submit — password is AUTO-GENERATED and sent to your email' },
          { n:4, text:'Check email for 6-digit OTP verification code' },
          { n:5, text:'Enter OTP on the verification page' },
          { n:6, text:'After verification, "School Ready" email arrives with your Login URL and password' },
        ],
        tip: 'Your unique school login URL: https://ilmforge-erp.vercel.app/login?slug=your-school-name — share this with all staff.',
        note: 'Save your password from the email immediately. Change it in My Profile → Change Password after first login.',
      },
      {
        title: 'Complete Onboarding (5 Steps)',
        steps: [
          { n:1, text:'Step 1 — Branding: Upload school logo and choose color theme' },
          { n:2, text:'Step 2 — School Info: Enter address, city, phone, email, motto' },
          { n:3, text:'Step 3 — Classes: Add your class structure (Nursery, KG, Class 1–10)' },
          { n:4, text:'Step 4 — Fee & Staff: Set monthly fee per class, add first teacher' },
          { n:5, text:'Step 5 — All Set! Credentials popup shows Login URL, Email, Password' },
        ],
        warning: 'Step 5 mein jo credentials popup aata hai uska screenshot lo ya copy karo — ye popup sirf ek baar dikhta hai.',
      },
      {
        title: 'Login to the System',
        steps: [
          { n:1, text:'Go to https://ilmforge-erp.vercel.app/login' },
          { n:2, text:'Enter your registered Email and Password' },
          { n:3, text:'Click Sign In — Dashboard khulega' },
          { n:4, text:'Sidebar mein 🔄 Smart Workflow Hub pe click karo — complete guide wahan milegi' },
        ],
        tip: 'Demo credentials: admin@demo.com / Admin@123 (for testing only)',
      },
    ],
  },

  /* ──────────────────────────────────────────
     2. STUDENT MANAGEMENT
  ────────────────────────────────────────── */
  {
    id: 'students',
    icon: '👨‍🎓',
    color: '#2563EB',
    title: 'Student Management',
    desc: 'Admission se promotion aur leaving tak — poora lifecycle',
    chapters: [
      {
        title: 'Step 1: Classes & Sections Setup (PEHLE KARO)',
        steps: [
          { n:1, text:'Settings → Classes & Sections' },
          { n:2, text:'"Add New Class" → Class name (e.g. "Class 5"), order number, monthly tuition fee' },
          { n:3, text:'Har class mein sections add karo (Section A, B, C)' },
          { n:4, text:'Saari classes ke liye repeat karo' },
        ],
        warning: 'Classes setup kiye baghair students admit nahi ho sakte — yeh PEHLA kaam hai.',
      },
      {
        title: 'Step 2: Admit a Student (Wizard)',
        steps: [
          { n:1, text:'Admissions → Admit Student OR Dashboard → "Add Students" button' },
          { n:2, text:'Student Name*, Father Name*, Date of Birth, Gender bharo' },
          { n:3, text:'Campus, Class, Section select karo dropdown se' },
          { n:4, text:'Father Phone*, Father Email, Father CNIC (dashes ke baghair), Home Address' },
          { n:5, text:'Student Photo upload karo (ID card ke liye zaroor karo)' },
          { n:6, text:'"Admit Student" click karo — Roll Number AUTO-GENERATE hoga (e.g. C5A-26-001)' },
        ],
        tip: 'Roll Number format: {ClassCode}{Section}-{Year}-{Sequence}. Yeh roll number ID card aur fee voucher pe print hoga.',
      },
      {
        title: 'Admissions CRM — Lead Pipeline',
        steps: [
          { n:1, text:'Admissions → CRM (ya sidebar mein Admissions CRM)' },
          { n:2, text:'"Add Lead" → student name, parent name, phone, class applied, source (walk-in/referral)' },
          { n:3, text:'Lead automatically "New" stage mein aata hai' },
          { n:4, text:'Stage change karo: New → Contacted → Visited → Admitted / Lost' },
          { n:5, text:'"Follow-Up" button se reminder note add karo' },
          { n:6, text:'"Convert to Student" button se directly admission wizard khulta hai' },
        ],
        tip: 'CRM se track hota hai kitne inquiries aaye, kitne admit hue — admission efficiency improve hoti hai.',
      },
      {
        title: 'Bulk Student Import (Excel)',
        steps: [
          { n:1, text:'Students → Bulk Import (ya sidebar mein)' },
          { n:2, text:'"Download Template" se Excel format lo' },
          { n:3, text:'Excel mein saare students ki info bharo' },
          { n:4, text:'File upload karo → Preview dekho' },
          { n:5, text:'"Import" click karo — sab students ek baar mein add ho jaate hain' },
        ],
        tip: 'Naye school ke liye ya session change ke liye bulk import bohot fast hai — 500+ students ek baar.',
      },
      {
        title: 'Daily Attendance',
        steps: [
          { n:1, text:'Attendance → Mark Attendance' },
          { n:2, text:'Class, Section, Date select karo' },
          { n:3, text:'Har student: Present / Absent / Late / Leave mark karo' },
          { n:4, text:'"Notify Parents of Absent Students" toggle ON karo — auto SMS/WhatsApp jaayega' },
          { n:5, text:'"Save Attendance" click karo' },
        ],
        tip: 'Barcode attendance ke liye: Attendance → Barcode Scan — student ka ID card scan karo, attendance auto-mark hogi.',
      },
      {
        title: 'Gate Passes (QR Based)',
        steps: [
          { n:1, text:'Gate Passes page (sidebar ya /gate-passes)' },
          { n:2, text:'Student name search karo (2+ characters type karo)' },
          { n:3, text:'Student select karo → Parent name aur Reason bharo' },
          { n:4, text:'"Issue Gate Pass" click karo — QR code generate hoga' },
          { n:5, text:'QR code print karo ya parent ko dikhaao' },
          { n:6, text:'Gatekeeper portal pe scan karo exit verify karne ke liye' },
        ],
        tip: 'Gatekeeper portal pe verify karne se audit trail automatically banta hai.',
      },
      {
        title: 'Student Promotion',
        steps: [
          { n:1, text:'Students → Student Promotion' },
          { n:2, text:'Class aur section select karo' },
          { n:3, text:'Passed students automatically select hote hain' },
          { n:4, text:'New Class select karo → "Promote Selected Students"' },
          { n:5, text:'Failed ya detained students alag rakho' },
        ],
      },
      {
        title: 'Student Leaving / Pass-out',
        steps: [
          { n:1, text:'Pehle Fees → Defaulters check karo — balance clear karo' },
          { n:2, text:'Gate Passes → Final gate pass issue karo' },
          { n:3, text:'Certificates → Issue Leaving Certificate + TC (Transfer Certificate)' },
          { n:4, text:'Alumni → Add to Alumni database' },
          { n:5, text:'Students → Student profile → Status → "Pass-out" set karo' },
        ],
        warning: 'Outstanding fees clear hone ke baad hi certificate issue karo.',
      },
    ],
  },

  /* ──────────────────────────────────────────
     3. FEE MANAGEMENT
  ────────────────────────────────────────── */
  {
    id: 'fees',
    icon: '💰',
    color: '#15803D',
    title: 'Fee Management',
    desc: 'Generate, collect, vouchers, EMI plans aur defaulters',
    chapters: [
      {
        title: 'Fee Structure Setup',
        steps: [
          { n:1, text:'Fees → Fee Structure' },
          { n:2, text:'Har class ka monthly tuition fee set hai (class create karte waqt set hota hai)' },
          { n:3, text:'Update karne ke liye: class row mein "Edit" click karo → new amount enter karo' },
        ],
      },
      {
        title: 'Generate Monthly Fee',
        steps: [
          { n:1, text:'Fees → Generate Fee' },
          { n:2, text:'Campus → Class → Section → Fee Month → Year select karo' },
          { n:3, text:'Due Date set karo (e.g. aglay mahine ki 10 tarikh)' },
          { n:4, text:'Late Fee amount optionally set karo' },
          { n:5, text:'Transport Fee tick karo agar school van use kar rahe hain' },
          { n:6, text:'"Generate Fee 👍" click karo — saare students ke invoices ban jaate hain' },
        ],
        warning: 'Ek mahine mein fee sirf ek baar generate hoti hai. Month start hone se pehle generate karo.',
      },
      {
        title: 'Collect Fee Payment',
        steps: [
          { n:1, text:'Fees → Fee Collection' },
          { n:2, text:'Student name ya roll number search karo' },
          { n:3, text:'Student select karo → unpaid invoices dikh jaate hain' },
          { n:4, text:'Invoice click karo → Amount Paid, Discount (agar ho), Method (Cash/Bank/Online) enter karo' },
          { n:5, text:'"Send SMS/WhatsApp to parent" toggle karo agar notify karna ho' },
          { n:6, text:'"Take Payment" click karo → receipt number generate hoga → Print karo' },
        ],
        tip: 'Family fee: "Family Fee Calculator" use karo — Father CNIC enter karo → sab bachon ki dues ek saath dikhti hain.',
      },
      {
        title: 'Fee Voucher (3 Copy Print)',
        steps: [
          { n:1, text:'Public URL: https://ilmforge-erp.vercel.app/fee-voucher kholo' },
          { n:2, text:'Student Roll Number enter karo → Continue' },
          { n:3, text:'Teen copies dikh jaate hain: Bank Copy, School Copy, Parent Copy' },
          { n:4, text:'🖨️ Print click karo → teeno copies print ho jaate hain' },
          { n:5, text:'📲 WhatsApp button se parent ko voucher details send kar sakte ho' },
        ],
        tip: 'Yeh public URL bina login ke kaam karta hai — cashier ko alag se login ki zaroorat nahi.',
      },
      {
        title: 'Fee Defaulters & Reminders',
        steps: [
          { n:1, text:'Fees → Defaulters' },
          { n:2, text:'Class aur section filter karo' },
          { n:3, text:'Defaulter list dikh jaati hai with pending amount' },
          { n:4, text:'"Send Reminder" button → SMS/WhatsApp reminder select karo' },
          { n:5, text:'1st/2nd/3rd Reminder templates available hain' },
        ],
      },
      {
        title: 'EMI / Instalment Plans',
        steps: [
          { n:1, text:'Fees → EMI Plans' },
          { n:2, text:'"New EMI Plan" click karo' },
          { n:3, text:'Plan title, total amount, number of installments (2/3/4/6/12 months) set karo' },
          { n:4, text:'Per installment amount automatically calculate hoti hai' },
          { n:5, text:'Save karo → students ko yeh plan assign kar sakte ho' },
        ],
        tip: 'Annual fee (Rs. 12,000) ko 12 installments mein divide karo = Rs. 1,000/month — parents ke liye easy.',
      },
      {
        title: 'Online Payment (JazzCash/EasyPaisa)',
        steps: [
          { n:1, text:'Settings → Payments → Online Gateway configure karo' },
          { n:2, text:'JazzCash ya EasyPaisa credentials enter karo' },
          { n:3, text:'Fees → Online Payment → gateway status check karo' },
          { n:4, text:'Parent portal pe "Pay Online" button aayega' },
          { n:5, text:'Payment transaction Fees → Payment Transactions mein dikh jaayega' },
        ],
        note: 'Online payment ke liye JazzCash/EasyPaisa merchant account zaroor hona chahiye.',
      },
    ],
  },

  /* ──────────────────────────────────────────
     4. EXAM MANAGEMENT
  ────────────────────────────────────────── */
  {
    id: 'exams',
    icon: '📝',
    color: '#DC2626',
    title: 'Exam Management',
    desc: 'Exam timetable se merit list aur annual report cards tak',
    chapters: [
      {
        title: 'Create Exam',
        steps: [
          { n:1, text:'Exams Hub → Exams tab → "Create Exam"' },
          { n:2, text:'Title, Type (Test/Midterm/Final), Class, Date Range enter karo' },
          { n:3, text:'Total Marks set karo' },
          { n:4, text:'Save → exam list mein dikh jaayega' },
        ],
      },
      {
        title: 'Exam Timetable (Date Sheet)',
        steps: [
          { n:1, text:'Exams Hub → Exam Timetable tab (ya /exams/timetable)' },
          { n:2, text:'Exam select karo → "+ Add Entry"' },
          { n:3, text:'Subject, Date, Start Time, End Time, Room bharo' },
          { n:4, text:'Save karo → timetable ban jaata hai' },
          { n:5, text:'"Print Timetable" button → A4 PDF print karo notice board ke liye' },
        ],
        tip: 'Date sheet parents ko WhatsApp pe bhi bhej sakte ho Communication Hub se.',
      },
      {
        title: 'Admit Cards (Exam Slips)',
        steps: [
          { n:1, text:'Exams Hub → Admit Cards tab' },
          { n:2, text:'Exam select karo → Class select karo' },
          { n:3, text:'Preview cards dikh jaate hain — student photo, roll number, schedule' },
          { n:4, text:'"Print All" click karo → A4 pe print karo' },
        ],
      },
      {
        title: 'Enter Marks',
        steps: [
          { n:1, text:'Exams Hub → Exams → exam row mein "Marks" button click karo' },
          { n:2, text:'Class select karo → students list aati hai' },
          { n:3, text:'"Total Marks" default set karo → "Apply All" click karo' },
          { n:4, text:'Har student ke obtained marks enter karo' },
          { n:5, text:'Absent students ke liye "Absent" checkbox tick karo' },
          { n:6, text:'"Save All Marks" click karo (neeche sticky button hai)' },
        ],
        tip: 'Teachers apne portal se bhi marks enter kar sakte hain — Admin ko har class manually enter nahi karna padta.',
      },
      {
        title: 'View Results & Marksheets',
        steps: [
          { n:1, text:'Exams → exam row mein "Results" button click karo' },
          { n:2, text:'Passed/Failed/Absent summary dikh jaata hai' },
          { n:3, text:'"Print Marksheet" button → class ka complete result sheet' },
          { n:4, text:'Grades automatically calculate hote hain: A+, A, B, C, D, F' },
        ],
      },
      {
        title: 'Merit List',
        steps: [
          { n:1, text:'Exams Hub → Merit List tab (ya /exams/merit-list)' },
          { n:2, text:'Exam select karo → Class/Section filter karo' },
          { n:3, text:'Top students rank ke saath dikh jaate hain' },
          { n:4, text:'Print karo → notice board pe lagao' },
        ],
        tip: 'Merit list Result Ceremony ke liye perfect hai — parents ko impress karta hai.',
      },
      {
        title: 'Gazette Sheet',
        steps: [
          { n:1, text:'Exams Hub → Gazette Sheet tab (ya /exams/gazette)' },
          { n:2, text:'Exam aur class select karo' },
          { n:3, text:'Official gazette format mein saare students ka result dikh jaata hai' },
          { n:4, text:'Print karo — school record ke liye official document' },
        ],
      },
      {
        title: 'Annual Report Cards',
        steps: [
          { n:1, text:'Exams Hub → Annual Report tab (ya /exams/annual-report)' },
          { n:2, text:'Academic year select karo' },
          { n:3, text:'Saare exams (tests + midterm + final) ka cumulative result dikh jaata hai' },
          { n:4, text:'Per student annual percentage aur grade auto-calculate hoti hai' },
          { n:5, text:'"Print Report Cards" → individual cards print hote hain' },
        ],
        tip: 'Annual report card mein school logo aur principal signature space automatically aata hai.',
      },
      {
        title: 'Failed Students List',
        steps: [
          { n:1, text:'Exams Hub → Failed Students tab (ya /exams/failed)' },
          { n:2, text:'Exam aur class filter karo' },
          { n:3, text:'Failed ya absent students ki list dikh jaati hai' },
          { n:4, text:'Print karo → teachers meeting ya PTM ke liye use karo' },
        ],
      },
    ],
  },

  /* ──────────────────────────────────────────
     5. STAFF MANAGEMENT
  ────────────────────────────────────────── */
  {
    id: 'staff',
    icon: '👨‍🏫',
    color: '#7C3AED',
    title: 'Staff & Teacher Management',
    desc: 'Add staff, attendance, salaries aur portals',
    chapters: [
      {
        title: 'Add New Teacher / Staff',
        steps: [
          { n:1, text:'Staff → Staff Management → "Add New Staff"' },
          { n:2, text:'Name*, Email*, Phone*, Designation*, Salary, Join Date bharo' },
          { n:3, text:'Campus aur Department select karo' },
          { n:4, text:'Staff Photo upload karo (ID card ke liye)' },
          { n:5, text:'Employee Code AUTO-GENERATED hoga (e.g. TCH-26-0001)' },
          { n:6, text:'"Save" click karo — staff member portal login kar sakta hai ab' },
        ],
        tip: 'Employee Code formats: Teacher→TCH, Principal→PRI, Admin→ADM, Accountant→ACC, Driver→DRV',
      },
      {
        title: 'Staff Salary',
        steps: [
          { n:1, text:'Salary → Generate Salary → Month aur Year select karo' },
          { n:2, text:'Staff list review karo with salary amounts' },
          { n:3, text:'"Generate" click karo → salary records ban jaate hain' },
          { n:4, text:'Manage Salaries → har staff member ke liye Print Slip' },
        ],
      },
      {
        title: 'Staff Attendance Report',
        steps: [
          { n:1, text:'Attendance → Staff Attendance Report (ya /attendance/staff-report)' },
          { n:2, text:'Month aur year select karo' },
          { n:3, text:'Saare staff members ka monthly summary dikh jaata hai' },
          { n:4, text:'Attendance % ke saath color-coded progress bars' },
          { n:5, text:'Print button se monthly report print karo' },
        ],
      },
      {
        title: 'Staff Appraisals',
        steps: [
          { n:1, text:'Staff → Appraisals' },
          { n:2, text:'"New Appraisal" → staff select karo, rating categories fill karo' },
          { n:3, text:'Overall score automatically calculate hogi' },
          { n:4, text:'Appraisal letter print kar sakte ho' },
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
    color: '#D97706',
    title: 'Portal Access — Parents, Teachers, Students',
    desc: 'Sab stakeholders ko login credentials provide karo',
    chapters: [
      {
        title: 'Default Passwords Reference',
        content: [
          { role: 'Admin', username: 'Registered Email', password: 'Email se aata hai (auto)', example: 'Sch7#KmNp' },
          { role: 'Teacher', username: 'Staff Email', password: 'teacher', example: 'teacher' },
          { role: 'Accountant', username: 'Staff Email', password: 'accountant', example: 'accountant' },
          { role: 'Parent', username: 'Father Email', password: 'parent', example: 'parent' },
          { role: 'Student', username: 'Roll Number', password: 'student123', example: 'C5A-26-001' },
          { role: 'Gatekeeper', username: 'Staff Email', password: 'gatekeeper', example: 'gatekeeper' },
        ],
        isTable: true,
      },
      {
        title: 'Teacher Portal Setup',
        steps: [
          { n:1, text:'Staff add karo (auto login account ban jaata hai)' },
          { n:2, text:'Portal Management → Teachers tab' },
          { n:3, text:'"Email Credentials" click karo → teacher ko email aata hai Login URL + password ke saath' },
          { n:4, text:'Teacher apne portal mein: Students, Attendance, Marks Entry, Homework, Online Classes dekh sakta hai' },
        ],
        warning: 'Default teacher password "teacher" hai — teachers ko first login ke baad change karna chahiye.',
      },
      {
        title: 'Parent Portal Setup',
        steps: [
          { n:1, text:'Student admission form mein Father Email zaroor bharo' },
          { n:2, text:'Portal Management → Parents tab' },
          { n:3, text:'"Email Credentials" click karo → parent ko email aata hai' },
          { n:4, text:'Ya "SMS" button se credentials SMS pe bhejo' },
          { n:5, text:'Parent login ke baad: child ki attendance, fees, marks, homework dekh sakta hai' },
        ],
        tip: 'Parent portal link: https://ilmforge-erp.vercel.app/login — yeh link parents ke saath share karo.',
      },
      {
        title: 'Student Portal Setup',
        steps: [
          { n:1, text:'Students Roll Number se login karte hain (username)' },
          { n:2, text:'Default password: "student123"' },
          { n:3, text:'Portal Management → Students tab → roll numbers list' },
          { n:4, text:'"Copy Credentials" button → WhatsApp ya print se share karo' },
        ],
        tip: 'Roll number ID card pe aur fee voucher pe print hota hai — students apna roll number wahan se dekh sakte hain.',
      },
    ],
  },

  /* ──────────────────────────────────────────
     7. COMMUNICATION
  ────────────────────────────────────────── */
  {
    id: 'communication',
    icon: '📢',
    color: '#0891B2',
    title: 'Communication & Notifications',
    desc: 'SMS, WhatsApp, Email, Push Notifications aur Announcements',
    chapters: [
      {
        title: 'SMS to Parents',
        steps: [
          { n:1, text:'Notifications → SMS Management → SMS To Parents' },
          { n:2, text:'Campus, Class, Section (ya All) select karo' },
          { n:3, text:'Message type karo — tags use karo: $student_name, $class_name, $amount' },
          { n:4, text:'"Send SMS" click karo' },
        ],
        tip: 'Available tags: $student_name, $parent_name, $class_name, $section_name, $campus_name, $amount, $due_date',
      },
      {
        title: 'Push Notifications (FCM)',
        steps: [
          { n:1, text:'Push Notifications page (sidebar mein)' },
          { n:2, text:'"New Notification" → Title aur Body bharo' },
          { n:3, text:'Target: All / Parents / Teachers / Students select karo' },
          { n:4, text:'"Send Push" click karo — mobile app pe notification aayega' },
        ],
        note: 'Push notifications ke liye Firebase FCM setup zaroori hai — Settings mein configure karo.',
      },
      {
        title: 'School Announcements',
        steps: [
          { n:1, text:'Announcements page' },
          { n:2, text:'"Add Announcement" → Title, Message, Target, Priority, Expiry Date bharo' },
          { n:3, text:'Save karo → sab portals pe dikh jaayega' },
        ],
      },
    ],
  },

  /* ──────────────────────────────────────────
     8. REPORTS & PRINTING
  ────────────────────────────────────────── */
  {
    id: 'reports',
    icon: '📊',
    color: '#B45309',
    title: 'Reports & Printing',
    desc: 'Sab printable reports, ID cards, certificates',
    chapters: [
      {
        title: 'Financial Reports',
        steps: [
          { n:1, text:'Reports → Reporting Area' },
          { n:2, text:'Reports: Class Wise Collection, Fee Defaulters, Income & Expense, Balance Sheet, Staff Salary' },
          { n:3, text:'"Generate Report" click karo → print preview khulta hai' },
          { n:4, text:'Browser Print (Ctrl+P) se print ya PDF save karo' },
        ],
        tip: 'Saari tables mein Export buttons hain: Excel, CSV, PDF, Print.',
      },
      {
        title: 'Daily Balance Sheet',
        steps: [
          { n:1, text:'Accounting → Daily Balance Sheet' },
          { n:2, text:'Date select karo — aaj ki income aur expenses dikh jaati hain' },
          { n:3, text:'Opening balance, fee collections, expenses, closing balance — sab automatic' },
        ],
      },
      {
        title: 'Student ID Cards',
        steps: [
          { n:1, text:'Students → ID Cards' },
          { n:2, text:'Student ya Staff select karo, template choose karo (5 designs)' },
          { n:3, text:'Class/section select → preview dikh jaata hai' },
          { n:4, text:'"Print All" → A4 pe 2 cards per page print hote hain' },
        ],
      },
      {
        title: 'Certificates',
        steps: [
          { n:1, text:'Certificates page' },
          { n:2, text:'Type select karo: Character, Leaving, Merit, Participation, Date of Birth' },
          { n:3, text:'Student select karo → preview dikh jaata hai school logo ke saath' },
          { n:4, text:'Customize karo → Print' },
        ],
        tip: 'Character certificate aur TC (Transfer Certificate) most commonly used hain.',
      },
    ],
  },

  /* ──────────────────────────────────────────
     9. SETTINGS & ADMIN
  ────────────────────────────────────────── */
  {
    id: 'settings',
    icon: '⚙️',
    color: '#6B7280',
    title: 'Settings & Administration',
    desc: 'School profile, backup, SOPs aur system configuration',
    chapters: [
      {
        title: 'School Profile',
        steps: [
          { n:1, text:'Settings → School Profile' },
          { n:2, text:'School logo upload karo (saare documents pe print hoga)' },
          { n:3, text:'Name, Address, City, Phone, Email update karo → Save' },
        ],
      },
      {
        title: 'Backup & Restore',
        steps: [
          { n:1, text:'Settings → Backup & Restore (ya /settings/backup)' },
          { n:2, text:'"Create Backup" click karo → JSON file download hogi' },
          { n:3, text:'Backup file safe jagah save karo (Google Drive/USB)' },
          { n:4, text:'Restore ke liye: file upload karo → Dry Run pehle karo → phir actual restore' },
        ],
        warning: 'Monthly backup lena bohot zaroori hai — data loss ka risk zero kar deta hai.',
      },
      {
        title: 'Standard Operating Procedures (SOPs)',
        steps: [
          { n:1, text:'SOPs page (sidebar mein Standard Procedures)' },
          { n:2, text:'School ke liye custom SOPs create karo' },
          { n:3, text:'Staff ko SOP assign karo — they can confirm reading' },
          { n:4, text:'SOP list print karo ya share karo' },
        ],
      },
      {
        title: 'Audit Logs',
        steps: [
          { n:1, text:'Settings → Audit Logs' },
          { n:2, text:'Saari system activity record hoti hai — kisi ne kya kiya kab kiya' },
          { n:3, text:'User, action, resource, IP address, time — sab track hota hai' },
          { n:4, text:'Filter by date, user, or action type' },
        ],
        tip: 'Audit logs se financial discrepancy trace ki ja sakti hai — kisi ne payment delete ki? Yahan dikh jaayega.',
      },
      {
        title: 'Biometric Device Setup',
        steps: [
          { n:1, text:'Settings → Biometric Settings → Bio Token copy karo' },
          { n:2, text:'"Download BioSync App" → Windows PC pe install karo' },
          { n:3, text:'BioSync mein: Server URL aur Bio Token enter karo → Verify & Connect' },
          { n:4, text:'ZKTeco device IP add karo (port 4370) → Save Device' },
          { n:5, text:'Members tab → Get from School → Upload to Device → fingerprints register karo' },
          { n:6, text:'Auto-Sync enable karo — har 10 minute mein attendance automatic upload hogi' },
        ],
        note: 'Supported: ZKTeco K40, MB20, IN01 aur most ZKTeco TCP/IP models.',
      },
    ],
  },

  /* ──────────────────────────────────────────
     v3.4 NEW FEATURES
  ────────────────────────────────────────── */
  {
    id: 'new-features',
    icon: '🆕',
    color: '#7c3aed',
    title: 'New Features v3.4',
    desc: 'BISE result cards, homework diary, POS, parent wallet, admin permissions, website management',
    chapters: [
      {
        title: 'BISE / Board-Format Result Card',
        steps: [
          { n:1, text:'Exams → BISE Result Card (ya /exams/bise-result-card)' },
          { n:2, text:'Student name search karo → select karo' },
          { n:3, text:'Exam select karo dropdown se' },
          { n:4, text:'Optional: Class Teacher Remarks field mein comment likho' },
          { n:5, text:'Yellow header ke saath result card preview dikh jaata hai' },
          { n:6, text:'Subject-wise marks table: 1st/2nd/3rd exam columns, Obtained, Total, Minimum, Percentage, Remarks' },
          { n:7, text:'Bar chart automatically generate hota hai (Obtained vs Total marks)' },
          { n:8, text:'"Print Result Card" button dabao → proper Pakistani board format mein print hoga' },
        ],
        tip: 'BISE format mein school logo, yellow header, student photo, complete subject table, bar chart aur teacher remarks sab included hain.',
      },
      {
        title: 'Daily Homework Diary (Calendar-based)',
        steps: [
          { n:1, text:'Sidebar → Homework Diary (ya /homework/diary)' },
          { n:2, text:'Class select karo' },
          { n:3, text:'Date strip se date select karo (5-day view with arrows)' },
          { n:4, text:'Saare subjects ke colored cards dikh jaate hain' },
          { n:5, text:'Pending subjects pe "Assign Homework" button dabao' },
          { n:6, text:'Homework details type karo → Save' },
          { n:7, text:'"Send Diary via SMS" button → saare us class ke parents ko homework SMS ja jaata hai' },
        ],
        tip: 'Subject cards color-coded hain — red, blue, yellow, purple etc. Pending subjects clearly "Pending" badge dikhate hain.',
      },
      {
        title: 'Point of Sale — Canteen / School Shop',
        steps: [
          { n:1, text:'Sidebar → Point of Sale (POS) (ya /stock/pos)' },
          { n:2, text:'Products grid dikh jaata hai — categories filter available hai' },
          { n:3, text:'Product click karo → cart mein add ho jaata hai' },
          { n:4, text:'Cart mein quantity + / - se adjust karo' },
          { n:5, text:'"Checkout & Print Receipt" dabao → sale complete + thermal receipt auto-print' },
          { n:6, text:'Products add karne ke liye: Stock & Inventory → Products & Stock' },
        ],
        warning: 'Out-of-stock products gray aur disabled dikhte hain — click karne pe cart mein add nahi honge.',
      },
      {
        title: 'Parent Wallet System',
        steps: [
          { n:1, text:'Fees → Parent Wallet (ya /fees/parent-wallet)' },
          { n:2, text:'Student search karo → select karo' },
          { n:3, text:'Wallet balance purple card mein dikh jaata hai' },
          { n:4, text:'"Add Deposit" button → amount aur note enter karo → deposit karo' },
          { n:5, text:'Transaction history: Deposits (green) aur Deductions (red) track hote hain' },
          { n:6, text:'Jab fee generate hoti hai — wallet se auto-deduct ho sakta hai' },
        ],
        tip: 'Parents advance payment dete hain — school isko wallet mein credit karta hai. Fee due hone pe system wallet se deduct karta hai.',
      },
      {
        title: 'Admin Module Permissions',
        steps: [
          { n:1, text:'Settings → Admin Accounts (ya /settings/admins)' },
          { n:2, text:'Admin user ki row mein "Permissions" button (yellow) click karo' },
          { n:3, text:'Modal khulega — 26 modules ke toggles dikhenge' },
          { n:4, text:'Har module ke toggle pe click karo — ON/OFF ho jaata hai' },
          { n:5, text:'"Enable All" ya "Disable All" quick buttons available hain' },
          { n:6, text:'Progress bar dikhata hai kitne modules enabled hain' },
          { n:7, text:'"Save Permissions" dabao — permissions save ho jaate hain' },
        ],
        tip: 'Admin ko sirf woh modules dikhenge jo enable kiye hain — ek accountant ko student management hide kar sakte ho.',
      },
      {
        title: 'Student Info Reports (Printable)',
        steps: [
          { n:1, text:'Students → Student Info Reports (ya /students/info-reports)' },
          { n:2, text:'4 report types available hain:' },
          { n:3, text:'All Active Students — Print button → saare active students ki list' },
          { n:4, text:'All Inactive Students — Print button → deactivated students' },
          { n:5, text:'Class Wise Report — class select karo → Print' },
          { n:6, text:'All Passout Students — graduated students ki list' },
          { n:7, text:'Har report A4 print format mein generate hoti hai Excel-style table ke saath' },
        ],
        tip: 'KPI cards pe Total, Male, Female, Passout students ka count bhi dikh jaata hai.',
      },
      {
        title: 'WhatsApp Message Types',
        steps: [
          { n:1, text:'Notifications → WhatsApp (ya /notifications/whatsapp)' },
          { n:2, text:'Message Type section mein 5 types available hain:' },
          { n:3, text:'Text — Simple text message (default)' },
          { n:4, text:'Picture/Video/Audio/Document — Media URL + Caption enter karo' },
          { n:5, text:'Link/URL — URL field enter karo with message' },
          { n:6, text:'Location — Location message (coordinates)' },
          { n:7, text:'Quiz/Poll — Question + Description + 3 Options' },
          { n:8, text:'Type select karo → extra fields appear hote hain → Send' },
        ],
        warning: 'WhatsApp API bulk messages mein limitations hain — mass marketing messages number ban kar sakta hai.',
      },
      {
        title: 'Website Management',
        steps: [
          { n:1, text:'Settings → Website Management (ya /settings/website-management)' },
          { n:2, text:'5 tabs available hain:' },
          { n:3, text:'System Settings — School name, address, phone, currency, running session' },
          { n:4, text:'Theme & Logo — 9 color themes + custom color + school logo upload' },
          { n:5, text:'About School — students enrolled, classes, awards, about text' },
          { n:6, text:'Facilities — 3 facility sections with title + description' },
          { n:7, text:'Gallery — 6 photo upload slots for school gallery' },
          { n:8, text:'"Save Changes" button dabao — website content update ho jaata hai' },
        ],
        tip: 'School website ka theme color change karne se sab documents aur portals pe branding update hoti hai.',
      },
      {
        title: 'Annual Attendance Calendar',
        steps: [
          { n:1, text:'Reports → Attendance Calendar (ya /reports/attendance-calendar)' },
          { n:2, text:'Student search karo → select karo' },
          { n:3, text:'Year select karo (current / previous year)' },
          { n:4, text:'12-month calendar grid dikh jaata hai' },
          { n:5, text:'P = Present (green), A = Absent (red), L = Leave (yellow), H = Holiday/Weekend (purple)' },
          { n:6, text:'Running totals: per month Present aur Absent count, plus year total' },
          { n:7, text:'"Print Calendar" → BISE-style annual attendance report print hota hai' },
        ],
        tip: 'Teacher/Parent/Principal signatures ke spaces automatically print mein include hote hain.',
      },
      {
        title: 'Admissions CRM — Lead Pipeline',
        steps: [
          { n:1, text:'Admissions → CRM (ya /admissions/crm)' },
          { n:2, text:'"Add Lead" → Parent name, student name, phone, class applied, source' },
          { n:3, text:'Stages: New → Contacted → Visited → Admitted / Lost' },
          { n:4, text:'Stage drag ya button se change karo' },
          { n:5, text:'"Follow-Up" note add karo — reminder ke liye' },
          { n:6, text:'"Convert to Admitted" → directly Admission Wizard khulta hai' },
          { n:7, text:'CRM stats: total leads, conversion rate, source tracking' },
        ],
        tip: 'CRM se track hota hai kitni inquiries aaye aur kitne admit hue — school ka admission efficiency measure hota hai.',
      },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════
   ROLE QUICK START
═══════════════════════════════════════════════════════════ */
const ROLE_QUICK_START = [
  { role: 'Admin', color: '#0F766E', path: '/dashboard', bullets: ['Smart Workflow Hub se start karo', 'Classes, fees, staff configure karo', 'Settings aur portals manage karo'] },
  { role: 'Accountant', color: '#1D4ED8', path: '/accountant-portal', bullets: ['Fees collect aur post karo', 'Defaulters aur reminders track karo', 'Financial reports run karo'] },
  { role: 'Teacher', color: '#7C3AED', path: '/teacher-portal', bullets: ['Attendance mark karo', 'Marks aur homework enter karo', 'Class materials share karo'] },
  { role: 'Parent', color: '#D97706', path: '/parent-portal', bullets: ['Child ki fees aur dues dekho', 'Attendance updates track karo', 'Notices aur alerts parho'] },
  { role: 'Student', color: '#0891B2', path: '/student-portal', bullets: ['Homework aur results check karo', 'Announcements parho', 'Attendance dekho'] },
  { role: 'Gatekeeper', color: '#B91C1C', path: '/gatekeeper-portal', bullets: ['Barcode attendance sirf', 'QR gate pass verify karo', 'Live daily entry log'] },
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
            <div style={{ overflowX:'auto' }}>
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
              <span style={{ fontSize:12.5, color:'#1D4ED8', lineHeight:1.5 }}>{chapter.note}</span>
            </div>
          )}
          {chapter.warning && (
            <div style={{ background:'#FFF7ED', border:'1px solid #FED7AA', borderRadius:8, padding:'10px 14px', marginTop:12, display:'flex', gap:8, alignItems:'flex-start' }}>
              <AlertTriangle size={14} color="#C2410C" style={{ flexShrink:0, marginTop:1 }}/>
              <span style={{ fontSize:12.5, color:'#9A3412', lineHeight:1.5 }}>{chapter.warning}</span>
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
  const [search, setSearch]   = useState('');
  const [showDemo, setShowDemo] = useState(false);

  const filteredSections = SECTIONS.map(sec => ({
    ...sec,
    chapters: sec.chapters.filter(ch =>
      !search ||
      ch.title.toLowerCase().includes(search.toLowerCase()) ||
      ch.steps?.some(s => s.text.toLowerCase().includes(search.toLowerCase()))
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
              <h1 style={{ margin:0, fontSize:24, fontWeight:900 }}>IlmForge User Manual</h1>
              <p style={{ margin:'4px 0 0', opacity:0.75, fontSize:13 }}>v3.4 — 10 sections · 60+ chapters · BISE cards · POS · Homework Diary · Demo script</p>
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
          {['🔄 Workflow Hub','Admission','Fees','BISE Result Card','Homework Diary','POS','Parent Wallet','Admin Permissions','Website Mgmt'].map(tag => (
            <span key={tag} style={{ background:'rgba(255,255,255,0.15)', padding:'3px 10px', borderRadius:99, fontSize:11.5, fontWeight:600 }}>{tag}</span>
          ))}
        </div>
      </div>

      {/* ── Demo Script Panel ── */}
      {showDemo && (
        <div style={{ background:'#fff', border:'2px solid #f59e0b', borderRadius:12, padding:20, marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div style={{ fontSize:15, fontWeight:800, color:'#92400e', display:'flex', alignItems:'center', gap:8 }}>
              <Star size={16} color="#f59e0b"/> Client Demo Script — ~21 minutes
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
            💡 <strong>Demo Tip:</strong> Pehle Workflow Hub dikhaiye — clients seedha samajh jaate hain system ka flow. Phir live admission wizard run karo — sab se zyada impress karta hai.
          </div>
        </div>
      )}

      {/* ── Search ── */}
      <div style={{ position:'relative', marginBottom:20 }}>
        <Search size={16} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#94A3B8' }}/>
        <input className="form-input" style={{ paddingLeft:42, fontSize:14, height:46 }}
          placeholder="Search any feature, step, or topic..."
          value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      {/* ── Role Cards ── */}
      {!search && (
        <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, padding:'16px', marginBottom:20 }}>
          <div style={{ fontSize:15, fontWeight:800, color:'#1E3A5F', marginBottom:12 }}>Role Quick Start</div>
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

      {/* ── Footer ── */}
      <div style={{ background:'#F8FAFC', border:'1px solid #E5E7EB', borderRadius:12, padding:'20px 24px', textAlign:'center', marginTop:16 }}>
        <div style={{ fontSize:20, marginBottom:6 }}>🎓</div>
        <div style={{ fontWeight:800, color:'#1E3A5F', fontSize:15 }}>IlmForge School Management System</div>
        <div style={{ fontSize:12, color:'#6B7280', marginTop:6 }}>
          Pakistan ka #1 School ERP · Live: <strong>https://ilmforge-erp.vercel.app</strong>
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
