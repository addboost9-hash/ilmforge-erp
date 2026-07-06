/**
 * IlmForge — SMS Service (Twilio)
 * Supports per-school credentials stored in settings OR env fallback.
 * Auto-normalizes Pakistan mobile numbers to E.164 (+92XXXXXXXXXX).
 */

/* ─── Pakistan phone normalizer ───────────────────────────── */
const normalizePKPhone = (raw) => {
  if (!raw) return null;
  let n = String(raw).replace(/[\s\-().]/g, '');        // strip spaces, dashes, parens
  if (n.startsWith('+92')) return n;                     // already E.164
  if (n.startsWith('0092')) return '+92' + n.slice(4);   // 0092 prefix
  if (n.startsWith('92') && n.length === 12) return '+' + n; // 92XXXXXXXXXX
  if (n.startsWith('0') && n.length === 11) return '+92' + n.slice(1); // 03XXXXXXXXX
  if (n.length === 10) return '+92' + n;                  // 3XXXXXXXXX without leading 0
  return n.startsWith('+') ? n : '+' + n;               // fallback: keep as is
};

/* ─── Resolve credentials (per-school first, env fallback) ─ */
const resolveSmsConfig = (schoolConfig = {}) => ({
  accountSid:   schoolConfig.smsAccountSid   || process.env.TWILIO_ACCOUNT_SID,
  authToken:    schoolConfig.smsAuthToken    || process.env.TWILIO_AUTH_TOKEN,
  fromNumber:   schoolConfig.smsFromNumber   || process.env.TWILIO_PHONE_NUMBER,
});

/* ─── Core send ─────────────────────────────────────────────── */
const sendSMS = async (to, message, schoolConfig = {}) => {
  const phone = normalizePKPhone(to);
  if (!phone) return { success: false, error: 'Invalid phone number' };

  const { accountSid, authToken, fromNumber } = resolveSmsConfig(schoolConfig);

  if (!accountSid || !authToken || !fromNumber) {
    console.log(`📱 [SMS — not configured] To: ${phone}\n${message}\n`);
    return { success: false, error: 'SMS credentials not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER.' };
  }

  try {
    const twilio = require('twilio')(accountSid, authToken);
    const msg = await twilio.messages.create({ body: message, from: fromNumber, to: phone });
    console.log(`📱 [SMS SENT] To: ${phone} SID: ${msg.sid}`);
    return { success: true, sid: msg.sid, to: phone };
  } catch (err) {
    console.error('SMS send error:', err.message);
    return { success: false, error: err.message };
  }
};

/* ─── Bulk send with per-recipient results ─────────────────── */
const sendBulkSMS = async (recipients, message, schoolConfig = {}) => {
  const results = [];
  for (const r of recipients) {
    const phone = typeof r === 'string' ? r : (r.phone || r.emergencyPhone);
    const result = await sendSMS(phone, message, schoolConfig);
    results.push({ phone, ...result });
  }
  return {
    total:   results.length,
    sent:    results.filter(r => r.success).length,
    failed:  results.filter(r => !r.success).length,
    results,
  };
};

/* ─── Test credentials ──────────────────────────────────────── */
const testSmsCredentials = async (accountSid, authToken, fromNumber, testTo) => {
  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, error: 'accountSid, authToken, fromNumber are all required.' };
  }
  try {
    const twilio = require('twilio')(accountSid, authToken);
    // Validate credentials by fetching account info
    const account = await twilio.api.accounts(accountSid).fetch();
    if (testTo) {
      const to = normalizePKPhone(testTo);
      const msg = await twilio.messages.create({
        body: 'IlmForge SMS test — credentials working! ✓',
        from: fromNumber,
        to,
      });
      return { success: true, accountName: account.friendlyName, sid: msg.sid, testTo: to };
    }
    return { success: true, accountName: account.friendlyName };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = { sendSMS, sendBulkSMS, testSmsCredentials, normalizePKPhone };
