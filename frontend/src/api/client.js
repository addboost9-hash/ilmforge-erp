import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000, // 20s for production (Render cold starts)
});

// Request interceptor — attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const campusId = localStorage.getItem('campusId');
  if (campusId) config.headers['x-campus-id'] = campusId;
  return config;
});

// Response interceptor — handle 401 + school suspension
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const code = err.response?.data?.code;

    // School suspended by platform owner
    if (err.response?.status === 403 && ['SCHOOL_SUSPENDED','SCHOOL_INACTIVE','TRIAL_EXPIRED','LICENSE_EXPIRED'].includes(code)) {
      const msg = err.response.data;
      localStorage.clear();
      // Show suspension page
      window.location.href = `/suspended?reason=${encodeURIComponent(msg.message)}&contact=${encodeURIComponent(msg.contact || msg.renew || msg.upgrade || '')}`;
      return Promise.reject(err);
    }

    // Token expired — refresh
    if (err.response?.status === 401 && code === 'TOKEN_EXPIRED') {
      try {
        const refresh = localStorage.getItem('refreshToken');
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken: refresh });
        localStorage.setItem('accessToken', data.data.accessToken);
        err.config.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api.request(err.config);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }

    return Promise.reject(err);
  }
);

export default api;
