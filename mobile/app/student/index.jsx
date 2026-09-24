import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// FIX: redirectByRole() in app/_layout.jsx has always sent role==='student'
// logins here, but no `app/student/` route existed at all, so a student
// login hit an unmatched-route dead end. The web app already has a full
// Student Portal (frontend/src/pages/portal/StudentPortalPage.jsx) — this is
// a placeholder so a student login lands somewhere coherent on mobile while
// the equivalent screens (attendance/results/fees) are built out here.
export default function StudentHome() {
  return (
    <View style={styles.container}>
      <Ionicons name="school-outline" size={56} color="#1B2F6E" />
      <Text style={styles.title}>Student Portal — Coming Soon</Text>
      <Text style={styles.subtitle}>
        The mobile Student Portal is still being built. In the meantime, please use the
        web portal to view your attendance, results, and fee status.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12, backgroundColor: '#fff' },
  title: { fontSize: 17, fontWeight: '800', color: '#1B2F6E', textAlign: 'center', marginTop: 8 },
  subtitle: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 19 },
});
