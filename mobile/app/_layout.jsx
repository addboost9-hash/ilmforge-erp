import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
    },
  },
});

function AuthGuard({ children }) {
  const segments = useSegments();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const userStr = await AsyncStorage.getItem('user');
      const inAuthGroup = segments[0] === 'login';

      if (!token || !userStr) {
        if (!inAuthGroup) {
          router.replace('/login');
        }
      } else {
        const user = JSON.parse(userStr);
        if (inAuthGroup) {
          redirectByRole(user.role, router);
        }
      }
    } catch (e) {
      router.replace('/login');
    } finally {
      setChecking(false);
    }
  };

  if (checking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1B2F6E" />
      </View>
    );
  }

  return children;
}

export function redirectByRole(role, router) {
  const r = (role || '').toLowerCase();
  if (r === 'admin' || r === 'superadmin' || r === 'super_admin') {
    router.replace('/(tabs)');
  } else if (r === 'teacher') {
    router.replace('/teacher');
  } else if (r === 'parent') {
    router.replace('/parent');
  } else if (r === 'student') {
    router.replace('/student');
  } else {
    router.replace('/(tabs)');
  }
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard>
        <StatusBar style="light" backgroundColor="#1B2F6E" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#1B2F6E' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
            contentStyle: { backgroundColor: '#F5F7FA' },
          }}
        >
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="parent" options={{ headerShown: false }} />
          <Stack.Screen name="teacher" options={{ headerShown: false }} />
          <Stack.Screen name="student" options={{ headerShown: false }} />
        </Stack>
      </AuthGuard>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
});
