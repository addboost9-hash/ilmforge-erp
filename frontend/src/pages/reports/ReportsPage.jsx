import { Link } from 'react-router-dom';
import { FileText, Users, CreditCard, ClipboardCheck, BookOpen, TrendingUp, Download, Award, Package, Truck, GraduationCap, Briefcase, BarChart3, Printer } from 'lucide-react';

const REPORT_CATEGORIES = [
  {
    cat: 'Students', icon: Users, color: '#2563EB',
    items: [
      { label: 'All Active Students',          href: '/api/v1/reports/students/excel?status=active',   type: 'excel' },
      { label: 'All Inactive Students',         href: '/api/v1/reports/students/excel?status=inactive', type: 'excel' },
      { label: 'Pass-out Students',             href: '/api/v1/reports/students/excel?status=passout',  type: 'excel' },
      { label: 'Gender-wise Report',            href: '/api/v1/reports/students/excel?status=active',   type: 'excel' },
      { label: 'Class-wise Student List',       to:   '/students',                                       type: 'link'  },
      { label: 'Student Attendance Summary',    to:   '/attendance/report',                              type: 'link'  },
      { label: 'Today\'s Birthdays',            to:   '/students/birthdays',                             type: 'link'  },
    ],
  },
  {
    cat: 'Finance', icon: CreditCard, color: '#15803D',
    items: [
      { label: 'Daily Balance Sheet',           href: '/api/v1/reports/fees/balance-sheet',  type: 'excel' },
      { label: 'Monthly Income Report',         href: '/api/v1/reports/fees/income',         type: 'excel' },
      { label: 'Fee Defaulters List',           to:   '/fees/defaulters',                    type: 'link'  },
      { label: 'Fee Structure',                 to:   '/fees/structure',                     type: 'link'  },
      { label: 'Expense Report',                to:   '/expenses',                           type: 'link'  },
      { label: 'Salary Report',                 to:   '/salary',                             type: 'link'  },
    ],
  },
  {
    cat: 'Attendance', icon: ClipboardCheck, color: '#DC2626',
    items: [
      { label: 'Student Attendance Sheet',      to: '/attendance/report',     type: 'link' },
      { label: 'Staff Attendance Report',       to: '/attendance/staff',      type: 'link' },
      { label: 'Barcode Scan Log',              to: '/attendance/barcode',    type: 'link' },
    ],
  },
  {
    cat: 'Exams & Results', icon: GraduationCap, color: '#7C3AED',
    items: [
      { label: 'All Exams & Tests',             to: '/exams',    type: 'link' },
      { label: 'Student Marksheets',            to: '/exams',    type: 'link' },
      { label: 'Position Holders',              to: '/exams',    type: 'link' },
    ],
  },
  {
    cat: 'Staff & HR', icon: Award, color: '#B45309',
    items: [
      { label: 'All Staff List',                to: '/staff',          type: 'link' },
      { label: 'Salary Records',                to: '/salary',         type: 'link' },
      { label: 'Staff Attendance Summary',      to: '/attendance/staff', type: 'link' },
    ],
  },
  {
    cat: 'Certificates & ID Cards', icon: FileText, color: '#0891B2',
    items: [
      { label: 'School Leaving Certificate',   type: 'print', desc: 'SLC for passing students'  },
      { label: 'Character Certificate',         type: 'print', desc: 'Good character letter'     },
      { label: 'Date of Birth Certificate',     type: 'print', desc: 'Official DOB certificate'  },
      { label: 'Experience Certificate',        type: 'print', desc: 'For outgoing staff'         },
      { label: 'Student ID Cards',              type: 'print', desc: 'Print class-wise ID cards'  },
      { label: 'Staff ID Cards',                type: 'print', desc: 'Print staff ID cards'       },
    ],
  },
  {
    cat: 'Fee Vouchers', icon: CreditCard, color: '#0D9488',
    items: [
      { label: 'Student-wise Fee Voucher',      type: 'print', desc: 'Individual voucher per student' },
      { label: 'Family Fee Voucher',            type: 'print', desc: 'All children on one voucher'    },
      { label: 'Thermal Printer Voucher',       type: 'print', desc: '80mm thermal receipt'           },
      { label: 'Fee Voucher (Current Month)',   to: '/fees/generate', type: 'link' },
    ],
  },
  {
    cat: 'Inventory', icon: Package, color: '#475569',
    items: [
      { label: 'Product Stock Report',          to: '/stock',     type: 'link' },
      { label: 'Out-of-Stock Report',           to: '/stock',     type: 'link' },
      { label: 'Monthly Sales Report',          to: '/stock',     type: 'link' },
      { label: 'Transport Routes',              to: '/transport', type: 'link' },
    ],
  },
];

export default function ReportsPage() {
  return (
    <div className="page-content fade-up">
      <div style={{ marginBottom:20 }}>
        <h1 className="page-title">Reports Center</h1>
        <p className="page-subtitle">Generate, download and print reports for all modules</p>
      </div>

      {/* Quick download bar */}
      <div className="card" style={{ marginBottom:20, background:'linear-gradient(135deg,#1E3A5F,#253d63)', padding:'18px 20px' }}>
        <div style={{ fontSize:13.5, fontWeight:700, color:'#fff', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
          <BarChart3 size={16} color="#5EEAD4"/>
          Quick Downloads
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          {[
            { label:'Active Students Excel', href:'/api/v1/reports/students/excel?status=active' },
            { label:'Daily Balance Sheet',   href:'/api/v1/reports/fees/balance-sheet'           },
            { label:'Monthly Income',        href:'/api/v1/reports/fees/income'                  },
          ].map(r => (
            <a key={r.label} href={r.href} target="_blank" rel="noreferrer"
              style={{ background:'rgba(255,255,255,0.12)', color:'#fff', padding:'7px 14px', borderRadius:7, textDecoration:'none', fontSize:12.5, fontWeight:600, display:'flex', alignItems:'center', gap:6, border:'1px solid rgba(255,255,255,0.18)' }}>
              <Download size={13}/>{r.label}
            </a>
          ))}
        </div>
      </div>

      {/* Report categories grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))', gap:14 }}>
        {REPORT_CATEGORIES.map(cat => {
          const CatIcon = cat.icon;
          return (
            <div key={cat.cat} className="card" style={{ borderTop:`3px solid ${cat.color}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <div style={{ width:36, height:36, borderRadius:9, background:cat.color+'15', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <CatIcon size={17} color={cat.color}/>
                </div>
                <h3 style={{ margin:0, fontSize:13.5, fontWeight:700, color:'#1E3A5F' }}>{cat.cat}</h3>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {cat.items.map(item => {
                  if (item.type === 'excel') return (
                    <a key={item.label} href={item.href} target="_blank" rel="noreferrer"
                      style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 11px', background:'#F8FAFC', borderRadius:7, border:'1px solid #E8EDF3', textDecoration:'none', transition:'all 0.12s', cursor:'pointer' }}
                      onMouseEnter={e=>{e.currentTarget.style.background='#F0FDF9';e.currentTarget.style.borderColor='#CCFBF1';}}
                      onMouseLeave={e=>{e.currentTarget.style.background='#F8FAFC';e.currentTarget.style.borderColor='#E8EDF3';}}>
                      <span style={{ fontSize:12.5, color:'#374151' }}>{item.label}</span>
                      <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#15803D', fontWeight:700 }}>
                        <Download size={12}/> Excel
                      </span>
                    </a>
                  );
                  if (item.type === 'print') return (
                    <div key={item.label}
                      style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 11px', background:'#F8FAFC', borderRadius:7, border:'1px solid #E8EDF3', cursor:'pointer', transition:'all 0.12s' }}
                      onMouseEnter={e=>{e.currentTarget.style.background='#FFF7ED';e.currentTarget.style.borderColor='#FED7AA';}}
                      onMouseLeave={e=>{e.currentTarget.style.background='#F8FAFC';e.currentTarget.style.borderColor='#E8EDF3';}}>
                      <div>
                        <span style={{ fontSize:12.5, color:'#374151' }}>{item.label}</span>
                        {item.desc && <div style={{ fontSize:11, color:'#94A3B8', marginTop:1 }}>{item.desc}</div>}
                      </div>
                      <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#B45309', fontWeight:700 }}>
                        <Printer size={12}/> Print
                      </span>
                    </div>
                  );
                  return (
                    <Link key={item.label} to={item.to}
                      style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 11px', background:'#F8FAFC', borderRadius:7, border:'1px solid #E8EDF3', textDecoration:'none', transition:'all 0.12s' }}
                      onMouseEnter={e=>{e.currentTarget.style.background='#EFF6FF';e.currentTarget.style.borderColor='#BFDBFE';}}
                      onMouseLeave={e=>{e.currentTarget.style.background='#F8FAFC';e.currentTarget.style.borderColor='#E8EDF3';}}>
                      <span style={{ fontSize:12.5, color:'#374151' }}>{item.label}</span>
                      <FileText size={13} color="#64748B"/>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
