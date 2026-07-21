/**
 * IlmForge — Professional Certificates & Documents
 * Character Certificate: class/section filter, student search, editable fields, 2-per-page print
 * Experience Certificate: staff fields, dates, designation
 * All original certificate types preserved
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import {
  FileText, Award, GraduationCap, User, Calendar, Gift,
  Printer, Search, X, CheckCircle, ChevronDown,
} from 'lucide-react';

/* ── Certificate types ─────────────────────────── */
const CERT_TYPES = [
  { id:'leaving',   icon:FileText,      label:'Leaving Certificate',    desc:'For students leaving the school',        color:'#0F766E', forStaff:false },
  { id:'character', icon:Award,         label:'Character Certificate',  desc:'Certificate of good conduct',            color:'#7C3AED', forStaff:false },
  { id:'bonafide',  icon:CheckCircle,   label:'Bonafide Certificate',   desc:'Confirms student enrollment status',     color:'#2563EB', forStaff:false },
  { id:'dob',       icon:Calendar,      label:'Date of Birth Cert.',    desc:'Official DOB from school records',        color:'#0891B2', forStaff:false },
  { id:'experience',icon:GraduationCap, label:'Experience Certificate', desc:'For outgoing teachers & staff',          color:'#D97706', forStaff:true  },
  { id:'admit',     icon:User,          label:'Exam Admit Card',        desc:'Exam entrance slip with barcode',        color:'#DC2626', forStaff:false },
  { id:'birthday',  icon:Gift,          label:'Birthday Wish Card',     desc:'Personalized birthday card',             color:'#EC4899', forStaff:null  },
];

/* ════════════════════════════════════════════════════
   CERTIFICATE HTML BUILDERS
════════════════════════════════════════════════════ */
const getCertHTML = (type, person, school, extras = {}) => {
  const sName = school?.name    || 'IlmForge School';
  const addr  = school?.address || 'Islamabad, Pakistan';
  const phone = school?.phone   || '';
  const logo  = typeof window !== 'undefined' ? localStorage.getItem('schoolLogoPreview') : null;
  const date  = new Date().toLocaleDateString('en-PK', { day:'2-digit', month:'long', year:'numeric' });
  const year  = new Date().getFullYear();
  const dob   = person.dob
    ? new Date(person.dob).toLocaleDateString('en-PK', { day:'2-digit', month:'long', year:'numeric' })
    : '_______________';

  const logoHtml = logo
    ? `<img src="${logo}" style="width:64px;height:64px;object-fit:cover;border-radius:8px;" alt="Logo"/>`
    : `<div style="width:64px;height:64px;background:#0F766E;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:28px;">🎓</div>`;
  const watermarkHtml = `
    <div class="doc-watermark">
      ${logo ? `<img src="${logo}" alt="Watermark"/>` : ''}
      <span>${sName}</span>
    </div>`;

  const header = (accentColor) => `
    <div style="display:flex;align-items:center;gap:16px;padding-bottom:16px;border-bottom:3px solid ${accentColor};margin-bottom:18px;">
      ${logoHtml}
      <div>
        <h1 style="font-size:20px;font-weight:900;color:#111827;margin:0 0 3px;">${sName}</h1>
        ${addr ? `<p style="margin:0;color:#6B7280;font-size:11px;">${addr}${phone ? ' · ' + phone : ''}</p>` : ''}
      </div>
    </div>`;

  const sig = `
    <div style="display:flex;justify-content:space-between;margin-top:48px;padding-top:16px;border-top:1px dashed #CBD5E1;">
      <div style="text-align:center;">
        <div style="border-bottom:1px solid #374151;width:140px;margin-bottom:5px;"></div>
        <p style="font-size:11px;color:#374151;margin:0;">Class Teacher</p>
      </div>
      <div style="text-align:center;">
        <p style="font-size:11px;color:#9CA3AF;margin:0 0 5px;">Dated: ${date}</p>
      </div>
      <div style="text-align:center;">
        <div style="border-bottom:1px solid #374151;width:140px;margin-bottom:5px;"></div>
        <p style="font-size:11px;color:#374151;margin:0;">Principal / Head</p>
      </div>
    </div>
    <p style="font-size:10px;color:#9CA3AF;text-align:center;margin-top:12px;">
      Computer generated certificate · ${sName} · ${year}
    </p>`;

  /* ── Character cert uses extras: { character, reason, grNumber, session } ── */
  const charConduct  = extras.character || 'Good';
  const charReason   = extras.reason    || 'completion of studies';
  const charSession  = extras.session   || `${year - 1}-${year}`;
  const charGR       = extras.grNumber  || '_______________';

  /* ── Experience cert uses extras: { joinDate, leaveDate, expReason, expConduct } ── */
  const expJoin      = extras.joinDate    || '_______________';
  const expLeave     = extras.leaveDate   || '_______________';
  const expReason    = extras.expReason   || 'personal reasons';
  const expConduct   = extras.expConduct  || 'Excellent';

  /* One certificate block — used both solo and in 2-per-page */
  const charBlock = (accent = '#7C3AED') => `
    <div style="max-width:720px;margin:0 auto;padding:40px;border:3px double ${accent};border-radius:4px;font-family:Georgia,serif;">
      ${header(accent)}
      <h2 style="text-align:center;font-size:19px;font-weight:800;color:${accent};letter-spacing:2px;text-transform:uppercase;margin:0 0 20px;padding:10px;border:1px solid ${accent};background:#F5F3FF;">
        CERTIFICATE OF CHARACTER
      </h2>
      ${charGR !== '_______________' ? `<p style="font-size:12px;color:#6B7280;margin:0 0 14px;text-align:right;">GR No.: <strong style="color:#1F2937;">${charGR}</strong></p>` : ''}
      <p style="font-size:14px;line-height:2.1;color:#1F2937;margin-bottom:14px;">
        This is to certify that <strong style="color:#4C1D95;">${person.name}</strong>,
        son/daughter of <strong>${person.fatherName || '_______________'}</strong>,
        bearing Roll No. <strong>${person.rollNo || '___'}</strong>,
        has been a student of this institution in
        <strong>Class ${person.class?.name || '___'} ${person.section?.name ? '(' + person.section.name + ')' : ''}</strong>
        during the academic year <strong>${charSession}</strong>.
        His/Her character and conduct during the stay have been
        <strong style="color:#4C1D95;">${charConduct}</strong>.
        He/She is leaving this institution due to
        <strong>${charReason}</strong>.
        We wish him/her all the best in life.
      </p>
      <p style="font-size:14px;line-height:2.1;color:#1F2937;">
        This certificate is issued on the request of the student/parent for bonafide purposes only.
      </p>
      <div style="display:flex;justify-content:space-between;margin-top:48px;padding-top:16px;border-top:1px dashed #CBD5E1;">
        <div style="text-align:center;">
          <div style="border-bottom:1px solid #374151;width:140px;margin-bottom:5px;"></div>
          <p style="font-size:11px;color:#374151;margin:0;">Class Teacher</p>
        </div>
        <div style="text-align:center;">
          <p style="font-size:11px;color:#9CA3AF;margin:0 0 5px;">Dated: ${date}</p>
        </div>
        <div style="text-align:center;">
          <div style="border-bottom:1px solid #374151;width:140px;margin-bottom:5px;"></div>
          <p style="font-size:11px;color:#374151;margin:0;font-weight:700;">Principal / Head</p>
        </div>
      </div>
      <p style="font-size:10px;color:#9CA3AF;text-align:center;margin-top:12px;">
        Computer generated certificate · ${sName} · ${year}
      </p>
    </div>`;

  const expBlock = (accent = '#D97706') => `
    <div style="max-width:720px;margin:0 auto;padding:40px;border:3px double ${accent};border-radius:4px;font-family:Georgia,serif;">
      ${header(accent)}
      <h2 style="text-align:center;font-size:19px;font-weight:800;color:${accent};letter-spacing:2px;text-transform:uppercase;margin:0 0 20px;padding:10px;border:1px solid ${accent};background:#FFFBEB;">
        EXPERIENCE CERTIFICATE
      </h2>
      <p style="font-size:14px;line-height:2.1;color:#1F2937;margin-bottom:14px;">
        This is to certify that <strong style="color:#78350F;">${person.name}</strong>
        has served as <strong>${person.designation || 'Teacher'}</strong>
        ${person.department?.name ? `in the <strong>${person.department.name}</strong> department ` : ''}
        at <strong>${sName}</strong>
        from <strong>${expJoin}</strong> to <strong>${expLeave}</strong>.
      </p>
      <p style="font-size:14px;line-height:2.1;color:#1F2937;margin-bottom:14px;">
        During his/her service at this institution, his/her conduct and performance were found to be
        <strong style="color:#78350F;">${expConduct}</strong>. He/She proved to be a dedicated,
        sincere, and hardworking employee who actively contributed to the growth of the institution.
      </p>
      <p style="font-size:14px;line-height:2.1;color:#1F2937;margin-bottom:14px;">
        He/She is leaving this institution due to <strong>${expReason}</strong>.
        We wish him/her the best in future career endeavors.
      </p>
      <p style="font-size:14px;line-height:2.1;color:#1F2937;">
        This certificate is issued on request for bonafide purposes only.
      </p>
      <div style="display:flex;justify-content:space-between;margin-top:48px;padding-top:16px;border-top:1px dashed #CBD5E1;">
        <div style="text-align:center;">
          <div style="border-bottom:1px solid #374151;width:140px;margin-bottom:5px;"></div>
          <p style="font-size:11px;color:#374151;margin:0;">HR / Admin Officer</p>
        </div>
        <div style="text-align:center;">
          <p style="font-size:11px;color:#9CA3AF;margin:0 0 5px;">Dated: ${date}</p>
        </div>
        <div style="text-align:center;">
          <div style="border-bottom:1px solid #374151;width:140px;margin-bottom:5px;"></div>
          <p style="font-size:11px;color:#374151;margin:0;font-weight:700;">Principal / Head</p>
        </div>
      </div>
      <p style="font-size:10px;color:#9CA3AF;text-align:center;margin-top:12px;">
        Computer generated certificate · ${sName} · ${year}
      </p>
    </div>`;

  /* 2-per-page layout — used for character & experience */
  const twoPerPage = (blockFn, accent) => `
    <div class="cert-page">
      ${blockFn(accent)}
    </div>
    <div class="page-break"></div>
    <div class="cert-page">
      ${blockFn(accent)}
    </div>`;

  const TEMPLATES = {
    bonafide: `
      <div style="max-width:720px;margin:0 auto;padding:40px;border:3px double #2563EB;border-radius:4px;font-family:Georgia,serif;">
        ${header('#2563EB')}
        <h2 style="text-align:center;font-size:19px;font-weight:800;color:#2563EB;letter-spacing:2px;text-transform:uppercase;margin:0 0 20px;padding:10px;border:1px solid #2563EB;background:#EFF6FF;">
          BONAFIDE CERTIFICATE
        </h2>
        <p style="font-size:14px;line-height:2.1;color:#1F2937;margin-bottom:14px;">
          This is to certify that <strong style="color:#1E3A8A;">${person.name}</strong>,
          Son/Daughter of <strong>${person.fatherName || '_______________'}</strong>,
          bearing Roll No. <strong>${person.rollNo || '___'}</strong>,
          is a <em>bonafide</em> student of this institution,
          currently enrolled in <strong>Class ${person.class?.name || '___'}
          ${person.section?.name ? '— Section ' + person.section.name : ''}</strong>
          during the academic session <strong>${year - 1}–${year}</strong>.
        </p>
        <p style="font-size:14px;line-height:2.1;color:#1F2937;margin-bottom:14px;">
          His/Her conduct and attendance record has been satisfactory. This certificate
          is issued at the request of the student/parent for official purposes.
        </p>
        <p style="font-size:14px;line-height:2.1;color:#1F2937;">
          This school takes no responsibility for any misuse of this document.
        </p>
        ${sig}
      </div>`,

    leaving: `
      <div style="max-width:720px;margin:0 auto;padding:40px;border:3px double #0F766E;border-radius:4px;font-family:Georgia,serif;">
        ${header('#0F766E')}
        <h2 style="text-align:center;font-size:19px;font-weight:800;color:#0F766E;letter-spacing:2px;text-transform:uppercase;margin:0 0 20px;padding:10px;border:1px solid #0F766E;background:#F0FDFA;">
          SCHOOL LEAVING CERTIFICATE
        </h2>
        <p style="font-size:14px;line-height:2.1;color:#1F2937;margin-bottom:14px;">
          This is to certify that <strong style="color:#0F4C45;">${person.name}</strong>,
          Son/Daughter of <strong>${person.fatherName || '_______________'}</strong>,
          bearing Roll No. <strong>${person.rollNo || '___'}</strong>,
          was a student of <strong>Class ${person.class?.name || '___'}</strong>
          at this institution. He/She has successfully completed his/her studies and
          is leaving the school on <strong>${date}</strong>.
        </p>
        <p style="font-size:14px;line-height:2.1;color:#1F2937;margin-bottom:14px;">
          His/Her conduct and character during the stay at this school was found to be
          <strong>Good &amp; Satisfactory</strong>. We wish him/her the very best in future endeavors.
        </p>
        <p style="font-size:14px;line-height:2.1;color:#1F2937;">
          This certificate is issued on the request of the parent/guardian for bonafide purposes only.
        </p>
        ${sig}
      </div>`,

    character: extras.twoPerPage
      ? twoPerPage(charBlock, '#7C3AED')
      : charBlock('#7C3AED'),

    dob: `
      <div style="max-width:720px;margin:0 auto;padding:40px;border:3px double #2563EB;border-radius:4px;font-family:Georgia,serif;">
        ${header('#2563EB')}
        <h2 style="text-align:center;font-size:19px;font-weight:800;color:#2563EB;letter-spacing:2px;text-transform:uppercase;margin:0 0 20px;padding:10px;border:1px solid #2563EB;background:#EFF6FF;">
          DATE OF BIRTH CERTIFICATE
        </h2>
        <p style="font-size:14px;line-height:2.1;color:#1F2937;margin-bottom:14px;">
          This is to certify that according to the school records, the
          <strong>Date of Birth</strong> of
          <strong style="color:#1E3A8A;">${person.name}</strong>,
          Son/Daughter of <strong>${person.fatherName || '_______________'}</strong>,
          Roll No. <strong>${person.rollNo || '___'}</strong>,
          Class <strong>${person.class?.name || '___'}</strong>,
          is:
        </p>
        <div style="text-align:center;margin:20px 0;padding:16px;border:2px solid #2563EB;border-radius:8px;background:#EFF6FF;">
          <span style="font-size:20px;font-weight:900;color:#1D4ED8;letter-spacing:1px;">${dob}</span>
        </div>
        <p style="font-size:14px;line-height:2.1;color:#1F2937;">
          This certificate is issued for official and academic purposes only.
          This school is not responsible for any clerical error after issuance.
        </p>
        ${sig}
      </div>`,

    experience: extras.twoPerPage
      ? twoPerPage(expBlock, '#D97706')
      : expBlock('#D97706'),

    admit: `
      <div style="max-width:480px;margin:0 auto;padding:28px;border:2px solid #DC2626;border-radius:8px;font-family:Arial,sans-serif;">
        ${header('#DC2626')}
        <div style="background:#DC2626;color:#fff;text-align:center;padding:8px;font-size:14px;font-weight:800;letter-spacing:2px;margin-bottom:16px;border-radius:4px;">
          EXAMINATION ADMIT CARD
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:13px;">
          <tr style="background:#FEF2F2;"><td style="padding:8px;font-weight:700;border:1px solid #FECACA;width:40%;">Student Name</td><td style="padding:8px;border:1px solid #FECACA;font-weight:700;color:#111;">${person.name}</td></tr>
          <tr><td style="padding:8px;font-weight:700;border:1px solid #FECACA;">Roll No.</td><td style="padding:8px;border:1px solid #FECACA;font-weight:700;color:#DC2626;">${person.rollNo || '—'}</td></tr>
          <tr style="background:#FEF2F2;"><td style="padding:8px;font-weight:700;border:1px solid #FECACA;">Class / Section</td><td style="padding:8px;border:1px solid #FECACA;">${person.class?.name || '—'} ${person.section?.name ? '- ' + person.section.name : ''}</td></tr>
          <tr><td style="padding:8px;font-weight:700;border:1px solid #FECACA;">Father's Name</td><td style="padding:8px;border:1px solid #FECACA;">${person.fatherName || '—'}</td></tr>
          <tr style="background:#FEF2F2;"><td style="padding:8px;font-weight:700;border:1px solid #FECACA;">Session</td><td style="padding:8px;border:1px solid #FECACA;">2025-2026</td></tr>
        </table>
        <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:7px;padding:12px;margin-bottom:14px;font-size:11.5px;color:#374151;line-height:1.8;">
          <strong>Instructions:</strong><br/>
          1. Report 30 minutes before examination time.<br/>
          2. Bring this card along with school ID card.<br/>
          3. Mobile phones strictly prohibited.<br/>
          4. No entry without this admit card.
        </div>
        <div style="text-align:center;margin:14px 0;">
          <div style="font-family:'Courier New',monospace;font-size:24px;letter-spacing:5px;color:#1F2937;">▐▌▌▐▐▌▐▌▌▐▌▐▌▐▌</div>
          <div style="font-size:11px;color:#374151;font-weight:700;letter-spacing:2px;margin-top:3px;">${person.rollNo || 'ST-000'}</div>
        </div>
        <div style="display:flex;justify-content:space-between;padding-top:12px;border-top:1px dashed #CBD5E1;">
          <div style="text-align:center;"><div style="border-bottom:1px solid #374151;width:110px;margin-bottom:5px;padding-top:24px;"></div><p style="font-size:11px;margin:0;">Invigilator</p></div>
          <div style="text-align:center;"><div style="border-bottom:1px solid #374151;width:110px;margin-bottom:5px;padding-top:24px;"></div><p style="font-size:11px;margin:0;">Principal</p></div>
        </div>
      </div>`,

    birthday: `
      <div style="max-width:500px;margin:0 auto;padding:40px;background:linear-gradient(135deg,#FEF3C7,#FDE68A,#FEF3C7);border-radius:16px;text-align:center;font-family:'Arial',sans-serif;box-shadow:0 4px 20px rgba(217,119,6,0.2);">
        <div style="font-size:64px;margin-bottom:10px;">🎂</div>
        <div style="font-size:10px;font-weight:700;color:#B45309;text-transform:uppercase;letter-spacing:2px;margin-bottom:4px;">With Best Wishes from ${sName}</div>
        <h1 style="font-size:28px;font-weight:900;color:#92400E;margin:0 0 6px;letter-spacing:-0.5px;">Happy Birthday!</h1>
        <h2 style="font-size:22px;font-weight:800;color:#78350F;margin:0 0 20px;">${person.name}</h2>
        <div style="background:rgba(255,255,255,0.7);border-radius:12px;padding:18px 20px;margin:16px 0;border:1px solid rgba(217,119,6,0.3);">
          <p style="font-size:14px;color:#1F2937;line-height:1.8;margin:0;">
            Wishing you a wonderful birthday filled with joy, happiness, and endless success!
            May this new year of your life bring you closer to all your goals and dreams.
            Stay blessed and keep shining! ✨
          </p>
        </div>
        <div style="margin:14px 0;">
          <div style="font-size:12px;color:#B45309;font-weight:600;margin-bottom:4px;">${date}</div>
          <div style="font-size:11px;color:#92400E;">${sName}</div>
        </div>
        <div style="display:flex;justify-content:center;gap:8px;font-size:22px;margin-top:12px;">🎉 🌟 🎊 🎁 🌈</div>
      </div>`,
  };

  const printBtn = extras.twoPerPage
    ? `<button onclick="window.print()" style="background:#0F766E;color:#fff;border:none;padding:9px 22px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;margin-right:8px;">🖨 Print 2-per-Page</button>`
    : `<button onclick="window.print()" style="background:#0F766E;color:#fff;border:none;padding:9px 22px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;">🖨 Print Certificate</button>`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${CERT_TYPES.find(c => c.id === type)?.label} — ${sName}</title>
<style>
  body{background:#F8FAFC;padding:32px;font-family:Arial,sans-serif;position:relative;}
  .doc-watermark{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;z-index:0}
  .doc-watermark img{width:170px;height:170px;object-fit:cover;border-radius:20px;filter:grayscale(.1);opacity:.07}
  .doc-watermark span{margin-top:10px;font-size:30px;letter-spacing:1px;font-weight:900;color:#0F172A;text-transform:uppercase;opacity:.055}
  .doc-content{position:relative;z-index:1;}
  .cert-page{margin-bottom:32px;}
  .page-break{page-break-after:always;}
  @media print{
    body{background:#fff;padding:12px;}
    .no-print{display:none!important;}
    .page-break{page-break-after:always;}
    .cert-page{page-break-inside:avoid;margin-bottom:0;}
  }
</style></head><body>
  ${watermarkHtml}
  <div class="doc-content">
  <div class="no-print" style="text-align:right;margin-bottom:14px;">
    ${printBtn}
  </div>
  ${TEMPLATES[type] || '<p>Template not found</p>'}
  </div>
</body></html>`;
};

/* ════════════════════════════════════════════════════
   CHARACTER CERTIFICATE FIELDS PANEL
════════════════════════════════════════════════════ */
function CharacterFields({ fields, onChange }) {
  const year = new Date().getFullYear();
  return (
    <div className="card" style={{ marginBottom:14, border:'2px solid #7C3AED20', background:'#F5F3FF20' }}>
      <div style={{ fontSize:13, fontWeight:700, color:'#7C3AED', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
        <Award size={14}/> Character Certificate Fields
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <div>
          <label style={{ fontSize:11.5, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Character Rating</label>
          <select className="form-select" style={{ height:34, fontSize:12.5 }}
            value={fields.character}
            onChange={e => onChange({ ...fields, character: e.target.value })}>
            <option>Excellent</option>
            <option>Good</option>
            <option>Satisfactory</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize:11.5, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Academic Session</label>
          <input className="form-input" style={{ fontSize:12.5 }}
            placeholder={`${year - 1}-${year}`}
            value={fields.session}
            onChange={e => onChange({ ...fields, session: e.target.value })}
          />
        </div>
        <div>
          <label style={{ fontSize:11.5, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Reason for Leaving</label>
          <input className="form-input" style={{ fontSize:12.5 }}
            placeholder="completion of studies"
            value={fields.reason}
            onChange={e => onChange({ ...fields, reason: e.target.value })}
          />
        </div>
        <div>
          <label style={{ fontSize:11.5, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>School GR Number</label>
          <input className="form-input" style={{ fontSize:12.5 }}
            placeholder="GR-XXXX"
            value={fields.grNumber}
            onChange={e => onChange({ ...fields, grNumber: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   EXPERIENCE CERTIFICATE FIELDS PANEL
════════════════════════════════════════════════════ */
function ExperienceFields({ fields, onChange }) {
  return (
    <div className="card" style={{ marginBottom:14, border:'2px solid #D9770620', background:'#FFFBEB20' }}>
      <div style={{ fontSize:13, fontWeight:700, color:'#D97706', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
        <GraduationCap size={14}/> Experience Certificate Fields
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <div>
          <label style={{ fontSize:11.5, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Joining Date</label>
          <input type="date" className="form-input" style={{ fontSize:12.5 }}
            value={fields.joinDate}
            onChange={e => onChange({ ...fields, joinDate: e.target.value })}
          />
        </div>
        <div>
          <label style={{ fontSize:11.5, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Leaving Date</label>
          <input type="date" className="form-input" style={{ fontSize:12.5 }}
            value={fields.leaveDate}
            onChange={e => onChange({ ...fields, leaveDate: e.target.value })}
          />
        </div>
        <div>
          <label style={{ fontSize:11.5, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Conduct / Performance</label>
          <select className="form-select" style={{ height:34, fontSize:12.5 }}
            value={fields.expConduct}
            onChange={e => onChange({ ...fields, expConduct: e.target.value })}>
            <option>Excellent</option>
            <option>Good</option>
            <option>Satisfactory</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize:11.5, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Reason for Leaving</label>
          <input className="form-input" style={{ fontSize:12.5 }}
            placeholder="personal reasons"
            value={fields.expReason}
            onChange={e => onChange({ ...fields, expReason: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════ */
export default function CertificatesPage() {
  const [certType, setCertType] = useState('leaving');
  const [forStaff, setForStaff] = useState(false);
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState(null);
  const [classId,  setClassId]  = useState('');
  const [sectionId, setSectionId] = useState('');

  /* Character certificate extra fields */
  const [charFields, setCharFields] = useState({
    character: 'Excellent',
    reason:    '',
    grNumber:  '',
    session:   '',
  });

  /* Experience certificate extra fields */
  const [expFields, setExpFields] = useState({
    joinDate:   '',
    leaveDate:  '',
    expConduct: 'Excellent',
    expReason:  '',
  });

  const { data:classes } = useQuery({
    queryKey: ['classes'],
    queryFn:  () => api.get('/classes').then(r => r.data.data),
  });

  const { data:sections } = useQuery({
    queryKey: ['sections', classId],
    queryFn:  () => classId
      ? api.get('/sections', { params:{ classId } }).then(r => r.data.data || [])
      : Promise.resolve([]),
    enabled: !!classId,
  });

  const { data:school } = useQuery({
    queryKey: ['school-settings'],
    queryFn:  () => api.get('/settings/school').then(r => r.data.data),
  });

  const { data:rawPeople, isFetching } = useQuery({
    queryKey: [forStaff ? 'staff' : 'students', classId, sectionId],
    queryFn:  () => forStaff
      ? api.get('/staff').then(r => r.data.data || [])
      : api.get('/students', {
          params: {
            classId:   classId   || undefined,
            sectionId: sectionId || undefined,
            status:    'active',
            limit:     200,
          },
        }).then(r => r.data.data || []),
  });

  /* Search filter */
  const people = (rawPeople || []).filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.rollNo?.toLowerCase().includes(q) ||
      p.empCode?.toLowerCase().includes(q) ||
      p.fatherName?.toLowerCase().includes(q) ||
      p.class?.name?.toLowerCase().includes(q)
    );
  });

  const activeCert = CERT_TYPES.find(c => c.id === certType);

  /* Build extras object for template */
  const buildExtras = (twoPerPage = false) => {
    if (certType === 'character') {
      return { ...charFields, twoPerPage };
    }
    if (certType === 'experience') {
      const fmt = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day:'2-digit', month:'long', year:'numeric' }) : '_______________';
      return {
        ...expFields,
        joinDate:  fmt(expFields.joinDate),
        leaveDate: fmt(expFields.leaveDate),
        twoPerPage,
      };
    }
    return { twoPerPage };
  };

  const generate = (person, twoPerPage = false) => {
    const html = getCertHTML(certType, person, school, buildExtras(twoPerPage));
    const win  = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    toast.success(`${activeCert?.label} opened for printing!`);
  };

  const filteredCerts = CERT_TYPES.filter(c =>
    forStaff ? c.forStaff !== false : c.forStaff !== true
  );

  const isCharacter  = certType === 'character';
  const isExperience = certType === 'experience';

  return (
    <div className="page-content fade-up">
      <div style={{ marginBottom:24 }}>
        <h1 className="page-title">Certificates & Documents</h1>
        <p className="page-subtitle">Generate and print official certificates with school branding</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:16 }}>

        {/* ═══ LEFT ═══ */}
        <div>
          {/* Student / Staff toggle + filters */}
          <div className="card" style={{ marginBottom:14, padding:14 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
              <div style={{ display:'flex', gap:8 }}>
                <button
                  className={`btn btn-sm ${!forStaff ? 'btn-teal' : 'btn-outline'}`}
                  onClick={() => { setForStaff(false); setSelected(null); setCertType('leaving'); }}>
                  Student Certificates
                </button>
                <button
                  className={`btn btn-sm ${forStaff ? 'btn-teal' : 'btn-outline'}`}
                  onClick={() => { setForStaff(true); setSelected(null); setCertType('experience'); }}>
                  Staff Certificates
                </button>
              </div>

              {/* Class + Section dropdowns for students */}
              {!forStaff && (
                <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                  <select
                    className="form-select"
                    style={{ width:150, height:34, fontSize:12.5 }}
                    value={classId}
                    onChange={e => { setClassId(e.target.value); setSectionId(''); setSelected(null); }}>
                    <option value="">All Classes</option>
                    {(classes || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {classId && (sections || []).length > 0 && (
                    <select
                      className="form-select"
                      style={{ width:130, height:34, fontSize:12.5 }}
                      value={sectionId}
                      onChange={e => { setSectionId(e.target.value); setSelected(null); }}>
                      <option value="">All Sections</option>
                      {(sections || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Certificate type grid */}
          <div className="card" style={{ marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#111827', marginBottom:12 }}>Select Certificate Type</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
              {filteredCerts.map(cert => {
                const Icon   = cert.icon;
                const active = certType === cert.id;
                return (
                  <div key={cert.id} onClick={() => setCertType(cert.id)}
                    style={{
                      padding:'14px 12px', borderRadius:10, cursor:'pointer',
                      border:`2px solid ${active ? cert.color : '#E5E7EB'}`,
                      background: active ? cert.color + '10' : '#FAFAFA',
                      transition:'all .13s', textAlign:'center',
                    }}>
                    <div style={{ width:38, height:38, borderRadius:9, background:cert.color+'15', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 8px' }}>
                      <Icon size={18} color={cert.color}/>
                    </div>
                    <div style={{ fontSize:12, fontWeight:active ? 700 : 500, color:active ? cert.color : '#374151', lineHeight:1.3 }}>
                      {cert.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Character Certificate extra fields */}
          {isCharacter && (
            <CharacterFields fields={charFields} onChange={setCharFields}/>
          )}

          {/* Experience Certificate extra fields */}
          {isExperience && (
            <ExperienceFields fields={expFields} onChange={setExpFields}/>
          )}

          {/* Search + Person list */}
          <div className="card" style={{ padding:0 }}>
            <div style={{ padding:'14px 16px', borderBottom:'1px solid #F3F4F6', display:'flex', gap:10, alignItems:'center' }}>
              <div style={{ position:'relative', flex:1 }}>
                <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF' }}/>
                <input
                  className="form-input"
                  style={{ paddingLeft:30 }}
                  placeholder={`Search ${forStaff ? 'staff' : 'student'} by name, roll no...`}
                  value={search}
                  onChange={e => { setSearch(e.target.value); setSelected(null); }}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9CA3AF' }}>
                    <X size={13}/>
                  </button>
                )}
              </div>
              <span style={{ fontSize:12, color:'#9CA3AF', whiteSpace:'nowrap' }}>
                {people.length} {forStaff ? 'staff' : 'students'}
              </span>
            </div>

            {isFetching ? (
              <div className="loading-center" style={{ padding:40 }}><div className="spinner"/></div>
            ) : people.length === 0 ? (
              <div className="empty-state" style={{ padding:40 }}>
                <div className="empty-state-icon">📋</div>
                <div className="empty-state-text">{search ? `No results for "${search}"` : 'No records found'}</div>
                {search && (
                  <button className="btn btn-outline btn-sm" style={{ marginTop:10 }} onClick={() => setSearch('')}>
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div className="table-wrap" style={{ borderRadius:0, border:'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      {!forStaff && <><th>Roll No</th><th>Class</th><th>Father</th></>}
                      {forStaff  && <><th>Emp. Code</th><th>Designation</th></>}
                      <th>Generate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {people.map((p, i) => (
                      <tr key={p.id} style={{ background: selected?.id === p.id ? activeCert?.color + '10' : undefined }}>
                        <td style={{ color:'#9CA3AF', fontSize:12 }}>{i + 1}</td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ width:30, height:30, borderRadius:'50%', background:activeCert?.color+'20', display:'flex', alignItems:'center', justifyContent:'center', color:activeCert?.color, fontWeight:800, fontSize:12, flexShrink:0 }}>
                              {p.name?.charAt(0)}
                            </div>
                            <span style={{ fontWeight:600, fontSize:13 }}>{p.name}</span>
                          </div>
                        </td>
                        {!forStaff && <>
                          <td><span style={{ fontFamily:'monospace', fontWeight:700, color:activeCert?.color, fontSize:12 }}>{p.rollNo || '—'}</span></td>
                          <td><span className="badge badge-blue">{p.class?.name || '—'}</span></td>
                          <td style={{ fontSize:12, color:'#6B7280', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.fatherName || '—'}</td>
                        </>}
                        {forStaff && <>
                          <td><span style={{ fontFamily:'monospace', fontWeight:700, color:activeCert?.color, fontSize:12 }}>{p.empCode || 'S-' + p.id}</span></td>
                          <td><span className="badge badge-gold">{p.designation || '—'}</span></td>
                        </>}
                        <td>
                          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                            <button
                              className="btn btn-sm"
                              style={{ background:activeCert?.color, color:'#fff', border:'none' }}
                              onClick={() => { setSelected(p); generate(p, false); }}>
                              <Printer size={12}/> Print
                            </button>
                            {(isCharacter || isExperience) && (
                              <button
                                className="btn btn-sm btn-outline"
                                style={{ fontSize:11, padding:'4px 8px', whiteSpace:'nowrap' }}
                                title="Print 2 copies per page"
                                onClick={() => { setSelected(p); generate(p, true); }}>
                                <Printer size={11}/> 2/page
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ═══ RIGHT INFO ═══ */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Active cert info */}
          {activeCert && (
            <div className="card" style={{ borderTop:`4px solid ${activeCert.color}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:activeCert.color+'15', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <activeCert.icon size={20} color={activeCert.color}/>
                </div>
                <div>
                  <div style={{ fontWeight:700, fontSize:14, color:'#111827' }}>{activeCert.label}</div>
                  <div style={{ fontSize:12, color:'#6B7280' }}>{activeCert.desc}</div>
                </div>
              </div>
              <div className="alert alert-teal">
                <CheckCircle size={14}/>
                <span style={{ fontSize:12.5 }}>
                  Certificate opens in a new tab with school name, logo, and all details auto-filled. Click "Print Certificate" to print.
                </span>
              </div>
              {(isCharacter || isExperience) && (
                <div style={{ marginTop:10, padding:'8px 10px', background:'#F5F3FF', borderRadius:8, border:'1px solid #7C3AED30' }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'#4C1D95', marginBottom:4 }}>Print 2-per-Page</div>
                  <div style={{ fontSize:11.5, color:'#6B7280', lineHeight:1.6 }}>
                    Use the "2/page" button to print two copies on one A4 sheet — ideal for record-keeping.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Character certificate preview card */}
          {isCharacter && selected && (
            <div className="card" style={{ borderLeft:`4px solid #7C3AED`, background:'#FAFAFA' }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#7C3AED', marginBottom:8 }}>Certificate Preview</div>
              <div style={{ fontSize:12, color:'#374151', lineHeight:1.9 }}>
                <div><strong>Student:</strong> {selected.name}</div>
                <div><strong>Father:</strong> {selected.fatherName || '—'}</div>
                <div><strong>Roll No:</strong> {selected.rollNo || '—'}</div>
                <div><strong>Class:</strong> {selected.class?.name || '—'} {selected.section?.name ? '/ ' + selected.section.name : ''}</div>
                <div><strong>Character:</strong> <span style={{ color:'#7C3AED', fontWeight:700 }}>{charFields.character}</span></div>
                <div><strong>Session:</strong> {charFields.session || `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`}</div>
                {charFields.reason && <div><strong>Reason:</strong> {charFields.reason}</div>}
                {charFields.grNumber && <div><strong>GR No:</strong> {charFields.grNumber}</div>}
              </div>
            </div>
          )}

          {/* Experience certificate preview card */}
          {isExperience && selected && (
            <div className="card" style={{ borderLeft:`4px solid #D97706`, background:'#FAFAFA' }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#D97706', marginBottom:8 }}>Certificate Preview</div>
              <div style={{ fontSize:12, color:'#374151', lineHeight:1.9 }}>
                <div><strong>Staff:</strong> {selected.name}</div>
                <div><strong>Designation:</strong> {selected.designation || '—'}</div>
                <div><strong>Joined:</strong> {expFields.joinDate || '—'}</div>
                <div><strong>Leaving:</strong> {expFields.leaveDate || '—'}</div>
                <div><strong>Conduct:</strong> <span style={{ color:'#D97706', fontWeight:700 }}>{expFields.expConduct}</span></div>
                {expFields.expReason && <div><strong>Reason:</strong> {expFields.expReason}</div>}
              </div>
            </div>
          )}

          {/* All types quick reference */}
          <div className="card">
            <div style={{ fontSize:13, fontWeight:700, color:'#111827', marginBottom:12 }}>All Certificates</div>
            {CERT_TYPES.map(cert => {
              const Icon = cert.icon;
              return (
                <div key={cert.id}
                  onClick={() => { setCertType(cert.id); setForStaff(cert.forStaff === true); }}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'1px solid #F3F4F6', cursor:'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <div style={{ width:30, height:30, borderRadius:7, background:cert.color+'15', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Icon size={14} color={cert.color}/>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12.5, fontWeight:600, color:'#1F2937' }}>{cert.label}</div>
                    <div style={{ fontSize:11, color:'#9CA3AF' }}>
                      {cert.forStaff ? 'Staff' : cert.forStaff === null ? 'Students & Staff' : 'Students'}
                    </div>
                  </div>
                  {certType === cert.id && <span className="badge badge-teal" style={{ fontSize:10 }}>Active</span>}
                </div>
              );
            })}
          </div>

          <div className="alert alert-warning">
            <span>💡</span>
            <span style={{ fontSize:12.5 }}>Print on A4 paper. Use "Save as PDF" to save a digital copy. School logo is included automatically.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
