/**
 * IlmForge — Complete User Manual
 * Step-by-step guide for all roles and workflows
 */
import { useState } from 'react';
import {
  BookOpen, CheckCircle, AlertTriangle, Info, ArrowRight, Printer,
  Search, ChevronDown, ChevronRight, Users, DollarSign, GraduationCap,
  Award, BarChart2, Settings, Shield, Phone, Mail
} from 'lucide-react';

/* ── Data ─────────────────────────────────────────────── */
const SECTIONS = [
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
          { n:1, text:'Go to https://ilmforge-erp.vercel.app and click "Register"' },
          { n:2, text:'Enter School Name, Your Name, Email Address, and Phone' },
          { n:3, text:'Click Submit — your password is AUTO-GENERATED and sent to your email' },
          { n:4, text:'Check your email for the 6-digit OTP verification code' },
          { n:5, text:'Enter the OTP on the verification page' },
          { n:6, text:'After verification, a "School Ready" email is sent with your login URL and password' },
        ],
        note: 'Your unique school login URL format: https://ilmforge-erp.vercel.app/login?slug=your-school-name',
        tip: 'Save your password from the email immediately. You can change it later in My Profile → Change Password.',
      },
      {
        title: 'Complete Onboarding (5 Steps)',
        steps: [
          { n:1, text:'Step 1 — Branding: Upload your school logo and choose a color theme' },
          { n:2, text:'Step 2 — School Info: Enter address, phone, city, and school motto' },
          { n:3, text:'Step 3 — Classes: Add your class structure (e.g., Nursery, KG, Class 1–10)' },
          { n:4, text:'Step 4 — Fee & Staff: Set monthly fee amounts per class and add first teacher' },
          { n:5, text:'Step 5 — All Set! A credentials popup shows your Login URL, Email, and Password' },
        ],
        warning: 'Save the credentials shown in the Step 5 popup. Screenshot or copy them before closing.',
      },
      {
        title: 'Login to the System',
        steps: [
          { n:1, text:'Go to https://ilmforge-erp.vercel.app/login' },
          { n:2, text:'Enter your registered Email and Password' },
          { n:3, text:'Click Sign In — you\'ll be taken to the Dashboard' },
        ],
        tip: 'Demo credentials: admin@demo.com / Admin@123 (for testing)',
      },
    ],
  },
  {
    id: 'students',
    icon: '👨‍🎓',
    color: '#2563EB',
    title: 'Student Management',
    desc: 'Full student lifecycle from admission to leaving',
    chapters: [
      {
        title: 'Step 1: Set Up Classes & Sections (MUST DO FIRST)',
        steps: [
          { n:1, text:'Go to Settings → Classes & Sections' },
          { n:2, text:'Click "Add New Class" → Enter class name (e.g., "Class 5"), numeric order, tuition fee' },
          { n:3, text:'Add sections to each class (e.g., Section A, B, C)' },
          { n:4, text:'Repeat for all classes your school has' },
        ],
        warning: 'You cannot admit students without classes. Set up classes FIRST.',
      },
      {
        title: 'Step 2: Admit a Student',
        steps: [
          { n:1, text:'Go to Admissions → Admit Student (or click "Add Students" on Dashboard)' },
          { n:2, text:'Fill in: Student Name*, Father Name*, Date of Birth, Gender' },
          { n:3, text:'Select Campus, Class, and Section from dropdowns' },
          { n:4, text:'Enter: Father Phone*, Father Email, Father CNIC (without dashes), Home Address' },
          { n:5, text:'Upload Student Photo (optional but recommended for ID cards)' },
          { n:6, text:'Click "Admit Student" — Roll Number is AUTO-GENERATED (e.g., C5A-26-001)' },
        ],
        tip: 'Roll Number format: {ClassCode}{Section}-{Year}-{Sequence}. E.g., C5A-26-001 = Class 5 Section A, Year 2026, Student #001',
      },
      {
        title: 'Step 3: Mark Daily Attendance',
        steps: [
          { n:1, text:'Go to Academics → Manage Attendance → Students Attendance' },
          { n:2, text:'Select Class, Section, and Date' },
          { n:3, text:'Click "Manage Attendance" to see the class list' },
          { n:4, text:'Mark each student: Present / Absent / Leave / Online' },
          { n:5, text:'Enable "Notify Parents of Absent Students" to auto-send SMS/WhatsApp' },
          { n:6, text:'Click "Save Attendance"' },
        ],
        tip: 'For barcode-based attendance: Go to Academics → Manage Attendance → Barcode Attendance, scan student ID cards.',
      },
      {
        title: 'Step 4: Generate & Collect Fee',
        steps: [
          { n:1, text:'Go to Fee Management → Accounting/Fee → Generate Monthly Fee' },
          { n:2, text:'Select Campus, Class, Section, Fee Month, Year, Due Date' },
          { n:3, text:'Click "Generate Fee" — fee invoices are created for all students' },
          { n:4, text:'To collect fee: Go to Fee Payment → search student name or roll number' },
          { n:5, text:'Click on student → unpaid invoices appear → click "Take Payment"' },
          { n:6, text:'Enter Amount Paid, Discount (if any), Method (Cash/Bank), click Save' },
        ],
      },
      {
        title: 'Step 5: Enter Exam Marks',
        steps: [
          { n:1, text:'Go to Exams & Tests → Exam Management → Exam List' },
          { n:2, text:'Click "Create Exam" → Enter title, type (Test/Midterm/Final), class, dates' },
          { n:3, text:'On the exam row, click "Marks" button' },
          { n:4, text:'Select class if not auto-assigned → student list loads' },
          { n:5, text:'Set "Total Marks" default → click "Apply All"' },
          { n:6, text:'Enter obtained marks per student (or tick Absent checkbox)' },
          { n:7, text:'Click "Save All Marks" (sticky button at bottom)' },
          { n:8, text:'Click "View Results" to see the results report' },
        ],
      },
      {
        title: 'Step 6: Print Report Card & Certificates',
        steps: [
          { n:1, text:'Go to Exams & Tests → Exam Management → Print Marksheets' },
          { n:2, text:'Select class and section → click View → click Print' },
          { n:3, text:'For Certificates: Go to Certificates & Cards → Certification' },
          { n:4, text:'Select certificate type (Character, Merit, Participation, etc.)' },
          { n:5, text:'Select student → customize if needed → Print' },
        ],
      },
      {
        title: 'Step 7: Promote Student to Next Class',
        steps: [
          { n:1, text:'Go to Student Management → All Students' },
          { n:2, text:'Find the student → click the ↔ (Promote) button' },
          { n:3, text:'Select New Class and Section → click "Promote Student"' },
          { n:4, text:'For bulk promotion: Go to Admissions → Student Management → Student Promotion' },
        ],
      },
      {
        title: 'Step 8: Student Leaving (Pass-out)',
        steps: [
          { n:1, text:'Go to Students → find the student → click Promote (↔)' },
          { n:2, text:'Set Status to "Pass-out (Graduated)"' },
          { n:3, text:'Print Character Certificate (Certificates section)' },
          { n:4, text:'Clear any outstanding fees before final leaving' },
        ],
      },
    ],
  },
  {
    id: 'staff',
    icon: '👨‍🏫',
    color: '#7C3AED',
    title: 'Staff & Teacher Management',
    desc: 'Add staff, manage attendance, salaries and portals',
    chapters: [
      {
        title: 'Add New Teacher/Staff',
        steps: [
          { n:1, text:'Go to Staff → Staff Management → Add New Staff (or Dashboard → Add Teachers)' },
          { n:2, text:'Fill in: Name*, Email*, Phone*, Designation*, Salary, Join Date' },
          { n:3, text:'Select Campus and Department' },
          { n:4, text:'Upload Staff Photo (for ID card)' },
          { n:5, text:'Employee Code is AUTO-GENERATED (e.g., TCH-26-0001 for Teacher)' },
          { n:6, text:'Click Save — staff is added and can now login to their portal' },
        ],
        tip: 'Employee Code formats: Teacher→TCH, Principal→PRI, Admin→ADM, Accountant→ACC',
      },
      {
        title: 'Send Teacher Portal Credentials',
        steps: [
          { n:1, text:'Go to Portal Management (Staff → Portal Management)' },
          { n:2, text:'Go to Teachers tab' },
          { n:3, text:'Find the teacher → click "Email Credentials" button' },
          { n:4, text:'Teacher receives email with: Login URL, Email, Password (default: "teacher")' },
          { n:5, text:'Teacher can change password after first login' },
        ],
        warning: 'Default teacher password is "teacher". Teachers MUST change it after first login.',
      },
      {
        title: 'Mark Staff Attendance',
        steps: [
          { n:1, text:'Go to Academics → Manage Attendance → Staff Attendance' },
          { n:2, text:'Select Campus, Department, and Date' },
          { n:3, text:'Click "Manage Attendance" → mark Present/Absent/Leave' },
          { n:4, text:'Save Attendance' },
        ],
      },
      {
        title: 'Generate Salary',
        steps: [
          { n:1, text:'Go to Finance & Payroll → Salary & Loan → Generate Salary' },
          { n:2, text:'Select month and year' },
          { n:3, text:'Review staff list with salary amounts' },
          { n:4, text:'Click Generate → salary records created' },
          { n:5, text:'Go to Manage Salaries → click Print Slip per staff member' },
        ],
      },
      {
        title: 'Issue Experience Certificate',
        steps: [
          { n:1, text:'Go to Certificates & Cards → Certification → Staff Certificates' },
          { n:2, text:'Select "Experience Certificate"' },
          { n:3, text:'Select staff member → dates → Print' },
        ],
      },
    ],
  },
  {
    id: 'portals',
    icon: '🔐',
    color: '#D97706',
    title: 'Portal Access for Parents, Teachers & Students',
    desc: 'How to provide login access to all stakeholders',
    chapters: [
      {
        title: 'Teacher Portal Setup',
        steps: [
          { n:1, text:'Add teacher via Staff Management (auto-creates login account)' },
          { n:2, text:'Go to Portal Management → Teachers tab' },
          { n:3, text:'Click "Email Credentials" → teacher gets email with login URL + password' },
          { n:4, text:'Teacher logs in at: https://ilmforge-erp.vercel.app/login with their email' },
          { n:5, text:'Teacher sees: Student List, Attendance, Marks Entry, Homework, Online Classes' },
        ],
        tip: 'Teachers can only access their assigned class students. Admin sets class assignment from Staff Management.',
      },
      {
        title: 'Parent Portal Setup',
        steps: [
          { n:1, text:'Ensure student admission form has Father\'s Email address filled' },
          { n:2, text:'Go to Portal Management → Parents tab' },
          { n:3, text:'Find parent (shows student\'s father name)' },
          { n:4, text:'Click "Email Credentials" → parent gets login details' },
          { n:5, text:'Or click "SMS" to send via text message' },
          { n:6, text:'Parent logs in → sees child\'s attendance, fees, marks, homework' },
        ],
        warning: 'Parents need Father\'s Email in admission form to receive credentials by email. If missing, use SMS or WhatsApp to send credentials manually.',
        note: 'Default parent password: "parent". Share login URL: https://ilmforge-erp.vercel.app/login',
      },
      {
        title: 'Student Portal Setup',
        steps: [
          { n:1, text:'Students login with their Roll Number as the username' },
          { n:2, text:'Default password: "student123"' },
          { n:3, text:'Go to Portal Management → Students tab to see all roll numbers' },
          { n:4, text:'Use "Copy Credentials" button → share via WhatsApp or print' },
          { n:5, text:'Student logs in → sees results, timetable, homework, announcements' },
        ],
        tip: 'Roll numbers are printed on fee vouchers and ID cards. Students can show their ID card to find their roll number.',
      },
      {
        title: 'Default Passwords Reference Table',
        content: [
          { role: 'Admin', username: 'Registered Email', password: 'Sent via email (auto-generated)', example: 'Sch7#KmNp' },
          { role: 'Teacher', username: 'Staff Email', password: 'teacher', example: 'teacher' },
          { role: 'Accountant', username: 'Staff Email', password: 'accountant', example: 'accountant' },
          { role: 'Parent', username: 'Father Email', password: 'parent', example: 'parent' },
          { role: 'Student', username: 'Roll Number', password: 'student123', example: 'C5A-26-001' },
        ],
        isTable: true,
      },
    ],
  },
  {
    id: 'fees',
    icon: '💰',
    color: '#15803D',
    title: 'Fee Management',
    desc: 'Generate, collect and manage all fee workflows',
    chapters: [
      {
        title: 'Fee Types Setup',
        steps: [
          { n:1, text:'Go to Fee Management → Accounting/Fee → Fee Types' },
          { n:2, text:'System has 8 default types: Monthly Tuition, Admission, Exam, Transport, Lab, Sports, Computer, Books' },
          { n:3, text:'Add custom fee types using the "Add A Fee Type" tab' },
        ],
      },
      {
        title: 'Fee Structure (set monthly fee per class)',
        steps: [
          { n:1, text:'Go to Fee Management → Accounting/Fee → Fee Structure' },
          { n:2, text:'Each class shows its tuition fee (set during class creation)' },
          { n:3, text:'Click Update on any class to change the monthly fee amount' },
        ],
      },
      {
        title: 'Generate Monthly Fee',
        steps: [
          { n:1, text:'Go to Fee Management → Generate Monthly Fee' },
          { n:2, text:'Select Campus → Class → Section → Fee Month → Fee Year' },
          { n:3, text:'Set Due Date (e.g., 10th of next month)' },
          { n:4, text:'Optionally set Late Fee amount' },
          { n:5, text:'Tick "Transport Fee" if students use school van' },
          { n:6, text:'Click "Generate Fee 👍" — invoices created for all students' },
        ],
        warning: 'Generate fee BEFORE the month starts. You cannot generate fee for a month twice.',
      },
      {
        title: 'Collect Fee Payment',
        steps: [
          { n:1, text:'Go to Fee Management → Fee Payment (Dashboard)' },
          { n:2, text:'Type student name in "Search Student by Name/Code"' },
          { n:3, text:'Select student from dropdown' },
          { n:4, text:'Unpaid invoices appear → click on an invoice' },
          { n:5, text:'Enter: Amount Paid, Discount (if any), Method (Cash/Bank/Online)' },
          { n:6, text:'Toggle "Send SMS/WhatsApp notification to parent"' },
          { n:7, text:'Click "Take Payment" → receipt number generated' },
          { n:8, text:'Print receipt using Print button' },
        ],
        tip: 'For family fee payment: Use "Family Fee Calculator" — enter Father\'s CNIC to see ALL children\'s dues at once.',
      },
      {
        title: 'Send Fee Defaulter Reminders',
        steps: [
          { n:1, text:'Go to Fee Management → Accounting/Fee → SMS To Fee Defaulters' },
          { n:2, text:'Select Class, Section' },
          { n:3, text:'Choose reminder type: First/Second/Third Reminder' },
          { n:4, text:'Select "Notify By: WhatsApp & SMS"' },
          { n:5, text:'Click "Send Reminder 👍"' },
        ],
      },
    ],
  },
  {
    id: 'communication',
    icon: '📢',
    color: '#0891B2',
    title: 'Communication & Notifications',
    desc: 'SMS, WhatsApp, Email and Announcements',
    chapters: [
      {
        title: 'Send SMS to Parents',
        steps: [
          { n:1, text:'Go to Communication → SMS Management → SMS To Parents' },
          { n:2, text:'Select Campus, Class, Section (or All)' },
          { n:3, text:'Type message — use tags like $student_name, $class_name' },
          { n:4, text:'Click "Send SMS"' },
        ],
        tip: 'Available tags: $student_name, $parent_name, $class_name, $section_name, $campus_name',
      },
      {
        title: 'Send WhatsApp Notification',
        steps: [
          { n:1, text:'Go to Communication → WhatsApp Notifications → Message To Parents' },
          { n:2, text:'Select class and section' },
          { n:3, text:'Type your message' },
          { n:4, text:'Click "Send SMS" (sends via WhatsApp)' },
        ],
      },
      {
        title: 'Post School Announcement',
        steps: [
          { n:1, text:'Go to Communication → Announcements' },
          { n:2, text:'Click "Add Announcement"' },
          { n:3, text:'Enter Title, Message, Target (All / Teachers / Parents / Students)' },
          { n:4, text:'Set Priority (Normal/High/Urgent) and Expiry Date' },
          { n:5, text:'Click Save — appears on all portals' },
        ],
      },
    ],
  },
  {
    id: 'reports',
    icon: '📊',
    color: '#B45309',
    title: 'Reports & Printing',
    desc: 'All printable reports and export options',
    chapters: [
      {
        title: 'Common Reports',
        steps: [
          { n:1, text:'Go to Finance & Payroll → Reporting Area' },
          { n:2, text:'Available reports: Class Wise, Fee Defaulters, Income & Expense, Balance Sheet, Staff Salary, etc.' },
          { n:3, text:'Click "Generate Report" → opens print preview in new tab' },
          { n:4, text:'Use browser Print (Ctrl+P) to print or save as PDF' },
        ],
        tip: 'All tables in the system have Export buttons: Excel, CSV, PDF, Print.',
      },
      {
        title: 'Print ID Cards',
        steps: [
          { n:1, text:'Go to Certificates & Cards → ID Card Printing' },
          { n:2, text:'Select Student or Staff, choose Template (5 designs available)' },
          { n:3, text:'Select class/section → Preview cards' },
          { n:4, text:'Click "Print All" → opens print page' },
          { n:5, text:'Set paper size to A4, Print 2 per page' },
        ],
      },
      {
        title: 'Print Fee Vouchers (3 Copies)',
        steps: [
          { n:1, text:'Go to public URL: https://ilmforge-erp.vercel.app/fee-voucher' },
          { n:2, text:'Enter student Roll Number → click Continue' },
          { n:3, text:'Three copies shown: Bank Copy, School Copy, Parent Copy' },
          { n:4, text:'Click 🖨️ Print → select invoice → prints all 3 copies' },
          { n:5, text:'Or click 📲 WhatsApp to send voucher details to parent' },
        ],
      },
    ],
  },
  {
    id: 'settings',
    icon: '⚙️',
    color: '#6B7280',
    title: 'Settings & Configuration',
    desc: 'Configure school profile, SMS, email and more',
    chapters: [
      {
        title: 'School Profile Setup',
        steps: [
          { n:1, text:'Go to Settings → School Profile' },
          { n:2, text:'Upload school logo (shows on all documents)' },
          { n:3, text:'Enter: School Name, Address, City, Phone, Email' },
          { n:4, text:'Save Changes' },
        ],
      },
      {
        title: 'SMS Settings',
        steps: [
          { n:1, text:'Go to Settings → SMS Settings' },
          { n:2, text:'Enter your SMS gateway credentials (Twilio/other)' },
          { n:3, text:'Test with a sample SMS' },
          { n:4, text:'Save — SMS will now work for attendance, fee reminders, etc.' },
        ],
      },
      {
        title: 'Biometric Device Setup',
        steps: [
          { n:1, text:'Go to Settings → Biometric Settings' },
          { n:2, text:'Note your Bio Token and Campus ID' },
          { n:3, text:'Click "Download BioSync App" → install on Windows PC' },
          { n:4, text:'In BioSync: Enter Server URL and Bio Token → click Verify & Connect' },
          { n:5, text:'Add your ZKTeco device IP (port 4370) → click Save Device' },
          { n:6, text:'In Members tab → Get from School → Upload to Device → register fingerprints' },
          { n:7, text:'Enable Auto-Sync for automatic attendance upload every 10 minutes' },
        ],
        note: 'Supported devices: ZKTeco K40, MB20, IN01, and most ZKTeco models with TCP/IP.',
      },
    ],
  },
];

const ROLE_QUICK_START = [
  { role: 'Admin', color: '#0F766E', path: '/dashboard', bullets: ['Configure classes, fees, staff', 'Approve admissions and promotion', 'Manage settings and portals'] },
  { role: 'Accountant', color: '#1D4ED8', path: '/accountant-portal', bullets: ['Collect and post payments', 'Track defaulters and reminders', 'Run financial reports'] },
  { role: 'Teacher', color: '#7C3AED', path: '/teacher-portal', bullets: ['Mark attendance', 'Enter marks and homework', 'Share class materials'] },
  { role: 'Parent', color: '#D97706', path: '/parent-portal', bullets: ['View child fees and dues', 'Track attendance updates', 'Read notices and alerts'] },
  { role: 'Student', color: '#0891B2', path: '/student-portal', bullets: ['Check homework and results', 'View announcements', 'Track attendance snapshot'] },
  { role: 'Gatekeeper', color: '#B91C1C', path: '/gatekeeper-portal', bullets: ['Barcode attendance only', 'Fast check-in workflow', 'Live daily entry log'] },
];

const AUDIT_CHECKLIST = [
  'Role login opens only the correct portal/dashboard',
  'Parent and student cannot access unrelated records',
  'Fee posting is limited to finance roles',
  'Exam creation and marks entry are restricted',
  'Portal credentials are shared only through approved workflow',
  'Reports and vouchers print with school branding',
];

/* ── Step component ──────────────────────────────────── */
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

/* ── Chapter component ───────────────────────────────── */
function Chapter({ chapter, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen || false);
  return (
    <div style={{ border:'1px solid #E5E7EB', borderRadius:10, marginBottom:10, overflow:'hidden' }}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', background: open ? '#F0FDF9' : '#FAFAFA', border:'none', cursor:'pointer', textAlign:'left' }}>
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
                    {['Role','Username/Login ID','Default Password','Example'].map(h=>(
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

/* ── Main Page ───────────────────────────────────────── */
export default function UserManualPage() {
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState(null);

  const filteredSections = SECTIONS.map(sec => ({
    ...sec,
    chapters: sec.chapters.filter(ch =>
      !search || ch.title.toLowerCase().includes(search.toLowerCase()) ||
      ch.steps?.some(s => s.text.toLowerCase().includes(search.toLowerCase()))
    )
  })).filter(sec => !search || sec.chapters.length > 0);

  const handlePrint = () => window.print();

  return (
    <div className="page-content fade-up" id="user-manual">
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#0F4C45,#0F766E)', borderRadius:16, padding:'28px 32px', marginBottom:24, color:'#fff' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ fontSize:40 }}>📖</div>
            <div>
              <h1 style={{ margin:0, fontSize:24, fontWeight:900 }}>IlmForge User Manual</h1>
              <p style={{ margin:'4px 0 0', opacity:0.75, fontSize:13.5 }}>Complete step-by-step guide — from student admission to school reports</p>
            </div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={handlePrint}
              style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)', color:'#fff', padding:'8px 16px', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
              <Printer size={14}/> Print Manual
            </button>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, marginTop:18, flexWrap:'wrap' }}>
          {['Student Admission','Fee Collection','Exam Marks','Portal Access','ID Cards','Reports'].map(tag => (
            <span key={tag} style={{ background:'rgba(255,255,255,0.15)', padding:'3px 10px', borderRadius:99, fontSize:11.5, fontWeight:600 }}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Search */}
      <div style={{ position:'relative', marginBottom:20 }}>
        <Search size={16} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#94A3B8' }}/>
        <input className="form-input" style={{ paddingLeft:42, fontSize:14, height:46 }}
          placeholder="Search any feature, step, or topic..."
          value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      {/* Role quick-start cards */}
      {!search && (
        <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, padding:'16px 16px 10px', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, flexWrap:'wrap', marginBottom:10 }}>
            <div style={{ fontSize:15, fontWeight:800, color:'#1E3A5F' }}>Role Quick Start</div>
            <div style={{ fontSize:12, color:'#64748B' }}>Open the right portal in one click</div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))', gap:10 }}>
            {ROLE_QUICK_START.map((item) => (
              <a key={item.role} href={item.path}
                style={{ border:`1px solid ${item.color}30`, background:`${item.color}10`, borderRadius:10, padding:'10px 12px', textDecoration:'none' }}>
                <div style={{ fontSize:13.5, fontWeight:800, color:item.color, marginBottom:6 }}>{item.role}</div>
                {item.bullets.map((b) => (
                  <div key={b} style={{ fontSize:12, color:'#334155', lineHeight:1.5 }}>• {b}</div>
                ))}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Ops audit checklist */}
      {!search && (
        <div style={{ background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:12, padding:'14px 16px', marginBottom:18 }}>
          <div style={{ fontSize:13.5, fontWeight:800, color:'#1E3A5F', marginBottom:6 }}>Operational Readiness Checklist</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:4 }}>
            {AUDIT_CHECKLIST.map((line) => (
              <div key={line} style={{ fontSize:12.5, color:'#334155', lineHeight:1.55 }}>✓ {line}</div>
            ))}
          </div>
        </div>
      )}

      {/* Quick nav */}
      {!search && (
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:24 }}>
          {SECTIONS.map(sec => (
            <a key={sec.id} href={`#${sec.id}`}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:99, background:`${sec.color}15`, border:`1px solid ${sec.color}30`, color:sec.color, textDecoration:'none', fontSize:13, fontWeight:600 }}>
              <span>{sec.icon}</span> {sec.title}
            </a>
          ))}
        </div>
      )}

      {/* Content */}
      {filteredSections.map(sec => (
        <div key={sec.id} id={sec.id} style={{ marginBottom:32 }}>
          {/* Section header */}
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
          {/* Chapters */}
          {sec.chapters.map((ch, i) => <Chapter key={i} chapter={ch} defaultOpen={i===0 && !search}/>)}
        </div>
      ))}

      {/* Footer */}
      <div style={{ background:'#F8FAFC', border:'1px solid #E5E7EB', borderRadius:12, padding:'20px 24px', textAlign:'center', marginTop:16 }}>
        <div style={{ fontSize:16, marginBottom:6 }}>🎓</div>
        <div style={{ fontWeight:700, color:'#1E3A5F', fontSize:14 }}>IlmForge School Management System</div>
        <div style={{ fontSize:12, color:'#6B7280', marginTop:4 }}>
          Ilm Ko Asaan Banaye · Live: https://ilmforge-erp.vercel.app ·
          Support: interface_alerts@carecloud.com
        </div>
      </div>

      {/* Print CSS */}
      <style>{`
        @media print {
          .page-content > *:not(#user-manual) { display: none !important; }
          #user-manual { display: block !important; }
          body { font-size: 11pt; }
          button { display: none !important; }
        }
      `}</style>
    </div>
  );
}
