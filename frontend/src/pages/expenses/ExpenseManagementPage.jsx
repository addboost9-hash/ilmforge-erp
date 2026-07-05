import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { buildWatermarkCss, buildWatermarkMarkup } from '../../utils/watermarkPrint';
import {
  TrendingDown, Plus, Tag, Printer, Edit2, Trash2, DollarSign,
  X, CheckCircle, Search, Calendar,
} from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────
const fmt      = v => 'Rs. ' + Number(v || 0).toLocaleString('en-PK');
const todayStr = () => new Date().toISOString().split('T')[0];
const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
};
const yearStart = () => new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];

// ─── storage helpers ─────────────────────────────────────────────────────────
const load = (key, seed) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return seed;
};
const save = (key, data) => {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch (_) {}
};

// ─── pre-seeded categories ───────────────────────────────────────────────────
const SEED_CATS = [
  { id: 1,  name: 'Staff Salary',  color: '#0F766E', description: 'Monthly salaries and wages'        },
  { id: 2,  name: 'Rent',          color: '#7C3AED', description: 'Building and premises rent'        },
  { id: 3,  name: 'Utilities',     color: '#2563EB', description: 'Electricity, gas, water bills'     },
  { id: 4,  name: 'Maintenance',   color: '#D97706', description: 'Repairs and maintenance work'      },
  { id: 5,  name: 'Transport',     color: '#DC2626', description: 'Vehicle and transport costs'       },
  { id: 6,  name: 'Stationery',    color: '#059669', description: 'Paper, pens and office supplies'   },
  { id: 7,  name: 'Furniture',     color: '#9333EA', description: 'Furniture and fixtures'            },
  { id: 8,  name: 'IT/Computer',   color: '#0284C7', description: 'Computers, software, IT expenses' },
  { id: 9,  name: 'Events',        color: '#E11D48', description: 'Events, functions and ceremonies'  },
  { id: 10, name: 'Miscellaneous', color: '#64748B', description: 'Other uncategorised expenses'      },
];

// ─── seed expenses ────────────────────────────────────────────────────────────
const SEED_EXPENSES = [
  { id: 1, title: 'Teacher Salaries — June',   categoryId: 1,  amount: 285000, date: todayStr(),   description: 'Monthly salaries for all teaching staff', addedBy: 'Admin' },
  { id: 2, title: 'Electricity Bill',           categoryId: 3,  amount: 12500,  date: todayStr(),   description: 'June electricity bill MEPCO',              addedBy: 'Accountant' },
  { id: 3, title: 'School Van Fuel',            categoryId: 5,  amount: 8200,   date: '2026-06-28', description: 'June fuel expenses for 3 vans',             addedBy: 'Admin' },
  { id: 4, title: 'Exam Stationery',            categoryId: 6,  amount: 4750,   date: '2026-06-25', description: 'Answer sheets, question papers',            addedBy: 'Admin' },
  { id: 5, title: 'Annual Day Decoration',      categoryId: 9,  amount: 22000,  date: '2026-06-20', description: 'Banners, lights and decor for annual day',  addedBy: 'Accountant' },
];

// ─── empty form shapes ────────────────────────────────────────────────────────
const emptyExpense = { title: '', categoryId: '', amount: '', date: todayStr(), description: '', addedBy: 'Admin' };
const emptyCat     = { name: '', color: '#0F766E', description: '' };

// ─── small reusable components ────────────────────────────────────────────────
function StatCard({ label, value, sub, bg, icon: Icon }) {
  return (
    <div style={{
      background: bg, borderRadius: 14, padding: '18px 22px',
      position: 'relative', overflow: 'hidden', minWidth: 0,
      boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
    }}>
      <div style={{ position: 'absolute', right: 16, top: 14, opacity: 0.18 }}>
        <Icon size={48} color="#fff" />
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.82)', fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Badge({ name, color }) {
  return (
    <span style={{
      background: color + '18', color, border: `1px solid ${color}44`,
      borderRadius: 20, padding: '3px 10px', fontSize: 11.5, fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>{name}</span>
  );
}

function FieldErr({ msg }) {
  return msg ? <div style={{ color: '#DC2626', fontSize: 11.5, marginTop: 3 }}>{msg}</div> : null;
}

// ─── shared style helpers ─────────────────────────────────────────────────────
const inp = {
  width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB',
  borderRadius: 8, fontSize: 13.5, outline: 'none', boxSizing: 'border-box',
  background: '#FAFAFA',
};
const lbl = { fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 5, display: 'block' };

// ─── main component ───────────────────────────────────────────────────────────
export default function ExpenseManagementPage() {
  const [activeTab, setActiveTab] = useState('expenses');

  // data
  const [expenses, setExpenses] = useState(() => load('ilmforge_expenses_v2', SEED_EXPENSES));
  const [cats, setCats]         = useState(() => load('ilmforge_expense_cats', SEED_CATS));

  useEffect(() => { save('ilmforge_expenses_v2', expenses); }, [expenses]);
  useEffect(() => { save('ilmforge_expense_cats', cats);     }, [cats]);

  // expense form
  const [expForm, setExpForm]         = useState(emptyExpense);
  const [expErrors, setExpErrors]     = useState({});
  const [editingExp, setEditingExp]   = useState(null);
  const [showExpForm, setShowExpForm] = useState(false);

  // filters
  const [filterCat, setFilterCat]   = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo]     = useState('');
  const [search, setSearch]         = useState('');

  // category form
  const [catForm, setCatForm]         = useState(emptyCat);
  const [catErrors, setCatErrors]     = useState({});
  const [editingCat, setEditingCat]   = useState(null);
  const [showCatForm, setShowCatForm] = useState(false);

  // ─── stats ──────────────────────────────────────────────────────────────────
  const td = todayStr();
  const ms = monthStart();
  const ys = yearStart();

  const todayTotal = expenses.filter(e => e.date === td).reduce((s, e) => s + Number(e.amount || 0), 0);
  const monthTotal = expenses.filter(e => e.date >= ms).reduce((s, e) => s + Number(e.amount || 0), 0);
  const yearTotal  = expenses.filter(e => e.date >= ys).reduce((s, e) => s + Number(e.amount || 0), 0);

  // ─── helpers ─────────────────────────────────────────────────────────────────
  const getCat    = id => cats.find(c => c.id === Number(id));
  const nextExpId = ()  => expenses.length ? Math.max(...expenses.map(e => e.id)) + 1 : 1;
  const nextCatId = ()  => cats.length     ? Math.max(...cats.map(c => c.id))     + 1 : 1;

  // ─── expense CRUD ─────────────────────────────────────────────────────────────
  const validateExp = () => {
    const errs = {};
    if (!expForm.title.trim())                                                   errs.title      = 'Title is required';
    if (!expForm.categoryId)                                                     errs.categoryId = 'Select a category';
    if (!expForm.amount || isNaN(expForm.amount) || Number(expForm.amount) <= 0) errs.amount     = 'Enter a valid amount';
    if (!expForm.date)                                                           errs.date       = 'Date is required';
    return errs;
  };

  const handleSaveExpense = async () => {
    const errs = validateExp();
    if (Object.keys(errs).length) { setExpErrors(errs); return; }

    const payload = { ...expForm, amount: Number(expForm.amount), categoryId: Number(expForm.categoryId) };

    try { await api.post('/expenses', payload); } catch (_) { /* localStorage fallback */ }

    if (editingExp !== null) {
      setExpenses(prev => prev.map(e => e.id === editingExp ? { ...payload, id: editingExp } : e));
      toast.success('Expense updated');
    } else {
      setExpenses(prev => [...prev, { ...payload, id: nextExpId() }]);
      toast.success('Expense added');
    }
    setExpForm(emptyExpense);
    setExpErrors({});
    setEditingExp(null);
    setShowExpForm(false);
  };

  const handleEditExp = exp => {
    setExpForm({ ...exp, categoryId: String(exp.categoryId) });
    setEditingExp(exp.id);
    setShowExpForm(true);
    setExpErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteExp = id => {
    if (!window.confirm('Delete this expense?')) return;
    setExpenses(prev => prev.filter(e => e.id !== id));
    toast.success('Expense deleted');
  };

  const handleCancelExp = () => {
    setExpForm(emptyExpense);
    setExpErrors({});
    setEditingExp(null);
    setShowExpForm(false);
  };

  // ─── category CRUD ────────────────────────────────────────────────────────────
  const validateCat = () => {
    const errs = {};
    if (!catForm.name.trim()) errs.name  = 'Category name is required';
    if (!catForm.color)       errs.color = 'Pick a colour';
    return errs;
  };

  const handleSaveCat = () => {
    const errs = validateCat();
    if (Object.keys(errs).length) { setCatErrors(errs); return; }

    if (editingCat !== null) {
      setCats(prev => prev.map(c => c.id === editingCat ? { ...catForm, id: editingCat } : c));
      toast.success('Category updated');
    } else {
      setCats(prev => [...prev, { ...catForm, id: nextCatId() }]);
      toast.success('Category added');
    }
    setCatForm(emptyCat);
    setCatErrors({});
    setEditingCat(null);
    setShowCatForm(false);
  };

  const handleEditCat = cat => {
    setCatForm({ name: cat.name, color: cat.color, description: cat.description || '' });
    setEditingCat(cat.id);
    setShowCatForm(true);
    setCatErrors({});
  };

  const handleDeleteCat = id => {
    if (expenses.some(e => e.categoryId === id)) { toast.error('Cannot delete — category is used by expenses'); return; }
    if (!window.confirm('Delete this category?')) return;
    setCats(prev => prev.filter(c => c.id !== id));
    toast.success('Category deleted');
  };

  const handleCancelCat = () => {
    setCatForm(emptyCat);
    setCatErrors({});
    setEditingCat(null);
    setShowCatForm(false);
  };

  // ─── filtered list ────────────────────────────────────────────────────────────
  const filtered = expenses.filter(e => {
    if (filterCat && String(e.categoryId) !== String(filterCat)) return false;
    if (filterFrom && e.date < filterFrom) return false;
    if (filterTo   && e.date > filterTo)   return false;
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const filteredTotal = filtered.reduce((s, e) => s + Number(e.amount || 0), 0);

  // ─── print ────────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const catLabel = filterCat ? getCat(filterCat)?.name || 'All' : 'All';
    const schoolName = localStorage.getItem('schoolName') || 'IlmForge School';
    const schoolLogo = localStorage.getItem('schoolLogoPreview') || '';
    const watermarkCss = buildWatermarkCss({ mode: 'a4', color: '#0F4C45' });
    const watermarkHtml = buildWatermarkMarkup({ logo: schoolLogo, text: schoolName });
    const rows = filtered.map((e, i) => {
      const cat = getCat(e.categoryId);
      return `<tr>
        <td>${i + 1}</td>
        <td>${e.title}</td>
        <td>${cat?.name || '—'}</td>
        <td style="text-align:right;">${fmt(e.amount)}</td>
        <td>${e.date}</td>
        <td>${e.addedBy || '—'}</td>
      </tr>`;
    }).join('');

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Expense Report</title>
      <style>
        body { font-family:Arial,sans-serif; font-size:12px; padding:20px; position:relative; overflow:hidden; }
        ${watermarkCss}
        h2   { color:#0F4C45; margin-bottom:4px; }
        p    { color:#555; margin:2px 0 12px; }
        table { width:100%; border-collapse:collapse; margin-top:12px; }
        th, td { border:1px solid #ddd; padding:7px 10px; }
        th { background:#0F4C45; color:#fff; text-align:left; }
        tr:nth-child(even) { background:#f9f9f9; }
        .total { text-align:right; padding:10px; font-weight:bold; font-size:13px; }
        h2, p, table, .total { position:relative; z-index:1; }
      </style></head><body>
      ${watermarkHtml}
      <h2>Expense Report</h2>
      <p>Category: ${catLabel} &nbsp;|&nbsp; Period: ${filterFrom || 'All'} – ${filterTo || 'All'}</p>
      <table>
        <thead><tr><th>#</th><th>Title</th><th>Category</th><th>Amount</th><th>Date</th><th>Added By</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="total">Total: ${fmt(filteredTotal)}</div>
      </body></html>`);
    win.document.close();
    win.print();
  };

  // ─── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="page-content fade-in">

      {/* page header */}
      <div style={{ marginBottom: 22 }}>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <TrendingDown size={26} color="#DC2626" /> Expense Management
        </h1>
        <p style={{ color: '#64748B', fontSize: 13, marginTop: 3 }}>
          Track, categorise, and manage all school expenses in one place.
        </p>
      </div>

      {/* tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid #E5E7EB' }}>
        {[
          { key: 'expenses',   label: 'Add / Manage Expenses', icon: TrendingDown },
          { key: 'categories', label: 'Expense Categories',    icon: Tag },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 20px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
              border: 'none', background: 'none',
              borderBottom: activeTab === key ? '2.5px solid #DC2626' : '2.5px solid transparent',
              color: activeTab === key ? '#DC2626' : '#6B7280',
              marginBottom: -2,
            }}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════
          TAB 1 — ADD / MANAGE EXPENSES
      ═══════════════════════════════════ */}
      {activeTab === 'expenses' && (
        <>
          {/* stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
            <StatCard
              label="Today's Expenses"
              value={fmt(todayTotal)}
              sub={`${expenses.filter(e => e.date === td).length} entries today`}
              bg="linear-gradient(135deg,#DC2626,#EF4444)"
              icon={TrendingDown}
            />
            <StatCard
              label="This Month"
              value={fmt(monthTotal)}
              sub={`Since ${new Date(ms).toLocaleString('default',{month:'long',year:'numeric'})}`}
              bg="linear-gradient(135deg,#7C3AED,#9333EA)"
              icon={DollarSign}
            />
            <StatCard
              label="This Year"
              value={fmt(yearTotal)}
              sub={`Jan – Dec ${new Date().getFullYear()}`}
              bg="linear-gradient(135deg,#0F766E,#14B8A6)"
              icon={DollarSign}
            />
          </div>

          {/* add / edit expense form card */}
          <div className="card" style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                <Plus size={18} color="#DC2626" />
                {editingExp !== null ? 'Edit Expense' : 'Add New Expense'}
              </h3>
              {!showExpForm && (
                <button
                  className="btn-primary"
                  style={{ background: '#DC2626', padding: '8px 18px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => { setShowExpForm(true); setEditingExp(null); setExpForm(emptyExpense); setExpErrors({}); }}
                >
                  <Plus size={14} /> Add Expense
                </button>
              )}
            </div>

            {showExpForm && (
              <div style={{ marginTop: 18, borderTop: '1px solid #F3F4F6', paddingTop: 18 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>

                  <div>
                    <label style={lbl}>Expense Title <span style={{ color: '#DC2626' }}>*</span></label>
                    <input
                      style={inp} placeholder="e.g. Electricity Bill" value={expForm.title}
                      onChange={e => { setExpForm(f => ({ ...f, title: e.target.value })); setExpErrors(v => ({ ...v, title: '' })); }}
                    />
                    <FieldErr msg={expErrors.title} />
                  </div>

                  <div>
                    <label style={lbl}>Category <span style={{ color: '#DC2626' }}>*</span></label>
                    <select
                      style={inp} value={expForm.categoryId}
                      onChange={e => { setExpForm(f => ({ ...f, categoryId: e.target.value })); setExpErrors(v => ({ ...v, categoryId: '' })); }}
                    >
                      <option value="">— Select Category —</option>
                      {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <FieldErr msg={expErrors.categoryId} />
                  </div>

                  <div>
                    <label style={lbl}>Amount (Rs.) <span style={{ color: '#DC2626' }}>*</span></label>
                    <input
                      style={inp} type="number" min="0" placeholder="0" value={expForm.amount}
                      onChange={e => { setExpForm(f => ({ ...f, amount: e.target.value })); setExpErrors(v => ({ ...v, amount: '' })); }}
                    />
                    <FieldErr msg={expErrors.amount} />
                  </div>

                  <div>
                    <label style={lbl}>Date <span style={{ color: '#DC2626' }}>*</span></label>
                    <input
                      style={inp} type="date" value={expForm.date}
                      onChange={e => { setExpForm(f => ({ ...f, date: e.target.value })); setExpErrors(v => ({ ...v, date: '' })); }}
                    />
                    <FieldErr msg={expErrors.date} />
                  </div>

                  <div>
                    <label style={lbl}>Added By</label>
                    <input
                      style={inp} placeholder="Admin" value={expForm.addedBy}
                      onChange={e => setExpForm(f => ({ ...f, addedBy: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label style={lbl}>Description / Receipt Note</label>
                    <input
                      style={inp} placeholder="Optional notes or receipt number" value={expForm.description}
                      onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))}
                    />
                  </div>

                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                  <button
                    className="btn-primary"
                    style={{ background: '#DC2626', padding: '9px 22px', display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={handleSaveExpense}
                  >
                    <CheckCircle size={14} />
                    {editingExp !== null ? 'Update Expense' : 'Save Expense'}
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ padding: '9px 18px', display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={handleCancelExp}
                  >
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* filters toolbar */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, flex: 1 }}>

                {/* search */}
                <div style={{ position: 'relative', minWidth: 200 }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                  <input
                    style={{ ...inp, paddingLeft: 32, minWidth: 180 }}
                    placeholder="Search expenses…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>

                {/* category filter */}
                <select style={{ ...inp, minWidth: 160 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                  <option value="">All Categories</option>
                  {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                {/* date range */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={14} color="#9CA3AF" />
                  <input style={{ ...inp, width: 136 }} type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
                  <span style={{ color: '#9CA3AF', fontSize: 12 }}>–</span>
                  <input style={{ ...inp, width: 136 }} type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
                </div>

                {(filterCat || filterFrom || filterTo || search) && (
                  <button
                    className="btn-secondary"
                    style={{ padding: '7px 14px', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 5 }}
                    onClick={() => { setFilterCat(''); setFilterFrom(''); setFilterTo(''); setSearch(''); }}
                  >
                    <X size={12} /> Clear
                  </button>
                )}
              </div>

              {/* print */}
              <button
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={handlePrint}
              >
                <Printer size={14} /> Print
              </button>
            </div>

            <div style={{ marginTop: 10, fontSize: 12.5, color: '#6B7280' }}>
              Showing <strong>{filtered.length}</strong> expense{filtered.length !== 1 ? 's' : ''} &nbsp;|&nbsp;
              Total: <strong style={{ color: '#DC2626' }}>{fmt(filteredTotal)}</strong>
            </div>
          </div>

          {/* expenses table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: '1.5px solid #E5E7EB' }}>
                    {['#', 'Title', 'Category', 'Amount', 'Date', 'Added By', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: h === 'Amount' ? 'right' : 'left', fontWeight: 700, color: '#374151', fontSize: 12, letterSpacing: 0.3 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '44px 0', color: '#9CA3AF', fontSize: 14 }}>
                        No expenses found. Adjust filters or add a new expense.
                      </td>
                    </tr>
                  )}
                  {filtered.map((exp, i) => {
                    const cat = getCat(exp.categoryId);
                    return (
                      <tr
                        key={exp.id}
                        style={{ borderBottom: '1px solid #F3F4F6' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}
                      >
                        <td style={{ padding: '11px 16px', color: '#9CA3AF', fontWeight: 600 }}>{i + 1}</td>
                        <td style={{ padding: '11px 16px' }}>
                          <div style={{ fontWeight: 600, color: '#1F2937' }}>{exp.title}</div>
                          {exp.description && (
                            <div style={{ fontSize: 11.5, color: '#9CA3AF', marginTop: 2 }}>{exp.description}</div>
                          )}
                        </td>
                        <td style={{ padding: '11px 16px' }}>
                          {cat ? <Badge name={cat.name} color={cat.color} /> : <span style={{ color: '#9CA3AF' }}>—</span>}
                        </td>
                        <td style={{ padding: '11px 16px', textAlign: 'right', fontWeight: 700, color: '#DC2626' }}>
                          {fmt(exp.amount)}
                        </td>
                        <td style={{ padding: '11px 16px', color: '#374151' }}>{exp.date}</td>
                        <td style={{ padding: '11px 16px', color: '#374151' }}>{exp.addedBy || '—'}</td>
                        <td style={{ padding: '11px 16px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => handleEditExp(exp)}
                              style={{ padding: '5px 10px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 6, cursor: 'pointer', color: '#2563EB', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                            >
                              <Edit2 size={12} /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteExp(exp.id)}
                              style={{ padding: '5px 10px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, cursor: 'pointer', color: '#DC2626', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════
          TAB 2 — EXPENSE CATEGORIES
      ═══════════════════════════════════ */}
      {activeTab === 'categories' && (
        <>
          {/* header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div style={{ fontSize: 13.5, color: '#64748B' }}>
              <Tag size={14} style={{ marginRight: 5, verticalAlign: 'middle', color: '#7C3AED' }} />
              <strong style={{ color: '#1F2937' }}>{cats.length}</strong> categories defined
            </div>
            {!showCatForm && (
              <button
                className="btn-primary"
                style={{ background: '#7C3AED', padding: '9px 20px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => { setShowCatForm(true); setEditingCat(null); setCatForm(emptyCat); setCatErrors({}); }}
              >
                <Plus size={14} /> Add Category
              </button>
            )}
          </div>

          {/* category form */}
          {showCatForm && (
            <div className="card" style={{ marginBottom: 20, borderLeft: '3.5px solid #7C3AED' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag size={16} color="#7C3AED" />
                {editingCat !== null ? 'Edit Category' : 'New Category'}
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 1fr', gap: 14, alignItems: 'start' }}>

                <div>
                  <label style={lbl}>Category Name <span style={{ color: '#DC2626' }}>*</span></label>
                  <input
                    style={inp} placeholder="e.g. Staff Salary" value={catForm.name}
                    onChange={e => { setCatForm(f => ({ ...f, name: e.target.value })); setCatErrors(v => ({ ...v, name: '' })); }}
                  />
                  <FieldErr msg={catErrors.name} />
                </div>

                <div>
                  <label style={lbl}>Color <span style={{ color: '#DC2626' }}>*</span></label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="color" value={catForm.color}
                      onChange={e => { setCatForm(f => ({ ...f, color: e.target.value })); setCatErrors(v => ({ ...v, color: '' })); }}
                      style={{ width: 44, height: 38, borderRadius: 8, border: '1.5px solid #E5E7EB', cursor: 'pointer', padding: 2 }}
                    />
                    <span style={{ fontSize: 12, color: '#6B7280', fontFamily: 'monospace' }}>{catForm.color}</span>
                  </div>
                  <FieldErr msg={catErrors.color} />
                </div>

                <div>
                  <label style={lbl}>Description</label>
                  <input
                    style={inp} placeholder="Optional short description" value={catForm.description}
                    onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>

              </div>

              {/* live preview */}
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12.5, color: '#6B7280' }}>Preview:</span>
                <Badge name={catForm.name || 'Category Name'} color={catForm.color} />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <button
                  className="btn-primary"
                  style={{ background: '#7C3AED', padding: '9px 22px', display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={handleSaveCat}
                >
                  <CheckCircle size={14} />
                  {editingCat !== null ? 'Update Category' : 'Save Category'}
                </button>
                <button
                  className="btn-secondary"
                  style={{ padding: '9px 18px', display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={handleCancelCat}
                >
                  <X size={14} /> Cancel
                </button>
              </div>
            </div>
          )}

          {/* categories table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: '1.5px solid #E5E7EB' }}>
                    {['#', 'Category', 'Color', 'Description', 'Expenses', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#374151', fontSize: 12, letterSpacing: 0.3 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cats.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF', fontSize: 14 }}>
                        No categories yet. Click "Add Category" to create one.
                      </td>
                    </tr>
                  )}
                  {cats.map((cat, i) => {
                    const expCount = expenses.filter(e => e.categoryId === cat.id).length;
                    const catTotal = expenses.filter(e => e.categoryId === cat.id).reduce((s, e) => s + Number(e.amount || 0), 0);
                    const inUse    = expCount > 0;
                    return (
                      <tr
                        key={cat.id}
                        style={{ borderBottom: '1px solid #F3F4F6' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}
                      >
                        <td style={{ padding: '12px 16px', color: '#9CA3AF', fontWeight: 600 }}>{i + 1}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <Badge name={cat.name} color={cat.color} />
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 20, height: 20, borderRadius: 5, background: cat.color, border: '1.5px solid #E5E7EB', flexShrink: 0 }} />
                            <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#6B7280' }}>{cat.color}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#6B7280', fontSize: 13 }}>
                          {cat.description || <span style={{ color: '#D1D5DB' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, color: '#1F2937' }}>{expCount}</div>
                          {catTotal > 0 && <div style={{ fontSize: 11.5, color: '#DC2626', marginTop: 2 }}>{fmt(catTotal)}</div>}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => handleEditCat(cat)}
                              style={{ padding: '5px 10px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 6, cursor: 'pointer', color: '#2563EB', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                            >
                              <Edit2 size={12} /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteCat(cat.id)}
                              disabled={inUse}
                              title={inUse ? 'Category is in use — cannot delete' : 'Delete category'}
                              style={{
                                padding: '5px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
                                background: inUse ? '#F3F4F6' : '#FEF2F2',
                                border: `1px solid ${inUse ? '#E5E7EB' : '#FECACA'}`,
                                color: inUse ? '#9CA3AF' : '#DC2626',
                                cursor: inUse ? 'not-allowed' : 'pointer',
                              }}
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '12px 18px', background: '#F9FAFB', borderTop: '1px solid #F3F4F6', fontSize: 12, color: '#9CA3AF' }}>
              Categories with active expenses cannot be deleted. Remove or reassign those expenses first.
            </div>
          </div>
        </>
      )}

    </div>
  );
}
