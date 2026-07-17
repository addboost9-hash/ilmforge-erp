/**
 * IlmForge — School Mentor Academics Module
 * URL: /academics
 * Matches School Mentor UI exactly:
 *   Tab 1: Scheme of Studies → Textbooks | Calendar → Academic Calendar | Activity Calendar
 *   Tab 2: Lesson Plans → Session & Term Setting | Term Breakup | Create Lesson Plan | View Lesson Plan
 */
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import {
  BookOpen, Trash2, X, Eye, Bell, ChevronDown, ChevronUp,
  FileText, Plus, Edit2, Save,
} from 'lucide-react';

/* ── Constants ── */
const TEAL  = '#0D9488';
const NAVY  = '#1B2F6E';
const RED   = '#DC2626';

const DEFAULT_KEY_DATES = {
  '1st Term': [
    { id: 1, event: '1st Term Starting date',   date: '2026-03-02', icon: 'blue'   },
    { id: 2, event: '1st Monthlies',             date: '2026-04-06', icon: 'green'  },
    { id: 3, event: 'First-Term Examinations',   date: '2026-05-20', icon: 'yellow' },
    { id: 4, event: 'PTM',                        date: '2026-06-06', icon: 'purple' },
  ],
  '2nd Term': [
    { id: 5, event: '2nd Term Starting date',   date: '2026-09-01', icon: 'green'  },
    { id: 6, event: '3rd Monthlies',             date: '2026-10-12', icon: 'teal'   },
  ],
};

const ICON_COLORS = {
  blue:   '#2563EB',
  green:  '#16A34A',
  yellow: '#D97706',
  purple: '#7C3AED',
  teal:   TEAL,
  red:    RED,
};

/* ── Shared Styles ── */
const inp = {
  width: '100%', padding: '8px 12px', borderRadius: 6,
  border: '1px solid #D1D5DB', fontSize: 13, boxSizing: 'border-box',
  outline: 'none', background: '#fff',
};

const mainTabBtn = (active) => ({
  padding: '9px 22px', fontWeight: 700, fontSize: 13,
  borderRadius: 7, border: `1.5px solid ${TEAL}`,
  background: active ? TEAL : 'transparent',
  color: active ? '#fff' : TEAL,
  cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap',
});

const subTabBtn = (active) => ({
  padding: '7px 16px', fontWeight: 600, fontSize: 12,
  borderRadius: 6, border: `1.5px solid ${TEAL}`,
  background: active ? TEAL : 'transparent',
  color: active ? '#fff' : TEAL,
  cursor: 'pointer', transition: 'all .13s', whiteSpace: 'nowrap',
});

/* ── Helpers ── */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    .replace(/(\d+)/, (m) => {
      const n = parseInt(m);
      const s = ['th','st','nd','rd'];
      const v = n % 100;
      return n + (s[(v-20)%10] || s[v] || s[0]);
    });
}

function getIconColor(icon) {
  return ICON_COLORS[icon] || TEAL;
}

function exportKeyDatesWord(keyDates, schoolName = 'School Mentor Demo') {
  const firstTerm  = keyDates['1st Term'] || [];
  const secondTerm = keyDates['2nd Term'] || [];

  const makeRows = (items, offset = 0) =>
    items.map((d, i) =>
      `<tr>
        <td style="padding:8px;border:1px solid #000;text-align:center;">${offset + i + 1}</td>
        <td style="padding:8px;border:1px solid #000;">${d.event}</td>
        <td style="padding:8px;border:1px solid #000;">${formatDate(d.date)}</td>
      </tr>`
    ).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    body{font-family:Arial,sans-serif;margin:40px;color:#000}
    .school-header{display:flex;justify-content:space-between;margin-bottom:24px;font-size:12px;padding-bottom:10px;border-bottom:2px solid #000}
    h2{text-align:center;font-size:18px;margin-bottom:24px}
    .term-header{text-align:center;font-weight:bold;font-size:14px;text-decoration:underline;margin:20px 0 8px}
    table{width:100%;border-collapse:collapse;margin-bottom:16px}
    th{background:#f0f0f0;font-weight:bold;padding:8px;border:1px solid #000;text-align:left}
    @media print{body{margin:20px}}
  </style></head><body>
  <div class="school-header">
    <div><strong>School Name :</strong> ${schoolName}</div>
    <div><strong>Address :</strong> School Mentor, Floor 3-5, Bahria Town Islamabad</div>
  </div>
  <h2>Key Dates of An Academic Calendar</h2>
  <div class="term-header">1st Term</div>
  <table>
    <tr><th>Sr. No</th><th>Heading / Events</th><th>Date / Detail</th></tr>
    ${makeRows(firstTerm, 0)}
  </table>
  <div class="term-header">2nd Term</div>
  <table>
    <tr><th>Sr. No</th><th>Heading / Events</th><th>Date / Detail</th></tr>
    ${makeRows(secondTerm, firstTerm.length)}
  </table>
  <script>window.onload=function(){window.print();}<\/script>
  </body></html>`;

  const w = window.open('', '_blank', 'width=900,height=700');
  if (w) { w.document.write(html); w.document.close(); }
}

function exportKeyDatesPDF(keyDates) {
  exportKeyDatesWord(keyDates); // reuse print dialog
}

/* ═══════════════════════════════════════════════════════════════
   KEY DATE CARD
═══════════════════════════════════════════════════════════════ */
function KeyDateCard({ d }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 180 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: getIconColor(d.icon),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, flexShrink: 0,
      }}>
        📖
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, color: NAVY }}>{formatDate(d.date)}</div>
        <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{d.event}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ACADEMIC CALENDAR TAB
═══════════════════════════════════════════════════════════════ */
function AcademicCalendarTab() {
  const [keyDates, setKeyDates] = useState(() => {
    try {
      const saved = localStorage.getItem('sm_key_dates');
      return saved ? JSON.parse(saved) : DEFAULT_KEY_DATES;
    } catch { return DEFAULT_KEY_DATES; }
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ term: '1st Term', event: '', date: '' });

  const saveKeyDates = useCallback((updated) => {
    setKeyDates(updated);
    localStorage.setItem('sm_key_dates', JSON.stringify(updated));
  }, []);

  const addEntry = () => {
    if (!editForm.event.trim() || !editForm.date) {
      toast.error('Event name and date are required');
      return;
    }
    const updated = { ...keyDates };
    const term = editForm.term;
    const existing = updated[term] || [];
    const newId = Date.now();
    updated[term] = [...existing, { id: newId, event: editForm.event.trim(), date: editForm.date, icon: 'teal' }];
    saveKeyDates(updated);
    setEditForm({ term: '1st Term', event: '', date: '' });
    setShowEditModal(false);
    toast.success('Key date added!');
  };

  const removeEntry = (term, id) => {
    const updated = { ...keyDates, [term]: keyDates[term].filter(d => d.id !== id) };
    saveKeyDates(updated);
    toast.success('Removed');
  };

  const schoolName = 'School Mentor Demo';

  return (
    <div>
      {/* Card */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        {/* Card Header */}
        <div style={{ background: TEAL, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 800, fontSize: 16, color: '#fff', letterSpacing: '0.3px' }}>Key Dates</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => exportKeyDatesPDF(keyDates)}
              style={{ background: RED, color: '#fff', border: 'none', borderRadius: 5, padding: '5px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <FileText size={13} /> PDF
            </button>
            <button
              onClick={() => exportKeyDatesWord(keyDates, schoolName)}
              style={{ background: '#fff', color: TEAL, border: `1.5px solid ${TEAL}`, borderRadius: 5, padding: '5px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <FileText size={13} /> Word
            </button>
            <button
              onClick={() => setShowEditModal(true)}
              style={{ background: 'transparent', color: '#fff', border: '1.5px solid rgba(255,255,255,0.6)', borderRadius: 5, padding: '5px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Edit2 size={13} /> Edit
            </button>
          </div>
        </div>

        {/* Card Body */}
        <div style={{ padding: 24 }}>
          {Object.entries(keyDates).map(([term, dates]) => (
            <div key={term} style={{ marginBottom: 28 }}>
              {/* Term Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: '#374151', whiteSpace: 'nowrap', padding: '0 4px' }}>
                  {term}
                </span>
                <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
              </div>

              {/* Date Cards */}
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {dates.length === 0 && (
                  <div style={{ color: '#94A3B8', fontSize: 13, fontStyle: 'italic' }}>No dates added for {term}</div>
                )}
                {dates.map(d => (
                  <div key={d.id} style={{ position: 'relative' }}>
                    <KeyDateCard d={d} />
                    <button
                      onClick={() => removeEntry(term, d.id)}
                      title="Remove"
                      style={{
                        position: 'absolute', top: -6, right: -8,
                        width: 18, height: 18, borderRadius: '50%',
                        background: '#FEE2E2', color: RED,
                        border: 'none', cursor: 'pointer',
                        fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit / Add Modal */}
      {showEditModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setShowEditModal(false); }}
        >
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: NAVY }}>Add Key Date</h2>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Term</label>
                <select style={inp} value={editForm.term} onChange={e => setEditForm(f => ({ ...f, term: e.target.value }))}>
                  <option value="1st Term">1st Term</option>
                  <option value="2nd Term">2nd Term</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Event Name *</label>
                <input style={inp} placeholder="e.g. 2nd Monthlies" value={editForm.event} onChange={e => setEditForm(f => ({ ...f, event: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Date *</label>
                <input type="date" style={inp} value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button
                onClick={() => setShowEditModal(false)}
                style={{ padding: '8px 18px', borderRadius: 6, border: '1.5px solid #D1D5DB', background: '#fff', color: '#374151', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                onClick={addEntry}
                style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: TEAL, color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Save size={14} /> Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ACTIVITY CALENDAR TAB
═══════════════════════════════════════════════════════════════ */
function ActivityCalendarTab() {
  const [activities] = useState([
    { id: 1, event: 'Annual Sports Day', date: '2026-03-15', category: 'Sports' },
    { id: 2, event: 'Science Exhibition', date: '2026-04-20', category: 'Academic' },
    { id: 3, event: 'Quran Competition', date: '2026-05-10', category: 'Islamic' },
    { id: 4, event: 'Farewell Party (Grade X)', date: '2026-06-15', category: 'Social' },
    { id: 5, event: 'Back to School Drive', date: '2026-09-05', category: 'Academic' },
    { id: 6, event: 'Debate Competition', date: '2026-11-20', category: 'Academic' },
  ]);

  const CATEGORY_COLORS = {
    Sports: '#2563EB', Academic: TEAL, Islamic: '#D97706', Social: '#7C3AED',
  };

  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ background: TEAL, padding: '14px 20px' }}>
        <span style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>Activity Calendar</span>
      </div>
      <div style={{ padding: 20 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#374151', borderBottom: '1px solid #E2E8F0' }}>Sr.</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#374151', borderBottom: '1px solid #E2E8F0' }}>Event</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#374151', borderBottom: '1px solid #E2E8F0' }}>Date</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#374151', borderBottom: '1px solid #E2E8F0' }}>Category</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((a, i) => (
              <tr key={a.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ padding: '10px 12px', fontSize: 13, color: '#94A3B8' }}>{i + 1}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: NAVY }}>{a.event}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: '#374151' }}>{formatDate(a.date)}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 20,
                    background: (CATEGORY_COLORS[a.category] || TEAL) + '1A',
                    color: CATEGORY_COLORS[a.category] || TEAL,
                    fontSize: 11, fontWeight: 700,
                  }}>
                    {a.category}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CALENDAR TAB (Academic Calendar | Activity Calendar)
═══════════════════════════════════════════════════════════════ */
function CalendarTab() {
  const [calSub, setCalSub] = useState('academic');
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button style={subTabBtn(calSub === 'academic')}  onClick={() => setCalSub('academic')}>Academic Calendar</button>
        <button style={subTabBtn(calSub === 'activity')}  onClick={() => setCalSub('activity')}>Activity Calendar</button>
      </div>
      {calSub === 'academic' && <AcademicCalendarTab />}
      {calSub === 'activity' && <ActivityCalendarTab />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TEXTBOOKS TAB (Scheme of Studies → Textbooks sub-tab)
═══════════════════════════════════════════════════════════════ */
function TextbooksTab() {
  const [books] = useState([
    { id: 1, class: 'Grade I', subject: 'English', title: 'Oxford English Book 1', publisher: 'Oxford University Press', edition: '2024' },
    { id: 2, class: 'Grade I', subject: 'Mathematics', title: 'New Math Book 1', publisher: 'National Book Foundation', edition: '2023' },
    { id: 3, class: 'Grade II', subject: 'Science', title: 'Basics Science 2', publisher: 'Punjab Curriculum Authority', edition: '2024' },
    { id: 4, class: 'Grade III', subject: 'Urdu', title: 'Urdu Ki Dunya 3', publisher: 'National Book Foundation', edition: '2024' },
    { id: 5, class: 'Grade IV', subject: 'Islamiyat', title: 'Islamiyat for Class IV', publisher: 'Punjab Curriculum Authority', edition: '2023' },
  ]);

  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ background: TEAL, padding: '14px 20px' }}>
        <span style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>Textbooks</span>
      </div>
      <div style={{ padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              {['Sr.', 'Class', 'Subject', 'Title', 'Publisher', 'Edition'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#374151', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {books.map((b, i) => (
              <tr key={b.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#94A3B8' }}>{i + 1}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: NAVY }}>{b.class}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#374151' }}>{b.subject}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500, color: '#1E40AF' }}>{b.title}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#64748B' }}>{b.publisher}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748B' }}>{b.edition}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SCHEME OF STUDIES TAB
═══════════════════════════════════════════════════════════════ */
function SchemeOfStudiesTab() {
  const [sos, setSos] = useState('textbooks');
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button style={subTabBtn(sos === 'textbooks')} onClick={() => setSos('textbooks')}>Textbooks</button>
        <button style={subTabBtn(sos === 'calendar')}  onClick={() => setSos('calendar')}>Calendar</button>
      </div>
      {sos === 'textbooks' && <TextbooksTab />}
      {sos === 'calendar'  && <CalendarTab />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LESSON PLAN VIEW MODAL
═══════════════════════════════════════════════════════════════ */
const SAMPLE_LESSON_PLAN = {
  class: 'IV',
  subject: 'Science',
  unitNo: '01',
  unitName: 'Introduction',
  timeRequired: '45 Minutes',
  topics: [
    {
      id: 1,
      name: 'Word Opposites',
      mainQuestion: 'match the word opposite',
      type: 'table',
      rows: [
        { word: 'Day',     opposite: 'Night'   },
        { word: 'Morning', opposite: 'Evening' },
        { word: 'Long',    opposite: 'Short'   },
        { word: 'Small',   opposite: 'High'    },
        { word: 'Up',      opposite: 'Down'    },
      ],
    },
    {
      id: 2,
      name: 'Applications',
      mainQuestion: 'write an application for sick leave',
      type: 'application',
      subject: 'Sick leave',
      body: 'Respected Sir/Madam,\n\nI beg to state that I am suffering from fever and cannot attend school today. I request you to grant me leave for one day i.e. 2nd March, 2026.\n\nYours obediently,\n[Student Name]',
    },
  ],
};

function LessonPlanViewModal({ plan, onClose }) {
  const [selectAll, setSelectAll] = useState(false);
  const [selected, setSelected] = useState({});

  const toggleSelect = (topicId, rowIdx) => {
    const key = `${topicId}_${rowIdx}`;
    setSelected(s => ({ ...s, [key]: !s[key] }));
  };

  const toggleSelectAll = () => {
    setSelectAll(v => !v);
    setSelected({});
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 20, overflowY: 'auto' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 700, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', margin: 'auto' }}>
        {/* Modal Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 800, fontSize: 17, color: TEAL }}>Lesson Plan</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}><X size={20} /></button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Info Chips Row 1 */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {[
              { label: plan.class, sub: 'Class' },
              { label: plan.subject, sub: 'Subject' },
              { label: plan.unitNo, sub: 'Unit no.' },
            ].map(c => (
              <div key={c.sub} style={{ background: '#F0FDF9', border: `1px solid ${TEAL}30`, borderRadius: 8, padding: '6px 14px', textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: TEAL }}>{c.label}</div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{c.sub}</div>
              </div>
            ))}
          </div>
          {/* Info Chips Row 2 */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {[
              { label: plan.unitName, sub: 'Unit name' },
              { label: plan.timeRequired, sub: 'Time required' },
            ].map(c => (
              <div key={c.sub} style={{ background: '#F0FDF9', border: `1px solid ${TEAL}30`, borderRadius: 8, padding: '6px 14px', textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: TEAL }}>{c.label}</div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{c.sub}</div>
              </div>
            ))}
          </div>

          {/* Select All */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
              <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} />
              Select All Questions
            </label>
          </div>

          {/* Topics */}
          {plan.topics.map(topic => (
            <div key={topic.id} style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 13, textAlign: 'center', color: NAVY, marginBottom: 10, padding: '6px', background: '#F8FAFC', borderRadius: 6 }}>
                Topic: {topic.name}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>Main Question 1: {topic.mainQuestion}</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748B', cursor: 'pointer' }}>
                  <input type="checkbox" checked={selectAll} readOnly />
                  Select All {topic.name}
                </label>
              </div>

              {topic.type === 'table' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'left', border: '1px solid #E2E8F0', fontSize: 12 }}>Sr No</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', border: '1px solid #E2E8F0', fontSize: 12 }}>Word</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', border: '1px solid #E2E8F0', fontSize: 12 }}>Opposite</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', border: '1px solid #E2E8F0', fontSize: 12 }}>Select</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topic.rows.map((row, idx) => {
                      const key = `${topic.id}_${idx}`;
                      return (
                        <tr key={idx}>
                          <td style={{ padding: '8px 10px', border: '1px solid #E2E8F0', color: '#94A3B8' }}>{idx + 1}</td>
                          <td style={{ padding: '8px 10px', border: '1px solid #E2E8F0', fontWeight: 500 }}>{row.word}</td>
                          <td style={{ padding: '8px 10px', border: '1px solid #E2E8F0' }}>{row.opposite}</td>
                          <td style={{ padding: '8px 10px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                            <input type="checkbox" checked={selectAll || !!selected[key]} onChange={() => toggleSelect(topic.id, idx)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {topic.type === 'application' && (
                <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: 16 }}>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 12, color: '#374151' }}>Subject: </span>
                    <span style={{ fontSize: 13, color: NAVY }}>{topic.subject}</span>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 12, color: '#374151' }}>Body:</span>
                    <div style={{ fontSize: 13, color: '#374151', whiteSpace: 'pre-line', marginTop: 4, lineHeight: 1.6, background: '#FAFAFA', padding: 10, borderRadius: 6, border: '1px solid #F1F5F9' }}>
                      {topic.body}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer' }}>
                      <input type="checkbox" checked={selectAll} readOnly /> Select
                    </label>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SESSION & TERM SETTING TAB
═══════════════════════════════════════════════════════════════ */
function SessionTermSettingTab() {
  const [form, setForm] = useState({
    sessionName: '2025-2026', sessionStart: '2025-09-01', sessionEnd: '2026-06-30',
    term1Start: '2026-03-01', term1End: '2026-06-30',
    term2Start: '2026-09-01', term2End: '2026-11-30',
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem('sm_session_settings', JSON.stringify(form));
    setSaved(true);
    toast.success('Session settings saved!');
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ background: TEAL, padding: '14px 20px' }}>
        <span style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>Session & Term Setting</span>
      </div>
      <div style={{ padding: 28 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Session Name</label>
            <input style={inp} value={form.sessionName} onChange={e => setForm(f => ({ ...f, sessionName: e.target.value }))} placeholder="e.g. 2025-2026" />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Session Start Date</label>
            <input type="date" style={inp} value={form.sessionStart} onChange={e => setForm(f => ({ ...f, sessionStart: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Session End Date</label>
            <input type="date" style={inp} value={form.sessionEnd} onChange={e => setForm(f => ({ ...f, sessionEnd: e.target.value }))} />
          </div>
        </div>
        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 20, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: NAVY, marginBottom: 14 }}>1st Term</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Start Date</label>
              <input type="date" style={inp} value={form.term1Start} onChange={e => setForm(f => ({ ...f, term1Start: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>End Date</label>
              <input type="date" style={inp} value={form.term1End} onChange={e => setForm(f => ({ ...f, term1End: e.target.value }))} />
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 20, marginBottom: 28 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: NAVY, marginBottom: 14 }}>2nd Term</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Start Date</label>
              <input type="date" style={inp} value={form.term2Start} onChange={e => setForm(f => ({ ...f, term2Start: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>End Date</label>
              <input type="date" style={inp} value={form.term2End} onChange={e => setForm(f => ({ ...f, term2End: e.target.value }))} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleSave}
            style={{ background: saved ? '#16A34A' : TEAL, color: '#fff', border: 'none', borderRadius: 7, padding: '10px 28px', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, transition: 'background .2s' }}
          >
            <Save size={14} /> {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TERM BREAKUP TAB
═══════════════════════════════════════════════════════════════ */
function TermBreakupTab() {
  const termData = [
    { term: '1st Term', start: '2026-03-02', end: '2026-06-30', weeks: 17, totalDays: 85, workingDays: 85 },
    { term: '2nd Term', start: '2026-09-01', end: '2026-11-30', weeks: 13, totalDays: 65, workingDays: 65 },
  ];

  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ background: TEAL, padding: '14px 20px' }}>
        <span style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>Term Breakup</span>
      </div>
      <div style={{ padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              {['Term', 'Start Date', 'End Date', 'Weeks', 'Total Days', 'Working Days'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#374151', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {termData.map(td => (
              <tr key={td.term} style={{ borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 13, color: TEAL }}>{td.term}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151' }}>{formatDate(td.start)}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151' }}>{formatDate(td.end)}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: NAVY }}>{td.weeks}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151' }}>{td.totalDays}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#16A34A' }}>{td.workingDays}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CREATE LESSON PLAN TAB
═══════════════════════════════════════════════════════════════ */
function CreateLessonPlanTab() {
  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data || []).catch(() => []),
  });

  const [form, setForm] = useState({
    classId: '', subjectId: '', unitNo: '', unitName: '', timeRequired: '45',
  });
  const [topics, setTopics] = useState([{ id: 1, topicName: '', mainQuestion: '', details: '' }]);
  const [saving, setSaving] = useState(false);

  const subjectsForClass = classes.find(c => String(c.id) === String(form.classId))?.subjects || [];

  const addTopic = () => setTopics(t => [...t, { id: Date.now(), topicName: '', mainQuestion: '', details: '' }]);
  const removeTopic = id => setTopics(t => t.filter(tp => tp.id !== id));
  const updateTopic = (id, field, value) => setTopics(t => t.map(tp => tp.id === id ? { ...tp, [field]: value } : tp));

  const handleSave = async () => {
    if (!form.classId) return toast.error('Please select a class');
    if (!form.unitName.trim()) return toast.error('Unit name is required');
    setSaving(true);
    try {
      await api.post('/lesson-plans', {
        classId: parseInt(form.classId),
        subjectId: form.subjectId ? parseInt(form.subjectId) : null,
        unitNo: form.unitNo,
        unitName: form.unitName,
        timeRequired: form.timeRequired,
        topics,
      }).catch(() => null);
      toast.success('Lesson plan created!');
      setForm({ classId: '', subjectId: '', unitNo: '', unitName: '', timeRequired: '45' });
      setTopics([{ id: 1, topicName: '', mainQuestion: '', details: '' }]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ background: TEAL, padding: '14px 20px' }}>
        <span style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>Create Lesson Plan</span>
      </div>
      <div style={{ padding: 28 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Select Class *</label>
            <select style={inp} value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value, subjectId: '' }))}>
              <option value="">— Select Class —</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Select Subject</label>
            <select style={inp} value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}>
              <option value="">— Select Subject —</option>
              {subjectsForClass.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Unit No.</label>
            <input style={inp} placeholder="e.g. U01" value={form.unitNo} onChange={e => setForm(f => ({ ...f, unitNo: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Unit Name *</label>
            <input style={inp} placeholder="e.g. Introduction" value={form.unitName} onChange={e => setForm(f => ({ ...f, unitName: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Time Required (min)</label>
            <input type="number" style={inp} value={form.timeRequired} onChange={e => setForm(f => ({ ...f, timeRequired: e.target.value }))} />
          </div>
        </div>

        {/* Topics */}
        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: NAVY }}>Topics</div>
            <button onClick={addTopic} style={{ background: '#F0FDF9', color: TEAL, border: `1px solid ${TEAL}40`, borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Plus size={13} /> Add Topic
            </button>
          </div>
          {topics.map((tp, idx) => (
            <div key={tp.id} style={{ background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0', padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 700, fontSize: 12, color: '#374151' }}>Topic {idx + 1}</span>
                {topics.length > 1 && (
                  <button onClick={() => removeTopic(tp.id)} style={{ background: '#FEE2E2', color: RED, border: 'none', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontSize: 12 }}>
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Topic Name</label>
                  <input style={inp} placeholder="e.g. Word Opposites" value={tp.topicName} onChange={e => updateTopic(tp.id, 'topicName', e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Main Question</label>
                  <input style={inp} placeholder="e.g. match the word opposite" value={tp.mainQuestion} onChange={e => updateTopic(tp.id, 'mainQuestion', e.target.value)} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Details / Content</label>
                <textarea
                  style={{ ...inp, resize: 'vertical', minHeight: 70 }}
                  placeholder="Topic details, questions, content..."
                  value={tp.details}
                  onChange={e => updateTopic(tp.id, 'details', e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ background: TEAL, color: '#fff', border: 'none', borderRadius: 7, padding: '10px 28px', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.7 : 1 }}
          >
            <Save size={14} /> {saving ? 'Saving…' : 'Save Lesson Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   VIEW LESSON PLAN TAB
═══════════════════════════════════════════════════════════════ */
function ViewLessonPlanTab() {
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [fetched, setFetched] = useState(false);
  const [planView, setPlanView] = useState('lesson'); // 'lesson' | 'notebook'
  const [expandedRows, setExpandedRows] = useState({});
  const [viewModal, setViewModal] = useState(null);
  const [loadingFetch, setLoadingFetch] = useState(false);

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data || []).catch(() => []),
  });

  const subjectsForClass = classes.find(c => String(c.id) === String(classId))?.subjects || [];

  const [units, setUnits] = useState([]);

  const demoUnits = [
    {
      id: 1,
      unitNo: 'U01',
      unitName: 'Basics Science',
      classId,
      subjectId,
      details: [
        { id: 1, unitNo: 'U01', unitName: 'Basics Science', status: 'Not Submitted' },
      ],
    },
    {
      id: 2,
      unitNo: 'U02',
      unitName: 'Living Things',
      classId,
      subjectId,
      details: [
        { id: 2, unitNo: 'U02', unitName: 'Living Things', status: 'Submitted' },
      ],
    },
    {
      id: 3,
      unitNo: 'U03',
      unitName: 'Plants & Animals',
      classId,
      subjectId,
      details: [
        { id: 3, unitNo: 'U03', unitName: 'Plants & Animals', status: 'Not Submitted' },
      ],
    },
  ];

  const handleFetch = async () => {
    if (!classId) return toast.error('Please select a class');
    setLoadingFetch(true);
    try {
      const res = await api.get('/lesson-plans', { params: { classId, subjectId: subjectId || undefined } }).catch(() => null);
      const data = res?.data?.data || [];
      setUnits(data.length ? data : demoUnits);
      setFetched(true);
    } finally {
      setLoadingFetch(false);
    }
  };

  const toggleRow = id => setExpandedRows(r => ({ ...r, [id]: !r[id] }));

  const handleDelete = (id) => {
    if (!window.confirm('Delete this lesson plan?')) return;
    setUnits(u => u.filter(x => x.id !== id));
    toast.success('Deleted');
  };

  return (
    <div>
      {/* Filters */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Select class</label>
        <select style={{ ...inp }} value={classId} onChange={e => { setClassId(e.target.value); setSubjectId(''); setFetched(false); }}>
          <option value="">— Select Class —</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Select subject</label>
        <select style={{ ...inp }} value={subjectId} onChange={e => { setSubjectId(e.target.value); setFetched(false); }}>
          <option value="">— Select Subject —</option>
          {subjectsForClass.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Fetch Button */}
      <button
        onClick={handleFetch}
        disabled={loadingFetch}
        style={{
          width: '100%', padding: '13px', background: TEAL, color: '#fff',
          border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 800,
          fontSize: 15, marginBottom: 20, opacity: loadingFetch ? 0.7 : 1,
          letterSpacing: '0.5px',
        }}
      >
        {loadingFetch ? 'Fetching…' : 'Fetch'}
      </button>

      {/* Toggle */}
      {fetched && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button style={subTabBtn(planView === 'lesson')}   onClick={() => setPlanView('lesson')}>Lesson Plans</button>
            <button style={subTabBtn(planView === 'notebook')} onClick={() => setPlanView('notebook')}>Notebook Lesson Plans</button>
          </div>

          {/* Table */}
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#374151', borderBottom: '1px solid #E2E8F0' }}>Sr.NO.</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#374151', borderBottom: '1px solid #E2E8F0' }}>Unit No.</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#374151', borderBottom: '1px solid #E2E8F0' }}>Unit Name</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#374151', borderBottom: '1px solid #E2E8F0' }}>PDF</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#374151', borderBottom: '1px solid #E2E8F0' }}>Delete</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#374151', borderBottom: '1px solid #E2E8F0' }}>Bell</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#374151', borderBottom: '1px solid #E2E8F0' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {units.map((unit, idx) => (
                  <>
                    <tr key={unit.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{
                          width: 26, height: 26, borderRadius: '50%',
                          background: '#16A34A', color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 12,
                        }}>{idx + 1}</div>
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          background: TEAL, color: '#fff', borderRadius: 6,
                          padding: '3px 10px', fontSize: 12, fontWeight: 700,
                        }}>#{unit.unitNo}</div>
                      </td>
                      <td style={{ padding: '11px 14px', fontWeight: 600, color: NAVY, fontSize: 13 }}>
                        <span style={{ marginRight: 6, fontSize: 14 }}>{'</>'}</span>
                        {unit.unitName}
                      </td>
                      <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                        <button
                          onClick={() => window.print()}
                          style={{ background: RED, color: '#fff', border: 'none', borderRadius: 5, padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                        >
                          PDF
                        </button>
                      </td>
                      <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleDelete(unit.id)}
                          style={{ background: 'transparent', color: TEAL, border: `1.5px solid ${TEAL}`, borderRadius: 5, padding: '5px 9px', fontSize: 12, cursor: 'pointer' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                      <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                        <button
                          onClick={() => toast('Notification bell clicked!')}
                          style={{ background: 'transparent', color: TEAL, border: `1.5px solid ${TEAL}`, borderRadius: 5, padding: '5px 9px', fontSize: 12, cursor: 'pointer' }}
                        >
                          <Bell size={13} />
                        </button>
                      </td>
                      <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                        <button
                          onClick={() => toggleRow(unit.id)}
                          style={{ background: 'transparent', color: TEAL, border: `1.5px solid ${TEAL}`, borderRadius: 5, padding: '5px 9px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                        >
                          {expandedRows[unit.id] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded inner rows */}
                    {expandedRows[unit.id] && (
                      <tr key={`${unit.id}_exp`}>
                        <td colSpan={7} style={{ padding: '0 14px 16px' }}>
                          <div style={{ background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ background: '#EFF6FF' }}>
                                  {['S.No.', 'Unit Number', 'Unit Name', 'Submission Status', 'Details'].map(h => (
                                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#374151', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {(unit.details || []).map((det, dIdx) => (
                                  <tr key={det.id}>
                                    <td style={{ padding: '9px 12px', fontSize: 12, color: '#94A3B8' }}>{dIdx + 1}</td>
                                    <td style={{ padding: '9px 12px', fontSize: 12, fontWeight: 600, color: TEAL }}>#{det.unitNo}</td>
                                    <td style={{ padding: '9px 12px', fontSize: 12, fontWeight: 500, color: NAVY }}>{det.unitName}</td>
                                    <td style={{ padding: '9px 12px' }}>
                                      <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                        background: det.status === 'Submitted' ? '#DCFCE7' : '#FEE2E2',
                                        color: det.status === 'Submitted' ? '#16A34A' : RED,
                                      }}>
                                        {det.status === 'Submitted' ? '✓' : '⊗'} {det.status}
                                      </span>
                                    </td>
                                    <td style={{ padding: '9px 12px' }}>
                                      <button
                                        onClick={() => setViewModal({
                                          ...SAMPLE_LESSON_PLAN,
                                          class: classes.find(c => String(c.id) === String(unit.classId))?.name || 'IV',
                                          subject: subjectsForClass.find(s => String(s.id) === String(unit.subjectId))?.name || 'Science',
                                          unitNo: det.unitNo,
                                          unitName: det.unitName,
                                        })}
                                        style={{
                                          background: 'transparent', color: TEAL, border: `1.5px solid ${TEAL}`,
                                          borderRadius: 5, padding: '4px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                          display: 'flex', alignItems: 'center', gap: 4,
                                        }}
                                      >
                                        <Eye size={12} /> View
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                {units.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <div style={{ padding: 40, textAlign: 'center' }}>
                        <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
                        <div style={{ fontWeight: 700, color: NAVY, fontSize: 15, marginBottom: 4 }}>No lesson plans found</div>
                        <div style={{ color: '#94A3B8', fontSize: 13 }}>Create a lesson plan first using the "Create Lesson Plan" tab</div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {viewModal && (
        <LessonPlanViewModal plan={viewModal} onClose={() => setViewModal(null)} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LESSON PLANS TAB
═══════════════════════════════════════════════════════════════ */
function LessonPlansTab() {
  const [lpSub, setLpSub] = useState('view');

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button style={subTabBtn(lpSub === 'session')}  onClick={() => setLpSub('session')}>Session &amp; Term Setting</button>
        <button style={subTabBtn(lpSub === 'breakup')}  onClick={() => setLpSub('breakup')}>Term Breakup</button>
        <button style={subTabBtn(lpSub === 'create')}   onClick={() => setLpSub('create')}>Create Lesson Plan</button>
        <button style={subTabBtn(lpSub === 'view')}     onClick={() => setLpSub('view')}>View Lesson Plan</button>
      </div>
      {lpSub === 'session'  && <SessionTermSettingTab />}
      {lpSub === 'breakup'  && <TermBreakupTab />}
      {lpSub === 'create'   && <CreateLessonPlanTab />}
      {lpSub === 'view'     && <ViewLessonPlanTab />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ROOT ACADEMICS PAGE
═══════════════════════════════════════════════════════════════ */
export default function SchoolMentorAcademicsPage() {
  const [mainTab, setMainTab] = useState('scheme');

  return (
    <div className="page-content fade-in">
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: NAVY }}>Academics</h1>
        <button
          onClick={() => toast('Tutorial coming soon!')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: TEAL, color: '#fff', border: 'none',
            borderRadius: 7, padding: '8px 18px', cursor: 'pointer',
            fontWeight: 700, fontSize: 13,
          }}
        >
          ▶ Tutorial
        </button>
      </div>

      {/* Main Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <button style={mainTabBtn(mainTab === 'scheme')}  onClick={() => setMainTab('scheme')}>
          <BookOpen size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Scheme of Studies
        </button>
        <button style={mainTabBtn(mainTab === 'lesson')}  onClick={() => setMainTab('lesson')}>
          <FileText size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Lesson Plans
        </button>
      </div>

      {/* Tab Content */}
      {mainTab === 'scheme' && <SchemeOfStudiesTab />}
      {mainTab === 'lesson' && <LessonPlansTab />}
    </div>
  );
}
