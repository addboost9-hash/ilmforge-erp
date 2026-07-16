import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '../../src/api/client';

const NAVY = '#1B2F6E';
const COLORS = ['#1B2F6E', '#059669', '#7C3AED', '#D97706', '#DC2626'];

export default function TeacherStudents() {
  const [selectedClass, setSelectedClass] = useState(null);
  const [search, setSearch] = useState('');

  const { data: classesData } = useQuery({
    queryKey: ['teacher-classes'],
    queryFn: async () => {
      const res = await api.get('/teacher/classes');
      return res.data?.data || res.data;
    },
  });

  const classes = Array.isArray(classesData)
    ? classesData
    : classesData?.classes || classesData?.data || [];

  const activeClassId = selectedClass || (classes[0]?._id || classes[0]?.id);

  const { data: studentsData, isLoading, error, refetch } = useQuery({
    queryKey: ['teacher-students', activeClassId],
    queryFn: async () => {
      const res = await api.get('/students', {
        params: { classId: activeClassId, limit: 200 },
      });
      return res.data?.data || res.data;
    },
    enabled: !!activeClassId,
  });

  const students = Array.isArray(studentsData)
    ? studentsData
    : studentsData?.students || studentsData?.data || studentsData?.items || [];

  const filtered = students.filter((s) => {
    const name = (s.name || s.fullName || `${s.firstName || ''} ${s.lastName || ''}`).toLowerCase();
    const roll = String(s.rollNo || s.rollNumber || '').toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || roll.includes(q);
  });

  const handleStudentPress = (student) => {
    const name = student.name || student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim();
    Alert.alert(
      name,
      `Roll: ${student.rollNo || student.rollNumber || 'N/A'}\nPhone: ${student.phone || student.parentPhone || 'N/A'}\nEmail: ${student.email || 'N/A'}\nParent: ${student.parentName || student.guardian?.name || 'N/A'}`,
      [{ text: 'Close' }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Class Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.classTabs}
        contentContainerStyle={styles.classTabsContent}
      >
        {classes.map((cls, i) => {
          const id = cls._id || cls.id;
          const isActive = id === activeClassId;
          return (
            <TouchableOpacity
              key={id || i}
              style={[styles.classTab, isActive && styles.classTabActive]}
              onPress={() => setSelectedClass(id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.classTabText, isActive && styles.classTabTextActive]}>
                {cls.name || cls.className}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#6B7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search students…"
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Count */}
      {!isLoading && (
        <Text style={styles.countText}>
          {filtered.length} of {students.length} students
        </Text>
      )}

      {/* Loading */}
      {isLoading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={NAVY} />
          <Text style={styles.loadingText}>Loading students…</Text>
        </View>
      )}

      {/* Error */}
      {error && !isLoading && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={24} color="#DC2626" />
          <Text style={styles.errorText}>Failed to load students.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* List */}
      {!isLoading && (
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => item._id || item.id || String(i)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const name = item.name || item.fullName || `${item.firstName || ''} ${item.lastName || ''}`.trim();
            const initials = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
            const color = COLORS[index % COLORS.length];
            return (
              <TouchableOpacity
                style={styles.studentCard}
                onPress={() => handleStudentPress(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.avatar, { backgroundColor: color }]}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{name}</Text>
                  <Text style={styles.studentRoll}>
                    Roll #{item.rollNo || item.rollNumber || item.admissionNo || 'N/A'}
                  </Text>
                </View>
                <View style={styles.cardRight}>
                  <View style={[styles.activeBadge, { backgroundColor: item.isActive !== false ? '#D1FAE5' : '#FEE2E2' }]}>
                    <Text style={[styles.activeBadgeText, { color: item.isActive !== false ? '#059669' : '#DC2626' }]}>
                      {item.isActive !== false ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color="#9CA3AF" style={{ marginTop: 6 }} />
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            !isLoading && !error && (
              <View style={styles.emptyBox}>
                <Ionicons name="people-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>
                  {search ? 'No students match your search.' : 'No students in this class.'}
                </Text>
              </View>
            )
          }
        />
      )}

      {/* No classes prompt */}
      {!isLoading && !activeClassId && classes.length === 0 && (
        <View style={styles.emptyBox}>
          <Ionicons name="school-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>No classes assigned to you.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  classTabs: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', maxHeight: 52 },
  classTabsContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  classTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F3F4F6' },
  classTabActive: { backgroundColor: NAVY },
  classTabText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  classTabTextActive: { color: '#fff' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 44, fontSize: 15, color: '#111827' },
  countText: { fontSize: 13, color: '#6B7280', marginHorizontal: 16, marginBottom: 8, fontWeight: '500' },
  listContent: { paddingHorizontal: 12, paddingBottom: 24 },
  studentCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  studentRoll: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  cardRight: { alignItems: 'flex-end' },
  activeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  activeBadgeText: { fontSize: 11, fontWeight: '700' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 40 },
  loadingText: { color: '#6B7280', fontSize: 14 },
  errorBox: { margin: 16, padding: 20, backgroundColor: '#FEF2F2', borderRadius: 14, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#FECACA' },
  errorText: { color: '#DC2626', fontSize: 15, fontWeight: '600' },
  retryBtn: { backgroundColor: NAVY, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '700' },
  emptyBox: { alignItems: 'center', padding: 40, gap: 10 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#9CA3AF', textAlign: 'center' },
});
