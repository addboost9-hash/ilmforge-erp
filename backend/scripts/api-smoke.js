/* eslint-disable no-console */
require('dotenv').config();

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:5000/api/v1';
const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || 'admin@demo.com';
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || 'Admin@123';

const jsonHeaders = { 'Content-Type': 'application/json' };

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, options);
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    const msg = body?.message || body?.error || `HTTP ${res.status}`;
    throw new Error(`${path} failed: ${msg}`);
  }
  return body;
}

function assertOk(condition, message) {
  if (!condition) throw new Error(message);
}

async function run() {
  console.log('Running API smoke checks...');

  const healthRes = await fetch('http://localhost:5000/health');
  assertOk(healthRes.ok, 'Health check failed');
  console.log('Health endpoint: OK');

  const login = await request('/auth/login', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const token = login?.data?.accessToken;
  assertOk(token, 'No accessToken from login');
  const authHeaders = { ...jsonHeaders, Authorization: `Bearer ${token}`, 'x-campus-id': '1' };
  console.log('Admin login: OK');

  const me = await request('/auth/me', { headers: authHeaders });
  assertOk(me?.success === true, 'Auth me check failed');
  console.log('Auth me: OK');

  const dashboard = await request('/dashboard/stats', { headers: authHeaders });
  assertOk(dashboard?.success === true, 'Dashboard stats check failed');
  console.log('Dashboard stats: OK');

  const subjects = await request('/classes/subjects', { headers: authHeaders });
  assertOk(subjects?.success === true, 'Subjects check failed');
  console.log('Classes subjects: OK');

  const sessions = await request('/settings/sessions', { headers: authHeaders });
  assertOk(sessions?.success === true, 'Sessions check failed');
  console.log('Settings sessions: OK');

  const paymentSettings = await request('/settings/payment', { headers: authHeaders });
  assertOk(paymentSettings?.success === true, 'Payment settings check failed');
  console.log('Settings payment: OK');

  const themeSettings = await request('/settings/theme', { headers: authHeaders });
  assertOk(themeSettings?.success === true, 'Theme settings check failed');
  console.log('Settings theme: OK');

  const websiteSettings = await request('/settings/website', { headers: authHeaders });
  assertOk(websiteSettings?.success === true, 'Website settings check failed');
  console.log('Settings website: OK');

  const attendancePeriod = await request('/attendance/period?classId=1', { headers: authHeaders });
  assertOk(attendancePeriod?.success === true, 'Attendance period check failed');
  console.log('Attendance period: OK');

  const students = await request('/students?limit=1', { headers: authHeaders });
  const firstStudent = students?.data?.[0];
  if (firstStudent?.rollNo) {
    const pub = await request(`/public/fees/by-roll/${encodeURIComponent(firstStudent.rollNo)}`);
    assertOk(pub?.success === true, 'Public fee voucher check failed');
    console.log('Public fee voucher: OK');
  } else {
    console.log('Public fee voucher: SKIPPED (no student roll number)');
  }

  const bulkValidate = await request('/bulk/students/validate', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ rows: [{ name: 'Smoke Import Student', dob: '2012-01-01' }] }),
  });
  assertOk(bulkValidate?.success === true, 'Bulk student validation check failed');
  console.log('Bulk students validate: OK');

  const leadPhone = `03${Date.now().toString().slice(-9)}`;
  const leadCreate = await request('/crm/leads', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      studentName: 'Smoke CRM Lead',
      parentName: 'Smoke Parent',
      phone: leadPhone,
      source: 'website',
      notes: 'Created by smoke test',
    }),
  });
  const leadId = leadCreate?.data?.id;
  assertOk(leadId, 'CRM lead create did not return id');

  const converted = await request(`/crm/leads/${leadId}/convert`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ remarks: 'Converted by smoke test' }),
  });
  const convertedStudentId = converted?.data?.student?.id;
  assertOk(converted?.success === true && convertedStudentId, 'CRM lead convert check failed');
  console.log('CRM lead convert: OK');

  const restoreDryRun = await request('/backups/restore', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      backup: { schoolId: me?.data?.schoolId || 1, classes: [], students: [] },
      modules: ['classes', 'students'],
      dryRun: true,
    }),
  });
  assertOk(restoreDryRun?.success === true, 'Backup restore dry-run check failed');
  console.log('Backup restore dry-run: OK');

  const gatePassStudentId = convertedStudentId || firstStudent?.id;
  if (gatePassStudentId) {
    const issuedPass = await request('/gatepasses', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ studentId: gatePassStudentId, parentName: 'Smoke Parent', reason: 'Smoke gate pass check' }),
    });
    const issuedPassId = issuedPass?.data?.id;
    assertOk(issuedPass?.success === true && issuedPassId, 'Gate pass issue check failed');

    const gateAudit = await request('/gatepasses/audit', { headers: authHeaders });
    assertOk(gateAudit?.success === true, 'Gate pass audit check failed');

    const revoked = await request(`/gatepasses/${issuedPassId}/revoke`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ reason: 'Smoke revoke check' }),
    });
    assertOk(revoked?.success === true, 'Gate pass revoke check failed');
    console.log('Gate pass audit + revoke: OK');
  } else {
    console.log('Gate pass audit + revoke: SKIPPED (no student available)');
  }

  console.log('All smoke checks passed.');
}

run().catch((err) => {
  console.error('Smoke checks failed.');
  console.error(err.message || err);
  process.exit(1);
});
