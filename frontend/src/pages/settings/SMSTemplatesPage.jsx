import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Save, MessageSquare, Info, Tag } from 'lucide-react';

const TAGS = [
  { tag: '{student_name}',  desc: "Student's full name" },
  { tag: '{parent_name}',   desc: "Parent's name" },
  { tag: '{roll_id}',       desc: "Student's roll number" },
  { tag: '{class_name}',    desc: "Class name" },
  { tag: '{school_name}',   desc: "School name" },
  { tag: '{fee_due}',       desc: "Due amount (Rs.)" },
  { tag: '{fee_title}',     desc: "Fee title/month" },
  { tag: '{month}',         desc: "Month name" },
  { tag: '{amount_paid}',   desc: "Amount paid" },
  { tag: '{receipt_no}',    desc: "Receipt number" },
  { tag: '{date}',          desc: "Today's date" },
  { tag: '{marks}',         desc: "Obtained marks" },
  { tag: '{percentage}',    desc: "Result percentage" },
];

const DEFAULT_TEMPLATES = [
  {
    id: 'fee_payment_received',
    event: 'Fee Payment Received',
    category: 'Finance',
    enabled: true,
    message: 'Dear {parent_name}, thank you! Fee payment of Rs. {amount_paid} received for {student_name} ({class_name}) for {fee_title}. Receipt No: {receipt_no}. - {school_name}',
  },
  {
    id: 'fee_reminder',
    event: 'Fee Payment Reminder',
    category: 'Finance',
    enabled: true,
    message: 'Dear {parent_name}, this is a reminder that {student_name} has outstanding fee of Rs. {fee_due} for {fee_title}. Please pay at earliest. - {school_name}',
  },
  {
    id: 'absent_alert',
    event: 'Student Absent Alert',
    category: 'Attendance',
    enabled: true,
    message: 'Dear {parent_name}, your child {student_name} was marked ABSENT from school today. Please ensure regular attendance to avoid academic loss. - {school_name}',
  },
  {
    id: 'exam_result',
    event: 'Exam Result Published',
    category: 'Exams',
    enabled: true,
    message: 'Dear {parent_name}, result for {student_name} has been published. Marks: {marks}, Percentage: {percentage}%. Visit the portal for detailed marksheet. - {school_name}',
  },
  {
    id: 'admission_approved',
    event: 'Admission Approved',
    category: 'Admissions',
    enabled: true,
    message: 'Congratulations! Admission of {student_name} in {class_name} has been approved at {school_name}. Welcome to our school family! Roll No: {roll_id}',
  },
  {
    id: 'student_birthday',
    event: 'Student Birthday Wish',
    category: 'Miscellaneous',
    enabled: true,
    message: 'Happy Birthday {student_name}! 🎂🎉 Wishing you a wonderful day and a bright future. With love, {school_name} Family.',
  },
  {
    id: 'staff_birthday',
    event: 'Staff Birthday Wish',
    category: 'Miscellaneous',
    enabled: true,
    message: 'Happy Birthday {student_name}! 🎂 Wishing you joy, health and success. - {school_name} Management',
  },
  {
    id: 'leave_approved',
    event: 'Leave Application Approved',
    category: 'Attendance',
    enabled: false,
    message: 'Dear {parent_name}, leave request for {student_name} has been approved. - {school_name}',
  },
];

const CATEGORIES = ['All', 'Finance', 'Attendance', 'Exams', 'Admissions', 'Miscellaneous'];

export default function SMSTemplatesPage() {
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [activeCategory, setActiveCategory] = useState('All');
  const [editingId, setEditingId] = useState(null);

  const filtered = activeCategory === 'All'
    ? templates
    : templates.filter(t => t.category === activeCategory);

  const updateTemplate = (id, field, value) => {
    setTemplates(prev => prev.map(t => t.id === id ? {...t, [field]:value} : t));
  };

  const insertTag = (id, tag) => {
    setTemplates(prev => prev.map(t => t.id === id ? {...t, message: t.message + tag} : t));
  };

  const save = useMutation({
    mutationFn: () => Promise.resolve({ ok: true }),
    onSuccess: () => { toast.success('SMS templates saved!'); setEditingId(null); },
  });

  const categoryColors = { Finance:'#15803D', Attendance:'#2563EB', Exams:'#7C3AED', Admissions:'#0D9488', Miscellaneous:'#D97706' };

  return (
    <div className="page-content fade-up">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 className="page-title">SMS Templates</h1>
          <p className="page-subtitle">Configure automated SMS messages for each school event</p>
        </div>
        <button className="btn btn-teal" onClick={() => save.mutate()}>
          <Save size={15}/> Save All Templates
        </button>
      </div>

      <div className="alert alert-info" style={{ marginBottom:16 }}>
        <Info size={15}/>
        <span>Use the variable tags to personalize messages. Tags are automatically replaced with actual data when sending.</span>
      </div>

      {/* Category tabs */}
      <div className="card" style={{ padding:'6px 12px', marginBottom:16, display:'flex', gap:6, flexWrap:'wrap' }}>
        {CATEGORIES.map(cat => (
          <button key={cat} className={`btn btn-sm${activeCategory===cat?' btn-teal':' btn-ghost'}`}
            onClick={() => setActiveCategory(cat)}>
            {cat}
          </button>
        ))}
      </div>

      {/* Templates list */}
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {filtered.map(t => (
          <div key={t.id} className="card" style={{ border: editingId===t.id ? '2px solid #0D9488' : '1px solid #E8EDF3' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: editingId===t.id ? 14 : 0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:9, background:(categoryColors[t.category]||'#64748B')+'18', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <MessageSquare size={16} color={categoryColors[t.category]||'#64748B'}/>
                </div>
                <div>
                  <div style={{ fontSize:13.5, fontWeight:700, color:'#1E3A5F' }}>{t.event}</div>
                  <span className={`badge ${t.category==='Finance'?'badge-green':t.category==='Attendance'?'badge-blue':t.category==='Exams'?'badge-purple':t.category==='Admissions'?'badge-teal':'badge-amber'}`}>
                    {t.category}
                  </span>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                {/* Toggle */}
                <label style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer' }}>
                  <div
                    onClick={() => updateTemplate(t.id, 'enabled', !t.enabled)}
                    style={{
                      width:42, height:22, borderRadius:11, position:'relative', cursor:'pointer', transition:'background 0.2s',
                      background: t.enabled ? '#0D9488' : '#CBD5E1',
                    }}>
                    <div style={{
                      position:'absolute', top:3, left: t.enabled ? 23 : 3,
                      width:16, height:16, borderRadius:'50%', background:'#fff',
                      transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)',
                    }}/>
                  </div>
                  <span style={{ fontSize:12, color: t.enabled ? '#0D9488' : '#94A3B8', fontWeight:600 }}>
                    {t.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
                <button className="btn btn-outline btn-sm"
                  onClick={() => setEditingId(editingId===t.id ? null : t.id)}>
                  {editingId===t.id ? 'Close' : 'Edit'}
                </button>
              </div>
            </div>

            {editingId !== t.id && (
              <div style={{ marginTop:10, padding:'10px 12px', background:'#F8FAFC', borderRadius:7, fontSize:12.5, color:'#475569', lineHeight:1.6, fontStyle:'italic' }}>
                "{t.message}"
              </div>
            )}

            {editingId === t.id && (
              <div>
                {/* Tags */}
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontSize:11.5, fontWeight:600, color:'#64748B', marginBottom:6, display:'flex', alignItems:'center', gap:5 }}>
                    <Tag size={12}/> Insert Variable Tags:
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                    {TAGS.map(tag => (
                      <button key={tag.tag}
                        className="btn btn-sm"
                        title={tag.desc}
                        style={{ background:'#EDE9FE', color:'#6D28D9', border:'1px solid #DDD6FE', fontSize:11 }}
                        onClick={() => insertTag(t.id, tag.tag)}>
                        {tag.tag}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Message textarea */}
                <div className="form-group">
                  <label className="form-label">Message Template</label>
                  <textarea
                    className="form-input form-textarea"
                    rows={4}
                    value={t.message}
                    onChange={e => updateTemplate(t.id, 'message', e.target.value)}
                  />
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:4, fontSize:11.5, color:'#94A3B8' }}>
                    <span>{t.message.length} characters</span>
                    <span>~{Math.ceil(t.message.length/160)} SMS</span>
                  </div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn btn-teal btn-sm" onClick={() => { save.mutate(); setEditingId(null); }}>
                    <Save size={13}/> Save
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
