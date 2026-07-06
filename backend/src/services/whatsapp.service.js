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

/* ─── Pre-built notification helpers ──────────────────────────── */
const sendFeePaidNotification = ({ parentPhone, studentName, amount, month, receiptNo, schoolName }, cfg) => {
  const msg = `💰 *Fee Payment Confirmed!*\n\nDear Parent,\nFee of *Rs. ${Number(amount).toLocaleString('en-PK')}* for *${studentName}* (${month}) received.\nReceipt: *${receiptNo}*\n\nThank you! — ${schoolName}`;
  return sendWhatsApp(parentPhone, msg, cfg);
};

const sendAbsentNotification = ({ parentPhone, studentName, className, date, schoolName }, cfg) => {
  const msg = `⚠️ *Attendance Alert*\n\nDear Parent,\nYour child *${studentName}* (${className}) was *ABSENT* on ${date}.\n\nPlease ensure regular attendance.\n— ${schoolName}`;
  return sendWhatsApp(parentPhone, msg, cfg);
};

const sendFeeReminderNotification = ({ parentPhone, studentName, dueAmount, month, dueDate, schoolName }, cfg) => {
  const msg = `🔔 *Fee Reminder*\n\nDear Parent,\n*Rs. ${Number(dueAmount).toLocaleString('en-PK')}* is pending for *${studentName}* (${month}).\nPlease pay by *${dueDate}* to avoid late charges.\n— ${schoolName}`;
  return sendWhatsApp(parentPhone, msg, cfg);
};

module.exports = {
  sendWhatsApp,
  sendBulkWhatsApp,
  testWhatsAppCredentials,
  sendFeePaidNotification,
  sendAbsentNotification,
  sendFeeReminderNotification,
};
