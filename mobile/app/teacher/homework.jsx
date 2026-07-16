import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../src/api/client';

const NAVY = '#1B2F6E';

function getTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function HomeworkCard({ hw }) {
  const subject = hw.subject?.name || hw.subjectName || hw.subject || 'Subject';
  const title = hw.title || hw.description?.slice(0, 60) || 'Homework';
  const due = hw.dueDate ? new Date(hw.dueDate).toLocaleDateString('en-PK') : 'N/A';
  const className = hw.class?.name || hw.className || 'All Classes';

  return (
    <View style={styles.hwCard}>
      <View style={styles.hwCardHeader}>
        <View style={styles.hwSubjectBadge}>
          <Text style={styles.hwSubjectText}>{subject}</Text>
        </View>
        <Text style={styles.hwDue}>Due: {due}</Text>
      </View>
      <Text style={styles.hwTitle}>{title}</Text>
      <Text style={styles.hwClass}>{className}</Text>
    </View>
  );
}

export default function HomeworkScreen() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    classId: '',
    subjectId: '',
    title: '',
    description: '',
    dueDate: getTomorrow(),
  });

  const { data: classesData } = useQuery({
    queryKey: ['teacher-classes'],
    queryFn: async () => {
      const res = await api.get('/teacher/classes');
      return res.data?.data || res.data;
    },
  });

  const { data: subjectsData } = useQuery({
    queryKey: ['teacher-subjects'],
    queryFn: async () => {
      const res = await api.get('/teacher/subjects');
      return res.data?.data || res.data;
    },
  });

  const { data: hwData, isLoading: loadingHw, refetch } = useQuery({
    queryKey: ['teacher-homework'],
    queryFn: async () => {
      const res = await api.get('/homework/teacher');
      return res.data?.data || res.data;
    },
  });

  const classes = Array.isArray(classesData)
    ? classesData
    : classesData?.classes || classesData?.data || [];

  const subjects = Array.isArray(subjectsData)
    ? subjectsData
    : subjectsData?.subjects || subjectsData?.data || [];

  const homeworks = Array.isArray(hwData)
    ? hwData
    : hwData?.homeworks || hwData?.homework || hwData?.data || [];

  const postMutation = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error('Title is required.');
      if (!form.description.trim()) throw new Error('Description is required.');
      const res = await api.post('/homework', {
        classId: form.classId || undefined,
        subjectId: form.subjectId || undefined,
        title: form.title.trim(),
        description: form.description.trim(),
        dueDate: form.dueDate,
      });
      return res.data;
    },
    onSuccess: () => {
      Alert.alert('Posted!', 'Homework posted and students notified.');
      setShowForm(false);
      setForm({ classId: '', subjectId: '', title: '', description: '', dueDate: getTomorrow() });
      refetch();
    },
    onError: (err) => {
      const msg = err.message || err.response?.data?.message || 'Failed to post homework.';
      Alert.alert('Error', msg);
    },
  });

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>
          {homeworks.length} Assignment{homeworks.length !== 1 ? 's' : ''} Posted
        </Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowForm(!showForm)}
          activeOpacity={0.8}
        >
          <Ionicons name={showForm ? 'close' : 'add'} size={20} color="#fff" />
          <Text style={styles.addBtnText}>{showForm ? 'Cancel' : 'New'}</Text>
        </TouchableOpacity>
      </View>

      {/* Post Form */}
      {showForm && (
        <ScrollView style={styles.formContainer} nestedScrollEnabled showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            <Text style={styles.formTitle}>Post New Homework</Text>

            {/* Class Selector */}
            <Text style={styles.formLabel}>Class</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {classes.map((cls) => (
                <TouchableOpacity
                  key={cls._id || cls.id}
                  style={[
                    styles.chip,
                    form.classId === (cls._id || cls.id) && styles.chipActive,
                  ]}
                  onPress={() => setForm({ ...form, classId: cls._id || cls.id })}
                >
                  <Text
                    style={[
                      styles.chipText,
                      form.classId === (cls._id || cls.id) && styles.chipTextActive,
                    ]}
                  >
                    {cls.name || cls.className}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Subject Selector */}
            {subjects.length > 0 && (
              <>
                <Text style={styles.formLabel}>Subject</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                  {subjects.map((sub) => (
                    <TouchableOpacity
                      key={sub._id || sub.id}
                      style={[
                        styles.chip,
                        form.subjectId === (sub._id || sub.id) && styles.chipActive,
                      ]}
                      onPress={() => setForm({ ...form, subjectId: sub._id || sub.id })}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          form.subjectId === (sub._id || sub.id) && styles.chipTextActive,
                        ]}
                      >
                        {sub.name || sub.subjectName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Title */}
            <Text style={styles.formLabel}>Title *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Chapter 5 Exercise"
              placeholderTextColor="#9CA3AF"
              value={form.title}
              onChangeText={(t) => setForm({ ...form, title: t })}
            />

            {/* Description */}
            <Text style={styles.formLabel}>Description *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Describe the homework task…"
              placeholderTextColor="#9CA3AF"
              value={form.description}
              onChangeText={(t) => setForm({ ...form, description: t })}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {/* Due Date */}
            <Text style={styles.formLabel}>Due Date</Text>
            <TextInput
              style={styles.textInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
              value={form.dueDate}
              onChangeText={(t) => setForm({ ...form, dueDate: t })}
            />

            <TouchableOpacity
              style={[styles.postBtn, postMutation.isPending && styles.postBtnDisabled]}
              onPress={() => postMutation.mutate()}
              disabled={postMutation.isPending}
              activeOpacity={0.8}
            >
              {postMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="send-outline" size={18} color="#fff" />
                  <Text style={styles.postBtnText}>Post Homework</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Homework List */}
      {!showForm && (
        <FlatList
          data={homeworks}
          keyExtractor={(item, i) => item._id || item.id || String(i)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <HomeworkCard hw={item} />}
          ListEmptyComponent={
            !loadingHw && (
              <View style={styles.emptyBox}>
                <Ionicons name="book-outline" size={56} color="#D1D5DB" />
                <Text style={styles.emptyText}>No homework posted yet</Text>
                <Text style={styles.emptySubText}>Tap "New" to post the first assignment.</Text>
              </View>
            )
          }
        />
      )}

      {loadingHw && !showForm && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={NAVY} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#374151' },
  addBtn: {
    backgroundColor: NAVY,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  formContainer: { maxHeight: 520 },
  form: {
    backgroundColor: '#fff',
    margin: 12,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  formTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 14 },
  formLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6, marginTop: 10 },
  chipRow: { marginBottom: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: { backgroundColor: '#EEF2FF', borderColor: NAVY },
  chipText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  chipTextActive: { color: NAVY, fontWeight: '700' },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  textArea: { height: 90, textAlignVertical: 'top' },
  postBtn: {
    backgroundColor: NAVY,
    borderRadius: 10,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  postBtnDisabled: { opacity: 0.7 },
  postBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  listContent: { padding: 12, paddingBottom: 24 },
  hwCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: NAVY,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  hwCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  hwSubjectBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  hwSubjectText: { fontSize: 11, fontWeight: '700', color: NAVY },
  hwDue: { fontSize: 12, color: '#6B7280' },
  hwTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  hwClass: { fontSize: 12, color: '#6B7280' },
  emptyBox: { alignItems: 'center', padding: 40, gap: 10 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#6B7280', textAlign: 'center' },
  emptySubText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
