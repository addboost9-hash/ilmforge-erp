import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../src/api/client';
import { clearAuth } from '../../src/store/auth';

const NAVY = '#1B2F6E';

function StatCard({ icon, label, value, color, bg }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={[styles.statIconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.statValue}>{value ?? '—'}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, label, color, onPress }) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.quickIconWrap, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [userName, setUserName] = useState('Admin');

  useState(() => {
    AsyncStorage.getItem('user').then((u) => {
      if (u) {
        const user = JSON.parse(u);
        setUserName(user.name || user.fullName || user.firstName || 'Admin');
      }
    });
  });

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('/dashboard/stats');
      return res.data?.data || res.data;
    },
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleLogout = async () => {
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

  const stats = data || {};

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={onRefresh}
          colors={[NAVY]}
          tintColor={NAVY}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Welcome Banner */}
      <View style={styles.banner}>
        <View>
          <Text style={styles.bannerGreet}>Good day,</Text>
          <Text style={styles.bannerName}>{userName}</Text>
          <Text style={styles.bannerSub}>Here's your school overview</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Loading */}
      {isLoading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="large" color={NAVY} />
          <Text style={styles.loadingText}>Loading stats…</Text>
        </View>
      )}

      {/* Error */}
      {error && !isLoading && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
          <Text style={styles.errorText}>Could not load dashboard data.</Text>
          <TouchableOpacity onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stats Grid */}
      {!isLoading && (
        <View style={styles.statsGrid}>
          <StatCard
            icon="people-outline"
            label="Total Students"
            value={stats.totalStudents || stats.students}
            color="#1B2F6E"
            bg="#EEF2FF"
          />
          <StatCard
            icon="checkmark-circle-outline"
            label="Today Present"
            value={stats.todayPresent || stats.presentToday}
            color="#059669"
            bg="#D1FAE5"
          />
          <StatCard
            icon="cash-outline"
            label="Fee Collected"
            value={
              stats.feeCollected
                ? `Rs ${Number(stats.feeCollected).toLocaleString()}`
                : stats.totalCollected
                ? `Rs ${Number(stats.totalCollected).toLocaleString()}`
                : '—'
            }
            color="#7C3AED"
            bg="#EDE9FE"
          />
          <StatCard
            icon="time-outline"
            label="Pending Fees"
            value={
              stats.pendingFees
                ? `Rs ${Number(stats.pendingFees).toLocaleString()}`
                : stats.totalPending
                ? `Rs ${Number(stats.totalPending).toLocaleString()}`
                : '—'
            }
            color="#DC2626"
            bg="#FEE2E2"
          />
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          <QuickAction
            icon="calendar-outline"
            label="Attendance"
            color="#1B2F6E"
            onPress={() => router.push('/(tabs)/attendance')}
          />
          <QuickAction
            icon="card-outline"
            label="Collect Fee"
            color="#7C3AED"
            onPress={() => router.push('/(tabs)/fees')}
          />
          <QuickAction
            icon="person-add-outline"
            label="Add Student"
            color="#059669"
            onPress={() => router.push('/(tabs)/students')}
          />
          <QuickAction
            icon="bar-chart-outline"
            label="Reports"
            color="#D97706"
            onPress={() => Alert.alert('Coming Soon', 'Reports module coming soon.')}
          />
        </View>
      </View>

      {/* Recent Activity */}
      {stats.recentActivity && stats.recentActivity.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {stats.recentActivity.slice(0, 5).map((item, index) => (
            <View key={index} style={styles.activityItem}>
              <View style={styles.activityDot} />
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>{item.message || item.description || item.text}</Text>
                <Text style={styles.activityTime}>{item.time || item.createdAt || ''}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Info Section when no live data */}
      {!isLoading && !stats.totalStudents && !stats.students && (
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={24} color={NAVY} />
          <Text style={styles.infoText}>
            Connect to the IlmForge backend to see live statistics.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    paddingBottom: 24,
  },
  banner: {
    backgroundColor: NAVY,
    padding: 24,
    paddingTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bannerGreet: {
    color: '#A5B4FC',
    fontSize: 14,
  },
  bannerName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  bannerSub: {
    color: '#C7D2FE',
    fontSize: 13,
    marginTop: 4,
  },
  logoutBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  loadingRow: {
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 14,
  },
  errorBox: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    flex: 1,
    color: '#DC2626',
    fontSize: 14,
  },
  retryText: {
    color: NAVY,
    fontWeight: '600',
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 10,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  section: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickAction: {
    width: '22%',
    alignItems: 'center',
    gap: 6,
  },
  quickIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickLabel: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '600',
    textAlign: 'center',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 10,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: NAVY,
    marginTop: 5,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#374151',
  },
  activityTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  infoBox: {
    margin: 16,
    padding: 16,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  infoText: {
    flex: 1,
    color: NAVY,
    fontSize: 13,
    lineHeight: 18,
  },
});
