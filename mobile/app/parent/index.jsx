import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../src/api/client';

const NAVY = '#1B2F6E';

const SUBJECT_COLORS = ['#1B2F6E', '#059669', '#7C3AED', '#D97706', '#DC2626', '#0EA5E9'];

function ChildCard({ child, index, onPress }) {
  const color = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
  const name =
    child.name || child.fullName || `${child.firstName || ''} ${child.lastName || ''}`.trim();
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const todayStatus = child.todayAttendance || child.attendanceToday;

  return (
    <TouchableOpacity style={styles.childCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.childAvatar, { backgroundColor: color }]}>
        <Text style={styles.childAvatarText}>{initials}</Text>
      </View>

      <View style={styles.childMain}>
        <Text style={styles.childName}>{name}</Text>
        <Text style={styles.childClass}>
          {child.class?.name || child.className || child.grade || 'N/A'}
        </Text>
        <Text style={styles.childRoll}>
          Roll #{child.rollNo || child.rollNumber || child.admissionNo || 'N/A'}
        </Text>
      </View>

      <View style={styles.childRight}>
        {todayStatus && (
          <View
            style={[
              styles.attendanceBadge,
              {
                backgroundColor:
                  todayStatus === 'P' || todayStatus === 'Present'
                    ? '#D1FAE5'
                    : todayStatus === 'A' || todayStatus === 'Absent'
                    ? '#FEE2E2'
                    : '#FEF3C7',
              },
            ]}
          >
            <Text
              style={[
                styles.attendanceBadgeText,
                {
                  color:
                    todayStatus === 'P' || todayStatus === 'Present'
                      ? '#059669'
                      : todayStatus === 'A' || todayStatus === 'Absent'
                      ? '#DC2626'
                      : '#D97706',
                },
              ]}
            >
              {todayStatus === 'P' ? 'Present' : todayStatus === 'A' ? 'Absent' : todayStatus}
            </Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" style={{ marginTop: 8 }} />
      </View>
    </TouchableOpacity>
  );
}

function StatRow({ icon, label, value, color }) {
  return (
    <View style={styles.statRow}>
      <View style={[styles.statRowIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.statRowLabel}>{label}</Text>
      <Text style={[styles.statRowValue, { color }]}>{value}</Text>
    </View>
  );
}

export default function ParentDashboard() {
  const [parentName, setParentName] = useState('Parent');

  useEffect(() => {
    AsyncStorage.getItem('user').then((u) => {
      if (u) {
        const user = JSON.parse(u);
        setParentName(user.name || user.fullName || user.firstName || 'Parent');
      }
    });
  }, []);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['parent-children'],
    queryFn: async () => {
      const res = await api.get('/parent/children');
      return res.data?.data || res.data;
    },
  });

  const children = Array.isArray(data)
    ? data
    : data?.children || data?.students || data?.data || [];

  const onRefresh = useCallback(() => refetch(), [refetch]);

  const showChildDetail = (child) => {
    const name =
      child.name || child.fullName || `${child.firstName || ''} ${child.lastName || ''}`.trim();
    Alert.alert(
      name,
      `Class: ${child.class?.name || child.className || 'N/A'}\nRoll: ${child.rollNo || child.rollNumber || 'N/A'}\nSection: ${child.section || 'N/A'}\nDOB: ${child.dob ? new Date(child.dob).toLocaleDateString('en-PK') : 'N/A'}`,
      [{ text: 'Close' }]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} colors={[NAVY]} tintColor={NAVY} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreet}>Welcome back,</Text>
          <Text style={styles.headerName}>{parentName}</Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="people" size={28} color="#fff" />
        </View>
      </View>

      {/* Loading */}
      {isLoading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={NAVY} />
          <Text style={styles.loadingText}>Loading your children…</Text>
        </View>
      )}

      {/* Error */}
      {error && !isLoading && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={24} color="#DC2626" />
          <Text style={styles.errorText}>Could not load children data.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Children List */}
      {!isLoading && children.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Children ({children.length})</Text>
          {children.map((child, index) => (
            <ChildCard
              key={child._id || child.id || index}
              child={child}
              index={index}
              onPress={() => showChildDetail(child)}
            />
          ))}
        </View>
      )}

      {/* Empty */}
      {!isLoading && !error && children.length === 0 && (
        <View style={styles.emptyBox}>
          <Ionicons name="people-outline" size={56} color="#D1D5DB" />
          <Text style={styles.emptyText}>No children linked to your account</Text>
          <Text style={styles.emptySubText}>
            Contact school administration to link your children.
          </Text>
        </View>
      )}

      {/* Quick Links */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Access</Text>
        <View style={styles.quickGrid}>
          {[
            { icon: 'calendar-outline', label: 'Attendance', color: '#1B2F6E', path: '/parent/attendance' },
            { icon: 'ribbon-outline', label: 'Results', color: '#7C3AED', path: '/parent/results' },
            { icon: 'card-outline', label: 'Fees', color: '#059669', path: '/parent/fees' },
            { icon: 'notifications-outline', label: 'Notices', color: '#D97706', path: null },
          ].map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.quickItem}
              onPress={() =>
                item.path
                  ? null
                  : Alert.alert('Coming Soon', 'This feature is coming soon.')
              }
              activeOpacity={0.7}
            >
              <View style={[styles.quickIcon, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon} size={24} color={item.color} />
              </View>
              <Text style={styles.quickLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Announcements placeholder */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Announcements</Text>
        <View style={styles.announcementCard}>
          <Ionicons name="megaphone-outline" size={20} color={NAVY} />
          <Text style={styles.announcementText}>
            No new announcements. Check back later.
          </Text>
        </View>
      </View>
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
  header: {
    backgroundColor: NAVY,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerGreet: {
    color: '#A5B4FC',
    fontSize: 14,
  },
  headerName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  childCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  childAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  childAvatarText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 18,
  },
  childMain: {
    flex: 1,
  },
  childName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  childClass: {
    fontSize: 13,
    color: NAVY,
    fontWeight: '600',
    marginBottom: 2,
  },
  childRoll: {
    fontSize: 12,
    color: '#6B7280',
  },
  childRight: {
    alignItems: 'flex-end',
  },
  attendanceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  attendanceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 10,
  },
  statRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statRowLabel: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  statRowValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  quickGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickItem: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  quickIcon: {
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
  announcementCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  announcementText: {
    flex: 1,
    color: NAVY,
    fontSize: 13,
    lineHeight: 18,
  },
  centered: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 14,
  },
  errorBox: {
    margin: 16,
    padding: 20,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '600',
  },
  retryBtn: {
    backgroundColor: NAVY,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
  },
  emptyBox: {
    alignItems: 'center',
    padding: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    maxWidth: 260,
  },
});
