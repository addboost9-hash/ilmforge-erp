import axios from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// FIX: was hardcoded to the hosted cloud URL with no way to point at a
// school's own offline/self-hosted deployment without changing this file and
// rebuilding the app. Now reads from app.json's expo.extra.apiUrl (settable
// per build/EAS profile), falling back to the same cloud URL as before.
const API_BASE = Constants.expoConfig?.extra?.apiUrl || 'https://ilmforge-erp.onrender.com/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const clearSession = () => Promise.all([
  SecureStore.deleteItemAsync('accessToken'),
  SecureStore.deleteItemAsync('refreshToken'),
  AsyncStorage.removeItem('user'),
]);

// FIX: a 401 used to just wipe storage and reject — a normal 15-minute access
// token expiry silently logged the user out mid-session even though a
// working refresh token (and backend POST /auth/refresh) already existed.
// Now attempts one silent refresh-and-retry before giving up; concurrent
// 401s while a refresh is already in flight wait on the same promise instead
// of each firing their own refresh call.
let refreshPromise = null;

const doRefresh = async () => {
  const refreshToken = await SecureStore.getItemAsync('refreshToken');
  if (!refreshToken) throw new Error('No refresh token');
  const res = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
  const { accessToken, refreshToken: newRefreshToken } = res.data.data;
  await SecureStore.setItemAsync('accessToken', accessToken);
  if (newRefreshToken) await SecureStore.setItemAsync('refreshToken', newRefreshToken);
  return accessToken;
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original?._retried) {
      original._retried = true;
      try {
        if (!refreshPromise) refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
        const accessToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        await clearSession();
        return Promise.reject(err);
      }
    }
    return Promise.reject(err);
  }
);

export default api;
