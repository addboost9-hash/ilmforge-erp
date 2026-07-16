import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '../../src/api/client';

const NAVY = '#1B2F6E';

const STATUS_MAP = {
  P: { label: 'Present', color: '#059669', bg: '#D1FAE5' },
  Present: { label: 'Present', color: '#059669', bg: '#D1FAE5' },
  A: { label: 'Absent', color: '#DC2626', bg: '#FEE2E2' },
  Absent: { label: 'Absent', color: '#DC2626', bg: '#FEE2E2' },
  L: { label: 'Leave', color: '#D97706', bg: '#FEF3C7' },
  Leave: { label: 'Leave', color: '#D97706', bg: '#FEF3C7' },
  Lt: { label: 'Late', color: '#7C3AED', bg: '#EDE9FE' },
  Late: { label: 'Late', color: '#7C3AED', bg: '#EDE9FE' },
};

function AttendanceRow({ record }) {
  const statusKey = record.status || record.attendanceStatus || 'P';
  const statusInfo = STATUS_MAP[statusKey] || STATUS_MAP['P'];
  const dateStr = record.date
    ? new Date(record.date).toLocaleDateString('en-PK', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : 'N/A';

  return (
    <View style={styles.attendanceRow}>
      <Text style={styles.attendanceDate}>{dateStr}</Text>
      <View style={[styles.statusChip, { backgroundColor: statusInfo.bg }]}>
        <Text style={[styles.statusChipText, { color: statusInfo.color }]}>
          {statusInfo.label}
        </Text>
      </View>
    </View>
  );
}

export default function ParentAttendance() {
  const [selectedChildId, setSelectedChildId] = useState(null);

  const { data: childrenData } = useQuery({
    queryKey: ['parent-children'],
    queryFn: async () => {
      const res = await api.get('/parent/children');
      return res.data?.data || res.data;
    },
  });

  const children = Array.isArray(childrenData)
    ? childrenData
    : childrenData?.children || childrenData?.students || childrenData?.data || [];

  const activeChildId = selectedChildId || (children[0]?._id || children[0]?.id);

  const { data: attendanceData, isLoading, error, refetch } = useQuery({
    queryKey: ['child-attendance', activeChildId],
    queryFn: async () => {
      const res = await api.get(`/attendance/student/${activeChildId}`);
      return res.data?.data || res.data;
    },
    enabled: !!activeChildId,
  });

  const records = Array.isArray(attendanceData)
    ? attendanceData
    : attendanceData?.attendance || attendanceData?.records || attendanceData?.data || [];

  const present = records.filter((r) => r.status === 'P' || r.status === 'Present').length;
  const absent = records.filter((r) => r.status === 'A' || r.status === 'Absent').length;
  const leave = records.filter((r) => r.status === 'L' || r.status === 'Leave').length;
  const late = records.filter((r) => r.status === 'Lt' || r.status === 'Late').length;
  const total = records.length;
  const attendancePct = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <View style={styles.container}>
      {/* Child Selector */}
      {children.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.childSelector}
          contentContainerStyle={styles.childSelectorContent}
        >
          {children.map((child, i) => {
            const id = child._id || child.id;
            const isActive = id === activeChildId;
            const name =
              child.name ||
              child.fullName ||
              `${child.firstName || ''} ${child.lastName || ''}`.trim();
            return (
              <TouchableOpacity
                key={id || i}
                style={[styles.childTab, isActive && styles.childTabActive]}
                onPress={() => setSelectedChildId(id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.childTabText, isActive && styles.childTabTextActive]}>
                  {name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Summary Cards */}
      {!isLoading && total > 0 && (
        <View style={styles.summarySection}>
          <View style={styles.percentageBlock}>
            <Text style={styles.percentageNumber}>{attendancePct}%</Text>
            <Text style={styles.percentageLabel}>Overall Attendance</Text>
          </View>
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryItem, { backgroundColor: '#D1FAE5' }]}>
              <Text style={[styles.summaryCount, { color: '#059669' }]}>{present}</Text>
              <Text style={[styles.summaryLabel, { color: '#059669' }]}>Present</Text>
            </View>
            <View style={[styles.summaryItem, { backgroundColor: '#FEE2E2' }]}>
              <Text style={[styles.summaryCount, { color: '#DC2626' }]}>{absent}</Text>
              <Text style={[styles.summaryLabel, { color: '#DC2626' }]}>Absent</Text>
            </View>
            <View style={[styles.summaryItem, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.summaryCount, { color: '#D97706' }]}>{leave}</Text>
              <Text style={[styles.summaryLabel, { color: '#D97706' }]}>Leave</Text>
            </View>
            <View style={[styles.summaryItem, { backgroundColor: '#EDE9FE' }]}>
              <Text style={[styles.summaryCount, { color: '#7C3AED' }]}>{late}</Text>
              <Text style={[styles.summaryLabel, { color: '#7C3AED' }]}>Late</Text>
            </View>
          </View>
        </View>
      )}

      {/* Loading */}
      {isLoading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={NAVY} />
          <Text style={styles.loadingText}>Loading attendance…</Text>
        </View>
      )}

      {/* Error */}
      {error && !isLoading && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={24} color="#DC2626" />
          <Text style={styles.errorText}>Could not load attendance.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Records List */}
      {!isLoading && records.length > 0 && (
        <FlatList
          data={[...records].reverse()}
          keyExtractor={(item, i) => item._id || item.id || String(i)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <AttendanceRow record={item} />}
        />
      )}

      {/* Empty */}
      {!isLoading && !error && records.length === 0 && (
        <View style={styles.emptyBox}>
          <Ionicons name="calendar-outline" size={56} color="#D1D5DB" />
          <Text style={styles.emptyText}>No attendance records found</Text>
          <Text style={styles.emptySubText}>
            Attendance will appear here once teachers start marking.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  childSelector: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    maxHeight: 52,
  },
  childSelectorContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  childTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  childTabActive: {
    backgroundColor: NAVY,
  },
  childTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  childTabTextActive: {
    color: '#fff',
  },
  summarySection: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  percentageBlock: {
    alignItems: 'center',
    marginBottom: 14,
  },
  percentageNumber: {
    fontSize: 40,
    fontWeight: '900',
    color: NAVY,
  },
  percentageLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  summaryCount: {
    fontSize: 20,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: 24,
  },
  attendanceRow: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  attendanceDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 40,
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 40,
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
