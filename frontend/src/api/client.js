import axios from 'axios';
import toast from 'react-hot-toast';
import { clearSession } from '../utils/session';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// Remembers the last failure notice so parallel failures collapse into one.
let lastNotice = { msg: '', at: 0 };

/* One message for "the request got no proper answer". A page firing six
   parallel reads must not stack six identical toasts, so the same message
   is shown at most once per few seconds. */
function notifyNetworkProblem({ offline, isNetwork, isServer, isRateLimit }) {
  if (!(offline || isNetwork || isServer || isRateLimit)) return;
  const msg = offline
    ? 'You are offline. Check your internet connection.'
    : isRateLimit
      ? 'Too many requests. Please wait a moment and try again.'
      : isNetwork
        ? 'Could not reach the server. Check your connection, then try again.'
        : 'The server could not complete that request. Please try again.';
  const now = Date.now();
  if (lastNotice.msg !== msg || now - lastNotice.at > 4000) {
    lastNotice = { msg, at: now };
    toast.error(msg, { id: 'api-failure', duration: 5000 });
  }
}

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Request interceptor — attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const campusId = localStorage.getItem('campusId');
  if (campusId) config.headers['x-campus-id'] = campusId;
  return config;
});

// Token refresh queue — prevents multiple simultaneous refresh calls
let isRefreshing = false;
let refreshQueue = [];

function processQueue(error, token = null) {
  refreshQueue.forEach(({ resolve, reject }) => error ? reject(error) : resolve(token));
  refreshQueue = [];
}

const clearAndRedirect = () => {
  clearSession();
  window.location.href = '/login';
};

// Response interceptor — handle 401 + school suspension
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err.response?.status;
    const code   = err.response?.data?.code;

    // School suspended / inactive / expired
    if (status === 403 && ['SCHOOL_SUSPENDED','SCHOOL_INACTIVE','TRIAL_EXPIRED','LICENSE_EXPIRED'].includes(code)) {
      const msg = err.response.data;
      clearSession();
      window.location.href = `/suspended?reason=${encodeURIComponent(msg.message)}&contact=${encodeURIComponent(msg.contact || msg.renew || msg.upgrade || '')}`;
      return Promise.reject(err);
    }

    // Token expired — refresh with queue (only 1 refresh at a time)
    if (status === 401 && code === 'TOKEN_EXPIRED' && !err.config._retry) {
      err.config._retry = true;

      if (isRefreshing) {
        // Wait for existing refresh to complete
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then(token => {
          err.config.headers.Authorization = `Bearer ${token}`;
          return api.request(err.config);
        }).catch((e) => {
          // Only a server that refused the renewal ends the sign-in; no
          // answer at all (offline, weak signal) must not.
          if (e?.response) clearAndRedirect();
          return Promise.reject(e);
        });
      }

      isRefreshing = true;
      const refresh = localStorage.getItem('refreshToken');
      if (!refresh) { clearAndRedirect(); return Promise.reject(err); }

      try {
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken: refresh });
        const newToken = data.data.accessToken;
        localStorage.setItem('accessToken', newToken);
        if (data.data.refreshToken) localStorage.setItem('refreshToken', data.data.refreshToken);
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        err.config.headers.Authorization = `Bearer ${newToken}`;
        return api.request(err.config);
      } catch (refreshErr) {
        // 503 = server restarting (Render spin-up) — don't logout, just retry after delay
        if (refreshErr.response?.status === 503) {
          processQueue(null, localStorage.getItem('accessToken'));
          isRefreshing = false;
          return new Promise(resolve => setTimeout(() => resolve(api.request(err.config)), 4000));
        }
        processQueue(refreshErr, null);
        // No answer from the server: the sign-in is not wrong, the network
        // is. It used to sign the person out and wipe this device's saved
        // data whenever the renewal met a weak signal. Keep the session; the
        // next request renews it once the connection is back.
        if (!refreshErr.response) {
          notifyNetworkProblem({ offline: typeof navigator !== 'undefined' && navigator.onLine === false, isNetwork: true });
          return Promise.reject(refreshErr);
        }
        clearAndRedirect();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    /* ── Tell the user when the SERVER failed ────────────────────────
       Pages commonly end a read with `.catch(() => [])`, which turns a
       failed request into an empty list. The screen then shows "no
       students" when the truth is "the server did not answer" — measured
       across 20 pages, 18 of them said nothing at all when every call
       failed. This interceptor runs before those catches, so surfacing it
       here covers every page at once, including ones never touched.

       Pass `{ silent: true }` on a request to opt out (polling, probes). */
    if (!err.config?.silent) {
      notifyNetworkProblem({
        offline: typeof navigator !== 'undefined' && navigator.onLine === false,
        isNetwork: !err.response,
        isServer: status >= 500,
        isRateLimit: status === 429,
      });
    }

    // Any other 401 (invalid token, not just expired) → logout
    if (status === 401 && !err.config._retry) {
      clearAndRedirect();
    }

    return Promise.reject(err);
  }
);

export default api;
