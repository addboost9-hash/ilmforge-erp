// SMS Service - Twilio or console fallback in dev
const sendSMS = async (to, message) => {
  if (process.env.NODE_ENV === 'development' || !process.env.TWILIO_ACCOUNT_SID) {
    console.log(`📱 [SMS DEV] To: ${to}\nMessage: ${message}\n`);
    return { success: true, dev: true };
  }
  try {
    const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const msg = await twilio.messages.create({ body: message, from: process.env.TWILIO_PHONE_NUMBER, to });
    return { success: true, sid: msg.sid };
  } catch (err) {
    console.error('SMS send error:', err.message);
    return { success: false, error: err.message };
  }
};

module.exports = { sendSMS };
