import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { clearAuth } from '../../src/store/auth';

const NAVY = '#1B2F6E';

export default function StudentLayout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: NAVY },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800', fontSize: 18 },
        headerRight: () => (
          <TouchableOpacity
            style={{ marginRight: 16 }}
            onPress={async () => { await clearAuth(); router.replace('/login'); }}
          >
            <Ionicons name="log-out-outline" size={22} color="#fff" />
          </TouchableOpacity>
        ),
      }}
    >
      <Stack.Screen name="index" options={{ headerTitle: 'Student Portal' }} />
    </Stack>
  );
}
