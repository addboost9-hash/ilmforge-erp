const admin = require('firebase-admin');

let firebaseReady = false;

const cleanPrivateKey = (value) => {
  if (!value) return '';
  return String(value).replace(/\\n/g, '\n');
};

const getFirebaseCredential = () => {
  const projectId = process.env.FCM_PROJECT_ID;
  const clientEmail = process.env.FCM_CLIENT_EMAIL;
  const privateKey = cleanPrivateKey(process.env.FCM_PRIVATE_KEY);

  if (projectId && clientEmail && privateKey) {
    return admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    });
  }

  // Falls back to GOOGLE_APPLICATION_CREDENTIALS / default service account.
  return admin.credential.applicationDefault();
};

const ensureFirebase = () => {
  if (firebaseReady) return;

  try {
    if (!admin.apps.length) {
      admin.initializeApp({ credential: getFirebaseCredential() });
    }
    firebaseReady = true;
  } catch (err) {
    const message = err?.message || 'Failed to initialize Firebase Admin.';
    throw Object.assign(new Error(message), { code: 'FCM_INIT_FAILED' });
  }
};

const normalizeData = (data = {}) => {
  const out = {};
  for (const [k, v] of Object.entries(data || {})) {
    if (v === undefined || v === null) continue;
    out[String(k)] = typeof v === 'string' ? v : JSON.stringify(v);
  }
  return out;
};

async function sendPushMulticast({ tokens = [], title, body, data = {} }) {
  ensureFirebase();

  const normalizedTokens = [...new Set(tokens.map((t) => String(t || '').trim()).filter(Boolean))];
  if (!normalizedTokens.length) {
    return {
      provider: 'fcm',
      sent: 0,
      failed: 0,
      sentAt: new Date(),
      payload: { title, body, data },
      failures: [],
    };
  }

  const messaging = admin.messaging();
  const response = await messaging.sendEachForMulticast({
    tokens: normalizedTokens,
    notification: {
      title: String(title || ''),
      body: String(body || ''),
    },
    data: normalizeData(data),
  });

  const failures = [];
  response.responses.forEach((r, idx) => {
    if (!r.success) {
      failures.push({
        token: normalizedTokens[idx],
        error: r.error?.message || 'Unknown FCM send error',
        code: r.error?.code || null,
      });
    }
  });

  return {
    provider: 'fcm',
    sent: response.successCount,
    failed: response.failureCount,
    sentAt: new Date(),
    payload: { title, body, data },
    failures,
  };
}

module.exports = { sendPushMulticast };
