import { Tabs, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const NAVY = '#1B2F6E';

export default function ParentLayout() {
  const router = useRouter();

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
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: NAVY },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800', fontSize: 18 },
        headerRight: () => (
          <TouchableOpacity
            style={{ marginRight: 16 }}
            onPress={() => router.replace('/login')}
          >
            <Ionicons name="log-out-outline" size={22} color="#fff" />
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'My Children',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
          headerTitle: 'Parent Portal',
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
          headerTitle: 'Fee Details',
        }}
      />
      <Tabs.Screen
        name="results"
        options={{
          title: 'Results',
          tabBarLabel: 'Results',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ribbon-outline" size={size} color={color} />
          ),
          headerTitle: 'Exam Results',
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
          headerTitle: 'Attendance Record',
        }}
      />
    </Tabs>
  );
}
