require('dotenv').config();
const { verifySmtpConnection, sendEmail } = require('../src/services/email.service');

async function main() {
  const verify = await verifySmtpConnection();
  if (!verify.success) {
    console.error('SMTP verify failed:', verify.error);
    process.exitCode = 1;
    return;
  }

  console.log('SMTP verify successful.');

  const to = process.env.SMTP_TEST_TO || process.env.SMTP_USER;
  if (!to) {
    console.log('No SMTP_TEST_TO/SMTP_USER set; skipping test message send.');
    return;
  }

  const result = await sendEmail({
    to,
    subject: `[${process.env.PLATFORM_NAME || 'IlmForge'}] SMTP Test`,
    html: '<p>SMTP test successful. OTP emails should be deliverable if mailbox policy allows it.</p>',
  });

  if (!result.success) {
    console.error('SMTP send failed:', result.error);
    process.exitCode = 1;
    return;
  }

  console.log('SMTP test email sent to:', to);
}

main().catch((err) => {
  console.error('SMTP test crashed:', err?.message || err);
  process.exitCode = 1;
});
