import { useEffect, useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NAVY = '#1B2F6E';

export default function TabLayout() {
  const router = useRouter();
  const [role, setRole] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    loadRole();
  }, []);

  const loadRole = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (!userStr) {
        router.replace('/login');
        return;
      }
      const user = JSON.parse(userStr);
      const r = (user.role || '').toLowerCase();
      // Teachers and parents have their own layout
      if (r === 'teacher') {
        router.replace('/teacher');
        return;
      }
      if (r === 'parent') {
        router.replace('/parent');
        return;
      }
      if (r === 'student') {
        router.replace('/student');
        return;
      }
      setRole(r);
    } catch {
      router.replace('/login');
    } finally {
      setChecking(false);
    }
  };

  if (checking) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={NAVY} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: NAVY,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: { backgroundColor: NAVY },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800', fontSize: 18 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
          headerTitle: 'IlmForge — Dashboard',
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: 'Students',
          tabBarLabel: 'Students',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
          headerTitle: 'Students',
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          tabBarLabel: 'Attendance',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
          headerTitle: 'Mark Attendance',
        }}
      />
      <Tabs.Screen
        name="fees"
        options={{
          title: 'Fees',
          tabBarLabel: 'Fees',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="card-outline" size={size} color={color} />
          ),
          headerTitle: 'Fee Management',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
          headerTitle: 'My Profile',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
});
