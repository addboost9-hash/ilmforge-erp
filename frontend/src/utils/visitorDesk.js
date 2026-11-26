/**
 * The Visitor Desk in the browser: how CNICs and mobiles are typed, the
 * visitor's slip (with its QR code for leaving), the paper register for
 * when the internet or the computer is down, and the kiosk's words in
 * English and Urdu.
 */
import QRCode from 'qrcode';
import { esc, pic, initials, docColor, SANS, SERIF } from './printKit';

/* ── Typing ───────────────────────────────────────────────────────────── */

/** As it is typed: "3520212345671" → "35202-1234567-1". */
export function typeCnic(raw) {
  const d = String(raw || '').replace(/\D/g, '').slice(0, 13);
  if (d.length <= 5) return d;
  if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}
export const cnicDigits = (v) => String(v || '').replace(/\D/g, '');
/** "35202-1234567-1" → "35202-•••••••-1" (a slip can be lost; it shows the CNIC in part). */
export const maskCnic = (v) => {
  const s = String(v || '');
  if (s.includes('•')) return s;
  const d = cnicDigits(s);
  return d.length === 13 ? `${d.slice(0, 5)}-•••••••-${d.slice(12)}` : '';
};
/** A real CNIC: 13 digits, not a stand-in such as 11111-1111111-1. */
export const isRealCnic = (v) => {
  const d = cnicDigits(v);
  return d.length === 13 && !/^(\d)\1{12}$/.test(d) && d !== '1234567890123' && d[0] !== '0';
};
/** As it is typed: "03001234567" → "0300 1234567". */
export function typePhone(raw) {
  const d = String(raw || '').replace(/[^\d+]/g, '').slice(0, 13);
  return /^03\d{3,}$/.test(d) ? `${d.slice(0, 4)} ${d.slice(4)}` : d;
}
export const realPhone = (v) => { const d = String(v || '').replace(/\D/g, ''); return d.length >= 10 && d.slice(-10).startsWith('3'); };

export const rs = (paisa) => `Rs ${Math.round((Number(paisa) || 0) / 100).toLocaleString('en-PK')}`;
export const timeOf = (d) => (d ? new Date(d).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Karachi' }) : '');
export const dayOf = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Karachi' }) : '');
/** Today in Pakistan, as YYYY-MM-DD. */
export const pkToday = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
/** "2026-11-26" + "10:45" (Pakistan time) → an ISO time. */
export const pkDateTime = (ymd, hm) => (ymd && hm ? new Date(`${ymd}T${hm}:00+05:00`).toISOString() : '');
export const waited = (min) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`);

/* Reasons: a colour and a symbol each, for the lists and the live feed. */
export const REASON_STYLE = {
  admission: { color: '#2563EB', icon: '🎓' },
  complaint: { color: '#DC2626', icon: '📣' },
  fee: { color: '#059669', icon: '💳' },
  meet_teacher: { color: '#7C3AED', icon: '👩‍🏫' },
  meet_principal: { color: '#4F46E5', icon: '🏛️' },
  early_pickup: { color: '#EA580C', icon: '🚸' },
  result: { color: '#0891B2', icon: '📄' },
  documents: { color: '#0D9488', icon: '📁' },
  interview: { color: '#9333EA', icon: '💼' },
  vendor: { color: '#64748B', icon: '📦' },
  other: { color: '#475569', icon: '💬' },
};
export const reasonStyle = (r) => REASON_STYLE[r] || REASON_STYLE.other;

/* ── The slip ─────────────────────────────────────────────────────────── */

/** The slip's QR code as a picture (made before the print window opens). */
export const qrPicture = (text) => QRCode.toDataURL(String(text || ''), { margin: 1, width: 180, errorCorrectionLevel: 'M' });

/**
 * The visitor's slip: 80 mm wide (a receipt printer, or the top of an A4
 * page). The QR code (or the number) checks the visitor out at the gate.
 */
export function slipDocument({ visit, qr, school = {}, gatePasses = [] }) {
  const color = docColor();
  const logo = pic(school.logoUrl);
  const kids = (visit.students || []).map((s) => `${esc(s.name)}${s.className ? ` <span class="m">(${esc(s.className)})</span>` : ''}`).join('<br>');
  const row = (k, v, raw = false) => (v ? `<tr><th>${esc(k)}</th><td dir="auto">${raw ? v : esc(v)}</td></tr>` : '');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Visitor slip ${esc(visit.slipNo)}</title><style>
  @page { size: 80mm auto; margin: 4mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: ${SANS}; color: #111827; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .s { width: 72mm; margin: 0 auto; padding: 2mm 0; }
  .h { display: flex; gap: 2.5mm; align-items: center; border-bottom: 1.2pt solid ${color}; padding-bottom: 2mm; }
  .h img, .h .mono { width: 11mm; height: 11mm; object-fit: contain; flex: none; }
  .h .mono { border-radius: 50%; background: ${color}; color: #fff; display: grid; place-items: center; font: 700 9pt ${SERIF}; }
  .h b { font: 700 11pt ${SERIF}; color: ${color}; display: block; line-height: 1.15; }
  .h small { font-size: 7pt; color: #4B5563; }
  .t { text-align: center; margin: 2.5mm 0 1mm; font: 700 8pt ${SANS}; letter-spacing: 1.6pt; color: #4B5563; }
  .no { text-align: center; font: 800 22pt Consolas, 'Courier New', monospace; color: ${color}; letter-spacing: 1pt; }
  .qr { text-align: center; margin: 1mm 0; } .qr img { width: 30mm; height: 30mm; }
  table { width: 100%; border-collapse: collapse; font-size: 8.6pt; margin-top: 1.5mm; }
  th { text-align: left; color: #6B7280; font-weight: 600; width: 23mm; padding: 1mm 0; vertical-align: top; }
  td { padding: 1mm 0; font-weight: 600; }
  .m { font-weight: 400; color: #4B5563; }
  .gp { margin-top: 2mm; border: 1pt dashed ${color}; border-radius: 2mm; padding: 1.5mm 2mm; font-size: 8pt; }
  .gp b { font-family: Consolas, monospace; }
  .f { margin-top: 2.5mm; border-top: .6pt solid #D1D5DB; padding-top: 1.5mm; text-align: center; font-size: 7.6pt; color: #374151; }
  .ur { font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', 'Segoe UI', serif; font-size: 9.5pt; direction: rtl; }
</style></head><body><div class="s">
  <div class="h">${logo ? `<img src="${esc(logo)}" alt="">` : `<div class="mono">${esc(initials(school.name))}</div>`}<div><b dir="auto">${esc(school.name || 'School')}</b>${school.phone ? `<small>${esc(school.phone)}</small>` : ''}</div></div>
  <div class="t">VISITOR SLIP</div>
  <div class="no">${esc(visit.slipNo)}</div>
  ${qr ? `<div class="qr"><img src="${esc(qr)}" alt=""></div>` : ''}
  <table>
    ${row('Name', visit.visitorName)}
    ${row('CNIC', maskCnic(visit.cnic))}
    ${row('Came for', [visit.reasonLabel, visit.detailLabel].filter(Boolean).join(' › '))}
    ${row(visit.students?.length > 1 ? 'Children' : 'Child', kids, true)}
    ${row('To meet', visit.hostName)}
    ${row('Time in', `${timeOf(visit.checkinAt)}, ${dayOf(visit.checkinAt)}`)}
  </table>
  ${gatePasses.length ? `<div class="gp">Gate pass: ${gatePasses.map((g) => `${esc(g.name)} <b>${esc(g.passCode)}</b>`).join('<br>')}<br>Show it to the guard with the child.</div>` : ''}
  <div class="f">Please show this slip at the gate when you leave.<div class="ur">جاتے وقت یہ پرچی گیٹ پر دکھائیں۔</div></div>
</div></body></html>`;
}

/**
 * The paper register: when the internet or the computer is down, visitors
 * are written here, and entered later with "Write in later".
 */
export function paperRegisterDocument({ school = {}, rows = 18 }) {
  const color = docColor();
  const cols = ['#', 'Time in', "Visitor's name", 'CNIC', 'Mobile', 'Child and class', 'Came for', 'What they said', 'Time out', 'Sign'];
  const widths = ['4%', '7%', '14%', '12%', '10%', '13%', '10%', '17%', '7%', '6%'];
  const body = Array.from({ length: rows }, (_, i) => `<tr><td class="n">${i + 1}</td>${cols.slice(1).map(() => '<td></td>').join('')}</tr>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Visitor register</title><style>
  @page { size: A4 landscape; margin: 9mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: ${SANS}; color: #111827; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  h1 { font: 700 15pt ${SERIF}; color: ${color}; margin: 0; text-align: center; text-transform: uppercase; }
  h2 { font: 600 10.5pt ${SANS}; margin: 1mm 0 0; text-align: center; letter-spacing: 1pt; }
  .meta { display: flex; justify-content: space-between; font-size: 9pt; margin: 3mm 0 2mm; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th { background: ${color}; color: #fff; font-size: 7.6pt; text-transform: uppercase; letter-spacing: .3pt; padding: 1.6mm 1.2mm; text-align: left; }
  td { border: .6pt solid #9CA3AF; height: 8.6mm; }
  td.n { text-align: center; color: #6B7280; font-size: 8pt; }
  .note { font-size: 8pt; color: #4B5563; margin-top: 2mm; }
</style></head><body>
  <h1 dir="auto">${esc(school.name || 'School')}</h1>
  <h2>VISITOR REGISTER</h2>
  <div class="meta"><span>Date: ______________________</span><span>Written by: ______________________</span><span>Page ____</span></div>
  <table><thead><tr>${cols.map((c, i) => `<th style="width:${widths[i]}">${c}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>
  <div class="note">For use when the internet or the computer is down. Enter each line later in IlmForge: Visitor Desk → Write in later (with the times written here).</div>
</body></html>`;
}

/* ── The kiosk's words ────────────────────────────────────────────────── */

export const KIOSK_TEXT = {
  en: {
    welcome: 'Welcome', start: 'Tap to begin', startHint: 'Please write your details. Reception will call you.',
    whyCame: 'Why have you come today?', yourDetails: 'Your details', name: 'Your name', cnic: 'Your CNIC',
    phone: 'Your mobile number', address: 'Address (if this is your first visit)', city: 'City',
    childQ: 'Is your child a student here?', yes: 'Yes', no: 'No',
    fatherCnic: "Child's father's CNIC", last4: 'Last 4 digits of the mobile number the school has',
    findChildren: 'Find my children', chooseChild: 'Choose your child', relation: 'You are the child\'s',
    complaintAbout: 'What is the complaint about?', admissionChild: "Child's name", admissionClass: 'Class',
    remarks: 'Tell us more (optional)', remarksComplaint: 'Please write your complaint',
    photo: 'Your photo (optional)', next: 'Next', back: 'Back', submit: 'Send to reception',
    done: 'Thank you!', ticket: 'Your number', showAtReception: 'Please show this number at reception.',
    newVisitor: 'Next visitor', noChildren: 'No child found. Please ask at reception.',
    required: 'Please fill this in.', idle: 'Starting again for the next visitor…', lang: 'اردو',
  },
  ur: {
    welcome: 'خوش آمدید', start: 'شروع کرنے کے لیے یہاں دبائیں', startHint: 'اپنی معلومات لکھیں۔ ریسیپشن آپ کو بلائے گا۔',
    whyCame: 'آج آپ کس لیے آئے ہیں؟', yourDetails: 'آپ کی معلومات', name: 'آپ کا نام', cnic: 'آپ کا شناختی کارڈ نمبر',
    phone: 'آپ کا موبائل نمبر', address: 'پتہ (اگر پہلی بار آئے ہیں)', city: 'شہر',
    childQ: 'کیا آپ کا بچہ اس سکول میں پڑھتا ہے؟', yes: 'جی ہاں', no: 'نہیں',
    fatherCnic: 'بچے کے والد کا شناختی کارڈ نمبر', last4: 'سکول میں درج موبائل نمبر کے آخری 4 ہندسے',
    findChildren: 'میرے بچے تلاش کریں', chooseChild: 'اپنا بچہ چنیں', relation: 'آپ بچے کے کیا لگتے ہیں؟',
    complaintAbout: 'شکایت کس بارے میں ہے؟', admissionChild: 'بچے کا نام', admissionClass: 'کلاس',
    remarks: 'مزید بتائیں (اختیاری)', remarksComplaint: 'اپنی شکایت لکھیں',
    photo: 'آپ کی تصویر (اختیاری)', next: 'آگے', back: 'واپس', submit: 'ریسیپشن کو بھیجیں',
    done: 'شکریہ!', ticket: 'آپ کا نمبر', showAtReception: 'یہ نمبر ریسیپشن پر دکھائیں۔',
    newVisitor: 'اگلا مہمان', noChildren: 'کوئی بچہ نہیں ملا۔ ریسیپشن سے رابطہ کریں۔',
    required: 'یہ لکھنا ضروری ہے۔', idle: 'اگلے مہمان کے لیے دوبارہ شروع…', lang: 'English',
  },
};
export const KIOSK_REASONS = {
  en: { admission: 'Admission', complaint: 'Complaint', fee: 'Pay the fee', meet_teacher: 'Meet a teacher', meet_principal: 'Meet the principal', early_pickup: 'Take my child early', result: 'Result / report card', documents: 'Certificate / documents', interview: 'Job interview', other: 'Something else' },
  ur: { admission: 'داخلہ', complaint: 'شکایت', fee: 'فیس جمع کروانا', meet_teacher: 'ٹیچر سے ملنا', meet_principal: 'پرنسپل سے ملنا', early_pickup: 'بچے کو جلدی لے جانا', result: 'رزلٹ / رپورٹ کارڈ', documents: 'سرٹیفکیٹ / دستاویزات', interview: 'ملازمت کا انٹرویو', other: 'کچھ اور' },
};
export const KIOSK_COMPLAINTS = {
  en: { teacher: "Teacher's behaviour", studies: 'Studies / homework', transport: 'Transport / van', fee: 'Fee / billing', cleanliness: 'Cleanliness', safety: 'Bullying / safety', uniform: 'Uniform / books', other: 'Other' },
  ur: { teacher: 'ٹیچر کا رویہ', studies: 'پڑھائی / ہوم ورک', transport: 'ٹرانسپورٹ / وین', fee: 'فیس / بل', cleanliness: 'صفائی', safety: 'تنگ کرنا / حفاظت', uniform: 'یونیفارم / کتابیں', other: 'کچھ اور' },
};
export const KIOSK_RELATIONS = {
  en: { father: 'Father', mother: 'Mother', guardian: 'Guardian', grandparent: 'Grandparent', uncle: 'Uncle', aunt: 'Aunt', brother: 'Brother', sister: 'Sister', other: 'Other' },
  ur: { father: 'والد', mother: 'والدہ', guardian: 'سرپرست', grandparent: 'دادا / نانا', uncle: 'چچا / ماموں', aunt: 'خالہ / پھوپھو', brother: 'بھائی', sister: 'بہن', other: 'کوئی اور' },
};
