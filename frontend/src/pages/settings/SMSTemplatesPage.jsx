import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Save, MessageSquare, Info, Tag } from 'lucide-react';

const TAGS = [
  { tag: '{student_name}',   desc: "Student's full name" },
  { tag: '{parent_name}',    desc: "Parent's name" },
  { tag: '{roll_id}',        desc: "Student's roll number" },
  { tag: '{class_name}',    desc: "Class name" },
  { tag: '{school_name}',   desc: "School name" },
  { tag: '{fee_due}',       desc: "Due amount (Rs.)" },
  { tag: '{fee_title}',     desc: "Fee title/month" },
  { tag: '{month}',         desc: "Month name" },
  { tag: '{amount_paid}',   desc: "Amount paid" },
  { tag: '{receipt_no}',    desc: "Receipt number" },
  { tag: '{date}',          desc: "Today's date" },
  { tag: '{marks}',           desc: "Obtained marks" },
  { tag: '{percentage}',      desc: "Result percentage" },
  { tag: '{teacher_name}',    desc: "Teacher/Staff name" },
  { tag: '{designation}',     desc: "Staff designation" },
  { tag: '{salary_month}',    desc: "Salary month" },
  { tag: '{basic_salary}',    desc: "Basic salary amount" },
  { tag: '{present_days}',    desc: "Present days count" },
  { tag: '{absent_days}',     desc: "Absent days count" },
  { tag: '{late_days}',       desc: "Late arrival days" },
  { tag: '{received_by}',     desc: "Received by (accountant)" },
  { tag: '{time}',            desc: "Current time" },
  { tag: '{approval_id}',     desc: "Leave approval ID" },
  { tag: '{leave_start_date}',desc: "Leave start date" },
  { tag: '{leave_end_date}',  desc: "Leave end date" },
  { tag: '{diary_details}',   desc: "Homework diary content" },
  { tag: '{to_campus_name}',  desc: "Transfer destination campus" },
  { tag: '{by_user}',         desc: "Action performed by" },
  { tag: '{exam_name}',       desc: "Exam name" },
  { tag: '{section_name}',    desc: "Section name" },
  { tag: '{campus_name}',     desc: "Campus name" },
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
    message: 'Respected {parent_name}, your request of leave for Student: {student_name} has been APPROVED. APPROVAL ID: {approval_id} From: {leave_start_date} To: {leave_end_date}. THANK YOU - {school_name}',
  },
  // ── Competitor parity templates ─────────────────────────────
  {
    id: 'inquiry_add',
    event: 'Inquiry / Lead Added',
    category: 'Admissions',
    enabled: true,
    message: 'Dear {student_name}, THANK YOU for your interest in {school_name}. You are now subscribed. We will inform you about admissions, latest developments and news updates via SMS.',
  },
  {
    id: 'inquiry_admit',
    event: 'Inquiry Admitted',
    category: 'Admissions',
    enabled: true,
    message: 'Admission Successful: Student Name: {student_name}, Parent: {parent_name}, Roll ID: {roll_id}. THANK YOU FOR JOINING US. - {school_name}',
  },
  {
    id: 'salary_issue',
    event: 'Salary Issued to Staff',
    category: 'Finance',
    enabled: true,
    message: 'Respected {teacher_name}, your salary of month {salary_month} has been issued. Basic Salary: {basic_salary}. Present Days: {present_days}. Late Arrivals: {late_days}. Absents: {absent_days}. Amount Paid: {amount_paid}. Thank You - {school_name}',
  },
  {
    id: 'fee_first_reminder',
    event: 'First Fee Reminder',
    category: 'Finance',
    enabled: true,
    message: 'You are noticed that kindly pay dues of your child {student_name}. Details: Monthly Fee Of {month}: Rs. {fee_due}. Please pay before due date. - {school_name}',
  },
  {
    id: 'fee_second_reminder',
    event: 'Second Fee Reminder',
    category: 'Finance',
    enabled: true,
    message: 'This is the second time you are noticed that kindly pay dues of your child {student_name} within due date. Details: Monthly Fee Of {month}: Rs. {fee_due}. - {school_name}',
  },
  {
    id: 'fee_third_reminder',
    event: 'Third / Final Fee Reminder',
    category: 'Finance',
    enabled: true,
    message: 'You are noticed FINALLY that kindly pay dues of your child {student_name}. If fee dues are not paid, your child will not be allowed to attend school after given date. Parents will be responsible for it. Details: {fee_due} - {school_name}',
  },
  {
    id: 'diary_sms',
    event: 'Daily Homework Diary',
    category: 'Academics',
    enabled: true,
    message: 'Daily Homework Diary For Student: {student_name}: {diary_details} - {school_name}',
  },
  {
    id: 'student_transfer',
    event: 'Student Transfer',
    category: 'Admissions',
    enabled: false,
    message: 'Student: {student_name} has been successfully transferred to campus: {to_campus_name} by {by_user}. Thank you. - {school_name}',
  },
  {
    id: 'staff_absent',
    event: 'Staff Absent Alert',
    category: 'Attendance',
    enabled: true,
    message: 'Respected {teacher_name}, Please be informed that you were marked as ABSENT today. Please remember to call or send a signed note explaining the reason for this absence. Thank you. - {school_name}',
  },
  {
    id: 'staff_late',
    event: 'Staff Late Arrival',
    category: 'Attendance',
    enabled: true,
    message: 'Respected {teacher_name}, Please be informed that you were marked as LATE arrival today. As a {designation} it is your responsibility to be punctual. Thank you. - {school_name}',
  },
  {
    id: 'fee_payment_confirm',
    event: 'Fee Payment Confirmation',
    category: 'Finance',
    enabled: true,
    message: 'THANK YOU FOR FEE SUBMISSION. Student: {student_name}, amount paid: Rs. {amount_paid} on {date} - {time} of {fee_title}. Received by {received_by}. - {school_name}',
  },
  {
    id: 'direct_payment',
    event: 'Direct Student Payment',
    category: 'Finance',
    enabled: true,
    message: 'THANK YOU FOR FEE SUBMISSION. Student: {student_name}, amount paid: Rs. {amount_paid} on {date} - {time} of {fee_title}. Received by {received_by}. - {school_name}',
  },
];

const CATEGORIES = ['All', 'Finance', 'Attendance', 'Exams', 'Admissions', 'Academics', 'Miscellaneous'];

export default function SMSTemplatesPage() {
  const queryClient = useQueryClient();
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [activeCategory, setActiveCategory] = useState('All');
  const [editingId, setEditingId] = useState(null);

  const { data: settings } = useQuery({
    queryKey: ['school-settings'],
    queryFn: () => api.get('/settings').then(r => r.data.data || {}),
  });

  useEffect(() => {
    if (settings?.smsTemplates && Array.isArray(settings.smsTemplates) && settings.smsTemplates.length > 0) {
      // Merge saved templates over defaults so new default templates are still included
      setTemplates(DEFAULT_TEMPLATES.map(def => {
        const saved = settings.smsTemplates.find(s => s.id === def.id);
        return saved ? { ...def, ...saved } : def;
      }));
    }
  }, [settings]);

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
    mutationFn: (data) => api.put('/settings', { smsTemplates: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-settings'] });
      toast.success('SMS templates saved!');
      setEditingId(null);
    },
    onError: () => toast.error('Failed to save SMS templates'),
  });

  const categoryColors = { Finance:'#15803D', Attendance:'#2563EB', Exams:'#7C3AED', Admissions:'#0D9488', Miscellaneous:'#D97706' };

  return (
    <div className="page-content fade-up">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 className="page-title">SMS Templates</h1>
          <p className="page-subtitle">Configure automated SMS messages for each school event</p>
        </div>
        <button className="btn btn-teal" onClick={() => save.mutate(templates)} disabled={save.isPending}>
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
                  <button className="btn btn-teal btn-sm" onClick={() => save.mutate(templates)} disabled={save.isPending}>
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
