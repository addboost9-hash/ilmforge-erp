const sendWhatsApp = async (to, message, type = 'text') => {
  if (process.env.NODE_ENV === 'development' || !process.env.WHATSAPP_API_KEY) {
    console.log(`💬 [WHATSAPP DEV] To: ${to}\nMessage: ${message}\n`);
    return { success: true, dev: true };
  }
  try {
    const response = await fetch(`${process.env.WHATSAPP_API_URL}/send-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.WHATSAPP_API_KEY}` },
      body: JSON.stringify({ phone: to, message, type })
    });
    const data = await response.json();
    return { success: true, data };
  } catch (err) {
    console.error('WhatsApp send error:', err.message);
    return { success: false, error: err.message };
  }
};

const sendFeePaidNotification = async ({ parentPhone, studentName, amount, month, receiptNo, schoolName }) => {
  const message = `💰 Fee Payment Confirmed!\n\nDear Parent,\nFee payment for *${studentName}* (${month}) of *Rs. ${(amount/100).toFixed(0)}* has been received.\nReceipt: ${receiptNo}\n\nThank you! — ${schoolName}`;
  return sendWhatsApp(parentPhone, message);
};

const sendAbsentNotification = async ({ parentPhone, studentName, className, date, schoolName }) => {
  const message = `⚠️ Attendance Alert!\n\nDear Parent,\nYour child *${studentName}* (${className}) was *absent* on ${date}.\n\nPlease ensure regular attendance.\n— ${schoolName}`;
  return sendWhatsApp(parentPhone, message);
};

const sendFeeReminderNotification = async ({ parentPhone, studentName, dueAmount, month, dueDate, schoolName }) => {
  const message = `🔔 Fee Reminder\n\nDear Parent,\n*Rs. ${(dueAmount/100).toFixed(0)}* is pending for *${studentName}* (${month}).\n\nPlease pay by *${dueDate}* to avoid late charges.\n— ${schoolName}`;
  return sendWhatsApp(parentPhone, message);
};

module.exports = { sendWhatsApp, sendFeePaidNotification, sendAbsentNotification, sendFeeReminderNotification };
