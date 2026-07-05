/**
 * IlmForge — Portal Management
 * Manage login credentials for Teachers, Parents & Students
 * Send credentials via Email, copy passwords, reset access
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import {
  Users, Award, Home, Mail, Phone, Copy, Send,
  RefreshCw, Eye, EyeOff, CheckCircle, X, Key,
  Smartphone, MessageSquare, Shield, ToggleLeft, ToggleRight,
  Info, ChevronDown, ChevronUp
} from 'lucide-react';

/* ── Send credentials email template ────────────────── */
const sendCredentialEmail = async (person, role, school) => {
  const sName     = school?.name || 'IlmForge School';
  const loginUrl  = window.location.origin + '/login';
  const logo      = localStorage.getItem('schoolLogoPreview');
  const logoHtml  = logo
    ? `<img src="${logo}" style="width:52px;height:52px;object-fit:cover;border-radius:10px;" alt="Logo"/>`
    : `<div style="width:52px;height:52px;background:#0F766E;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:24px;">🎓</div>`;

  const roleLabels = { teacher:'Teacher', accountant:'Accountant', parent:'Parent', student:'Student' };
  const defaultPws = { teacher:'teacher', accountant:'accountant', parent:'parent', student:'student123' };
  const pw         = person.tempPassword || defaultPws[role] || 'changeme';

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F0FDFA;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:28px 16px;background:#F0FDFA;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      <!-- Header -->
      <tr><td style="background:linear-gradient(145deg,#0F4C45,#0F766E);padding:28px 36px;text-align:center;">
        ${logoHtml}
        <h1 style="color:#fff;font-size:20px;font-weight:900;margin:10px 0 4px;">${sName}</h1>
        <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0;">IlmForge School Management Portal</p>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:28px 36px;">
        <h2 style="color:#0F4C45;font-size:18px;font-weight:800;margin:0 0 6px;">Welcome, ${person.name}! 👋</h2>
        <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;">
          Your <strong>${roleLabels[role]||role}</strong> portal account has been set up at <strong>${sName}</strong>.
          Use the credentials below to access your portal.
        </p>
        <!-- Credentials Card -->
        <div style="background:#F0FDFA;border:2px solid #0D9488;border-radius:12px;padding:20px 24px;margin-bottom:20px;">
          <h3 style="color:#0F4C45;font-size:12px;font-weight:700;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;">🔑 Your Login Details</h3>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:6px 0;color:#6B7280;font-size:13px;width:100px;">Portal URL</td><td style="padding:6px 0;"><a href="${loginUrl}" style="color:#0F766E;font-weight:700;font-size:13px;text-decoration:none;">${loginUrl}</a></td></tr>
            <tr style="border-top:1px solid #CCFBF1;"><td style="padding:6px 0;color:#6B7280;font-size:13px;">Role</td><td style="padding:6px 0;color:#0F4C45;font-size:13px;font-weight:700;">${roleLabels[role]||role}</td></tr>
            <tr style="border-top:1px solid #CCFBF1;"><td style="padding:6px 0;color:#6B7280;font-size:13px;">Email</td><td style="padding:6px 0;color:#0F4C45;font-size:13px;font-weight:700;">${person.email||'—'}</td></tr>
            <tr style="border-top:1px solid #CCFBF1;"><td style="padding:6px 0;color:#6B7280;font-size:13px;">Password</td>
              <td style="padding:6px 0;"><span style="background:#0F4C45;color:#fff;font-family:'Courier New',monospace;font-size:15px;font-weight:700;padding:4px 14px;border-radius:6px;letter-spacing:1px;">${pw}</span></td></tr>
          </table>
        </div>
        <!-- Warning -->
        <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:9px;padding:11px 14px;margin-bottom:18px;">
          <p style="color:#78350F;font-size:12.5px;margin:0;">⚠️ Please change your password after first login via <em>Settings → My Profile</em>.</p>
        </div>
        <!-- CTA -->
        <div style="text-align:center;margin-bottom:18px;">
          <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(90deg,#0F766E,#0D9488);color:#fff;text-decoration:none;padding:12px 32px;border-radius:9px;font-size:14px;font-weight:800;box-shadow:0 4px 12px rgba(15,118,110,0.3);">
            → Login to Portal
          </a>
        </div>
        <p style="color:#9CA3AF;font-size:11.5px;text-align:center;margin:0;">
          Need help? Contact school admin or reply to this email.<br/>
          Powered by <strong>IlmForge</strong> · Ilm Ko Asaan Banaye
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  return api.post('/notifications/email', {
    to:      person.email,
    subject: `🔑 Your ${sName} Portal Login Credentials`,
    body:    `Your login: ${person.email} / ${pw} — ${loginUrl}`,
    html,
  }).catch(() =>
    // Fallback: show credentials in toast if email fails
    Promise.resolve({ success: true, fallback: true })
  );
};

/* ════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════ */
export default function PortalManagementPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('teachers');
  const [showPassFor, setShowPassFor]   = useState({});
  const [resetModal, setResetModal]     = useState(null); // {user, role}
  const [newPassword, setNewPassword]   = useState('');
  const [sending, setSending]           = useState({});
  const [howToOpen, setHowToOpen]       = useState(true);

  // Per-parent email override state: { [studentId]: emailString }
  const [parentEmailOverrides, setParentEmailOverrides] = useState({});
  // Track which parent rows have the email input expanded
  const [emailEditOpen, setEmailEditOpen] = useState({});

  const { data:school } = useQuery({ queryKey:['school-settings'], queryFn:()=>api.get('/settings/school').then(r=>r.data.data) });
  const { data:staffData } = useQuery({ queryKey:['staff-portal'], queryFn:()=>api.get('/staff').then(r=>r.data.data||[]) });
  const { data:parentsData } = useQuery({ queryKey:['parents-portal'], queryFn:()=>api.get('/parents').then(r=>r.data.data||[]) });
  const { data:studentsData } = useQuery({ queryKey:['students-portal'], queryFn:()=>api.get('/students',{params:{limit:200,status:'active'}}).then(r=>r.data.data||[]) });

  /* Default passwords by role */
  const defaultPw = { teacher:'teacher', accountant:'accountant', parent:'parent', student:'student123' };

  /* Copy to clipboard */
  const copyText = (text, label='') => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied!`));
  };

  /* Send credentials via email */
  const sendCreds = async (person, role) => {
    if (!person.email) return toast.error('No email address for this user');
    setSending(s => ({...s, [person.id]: true}));
    try {
      const res = await sendCredentialEmail(person, role, school);
      if (res?.data?.fallback || res?.fallback) {
        toast.success(`Credentials: ${person.email} / ${defaultPw[role]||'teacher'}`, { duration:6000, icon:'📋' });
      } else {
        toast.success(`Credentials sent to ${person.email}! 📧`);
      }
    } catch {
      toast.error('Failed to send. Copy credentials manually.');
    } finally {
      setSending(s => ({...s, [person.id]: false}));
    }
  };

  /* Send via SMS */
  const sendSMS = async (person, role) => {
    const ph = person.phone || person.emergencyPhone;
    if (!ph) return toast.error('No phone number');
    try {
      await api.post('/notifications/sms', {
        phones: [ph],
        message: `${school?.name||'School'} Portal Login:\nEmail: ${person.email||'—'}\nPassword: ${defaultPw[role]||'teacher'}\nLogin: ${window.location.origin}/login`,
      });
      toast.success(`SMS sent to ${ph}! 📱`);
    } catch { toast.error('SMS failed — check SMS settings'); }
  };

  /* Reset password */
  const resetPw = useMutation({
    mutationFn: ({ userId, password }) => api.post('/auth/reset-staff-password', { userId, newPassword: password }),
    onSuccess: () => { toast.success('Password reset successfully!'); setResetModal(null); setNewPassword(''); },
    onError: () => { toast.error('Reset via admin panel: Settings → Admin Accounts'); setResetModal(null); },
  });

  /* ── Row component ── */
  const CredRow = ({ person, role, extraInfo }) => {
    const pw      = defaultPw[role] || 'changeme';
    const visible = showPassFor[person.id];
    const isSending = sending[person.id];
    const hasEmail  = !!person.email;

    return (
      <tr key={person.id}>
        <td>
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <div style={{ width:34,height:34,borderRadius:'50%',background:`linear-gradient(135deg,${role==='teacher'?'#7C3AED,#6D28D9':role==='parent'?'#0F766E,#0D9488':'#D97706,#B45309'})`,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:12,flexShrink:0 }}>
              {person.name?.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight:700, fontSize:13, color:'#111827' }}>{person.name}</div>
              {extraInfo && <div style={{ fontSize:11, color:'#9CA3AF' }}>{extraInfo}</div>}
            </div>
          </div>
        </td>
        <td>
          {hasEmail ? (
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ fontSize:12.5, color:'#374151' }}>{person.email}</span>
              <button onClick={()=>copyText(person.email,'Email')} style={{ background:'none',border:'none',cursor:'pointer',color:'#9CA3AF',padding:2 }}>
                <Copy size={11}/>
              </button>
            </div>
          ) : (
            <span style={{ fontSize:12, color:'#EF4444', fontStyle:'italic' }}>No email</span>
          )}
        </td>
        <td style={{ fontSize:12.5, color:'#374151' }}>
          {person.phone || person.emergencyPhone || '—'}
        </td>
        <td>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ fontFamily:'monospace', fontSize:13, fontWeight:700, color:'#0F766E', background:'#F0FDFA', padding:'2px 8px', borderRadius:5, letterSpacing:1 }}>
              {visible ? pw : '••••••••'}
            </span>
            <button onClick={()=>setShowPassFor(s=>({...s,[person.id]:!visible}))}
              style={{ background:'none',border:'none',cursor:'pointer',color:'#9CA3AF',padding:2 }}>
              {visible ? <EyeOff size={13}/> : <Eye size={13}/>}
            </button>
            <button onClick={()=>copyText(pw,'Password')}
              style={{ background:'none',border:'none',cursor:'pointer',color:'#9CA3AF',padding:2 }}>
              <Copy size={11}/>
            </button>
          </div>
        </td>
        <td>
          <span className={`badge ${hasEmail?'badge-teal':'badge-red'}`}>
            {hasEmail ? '✓ Can Login' : '✗ No Email'}
          </span>
        </td>
        <td>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            {/* Send via Email */}
            <button
              className="btn btn-sm btn-teal"
              style={{ gap:4, fontSize:11 }}
              disabled={!hasEmail || isSending}
              title={!hasEmail?'Add email first':'Send credentials by email'}
              onClick={()=>sendCreds(person, role)}>
              {isSending ? <RefreshCw size={11} style={{ animation:'spin .8s linear infinite' }}/> : <Mail size={11}/>}
              {isSending ? '…' : 'Email'}
            </button>

            {/* Send via SMS */}
            <button
              className="btn btn-sm"
              style={{ background:'#EFF6FF',border:'1px solid #BFDBFE',color:'#1D4ED8',gap:4,fontSize:11 }}
              title="Send via SMS"
              onClick={()=>sendSMS(person, role)}>
              <MessageSquare size={11}/> SMS
            </button>

            {/* Copy full credentials */}
            <button
              className="btn btn-sm btn-outline"
              style={{ gap:4,fontSize:11 }}
              title="Copy credentials"
              onClick={()=>copyText(`Email: ${person.email||'—'}\nPassword: ${pw}\nPortal: ${window.location.origin}/login`,'Credentials')}>
              <Copy size={11}/> Copy
            </button>

            {/* Reset password */}
            <button
              className="btn btn-sm btn-outline"
              style={{ gap:4,fontSize:11,borderColor:'#FDE68A',color:'#B45309',background:'#FFFBEB' }}
              title="Reset password"
              onClick={()=>{ setResetModal({person,role}); setNewPassword(''); }}>
              <Key size={11}/> Reset
            </button>
          </div>
        </td>
      </tr>
    );
  };

  /* ── Parent Row component (with inline email entry) ── */
  const ParentRow = ({ student }) => {
    const studentId  = student.id;
    // Priority: user-entered override → fatherEmail field → emergencyEmail → nothing
    const resolvedEmail =
      parentEmailOverrides[studentId] !== undefined
        ? parentEmailOverrides[studentId]
        : (student.fatherEmail || student.emergencyEmail || '');

    const isEditing  = !!emailEditOpen[studentId];
    const isSending  = !!sending[studentId];
    const hasEmail   = resolvedEmail.trim().length > 0;
    const pw         = 'parent';
    const parentName = student.fatherName || `${student.name}'s Parent`;

    const handleSendEmail = async () => {
      if (!hasEmail) return toast.error('Enter parent email first');
      setSending(s => ({...s, [studentId]: true}));
      try {
        const person = {
          id: studentId,
          name: parentName,
          email: resolvedEmail.trim(),
        };
        const res = await sendCredentialEmail(person, 'parent', school);
        if (res?.data?.fallback || res?.fallback) {
          toast.success(`Credentials: ${resolvedEmail.trim()} / ${pw}`, { duration:6000, icon:'📋' });
        } else {
          toast.success(`Credentials sent to ${resolvedEmail.trim()}! 📧`);
        }
      } catch {
        toast.error('Failed to send. Copy credentials manually.');
      } finally {
        setSending(s => ({...s, [studentId]: false}));
      }
    };

    const handleCopyAll = () => {
      copyText(
        `Parent: ${parentName}\nEmail: ${resolvedEmail||'—'}\nPassword: ${pw}\nPortal: ${window.location.origin}/login`,
        'Parent credentials'
      );
    };

    return (
      <tr>
        <td>
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <div style={{ width:34,height:34,borderRadius:'50%',background:'linear-gradient(135deg,#0F766E,#0D9488)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:12,flexShrink:0 }}>
              {parentName.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight:700, fontSize:13, color:'#111827' }}>{parentName}</div>
              <div style={{ fontSize:11, color:'#9CA3AF' }}>Student: {student.name} · {student.class?.name||'—'}</div>
            </div>
          </div>
        </td>

        {/* Email cell — inline edit */}
        <td>
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            {isEditing ? (
              <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                <input
                  type="email"
                  className="form-input"
                  style={{ padding:'4px 8px', fontSize:12, height:28, minWidth:180 }}
                  placeholder="Enter parent email…"
                  value={parentEmailOverrides[studentId] !== undefined ? parentEmailOverrides[studentId] : resolvedEmail}
                  onChange={e => setParentEmailOverrides(prev => ({...prev, [studentId]: e.target.value}))}
                  autoFocus
                />
                <button
                  className="btn btn-sm btn-teal"
                  style={{ fontSize:11, padding:'3px 8px', height:28 }}
                  onClick={() => setEmailEditOpen(prev => ({...prev, [studentId]: false}))}>
                  Save
                </button>
              </div>
            ) : (
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                {hasEmail ? (
                  <>
                    <span style={{ fontSize:12.5, color:'#374151' }}>{resolvedEmail}</span>
                    <button onClick={()=>copyText(resolvedEmail,'Email')} style={{ background:'none',border:'none',cursor:'pointer',color:'#9CA3AF',padding:2 }}>
                      <Copy size={11}/>
                    </button>
                  </>
                ) : (
                  <span style={{ fontSize:12, color:'#EF4444', fontStyle:'italic' }}>No email — enter below</span>
                )}
                <button
                  onClick={() => setEmailEditOpen(prev => ({...prev, [studentId]: true}))}
                  style={{ background:'#F0FDFA', border:'1px solid #0D9488', borderRadius:5, cursor:'pointer', color:'#0F766E', fontSize:10, padding:'2px 7px', fontWeight:600 }}>
                  {hasEmail ? 'Edit' : '+ Add'}
                </button>
              </div>
            )}
          </div>
        </td>

        <td style={{ fontSize:12.5, color:'#374151' }}>
          {student.emergencyPhone || student.fatherPhone || '—'}
        </td>

        <td>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ fontFamily:'monospace', fontSize:13, fontWeight:700, color:'#0F766E', background:'#F0FDFA', padding:'2px 8px', borderRadius:5, letterSpacing:1 }}>
              parent
            </span>
            <button onClick={()=>copyText(pw,'Password')} style={{ background:'none',border:'none',cursor:'pointer',color:'#9CA3AF',padding:2 }}>
              <Copy size={11}/>
            </button>
          </div>
        </td>

        <td>
          <span className={`badge ${hasEmail?'badge-teal':'badge-red'}`}>
            {hasEmail ? '✓ Email Set' : '✗ No Email'}
          </span>
        </td>

        <td>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            <button
              className="btn btn-sm btn-teal"
              style={{ gap:4, fontSize:11 }}
              disabled={!hasEmail || isSending}
              title={!hasEmail ? 'Enter parent email first' : 'Send credentials by email'}
              onClick={handleSendEmail}>
              {isSending ? <RefreshCw size={11} style={{ animation:'spin .8s linear infinite' }}/> : <Mail size={11}/>}
              {isSending ? '…' : 'Send Credentials'}
            </button>
            <button
              className="btn btn-sm btn-outline"
              style={{ gap:4, fontSize:11 }}
              title="Copy credentials"
              onClick={handleCopyAll}>
              <Copy size={11}/> Copy
            </button>
            <button
              className="btn btn-sm btn-outline"
              style={{ gap:4, fontSize:11, borderColor:'#FDE68A', color:'#B45309', background:'#FFFBEB' }}
              title="Reset password"
              onClick={() => { setResetModal({ person:{ id:studentId, name:parentName, email:resolvedEmail, userId:student.parentUserId }, role:'parent' }); setNewPassword(''); }}>
              <Key size={11}/> Reset
            </button>
          </div>
        </td>
      </tr>
    );
  };

  const TABS = [
    { id:'teachers',  label:'👨‍🏫 Teachers',  count:(staffData||[]).length,  color:'#7C3AED' },
    { id:'parents',   label:'👨‍👩‍👦 Parents',   count:(studentsData||[]).length, color:'#0F766E' },
    { id:'students',  label:'🎓 Students',   count:(studentsData||[]).length,color:'#D97706' },
  ];

  return (
    <div className="page-content fade-up">
      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <h1 className="page-title">Portal Management</h1>
        <p className="page-subtitle">Manage login credentials for teachers, parents and students</p>
      </div>

      {/* ═══ HOW TO GUIDE SECTION ═══ */}
      <div style={{
        background: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)',
        border: '1.5px solid #0D9488',
        borderRadius: 14,
        marginBottom: 20,
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(15,118,110,0.08)',
      }}>
        {/* Guide header (collapsible) */}
        <button
          onClick={() => setHowToOpen(v => !v)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '13px 20px', background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: howToOpen ? '1px solid #99F6E4' : 'none',
          }}>
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:'#0F766E', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Info size={16} color="#fff"/>
            </div>
            <span style={{ fontSize:14, fontWeight:800, color:'#0F4C45' }}>How To Guide — Setting Up Portal Access</span>
          </div>
          {howToOpen ? <ChevronUp size={16} color="#0F766E"/> : <ChevronDown size={16} color="#0F766E"/>}
        </button>

        {howToOpen && (
          <div style={{ padding: '16px 20px', display: 'flex', gap: 14, flexWrap: 'wrap' }}>

            {/* Teachers */}
            <div style={{
              flex: '1 1 200px',
              background: '#fff',
              borderRadius: 10,
              padding: '14px 16px',
              border: '1px solid #99F6E4',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:9 }}>
                <span style={{ fontSize:20 }}>📱</span>
                <span style={{ fontSize:13, fontWeight:800, color:'#7C3AED' }}>For Teachers</span>
              </div>
              <p style={{ fontSize:12.5, color:'#374151', lineHeight:1.65, margin:0 }}>
                Teachers receive credentials automatically when added via <strong>Staff Management</strong>.
                To resend: click the <strong style={{ color:'#0F766E' }}>"Email Credentials"</strong> button on the Teachers tab.
              </p>
              <div style={{ marginTop:9, padding:'7px 10px', background:'#F5F3FF', borderRadius:7, border:'1px solid #DDD6FE' }}>
                <span style={{ fontSize:11.5, color:'#5B21B6', fontWeight:600 }}>Default password:</span>
                <code style={{ marginLeft:6, background:'#7C3AED', color:'#fff', padding:'1px 8px', borderRadius:4, fontSize:11, fontWeight:700 }}>teacher</code>
              </div>
            </div>

            {/* Parents */}
            <div style={{
              flex: '1 1 200px',
              background: '#fff',
              borderRadius: 10,
              padding: '14px 16px',
              border: '1px solid #99F6E4',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:9 }}>
                <span style={{ fontSize:20 }}>👨‍👩‍👦</span>
                <span style={{ fontSize:13, fontWeight:800, color:'#0F766E' }}>For Parents</span>
              </div>
              <p style={{ fontSize:12.5, color:'#374151', lineHeight:1.65, margin:0 }}>
                Parents are connected to students via Father's phone/CNIC. To set up parent portal:
              </p>
              <ol style={{ fontSize:12, color:'#374151', lineHeight:1.7, margin:'7px 0 0 0', paddingLeft:18 }}>
                <li>Ensure student has father's email in admission form.</li>
                <li>Use the <strong style={{ color:'#0F766E' }}>"Send Credentials"</strong> button below.</li>
              </ol>
              <div style={{ marginTop:9, padding:'7px 10px', background:'#F0FDFA', borderRadius:7, border:'1px solid #99F6E4' }}>
                <span style={{ fontSize:11.5, color:'#0F766E', fontWeight:600 }}>Default password:</span>
                <code style={{ marginLeft:6, background:'#0F766E', color:'#fff', padding:'1px 8px', borderRadius:4, fontSize:11, fontWeight:700 }}>parent</code>
              </div>
            </div>

            {/* Students */}
            <div style={{
              flex: '1 1 200px',
              background: '#fff',
              borderRadius: 10,
              padding: '14px 16px',
              border: '1px solid #99F6E4',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:9 }}>
                <span style={{ fontSize:20 }}>🎓</span>
                <span style={{ fontSize:13, fontWeight:800, color:'#D97706' }}>For Students</span>
              </div>
              <p style={{ fontSize:12.5, color:'#374151', lineHeight:1.65, margin:0 }}>
                Students login with their <strong>Roll Number</strong> as username.
                To send: use WhatsApp or copy-paste credentials manually from the Students tab.
              </p>
              <div style={{ marginTop:9, padding:'7px 10px', background:'#FFFBEB', borderRadius:7, border:'1px solid #FDE68A' }}>
                <span style={{ fontSize:11.5, color:'#92400E', fontWeight:600 }}>Default password:</span>
                <code style={{ marginLeft:6, background:'#D97706', color:'#fff', padding:'1px 8px', borderRadius:4, fontSize:11, fontWeight:700 }}>student123</code>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Info banner */}
      <div className="alert alert-teal" style={{ marginBottom:18 }}>
        <Shield size={16}/>
        <div>
          <strong>Default Passwords</strong> — Teachers: <code style={{background:'#CCFBF1',padding:'1px 6px',borderRadius:4}}>teacher</code> &nbsp;|&nbsp;
          Parents: <code style={{background:'#CCFBF1',padding:'1px 6px',borderRadius:4}}>parent</code> &nbsp;|&nbsp;
          Students: <code style={{background:'#CCFBF1',padding:'1px 6px',borderRadius:4}}>student123</code>
          <br/><span style={{fontSize:12,opacity:.8}}>All users must change their password after first login.</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom:18 }}>
        {TABS.map(t => (
          <div key={t.id} className="card" onClick={()=>setActiveTab(t.id)}
            style={{ cursor:'pointer', borderTop:`3px solid ${activeTab===t.id?t.color:'transparent'}`, transition:'all .13s' }}>
            <div style={{ fontSize:24, fontWeight:800, color:t.color }}>{t.count}</div>
            <div style={{ fontSize:13, fontWeight:600, color:'#374151', marginTop:3 }}>{t.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tab-list" style={{ marginBottom:16 }}>
        {TABS.map(t => (
          <button key={t.id} className={`tab-btn${activeTab===t.id?' active':''}`} onClick={()=>setActiveTab(t.id)}>
            {t.label} <span style={{ marginLeft:6, fontSize:11, background:activeTab===t.id?t.color+'20':'#F3F4F6', color:activeTab===t.id?t.color:'#6B7280', padding:'1px 7px', borderRadius:99, fontWeight:700 }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* ═══ TEACHERS ═══ */}
      {activeTab==='teachers' && (
        <div className="card" style={{ padding:0 }}>
          <div style={{ padding:'12px 18px', borderBottom:'1px solid #F3F4F6', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:'#111827' }}>Teacher & Staff Accounts</h3>
            <button className="btn btn-sm btn-teal"
              onClick={()=>{ (staffData||[]).filter(s=>s.user?.email).forEach(s => sendCreds({...s.user,...s}, 'teacher')); toast.success('Sending to all teachers…'); }}>
              <Send size={12}/> Email Credentials
            </button>
          </div>
          <div className="table-wrap" style={{ borderRadius:0, border:'none' }}>
            <table className="data-table">
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Password</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {(staffData||[]).map(staff => (
                  <CredRow key={staff.id} person={{...staff.user, ...staff, id:staff.id, name:staff.name, email:staff.user?.email, phone:staff.user?.phone}} role="teacher" extraInfo={staff.designation}/>
                ))}
                {!(staffData||[]).length && <tr><td colSpan={6}><div className="empty-state" style={{padding:28}}><div className="empty-state-text">No staff members added yet</div></div></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ PARENTS ═══ */}
      {activeTab==='parents' && (
        <div className="card" style={{ padding:0 }}>
          <div style={{ padding:'12px 18px', borderBottom:'1px solid #F3F4F6', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, flexWrap:'wrap' }}>
            <div>
              <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:'#111827' }}>Parent Accounts</h3>
              <p style={{ margin:'3px 0 0', fontSize:12, color:'#6B7280' }}>
                Enter or confirm parent email per row, then click "Send Credentials".
                Email is auto-filled from admission form if available.
              </p>
            </div>
            <button className="btn btn-sm btn-teal"
              onClick={() => {
                const toSend = (studentsData||[]).filter(s => {
                  const email = parentEmailOverrides[s.id] !== undefined
                    ? parentEmailOverrides[s.id]
                    : (s.fatherEmail || s.emergencyEmail || '');
                  return email.trim().length > 0;
                });
                if (!toSend.length) return toast.error('No parent emails set. Add emails row by row first.');
                toSend.forEach(s => {
                  const email = (parentEmailOverrides[s.id] !== undefined ? parentEmailOverrides[s.id] : (s.fatherEmail || s.emergencyEmail || '')).trim();
                  sendCredentialEmail({ id: s.id, name: s.fatherName || `${s.name}'s Parent`, email }, 'parent', school);
                });
                toast.success(`Sending credentials to ${toSend.length} parents…`);
              }}>
              <Send size={12}/> Send All (with emails)
            </button>
          </div>

          {/* Tip banner */}
          <div style={{ margin:'12px 16px 0', padding:'10px 14px', background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:9, fontSize:12, color:'#78350F', display:'flex', alignItems:'flex-start', gap:8 }}>
            <span style={{ fontSize:15, flexShrink:0 }}>💡</span>
            <span>
              <strong>Tip:</strong> If a student's admission form includes the father's email, it appears automatically.
              Otherwise click <strong>+ Add</strong> next to "No email" to enter it manually per parent.
              The email you enter is only used for this session — save it in the student's admission record for permanent storage.
            </span>
          </div>

          <div className="table-wrap" style={{ borderRadius:0, border:'none', marginTop:8 }}>
            <table className="data-table">
              <thead><tr><th>Student / Parent</th><th>Parent Email</th><th>Phone</th><th>Password</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {(studentsData||[]).map(student => (
                  <ParentRow key={student.id} student={student}/>
                ))}
                {!(studentsData||[]).length && (
                  <tr><td colSpan={6}><div className="empty-state" style={{padding:28}}><div className="empty-state-text">No students admitted yet</div></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ STUDENTS ═══ */}
      {activeTab==='students' && (
        <div className="card" style={{ padding:0 }}>
          <div style={{ padding:'12px 18px', borderBottom:'1px solid #F3F4F6', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:'#111827' }}>Student Accounts</h3>
            <div className="alert alert-warning" style={{ padding:'6px 12px', fontSize:12, margin:0 }}>
              Students log in with Roll No. as username
            </div>
          </div>
          <div className="table-wrap" style={{ borderRadius:0, border:'none' }}>
            <table className="data-table">
              <thead><tr><th>Student</th><th>Roll No (Username)</th><th>Father</th><th>Password</th><th>Class</th><th>Actions</th></tr></thead>
              <tbody>
                {(studentsData||[]).slice(0,50).map(s => (
                  <tr key={s.id}>
                    <td><div style={{ fontWeight:700, fontSize:13 }}>{s.name}</div></td>
                    <td><span style={{ fontFamily:'monospace', fontWeight:700, color:'#0F766E', fontSize:13 }}>{s.rollNo||'—'}</span></td>
                    <td style={{ fontSize:12.5, color:'#6B7280' }}>{s.fatherName||'—'}</td>
                    <td>
                      <span style={{ fontFamily:'monospace', background:'#F0FDFA', color:'#0F766E', padding:'2px 8px', borderRadius:5, fontSize:12 }}>
                        student123
                      </span>
                    </td>
                    <td><span className="badge badge-blue">{s.class?.name||'—'}</span></td>
                    <td>
                      <button className="btn btn-sm btn-outline" style={{ fontSize:11,gap:4 }}
                        onClick={()=>copyText(`Roll No: ${s.rollNo||'—'}\nPassword: student123\nPortal: ${window.location.origin}/login`, 'Student credentials')}>
                        <Copy size={11}/> Copy
                      </button>
                    </td>
                  </tr>
                ))}
                {!(studentsData||[]).length && <tr><td colSpan={6}><div className="empty-state" style={{padding:28}}><div className="empty-state-text">No students found</div></div></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ RESET PASSWORD MODAL ═══ */}
      {resetModal && (
        <div className="modal-overlay" onClick={()=>setResetModal(null)}>
          <div className="modal modal-sm" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">🔑 Reset Password</div>
                <div style={{ fontSize:12.5, color:'#6B7280', marginTop:3 }}>For: <strong>{resetModal.person.name}</strong></div>
              </div>
              <button onClick={()=>setResetModal(null)} style={{ background:'none',border:'none',cursor:'pointer',color:'#9CA3AF' }}><X size={17}/></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-input" type="text" placeholder="Enter new password (min 6 chars)"
                  value={newPassword} onChange={e=>setNewPassword(e.target.value)}/>
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:4 }}>
                {['teacher123','parent123','changeme1','ilmforge1'].map(p=>(
                  <button key={p} className="btn btn-sm btn-outline" onClick={()=>setNewPassword(p)}
                    style={{ fontSize:11, fontFamily:'monospace' }}>{p}</button>
                ))}
              </div>
              <div className="alert alert-teal" style={{ marginTop:12 }}>
                <span>📧</span>
                <span style={{ fontSize:12 }}>After resetting, use "Email" button to send the new credentials to the user.</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setResetModal(null)}>Cancel</button>
              <button className="btn btn-teal" disabled={newPassword.length<4 || resetPw.isPending}
                onClick={()=>resetPw.mutate({ userId: resetModal.person.userId||resetModal.person.id, password: newPassword })}>
                <Key size={14}/> {resetPw.isPending?'Resetting…':'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
