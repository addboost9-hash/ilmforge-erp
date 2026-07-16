import AsyncStorage from '@react-native-async-storage/async-storage';

export const saveAuth = async (data) => {
  await AsyncStorage.multiSet([
    ['accessToken', data.accessToken || ''],
    ['refreshToken', data.refreshToken || ''],
    ['user', JSON.stringify(data.user || {})],
  ]);
};

export const getAuth = async () => {
  const [[, token], [, user]] = await AsyncStorage.multiGet(['accessToken', 'user']);
  return { token, user: user ? JSON.parse(user) : null };
};

export const clearAuth = async () => {
  await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
};
