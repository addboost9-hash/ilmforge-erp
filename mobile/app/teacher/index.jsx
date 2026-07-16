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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../src/api/client';

const NAVY = '#1B2F6E';

function ClassCard({ cls, onPress }) {
  const subject = cls.subject?.name || cls.subjectName || cls.subject || 'N/A';
  const className = cls.class?.name || cls.className || cls.name || 'N/A';
  const time = cls.time || cls.startTime || '';
  const room = cls.room || cls.roomNo || '';

  return (
    <TouchableOpacity style={styles.classCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.classCardLeft}>
        <View style={styles.classIcon}>
          <Ionicons name="book-outline" size={20} color={NAVY} />
        </View>
        <View>
          <Text style={styles.classSubject}>{subject}</Text>
          <Text style={styles.classSection}>{className}</Text>
          {room && <Text style={styles.classRoom}>Room {room}</Text>}
        </View>
      </View>
      {time && (
        <View style={styles.classTime}>
          <Ionicons name="time-outline" size={14} color="#6B7280" />
          <Text style={styles.classTimeText}>{time}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function NotificationItem({ notification }) {
  return (
    <View style={styles.notifItem}>
      <View style={styles.notifDot} />
      <View style={styles.notifContent}>
        <Text style={styles.notifText}>{notification.message || notification.title || notification.text}</Text>
        <Text style={styles.notifTime}>
          {notification.time || notification.createdAt
            ? new Date(notification.time || notification.createdAt).toLocaleDateString('en-PK')
            : ''}
        </Text>
      </View>
    </View>
  );
}

export default function TeacherDashboard() {
  const router = useRouter();
  const [teacherName, setTeacherName] = useState('Teacher');

  useEffect(() => {
    AsyncStorage.getItem('user').then((u) => {
      if (u) {
        const user = JSON.parse(u);
        setTeacherName(user.name || user.fullName || user.firstName || 'Teacher');
      }
    });
  }, []);

  const { data: classesData, isLoading: loadingClasses, refetch: refetchClasses, isRefetching } = useQuery({
    queryKey: ['teacher-today-classes'],
    queryFn: async () => {
      const res = await api.get('/teacher/today-classes');
      return res.data?.data || res.data;
    },
  });

  const { data: notifsData } = useQuery({
    queryKey: ['teacher-notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data?.data || res.data;
    },
  });

  const classes = Array.isArray(classesData)
    ? classesData
    : classesData?.classes || classesData?.data || [];

  const notifications = Array.isArray(notifsData)
    ? notifsData
    : notifsData?.notifications || notifsData?.data || [];

  const onRefresh = useCallback(() => refetchClasses(), [refetchClasses]);

  const getDayName = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  const getDateStr = () => {
    return new Date().toLocaleDateString('en-PK', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
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
          <Text style={styles.headerGreet}>Good day,</Text>
          <Text style={styles.headerName}>{teacherName}</Text>
          <Text style={styles.headerDate}>
            {getDayName()}, {getDateStr()}
          </Text>
        </View>
        <View style={styles.headerBadge}>
          <Ionicons name="school" size={28} color="#fff" />
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push('/teacher/attendance')}
            activeOpacity={0.7}
          >
            <View style={[styles.quickIcon, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="calendar-outline" size={24} color={NAVY} />
            </View>
            <Text style={styles.quickLabel}>Mark Attendance</Text>
            <Text style={styles.quickSub}>Take today's roll</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push('/teacher/homework')}
            activeOpacity={0.7}
          >
            <View style={[styles.quickIcon, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="book-outline" size={24} color="#059669" />
            </View>
            <Text style={styles.quickLabel}>Post Homework</Text>
            <Text style={styles.quickSub}>Assign tasks</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push('/teacher/students')}
            activeOpacity={0.7}
          >
            <View style={[styles.quickIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="people-outline" size={24} color="#D97706" />
            </View>
            <Text style={styles.quickLabel}>My Students</Text>
            <Text style={styles.quickSub}>View class list</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => Alert.alert('Coming Soon', 'Results entry coming soon.')}
            activeOpacity={0.7}
          >
            <View style={[styles.quickIcon, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="ribbon-outline" size={24} color="#7C3AED" />
            </View>
            <Text style={styles.quickLabel}>Enter Results</Text>
            <Text style={styles.quickSub}>Enter exam marks</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Today's Classes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Today's Classes ({loadingClasses ? '…' : classes.length})
        </Text>

        {loadingClasses ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={NAVY} />
            <Text style={styles.loadingText}>Loading classes…</Text>
          </View>
        ) : classes.length === 0 ? (
          <View style={styles.noClassesBox}>
            <Ionicons name="cafe-outline" size={32} color="#D1D5DB" />
            <Text style={styles.noClassesText}>No classes scheduled for today</Text>
          </View>
        ) : (
          classes.map((cls, i) => (
            <ClassCard
              key={cls._id || cls.id || i}
              cls={cls}
              onPress={() =>
                Alert.alert(
                  cls.subject?.name || cls.subjectName || 'Class',
                  `Class: ${cls.class?.name || cls.className || 'N/A'}\nTime: ${cls.time || 'N/A'}\nRoom: ${cls.room || 'N/A'}`
                )
              }
            />
          ))
        )}
      </View>

      {/* Notifications */}
      {notifications.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.notifsCard}>
            {notifications.slice(0, 5).map((n, i) => (
              <NotificationItem key={n._id || i} notification={n} />
            ))}
          </View>
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
  header: {
    backgroundColor: NAVY,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerGreet: {
    color: '#A5B4FC',
    fontSize: 13,
  },
  headerName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  headerDate: {
    color: '#C7D2FE',
    fontSize: 12,
    marginTop: 4,
  },
  headerBadge: {
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
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  quickSub: {
    fontSize: 12,
    color: '#6B7280',
  },
  classCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: NAVY,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  classCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  classIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  classSubject: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  classSection: {
    fontSize: 12,
    color: NAVY,
    fontWeight: '600',
    marginTop: 2,
  },
  classRoom: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  classTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  classTimeText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 14,
  },
  noClassesBox: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    gap: 8,
  },
  noClassesText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  notifsCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: NAVY,
    marginTop: 5,
  },
  notifContent: {
    flex: 1,
  },
  notifText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  notifTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
