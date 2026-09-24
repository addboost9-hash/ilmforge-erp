import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// FIX: accessToken/refreshToken were stored in plain AsyncStorage (readable by
// any code/tooling with filesystem access on the device) even though
// expo-secure-store was already installed and declared as a plugin in
// app.json — it was never actually used anywhere. Tokens now go through the
// OS keychain/keystore via SecureStore; only the non-sensitive `user` profile
// stays in AsyncStorage.
export const saveAuth = async (data) => {
  await Promise.all([
    SecureStore.setItemAsync('accessToken', data.accessToken || ''),
    SecureStore.setItemAsync('refreshToken', data.refreshToken || ''),
    AsyncStorage.setItem('user', JSON.stringify(data.user || {})),
  ]);
};

export const getAuth = async () => {
  const [token, userStr] = await Promise.all([
    SecureStore.getItemAsync('accessToken'),
    AsyncStorage.getItem('user'),
  ]);
  return { token, user: userStr ? JSON.parse(userStr) : null };
};

export const getRefreshToken = () => SecureStore.getItemAsync('refreshToken');

export const clearAuth = async () => {
  await Promise.all([
    SecureStore.deleteItemAsync('accessToken'),
    SecureStore.deleteItemAsync('refreshToken'),
    AsyncStorage.removeItem('user'),
  ]);
};
