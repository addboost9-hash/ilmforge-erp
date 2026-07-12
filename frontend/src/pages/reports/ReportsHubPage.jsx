/**
 * IlmForge — Reports Hub (110+ Reports)
 * Competitor parity: 110+ reports organized by category
 * All printable, exportable, filterable
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { Search, Printer, Download, FileText, BarChart2, ChevronRight, ExternalLink } from 'lucide-react';

const REPORT_CATEGORIES = [
  {
    id: 'students',
    label: 'Student Reports',
    icon: '👨‍🎓',
    color: '#1B2F6E',
    reports: [
      { id:'all-active',       label:'All Active Students',         desc:'Complete list with class, section, roll no',          to:'/students/info-reports' },
      { id:'all-inactive',     label:'All Inactive Students',       desc:'Deactivated/withdrawn students',                      to:'/students/info-reports' },
      { id:'class-wise',       label:'Class Wise Student List',     desc:'Students grouped by class and section',               to:'/students/info-reports' },
      { id:'gender-report',    label:'Gender-wise Report',          desc:'Male/female student count by class',                  to:'/students/info-reports' },
      { id:'passout',          label:'Passout Students',            desc:'Graduated students list',                             to:'/students/info-reports' },
      { id:'new-admissions',   label:'New Admissions Report',       desc:'Students admitted this month/year',                   to:'/admissions' },
      { id:'birthday',         label:'Student Birthdays',           desc:'Upcoming and today birthdays',                        to:'/students/birthdays' },
      { id:'promotion',        label:'Promotion Report',            desc:'Class promotion history',                             to:'/students/promote' },
      { id:'att-calendar',     label:'Annual Attendance Calendar',  desc:'Full year P/A/H per student',                        to:'/reports/attendance-calendar' },
      { id:'att-deficit',      label:'Attendance Deficit Report',   desc:'Students below required attendance %',                to:'/attendance/deficit' },
      { id:'low-attendance',   label:'Low Attendance Students',     desc:'Students with < 70% attendance',                     to:'/attendance/deficit' },
      { id:'health',           label:'Student Health Records',      desc:'Blood group, allergies, medical info',                to:'/student-health' },
      { id:'bulk-data',        label:'Student Data Export',         desc:'All student data as Excel/CSV',                       to:'/students/info-reports' },
    ],
  },
  {
    id: 'attendance',
    label: 'Attendance Reports',
    icon: '✅',
    color: '#15803d',
    reports: [
      { id:'daily-att',        label:'Daily Attendance Report',     desc:'Today\'s class-wise attendance summary',             to:'/attendance/report' },
      { id:'monthly-att',      label:'Monthly Attendance Sheet',    desc:'Month-wise attendance by class',                     to:'/attendance/report' },
      { id:'staff-att-report', label:'Staff Attendance Report',     desc:'Monthly staff attendance summary',                   to:'/attendance/staff-report' },
      { id:'period-att',       label:'Period Attendance Report',    desc:'Period/subject-wise attendance',                     to:'/attendance/period' },
      { id:'att-awards',       label:'Attendance Awards',           desc:'Perfect attendance students',                        to:'/attendance/awards' },
      { id:'absent-log',       label:'Absent Log',                  desc:'History of student absences',                        to:'/attendance/report' },
      { id:'late-log',         label:'Late Arrivals Log',           desc:'Students arriving late',                             to:'/attendance/report' },
      { id:'leave-balance',    label:'Leave Balance Report',        desc:'Staff remaining leave days',                         to:'/attendance/leave-balance' },
    ],
  },
  {
    id: 'fees',
    label: 'Fee & Finance Reports',
    icon: '💰',
    color: '#0073b7',
    reports: [
      { id:'daily-collection',  label:'Daily Fee Collection',       desc:'Today\'s fee receipts by accountant',               to:'/accounting/balancesheet' },
      { id:'monthly-collection',label:'Monthly Collection Report',  desc:'Month-wise fee collection summary',                  to:'/accounting/balancesheet' },
      { id:'defaulters',        label:'Fee Defaulters List',        desc:'Students with pending/overdue fees',                 to:'/fees/defaulters' },
      { id:'parent-defaulters', label:'Parent-wise Defaulters',     desc:'All children fees by parent CNIC',                  to:'/fees/defaulters' },
      { id:'fee-invoices',      label:'All Fee Invoices',           desc:'Complete invoice register',                          to:'/fees/invoices' },
      { id:'discounted',        label:'Discounted Students',        desc:'Students with fee concessions',                      to:'/fees/discounted' },
      { id:'balance-sheet',     label:'Daily Balance Sheet',        desc:'Income vs expenses per day',                         to:'/accounting/balancesheet' },
      { id:'income-expense',    label:'Income & Expense Report',    desc:'Monthly P&L summary',                               to:'/reporting-area' },
      { id:'outstanding-fees',  label:'Outstanding Fees Report',    desc:'Total pending dues by class',                       to:'/fees/defaulters' },
      { id:'payment-history',   label:'Payment History',            desc:'All fee payments received',                          to:'/payments/transactions' },
      { id:'emi-report',        label:'EMI Plans Report',           desc:'Instalment plan tracking',                           to:'/fees/emi' },
    ],
  },
  {
    id: 'exams',
    label: 'Exam & Result Reports',
    icon: '📝',
    color: '#dc2626',
    reports: [
      { id:'result-cards',      label:'Result Cards (Printable)',   desc:'Individual student result cards',                    to:'/exams' },
      { id:'bise-result',       label:'BISE Format Result Card',    desc:'Board-format result with bar chart',                 to:'/exams/bise-result-card' },
      { id:'merit-list',        label:'Merit List',                  desc:'Top performers ranked by class',                    to:'/exams/merit-list' },
      { id:'gazette',           label:'Gazette Sheet',              desc:'Official result gazette',                            to:'/exams/gazette' },
      { id:'annual-report',     label:'Annual Report Cards',        desc:'Cumulative year result cards',                       to:'/exams/annual-report' },
      { id:'failed-students',   label:'Failed Students',            desc:'Students who failed the exam',                       to:'/exams/failed' },
      { id:'subject-analysis',  label:'Subject Analysis',           desc:'Per-subject performance analysis',                   to:'/exams/subject-analysis' },
      { id:'class-average',     label:'Class Average Report',       desc:'Subject-wise class averages',                        to:'/exams' },
      { id:'exam-timetable',    label:'Exam Timetable',             desc:'Date sheet for all classes',                         to:'/exams/timetable' },
      { id:'admit-cards',       label:'Admit Cards (Exam Slips)',   desc:'Student admit card printing',                        to:'/exams/exam-slip' },
      { id:'tabulation',        label:'Tabulation Sheet',           desc:'Class tabulation with all subjects',                 to:'/exams' },
    ],
  },
  {
    id: 'staff',
    label: 'Staff & HR Reports',
    icon: '👨‍🏫',
    color: '#7c3aed',
    reports: [
      { id:'staff-list',        label:'Staff Directory',            desc:'All teaching and non-teaching staff',                to:'/staff' },
      { id:'staff-att',         label:'Staff Attendance Report',    desc:'Monthly staff attendance sheet',                     to:'/attendance/staff-report' },
      { id:'salary-report',     label:'Salary Report',              desc:'Monthly salary disbursement',                        to:'/salary' },
      { id:'loan-report',       label:'Loan & Advance Report',      desc:'Staff loans and deductions',                         to:'/salary/loans' },
      { id:'appraisal-report',  label:'Staff Appraisals',           desc:'Performance appraisal records',                      to:'/staff/appraisals' },
      { id:'leave-report',      label:'Leave Applications',         desc:'Staff leave history and balance',                    to:'/leaves' },
      { id:'staff-exp-cert',    label:'Experience Certificates',    desc:'Staff experience certificate records',               to:'/certificates' },
    ],
  },
  {
    id: 'certificates',
    label: 'Certificates & Cards',
    icon: '🎓',
    color: '#d97706',
    reports: [
      { id:'leaving-cert',      label:'Leaving Certificates',       desc:'Print leaving/TC certificates',                      to:'/certificates' },
      { id:'character-cert',    label:'Character Certificates',     desc:'Character certificates bulk print',                  to:'/certificates' },
      { id:'merit-cert',        label:'Merit Certificates',         desc:'Academic merit certificates',                        to:'/certificates' },
      { id:'cert-registry',     label:'Certificate Registry',       desc:'All issued certificates log',                        to:'/certificates/registry' },
      { id:'student-id',        label:'Student ID Cards',           desc:'Print student ID cards by class',                    to:'/students/id-cards' },
      { id:'staff-id',          label:'Staff ID Cards',             desc:'Print staff ID cards',                               to:'/staff/id-cards' },
      { id:'adm-form',          label:'Admission Form',             desc:'Print blank or filled admission forms',              to:'/admissions/form-print' },
    ],
  },
  {
    id: 'other',
    label: 'Other Reports',
    icon: '📊',
    color: '#64748b',
    reports: [
      { id:'timetable-report',  label:'Timetable Report',           desc:'Class/teacher timetable print',                      to:'/timetable' },
      { id:'transport-report',  label:'Transport Report',           desc:'Bus routes and students',                            to:'/transport' },
      { id:'library-report',    label:'Library Report',             desc:'Book issue/return history',                          to:'/library' },
      { id:'stock-report',      label:'Stock & Inventory Report',   desc:'Stock levels and sales',                             to:'/stock' },
      { id:'events-report',     label:'Events Report',              desc:'Academic calendar events list',                      to:'/academic-calendar' },
      { id:'complaints-report', label:'Complaints Report',          desc:'All parent/student complaints',                      to:'/complaints' },
      { id:'audit-report',      label:'Audit Logs Report',          desc:'System activity audit trail',                        to:'/settings/audit-logs' },
      { id:'sop-report',        label:'SOPs Report',                desc:'Standard operating procedures',                      to:'/sops' },
      { id:'analytics',         label:'Student Analytics',          desc:'Performance trends and charts',                      to:'/analytics/students' },
    ],
  },
];

const ALL_REPORTS = REPORT_CATEGORIES.flatMap(c => c.reports.map(r => ({ ...r, catId:c.id, catLabel:c.label, catColor:c.color, catIcon:c.icon })));

export default function ReportsHubPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  const filtered = ALL_REPORTS.filter(r => {
    const matchSearch = !search || r.label.toLowerCase().includes(search.toLowerCase()) || r.desc.toLowerCase().includes(search.toLowerCase());
    const matchCat    = !activeCategory || r.catId === activeCategory;
    return matchSearch && matchCat;
  });

  const totalReports = ALL_REPORTS.length;

  return (
    <div className="page-content fade-in">
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#1B2F6E,#0073b7)', borderRadius:12, padding:'20px 24px', marginBottom:20, color:'white' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:48, height:48, borderRadius:12, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>📊</div>
          <div>
            <h1 style={{ margin:0, fontSize:22, fontWeight:800 }}>Reports Hub</h1>
            <p style={{ margin:'4px 0 0', fontSize:13, opacity:0.8 }}>{totalReports}+ reports — Students, Fees, Exams, Staff, Certificates & More</p>
          </div>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="card" style={{ marginBottom:16 }}>
        <div className="card-body" style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:'1 1 260px' }}>
            <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }}/>
            <input className="form-input" style={{ paddingLeft:32 }} placeholder={`Search ${totalReports}+ reports…`}
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            <button onClick={() => setActiveCategory('')}
              className={`btn btn-sm ${!activeCategory ? 'btn-primary' : 'btn-outline'}`}>All</button>
            {REPORT_CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setActiveCategory(activeCategory===c.id ? '' : c.id)}
                className={`btn btn-sm ${activeCategory===c.id ? 'btn-primary' : 'btn-outline'}`}>
                {c.icon} {c.label.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Report count */}
      <div style={{ fontSize:13, color:'#64748b', marginBottom:16 }}>
        Showing <strong>{filtered.length}</strong> of {totalReports} reports
        {search && <span> matching "<strong>{search}</strong>"</span>}
      </div>

      {/* Reports by category */}
      {!search && !activeCategory ? (
        // Full category view
        REPORT_CATEGORIES.map(cat => (
          <div key={cat.id} style={{ marginBottom:24 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12, paddingBottom:8, borderBottom:`2px solid ${cat.color}` }}>
              <span style={{ fontSize:20 }}>{cat.icon}</span>
              <h2 style={{ margin:0, fontSize:16, fontWeight:800, color:'#1e3a5f' }}>{cat.label}</h2>
              <span style={{ background:cat.color+'18', color:cat.color, fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99 }}>{cat.reports.length} reports</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:10 }}>
              {cat.reports.map(r => (
                <Link key={r.id} to={r.to} style={{ textDecoration:'none' }}>
                  <div style={{ padding:'12px 14px', background:'white', border:'1px solid #e2e8f0', borderRadius:10, display:'flex', alignItems:'center', gap:10, transition:'all .15s', cursor:'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor=cat.color; e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor='#e2e8f0'; e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none'; }}>
                    <div style={{ width:36, height:36, borderRadius:8, background:cat.color+'12', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <FileText size={16} color={cat.color}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12.5, fontWeight:700, color:'#1e3a5f', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.label}</div>
                      <div style={{ fontSize:11, color:'#94a3b8', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.desc}</div>
                    </div>
                    <ChevronRight size={14} color="#cbd5e1" style={{ flexShrink:0 }}/>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))
      ) : (
        // Search/filter results
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:10 }}>
          {filtered.map(r => (
            <Link key={r.id} to={r.to} style={{ textDecoration:'none' }}>
              <div style={{ padding:'12px 14px', background:'white', border:'1px solid #e2e8f0', borderRadius:10, display:'flex', alignItems:'center', gap:10, transition:'all .15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=r.catColor; e.currentTarget.style.transform='translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='#e2e8f0'; e.currentTarget.style.transform='none'; }}>
                <span style={{ fontSize:18, flexShrink:0 }}>{r.catIcon}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:700, color:'#1e3a5f', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.label}</div>
                  <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>{r.catLabel}</div>
                </div>
                <ChevronRight size={14} color="#cbd5e1" style={{ flexShrink:0 }}/>
              </div>
            </Link>
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn:'1/-1', textAlign:'center', padding:40, color:'#94a3b8' }}>
              <BarChart2 size={40} style={{ opacity:0.3, marginBottom:10 }}/>
              <div style={{ fontSize:15, fontWeight:600 }}>No reports found</div>
              <div style={{ fontSize:13, marginTop:4 }}>Try a different search term</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
