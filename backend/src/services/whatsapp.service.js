/**
 * IlmForge — WhatsApp Service
 * Supports WaSender, UltraMsg, and generic REST APIs.
 * Per-school credentials with env fallback.
 * Pakistan phone normalization built-in.
 */
const { normalizePKPhone } = require('./sms.service');

/* ─── Resolve credentials ───────────────────────────────────── */
const resolveWaConfig = (schoolConfig = {}) => ({
  apiUrl:    schoolConfig.waApiUrl    || process.env.WHATSAPP_API_URL    || '',
  apiKey:    schoolConfig.waApiKey    || process.env.WHATSAPP_API_KEY    || '',
  provider:  schoolConfig.waProvider  || process.env.WHATSAPP_PROVIDER   || 'wasender',
  instance:  schoolConfig.waInstance  || process.env.WHATSAPP_INSTANCE   || '',
});

/* ─── Build request per provider ────────────────────────────── */
const buildRequest = (phone, message, config) => {
  const { apiUrl, apiKey, provider, instance } = config;

  if (provider === 'ultramsg') {
    return {
      url:     `${apiUrl}/instance${instance}/messages/chat`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({ token: apiKey, to: phone, body: message }).toString(),
      method:  'POST',
      isForm:  true,
    };
  }

  // Default: WaSender / generic Bearer token API
  return {
    url:     `${apiUrl}/send-message`,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body:    JSON.stringify({ phone, message, type: 'text' }),
    method:  'POST',
    isForm:  false,
  };
};

/* ─── Core send ─────────────────────────────────────────────── */
const sendWhatsApp = async (to, message, schoolConfig = {}) => {
  const phone = normalizePKPhone(to);
  if (!phone) return { success: false, error: 'Invalid phone number' };

  const config = resolveWaConfig(schoolConfig);

  if (!config.apiUrl || !config.apiKey) {
    console.log(`💬 [WA — not configured] To: ${phone}\n${message}\n`);
    return { success: false, error: 'WhatsApp credentials not configured. Set WHATSAPP_API_URL and WHATSAPP_API_KEY.' };
  }

  try {
    const req = buildRequest(phone, message, config);
    const response = await fetch(req.url, {
      method:  req.method,
      headers: req.headers,
      body:    req.body,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, error: data.message || `HTTP ${response.status}` };
    }
    console.log(`💬 [WA SENT] To: ${phone}`);
    return { success: true, data, to: phone };
  } catch (err) {
    console.error('WhatsApp send error:', err.message);
    return { success: false, error: err.message };
  }
};

/* ─── Bulk send ──────────────────────────────────────────────── */
const sendBulkWhatsApp = async (recipients, message, schoolConfig = {}) => {
  const results = [];
  for (const r of recipients) {
    const phone = typeof r === 'string' ? r : (r.phone || r.emergencyPhone);
    const result = await sendWhatsApp(phone, message, schoolConfig);
    results.push({ phone, ...result });
    // Small delay to avoid rate limiting
    await new Promise(res => setTimeout(res, 200));
  }
  return {
    total:  results.length,
    sent:   results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
  };
};

/* ─── Test credentials ──────────────────────────────────────── */
const testWhatsAppCredentials = async (apiUrl, apiKey, provider, testTo, instance) => {
  const config = { apiUrl, apiKey, provider: provider || 'wasender', instance: instance || '' };
  const phone  = normalizePKPhone(testTo);
  if (!phone) return { success: false, error: 'Invalid test phone number.' };
  const result = await sendWhatsApp(phone, '✅ IlmForge WhatsApp test — credentials working!', config);
  return result;
};

/* ─── Pre-built notification helpers ──────────────────────────────
   Each uses the school's own wording from Settings → SMS Templates when it
   has set one (messageFor), and sends nothing when the school switched
   that message off. */
const { messageFor } = require('./messageTemplate');
const { readSettings } = require('../utils/schoolSettings');
const rs = (n) => Number(n || 0).toLocaleString('en-PK');
// The school's own WhatsApp account from Settings → Channels. No caller
// passed it, so these went out only when the server itself had a key.
const schoolCfg = async (schoolId, cfg) => cfg || (schoolId ? (await readSettings(schoolId)).channels || {} : {});

const sendFeePaidNotification = async ({ schoolId, parentPhone, parentName, studentName, className, feeTitle, amount, month, receiptNo, schoolName }, cfg) => {
  const msg = await messageFor(schoolId, 'fee_payment_received', {
    parent_name: parentName || 'Parent', student_name: studentName, class_name: className || '', fee_title: feeTitle || month,
    amount_paid: rs(amount), receipt_no: receiptNo, month, school_name: schoolName,
  }, '💰 *Fee Payment Confirmed!*\n\nDear Parent,\nFee of *Rs. {amount_paid}* for *{student_name}* ({month}) received.\nReceipt: *{receipt_no}*\n\nThank you! — {school_name}');
  if (!msg) return { success: false, skipped: true };
  return sendWhatsApp(parentPhone, msg, await schoolCfg(schoolId, cfg));
};

const sendAbsentNotification = async ({ schoolId, parentPhone, parentName, studentName, className, date, schoolName }, cfg) => {
  const msg = await messageFor(schoolId, 'absent_alert', {
    parent_name: parentName || 'Parent', student_name: studentName, class_name: className || '', date, school_name: schoolName,
  }, '⚠️ *Attendance Alert*\n\nDear Parent,\nYour child *{student_name}* ({class_name}) was *ABSENT* on {date}.\n\nPlease ensure regular attendance.\n— {school_name}');
  if (!msg) return { success: false, skipped: true };
  return sendWhatsApp(parentPhone, msg, await schoolCfg(schoolId, cfg));
};

const sendFeeReminderNotification = async ({ schoolId, parentPhone, parentName, studentName, dueAmount, month, dueDate, schoolName }, cfg) => {
  const msg = await messageFor(schoolId, 'fee_reminder', {
    parent_name: parentName || 'Parent', student_name: studentName, fee_due: rs(dueAmount), fee_title: month, month,
    due_date: dueDate, school_name: schoolName,
  }, '🔔 *Fee Reminder*\n\nDear Parent,\n*Rs. {fee_due}* is pending for *{student_name}* ({month}).\nPlease pay by *{due_date}* to avoid late charges.\n— {school_name}');
  if (!msg) return { success: false, skipped: true };
  return sendWhatsApp(parentPhone, msg, await schoolCfg(schoolId, cfg));
};

module.exports = {
  sendWhatsApp,
  sendBulkWhatsApp,
  testWhatsAppCredentials,
  sendFeePaidNotification,
  sendAbsentNotification,
  sendFeeReminderNotification,
};
