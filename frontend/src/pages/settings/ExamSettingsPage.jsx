import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Save, GraduationCap, CheckCircle } from 'lucide-react';

const STORAGE_KEY = 'ilmforge_exam_settings';

const DEFAULTS = {
  admitCardInstructions:
`1. Report at exam center 30 minutes before the paper starts.

2. Bring this Admit Card along with your School ID Card.

3. Candidates without a valid Admit Card will not be allowed in the Examination Hall.

4. Mobile phones, electronic gadgets and unauthorized materials are strictly prohibited.

5. Follow the invigilator's instructions at all times.`,
  failCriteria: 'less_than_passing',
  passingMarks: '40',
  gradingSystem: 'percentage',
  gradeAPlus: '90',
  gradeA:  '80',
  gradeB:  '65',
  gradeC:  '50',
  gradeD:  '40',
  showRankOnMarksheet:       true,
  showPercentageOnMarksheet: true,
  showGradeOnMarksheet:      true,
  showAttendanceOnMarksheet: false,
  showTeacherSignature:      true,
  showPrincipalSignature:    true,
  resultCardHeader:          '',
};

export default function ExamSettingsPage() {
  const [form, setForm] = useState(DEFAULTS);
  const [saved, setSaved] = useState(false);

  /* Load from localStorage on mount */
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { setForm(prev => ({ ...prev, ...JSON.parse(stored) })); } catch {}
    }
  }, []);

  /* Save settings */
  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    /* Also expose for other pages (ExamMarksPage, print, etc.) */
    window.__examSettings = form;
    setSaved(true);
    toast.success('Exam settings saved!');
    setTimeout(() => setSaved(false), 2000);
  };

  const f = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <div className="page-content fade-up">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 className="page-title">Exam Settings</h1>
          <p className="page-subtitle">Configure exam rules, grading system and marksheet layout</p>
        </div>
        <button className="btn btn-teal" onClick={handleSave}>
          {saved ? <><CheckCircle size={14}/> Saved!</> : <><Save size={14}/> Save Settings</>}
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

        {/* Admit card instructions */}
        <div className="card" style={{ gridColumn:'span 2' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <GraduationCap size={15} color="#0D9488"/>
            <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:'#1E3A5F' }}>Admit Card Instructions</h3>
          </div>
          <div className="form-group" style={{ marginBottom:0 }}>
            <label className="form-label">Instructions (printed on every admit card)</label>
            <textarea className="form-input form-textarea" rows={7}
              value={form.admitCardInstructions}
              onChange={e=>f('admitCardInstructions',e.target.value)}/>
            <div style={{ fontSize:11.5, color:'#94A3B8', marginTop:4 }}>Leave a blank line between each point for better spacing.</div>
          </div>
        </div>

        {/* Pass/Fail Criteria */}
        <div className="card">
          <h3 style={{ fontSize:13.5, fontWeight:700, color:'#1E3A5F', marginBottom:14 }}>Pass / Fail Criteria</h3>

          <div className="form-group">
            <label className="form-label">Fail student if</label>
            <select className="form-select" value={form.failCriteria} onChange={e=>f('failCriteria',e.target.value)}>
              <option value="less_than_passing">Scored less than passing marks</option>
              <option value="absent">Marked Absent</option>
              <option value="both">Less than passing marks OR Absent</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Default Passing Marks (%)</label>
            <input className="form-input" type="number" min="1" max="100"
              value={form.passingMarks} onChange={e=>f('passingMarks',e.target.value)}/>
            <div style={{ fontSize:11.5, color:'#64748B', marginTop:4 }}>
              Students below <strong>{form.passingMarks}%</strong> are marked as Failed.
            </div>
          </div>

          <div className="form-group" style={{ marginBottom:0 }}>
            <label className="form-label">Grading System</label>
            <select className="form-select" value={form.gradingSystem} onChange={e=>f('gradingSystem',e.target.value)}>
              <option value="percentage">Percentage — A+, A, B, C, D, F</option>
              <option value="gpa">GPA — 4.0 Scale</option>
              <option value="marks">Marks Only</option>
            </select>
          </div>
        </div>

        {/* Grade boundaries */}
        <div className="card">
          <h3 style={{ fontSize:13.5, fontWeight:700, color:'#1E3A5F', marginBottom:14 }}>Grade Boundaries (%)</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[
              { grade:'A+ (Excellent)', key:'gradeAPlus', color:'#15803D' },
              { grade:'A  (Very Good)', key:'gradeA',    color:'#0D9488' },
              { grade:'B  (Good)',      key:'gradeB',    color:'#2563EB' },
              { grade:'C  (Average)',   key:'gradeC',    color:'#D97706' },
              { grade:'D  (Below Avg)',  key:'gradeD',    color:'#EA580C' },
            ].map(g => (
              <div key={g.key} className="form-group" style={{ marginBottom:0 }}>
                <label className="form-label" style={{ color:g.color, fontSize:11.5 }}>{g.grade}</label>
                <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <input className="form-input" type="number" min="0" max="100"
                    value={form[g.key]} onChange={e=>f(g.key,e.target.value)}
                    style={{ width:70 }}/>
                  <span style={{ fontSize:11.5, color:'#94A3B8' }}>%+</span>
                </div>
              </div>
            ))}
          </div>
          <div className="alert alert-warning" style={{ marginTop:12, padding:'8px 12px' }}>
            <span style={{ fontSize:12 }}>Below <strong>{form.gradeD}%</strong> = F (Fail)</span>
          </div>
        </div>

        {/* Marksheet display options */}
        <div className="card" style={{ gridColumn:'span 2' }}>
          <h3 style={{ fontSize:13.5, fontWeight:700, color:'#1E3A5F', marginBottom:14 }}>Marksheet / Result Card Options</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:10, marginBottom:14 }}>
            {[
              { key:'showRankOnMarksheet',       label:'Show Position / Rank'     },
              { key:'showPercentageOnMarksheet',  label:'Show Percentage'          },
              { key:'showGradeOnMarksheet',       label:'Show Letter Grade'        },
              { key:'showAttendanceOnMarksheet',  label:'Show Attendance Summary'  },
              { key:'showTeacherSignature',       label:'Teacher Signature Line'   },
              { key:'showPrincipalSignature',     label:'Principal Signature Line' },
            ].map(opt => (
              <label key={opt.key}
                style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, color:'#374151',
                  padding:'8px 12px', borderRadius:7,
                  background: form[opt.key] ? '#F0FDF9' : '#F8FAFC',
                  border: `1px solid ${form[opt.key] ? '#CCFBF1' : '#E8EDF3'}`,
                  transition:'all 0.12s' }}>
                <input type="checkbox" checked={!!form[opt.key]}
                  onChange={e => f(opt.key, e.target.checked)}
                  style={{ width:15, height:15, accentColor:'#0D9488' }}/>
                {opt.label}
              </label>
            ))}
          </div>
          <div className="form-group" style={{ marginBottom:0 }}>
            <label className="form-label">Result Card Header Text <span style={{color:'#94A3B8',fontWeight:400}}>(optional)</span></label>
            <input className="form-input" placeholder="e.g. Academic Year 2025-2026 — First Term Result"
              value={form.resultCardHeader} onChange={e=>f('resultCardHeader',e.target.value)}/>
          </div>
        </div>

      </div>

      {/* Bottom save */}
      <div style={{ marginTop:18, display:'flex', justifyContent:'flex-end' }}>
        <button className="btn btn-teal" style={{ padding:'10px 28px' }} onClick={handleSave}>
          {saved ? <><CheckCircle size={14}/> Saved!</> : <><Save size={14}/> Save Exam Settings</>}
        </button>
      </div>
    </div>
  );
}
