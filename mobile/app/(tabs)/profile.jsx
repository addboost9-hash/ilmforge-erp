import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { clearAuth } from '../../src/store/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NAVY = '#1B2F6E';

function ProfileRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <View style={styles.profileRow}>
      <View style={styles.profileRowIcon}>
        <Ionicons name={icon} size={18} color={NAVY} />
      </View>
      <View style={styles.profileRowContent}>
        <Text style={styles.profileRowLabel}>{label}</Text>
        <Text style={styles.profileRowValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) setUser(JSON.parse(userStr));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await clearAuth();
          router.replace('/login');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={NAVY} />
      </View>
    );
  }

  const displayName =
    user?.name || user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User';
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const role = (user?.role || 'User').charAt(0).toUpperCase() + (user?.role || 'user').slice(1);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.headerName}>{displayName}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{role}</Text>
        </View>
      </View>

      {/* Info Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account Information</Text>
        <ProfileRow icon="mail-outline" label="Email" value={user?.email} />
        <ProfileRow icon="call-outline" label="Phone" value={user?.phone || user?.phoneNumber} />
        <ProfileRow icon="shield-checkmark-outline" label="Role" value={role} />
        <ProfileRow icon="business-outline" label="School" value={user?.school?.name || user?.schoolName} />
        <ProfileRow icon="location-outline" label="Address" value={user?.address} />
      </View>

      {/* App Info Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>App Information</Text>
        <View style={styles.appInfoRow}>
          <Text style={styles.appInfoLabel}>Version</Text>
          <Text style={styles.appInfoValue}>1.0.0</Text>
        </View>
        <View style={styles.appInfoRow}>
          <Text style={styles.appInfoLabel}>API Server</Text>
          <Text style={styles.appInfoValue} numberOfLines={1}>ilmforge-erp.onrender.com</Text>
        </View>
        <View style={styles.appInfoRow}>
          <Text style={styles.appInfoLabel}>Build</Text>
          <Text style={styles.appInfoValue}>Expo SDK 51</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsCard}>
        <TouchableOpacity
          style={styles.actionItem}
          activeOpacity={0.7}
          onPress={() => Alert.alert('Notifications', 'Notification settings coming soon.')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}>
            <Ionicons name="notifications-outline" size={20} color={NAVY} />
          </View>
          <Text style={styles.actionText}>Notification Settings</Text>
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItem}
          activeOpacity={0.7}
          onPress={() => Alert.alert('Change Password', 'Password change coming soon.')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="key-outline" size={20} color="#D97706" />
          </View>
          <Text style={styles.actionText}>Change Password</Text>
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItem}
          activeOpacity={0.7}
          onPress={() => Alert.alert('Help & Support', 'Contact: support@ilmforge.pk')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="help-circle-outline" size={20} color="#059669" />
          </View>
          <Text style={styles.actionText}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={20} color="#DC2626" />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>IlmForge ERP Mobile v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: NAVY,
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
  },
  headerName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  roleBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  card: {
    backgroundColor: '#fff',
    margin: 12,
    marginBottom: 0,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  profileRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileRowContent: {
    flex: 1,
  },
  profileRowLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 1,
  },
  profileRowValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  appInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  appInfoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  appInfoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  actionsCard: {
    backgroundColor: '#fff',
    margin: 12,
    marginBottom: 0,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    margin: 12,
    marginTop: 16,
    padding: 14,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 15,
  },
  footer: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12,
    paddingVertical: 20,
  },
});
