import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '../../src/api/client';

const NAVY = '#1B2F6E';

function StudentCard({ item, onPress }) {
  const initials = (item.name || item.fullName || 'S')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const colors = ['#1B2F6E', '#059669', '#7C3AED', '#D97706', '#DC2626'];
  const colorIndex = (item.rollNo || item.rollNumber || 0) % colors.length;

  return (
    <TouchableOpacity style={styles.studentCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.avatar, { backgroundColor: colors[colorIndex] }]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName} numberOfLines={1}>
          {item.name || item.fullName || item.firstName + ' ' + item.lastName || 'Unknown'}
        </Text>
        <Text style={styles.studentMeta}>
          Roll #{item.rollNo || item.rollNumber || item.admissionNo || 'N/A'}
        </Text>
        <Text style={styles.studentClass}>
          {item.class?.name || item.className || item.grade || 'N/A'}
        </Text>
      </View>
      <View style={styles.cardRight}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: item.isActive !== false ? '#D1FAE5' : '#FEE2E2' },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: item.isActive !== false ? '#059669' : '#DC2626' },
            ]}
          >
            {item.isActive !== false ? 'Active' : 'Inactive'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" style={{ marginTop: 8 }} />
      </View>
    </TouchableOpacity>
  );
}

export default function StudentsScreen() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['students', page],
    queryFn: async () => {
      const res = await api.get('/students', { params: { page, limit: 50 } });
      return res.data?.data || res.data;
    },
  });

  const students = Array.isArray(data)
    ? data
    : data?.students || data?.data || data?.items || [];

  const filtered = students.filter((s) => {
    const name = (s.name || s.fullName || `${s.firstName || ''} ${s.lastName || ''}`).toLowerCase();
    const roll = String(s.rollNo || s.rollNumber || s.admissionNo || '').toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || roll.includes(q);
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleStudentPress = (student) => {
    Alert.alert(
      student.name || student.fullName || 'Student',
      `Roll: ${student.rollNo || student.rollNumber || 'N/A'}\nClass: ${student.class?.name || student.className || 'N/A'}\nPhone: ${student.phone || student.parentPhone || 'N/A'}\nEmail: ${student.email || 'N/A'}`,
      [{ text: 'Close' }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#6B7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or roll number…"
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
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
          {filtered.length} student{filtered.length !== 1 ? 's' : ''} found
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
          keyExtractor={(item, index) =>
            item._id || item.id || String(index)
          }
          renderItem={({ item }) => (
            <StudentCard item={item} onPress={() => handleStudentPress(item)} />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              colors={[NAVY]}
              tintColor={NAVY}
            />
          }
          ListEmptyComponent={
            !isLoading && !error ? (
              <View style={styles.emptyBox}>
                <Ionicons name="people-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>No students found</Text>
                <Text style={styles.emptySubText}>
                  {search ? 'Try a different search term.' : 'Students will appear here once added.'}
                </Text>
              </View>
            ) : null
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: '#111827',
  },
  countText: {
    fontSize: 13,
    color: '#6B7280',
    marginHorizontal: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  studentCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  studentMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  studentClass: {
    fontSize: 12,
    color: NAVY,
    fontWeight: '600',
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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
    marginTop: 4,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
  },
  emptyBox: {
    alignItems: 'center',
    padding: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
  },
  emptySubText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
