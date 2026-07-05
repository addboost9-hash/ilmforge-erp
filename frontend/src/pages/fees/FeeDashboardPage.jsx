import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import {
  Search, Scan, AlertCircle, DollarSign,
  TrendingUp, TrendingDown, Wallet, CreditCard
} from 'lucide-react';

const money = v => 'Rs. ' + ((v || 0) / 100).toLocaleString();
const moneyRaw = v => 'Rs. ' + ((v || 0)).toLocaleString();

/* ── Stat Card ─────────────────────────────────────────── */
const StatCard = ({ bg, value, label, sub, icon: Icon }) => (
  <div style={{
    background: bg,
    borderRadius: 10,
    padding: '18px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    color: '#fff',
    minHeight: 90,
  }}>
    <div style={{
      width: 48, height: 48, borderRadius: 10,
      background: 'rgba(255,255,255,0.22)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Icon size={24} color="#fff" />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, marginBottom: 4 }}>
        {value ?? '—'}
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 700, opacity: 0.95, marginBottom: 2 }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: 11, opacity: 0.8 }}>{sub}</div>
      )}
    </div>
  </div>
);

/* ── Section Banner ─────────────────────────────────────── */
const SectionBanner = ({ color, children }) => (
  <div style={{
    background: color,
    borderRadius: '8px 8px 0 0',
    padding: '9px 16px',
    display: 'flex', alignItems: 'center', gap: 8,
    fontWeight: 700, fontSize: 13.5, color: '#fff',
  }}>
    {children}
  </div>
);

/* ── Search Box ─────────────────────────────────────────── */
const SearchBox = ({ icon: Icon, placeholder, value, onChange, onSearch, loading }) => (
  <div style={{
    background: '#fff',
    border: '1px solid #E8EDF3',
    borderRadius: '0 0 8px 8px',
    padding: '14px 16px',
    display: 'flex', alignItems: 'center', gap: 10,
    borderTop: 'none',
  }}>
    <div style={{
      width: 46, height: 46, borderRadius: 8,
      background: '#F1F5F9',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      border: '1px solid #E2E8F0',
    }}>
      <Icon size={20} color="#94a3b8" />
    </div>
    <input
      style={{
        flex: 1, border: '1.5px solid #E2E8F0', borderRadius: 7,
        padding: '9px 14px', fontSize: 13.5, outline: 'none',
        color: '#374151', background: '#FAFAFA',
      }}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => e.key === 'Enter' && onSearch()}
    />
    <button
      onClick={onSearch}
      disabled={loading}
      style={{
        background: 'linear-gradient(135deg, #F97316, #EA580C)',
        color: '#fff', border: 'none', borderRadius: 7,
        padding: '9px 18px', fontWeight: 700, fontSize: 13,
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        flexShrink: 0, whiteSpace: 'nowrap',
      }}
    >
      <Search size={14} /> {loading ? 'Searching...' : 'Search'}
    </button>
  </div>
);

export default function FeeDashboardPage() {
  /* ── State ─────────────────────────────────────────────── */
  const [nameQuery, setNameQuery] = useState('');
  const [cnicQuery, setCnicQuery] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [cnicSearch, setCnicSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  /* ── Queries ───────────────────────────────────────────── */
  const { data: dashStats } = useQuery({
    queryKey: ['fee-dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data.data),
    staleTime: 60_000,
  });

  const { data: nameResults, isFetching: nameLoading } = useQuery({
    queryKey: ['fee-name-search', nameSearch],
    queryFn: () =>
      nameSearch.length > 1
        ? api.get('/students', { params: { search: nameSearch, limit: 10 } }).then(r => r.data.data)
        : Promise.resolve([]),
    enabled: nameSearch.length > 1,
  });

  const { data: cnicResults, isFetching: cnicLoading } = useQuery({
    queryKey: ['fee-cnic-search', cnicSearch],
    queryFn: () =>
      cnicSearch.length > 3
        ? api.get('/students', { params: { search: cnicSearch, limit: 10 } }).then(r => r.data.data)
        : Promise.resolve([]),
    enabled: cnicSearch.length > 3,
  });

  const { data: studentFee } = useQuery({
    queryKey: ['fee-dashboard-student', selectedStudent?.id],
    queryFn: () => api.get('/fees/student/' + selectedStudent.id).then(r => r.data.data),
    enabled: !!selectedStudent,
  });

  const { data: latestPayments } = useQuery({
    queryKey: ['fee-latest-payments'],
    queryFn: () => api.get('/fees/payments', { params: { limit: 15, sort: 'desc' } }).then(r => r.data.data),
    staleTime: 30_000,
  });

  /* ── Derived Stats ─────────────────────────────────────── */
  const unpaidCount = dashStats?.unpaidInvoices ?? dashStats?.fees?.unpaidCount ?? '—';
  const incomeToday = dashStats?.incomeToday ?? dashStats?.fees?.incomeToday ?? 0;
  const expenseToday = dashStats?.expenseToday ?? dashStats?.fees?.expenseToday ?? 0;
  const balanceToday = (typeof incomeToday === 'number' && typeof expenseToday === 'number')
    ? incomeToday - expenseToday
    : '—';

  /* ── Session ───────────────────────────────────────────── */
  const session = localStorage.getItem('session') || '2025-2026';

  return (
    <div className="page-content fade-in">

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Fee Dashboard</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>
            Quick fee collection, search students, and view today's stats
          </p>
        </div>
      </div>

      {/* ── 4 Stat Cards (2x2 grid) ────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 12, marginBottom: 20,
      }}>
        <StatCard
          bg="linear-gradient(135deg, #EF4444, #DC2626)"
          icon={AlertCircle}
          value={typeof unpaidCount === 'number' ? unpaidCount : unpaidCount}
          label="Unpaid Invoices"
          sub="Current Campus"
        />
        <StatCard
          bg="linear-gradient(135deg, #22C55E, #16A34A)"
          icon={TrendingUp}
          value={typeof incomeToday === 'number' ? moneyRaw(incomeToday / 100) : '—'}
          label="Income Today"
          sub="Only by you"
        />
        <StatCard
          bg="linear-gradient(135deg, #F59E0B, #D97706)"
          icon={TrendingDown}
          value={typeof expenseToday === 'number' ? moneyRaw(expenseToday / 100) : '—'}
          label="Expense Today"
          sub="Only by you"
        />
        <StatCard
          bg="linear-gradient(135deg, #3B82F6, #2563EB)"
          icon={Wallet}
          value={typeof balanceToday === 'number' ? moneyRaw(balanceToday / 100) : '—'}
          label="Balance Today"
          sub="Limited to you"
        />
      </div>

      {/* ── Search by Name / Code ──────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <SectionBanner color="#EAB308">
          <span style={{ fontSize: 16 }}>&#8853;</span>
          Search Student By Name / Code
        </SectionBanner>
        <SearchBox
          icon={Search}
          placeholder="Type Student Name or Code"
          value={nameQuery}
          onChange={setNameQuery}
          onSearch={() => setNameSearch(nameQuery)}
          loading={nameLoading}
        />

        {/* Name search results */}
        {nameSearch.length > 1 && (
          <div style={{
            border: '1px solid #E2E8F0', borderTop: 'none',
            borderRadius: '0 0 8px 8px', background: '#fff',
            overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.07)',
          }}>
            {nameLoading && (
              <div style={{ padding: '10px 16px', color: '#94a3b8', fontSize: 13 }}>Searching...</div>
            )}
            {!nameLoading && (nameResults || []).length === 0 && (
              <div style={{ padding: '10px 16px', color: '#94a3b8', fontSize: 13 }}>No students found</div>
            )}
            {(nameResults || []).map(s => (
              <div
                key={s.id}
                onClick={() => { setSelectedStudent(s); setNameQuery(s.name); setNameSearch(''); }}
                style={{
                  padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #F1F5F9',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13,
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#FFF7ED'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              >
                <div>
                  <span style={{ fontWeight: 700, color: '#1E3A5F' }}>{s.name}</span>
                  {s.fatherName && (
                    <span style={{ color: '#64748B', marginLeft: 8, fontSize: 12 }}>— {s.fatherName}</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {s.rollNo && <span className="badge badge-teal">{s.rollNo}</span>}
                  {s.class?.name && <span className="badge badge-blue">{s.class.name}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Selected student fee info */}
        {selectedStudent && studentFee && (
          <div style={{
            background: '#F0FDF4', border: '1px solid #BBF7D0',
            borderRadius: 8, padding: 14, marginTop: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'linear-gradient(135deg,#16A34A,#15803D)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: 15,
              }}>
                {selectedStudent.name?.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#14532D' }}>
                  {studentFee.student?.name || selectedStudent.name}
                </div>
                <div style={{ fontSize: 11.5, color: '#166534' }}>
                  Roll: <strong>{studentFee.student?.rollNo || '—'}</strong>
                  {studentFee.student?.class?.name && <> | Class: <strong>{studentFee.student.class.name}</strong></>}
                </div>
              </div>
              <button
                onClick={() => { setSelectedStudent(null); setNameQuery(''); }}
                style={{
                  marginLeft: 'auto', background: '#FEE2E2', border: 'none', borderRadius: 6,
                  padding: '4px 10px', fontSize: 12, color: '#DC2626', cursor: 'pointer', fontWeight: 600,
                }}
              >
                Clear
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: '#DCFCE7' }}>
                    {['Fee Title', 'Month', 'Total', 'Paid', 'Due', 'Status'].map(h => (
                      <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 700, color: '#14532D', borderBottom: '1px solid #BBF7D0' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(studentFee.invoices || []).slice(0, 5).map(inv => (
                    <tr key={inv.id} style={{ borderBottom: '1px solid #D1FAE5' }}>
                      <td style={{ padding: '6px 10px', fontWeight: 600, color: '#1E3A5F' }}>{inv.feeTitle}</td>
                      <td style={{ padding: '6px 10px', color: '#64748B' }}>{inv.month} {inv.year}</td>
                      <td style={{ padding: '6px 10px' }}>{money(inv.totalAmount)}</td>
                      <td style={{ padding: '6px 10px', color: '#15803D', fontWeight: 600 }}>{money(inv.paidAmount)}</td>
                      <td style={{ padding: '6px 10px', color: inv.dueAmount > 0 ? '#DC2626' : '#15803D', fontWeight: 700 }}>
                        {money(inv.dueAmount)}
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        <span className={`badge ${inv.status === 'paid' ? 'badge-green' : inv.status === 'partial' ? 'badge-amber' : 'badge-red'}`}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!studentFee.invoices || studentFee.invoices.length === 0) && (
                    <tr>
                      <td colSpan={6} style={{ padding: '12px 10px', textAlign: 'center', color: '#94a3b8' }}>
                        No invoices found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Barcode / Scan Section ─────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12,
        padding: '22px 20px', marginBottom: 16, gap: 20,
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg, #FF6B6B, #EF4444)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 6px 20px rgba(239,68,68,0.35)', flexShrink: 0,
        }}>
          <Scan size={38} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1E3A5F', marginBottom: 4 }}>
            Scan Fee Slip For Quick Payment...!
          </div>
          <div style={{ fontSize: 12.5, color: '#64748B', lineHeight: 1.5 }}>
            Place the fee slip barcode under the scanner to instantly load the student's fee record
            and collect payment without typing.
          </div>
        </div>
      </div>

      {/* ── Search by Parent ID / CNIC ─────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <SectionBanner color="#EAB308">
          <span style={{ fontSize: 16 }}>&#8853;</span>
          Search Student By Parent ID / CNIC
        </SectionBanner>
        <SearchBox
          icon={CreditCard}
          placeholder="Type Father's CNIC / Par..."
          value={cnicQuery}
          onChange={setCnicQuery}
          onSearch={() => setCnicSearch(cnicQuery)}
          loading={cnicLoading}
        />

        {/* CNIC search results */}
        {cnicSearch.length > 3 && (
          <div style={{
            border: '1px solid #E2E8F0', borderTop: 'none',
            borderRadius: '0 0 8px 8px', background: '#fff',
            overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.07)',
          }}>
            {cnicLoading && (
              <div style={{ padding: '10px 16px', color: '#94a3b8', fontSize: 13 }}>Searching...</div>
            )}
            {!cnicLoading && (cnicResults || []).length === 0 && (
              <div style={{ padding: '10px 16px', color: '#94a3b8', fontSize: 13 }}>No students found</div>
            )}
            {(cnicResults || []).map(s => (
              <div
                key={s.id}
                onClick={() => { setSelectedStudent(s); setCnicQuery(s.fatherName || s.name); setCnicSearch(''); }}
                style={{
                  padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #F1F5F9',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13,
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#FFF7ED'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              >
                <div>
                  <span style={{ fontWeight: 700, color: '#1E3A5F' }}>{s.name}</span>
                  {s.fatherCnic && (
                    <span style={{ color: '#64748B', marginLeft: 8, fontSize: 12 }}>CNIC: {s.fatherCnic}</span>
                  )}
                  {s.fatherName && (
                    <span style={{ color: '#64748B', marginLeft: 8, fontSize: 12 }}>Father: {s.fatherName}</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {s.rollNo && <span className="badge badge-teal">{s.rollNo}</span>}
                  {s.class?.name && <span className="badge badge-blue">{s.class.name}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Latest Payments ─────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <SectionBanner color="#16A34A">
          <span style={{ fontSize: 16 }}>&#8853;</span>
          Latest Payments
        </SectionBanner>
        <div style={{
          background: '#fff', border: '1px solid #E2E8F0',
          borderRadius: '0 0 8px 8px', borderTop: 'none', overflow: 'hidden',
        }}>
          {/* Scrollbar progress indicator */}
          <div style={{
            height: 4, background: '#F1F5F9', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, height: '100%', width: '35%',
              background: 'linear-gradient(90deg, #7C3AED, #A855F7)',
              borderRadius: 2,
            }} />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['ROLL', 'STUDENT', 'PARENT', 'CLASS', 'TITLE', 'PAID'].map(h => (
                    <th key={h} style={{
                      padding: '9px 14px', textAlign: 'left', fontWeight: 700,
                      color: '#374151', borderBottom: '1.5px solid #E2E8F0',
                      fontSize: 11.5, letterSpacing: '0.03em', textTransform: 'uppercase',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(latestPayments || []).length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '28px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                      No records found
                    </td>
                  </tr>
                )}
                {(latestPayments || []).map((p, i) => (
                  <tr
                    key={p.id || i}
                    style={{ borderBottom: '1px solid #F1F5F9' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td style={{ padding: '8px 14px', color: '#64748B', fontWeight: 600 }}>
                      {p.student?.rollNo || p.rollNo || '—'}
                    </td>
                    <td style={{ padding: '8px 14px', fontWeight: 700, color: '#1E3A5F' }}>
                      {p.student?.name || p.studentName || '—'}
                    </td>
                    <td style={{ padding: '8px 14px', color: '#64748B' }}>
                      {p.student?.fatherName || p.parentName || '—'}
                    </td>
                    <td style={{ padding: '8px 14px' }}>
                      {p.student?.class?.name || p.className
                        ? <span className="badge badge-blue">{p.student?.class?.name || p.className}</span>
                        : <span style={{ color: '#94a3b8' }}>—</span>
                      }
                    </td>
                    <td style={{ padding: '8px 14px', color: '#374151' }}>
                      {p.invoice?.feeTitle || p.feeTitle || '—'}
                    </td>
                    <td style={{ padding: '8px 14px', fontWeight: 700, color: '#15803D' }}>
                      {money(p.amountPaid || p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Important Note ──────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)',
        border: '1px solid #BFDBFE', borderRadius: 10,
        padding: '16px 20px', marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <DollarSign size={18} color="#2563EB" />
          <span style={{ fontWeight: 800, fontSize: 14, color: '#1D4ED8' }}>Important Note</span>
        </div>
        <ul style={{ margin: 0, paddingLeft: 20, color: '#1E40AF', fontSize: 13, lineHeight: 1.9 }}>
          <li>
            To collect a fee, first <strong>search the student by name, roll number, or father's CNIC</strong> using the search boxes above.
          </li>
          <li>
            Once a student is selected, their outstanding fee invoices will appear — click <strong>Collect</strong> on any invoice to record a payment.
          </li>
          <li>
            Income, Expense, and Balance stats are <strong>limited to your own transactions</strong> for this session and campus.
          </li>
          <li>
            For bulk fee generation or viewing defaulters, use the <strong>Fee Management</strong> sub-pages from the sidebar.
          </li>
        </ul>
      </div>

      {/* ── Running Session ─────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        padding: '10px 0',
      }}>
        <div style={{
          background: '#1E3A5F', color: '#fff', borderRadius: 8,
          padding: '8px 24px', fontSize: 13.5, fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
          userSelect: 'none',
        }}>
          Running Session: {session}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

    </div>
  );
}
