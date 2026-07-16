import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../src/api/client';

const NAVY = '#1B2F6E';

const STATUS_OPTIONS = [
  { key: 'P', label: 'Present', color: '#059669', bg: '#D1FAE5' },
  { key: 'A', label: 'Absent', color: '#DC2626', bg: '#FEE2E2' },
  { key: 'L', label: 'Leave', color: '#D97706', bg: '#FEF3C7' },
  { key: 'Lt', label: 'Late', color: '#7C3AED', bg: '#EDE9FE' },
];

function getToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function TeacherAttendance() {
  const [selectedClass, setSelectedClass] = useState(null);
  const [date] = useState(getToday);
  const [attendance, setAttendance] = useState({});
  const [showClassPicker, setShowClassPicker] = useState(false);

  // Load teacher's assigned classes
  const { data: classesData, isLoading: classesLoading } = useQuery({
    queryKey: ['teacher-classes'],
    queryFn: async () => {
      const res = await api.get('/teacher/classes');
      return res.data?.data || res.data;
    },
  });

  const classes = Array.isArray(classesData)
    ? classesData
    : classesData?.classes || classesData?.data || [];

  // Load students for selected class
  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ['students-class', selectedClass],
    queryFn: async () => {
      const res = await api.get('/students', {
        params: { classId: selectedClass, limit: 200 },
      });
      return res.data?.data || res.data;
    },
    enabled: !!selectedClass,
    onSuccess: (data) => {
      const list = Array.isArray(data)
        ? data
        : data?.students || data?.data || data?.items || [];
      const init = {};
      list.forEach((s) => {
        const id = s._id || s.id;
        if (!attendance[id]) init[id] = 'P';
      });
      setAttendance((prev) => ({ ...init, ...prev }));
    },
  });

  const students = Array.isArray(studentsData)
    ? studentsData
    : studentsData?.students || studentsData?.data || studentsData?.items || [];

  const setStatus = (studentId, status) => {
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
  };

  const markAll = (status) => {
    const all = {};
    students.forEach((s) => {
      all[s._id || s.id] = status;
    });
    setAttendance(all);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const records = students.map((s) => ({
        studentId: s._id || s.id,
        status: attendance[s._id || s.id] || 'P',
      }));
      const res = await api.post('/attendance/save', {
        classId: selectedClass,
        date,
        records,
      });
      return res.data;
    },
    onSuccess: () => {
      Alert.alert('Saved!', 'Attendance saved and parents notified.');
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to save attendance.';
      Alert.alert('Error', msg);
    },
  });

  const summary = {
    P: students.filter((s) => attendance[s._id || s.id] === 'P').length,
    A: students.filter((s) => attendance[s._id || s.id] === 'A').length,
    L: students.filter((s) => attendance[s._id || s.id] === 'L').length,
    Lt: students.filter((s) => attendance[s._id || s.id] === 'Lt').length,
  };

  return (
    <View style={styles.container}>
      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.classPicker}
          onPress={() => setShowClassPicker(!showClassPicker)}
          activeOpacity={0.7}
        >
          <Ionicons name="school-outline" size={18} color={NAVY} />
          <Text style={styles.classPickerText}>
            {selectedClass
              ? classes.find((c) => (c._id || c.id) === selectedClass)?.name ||
                classes.find((c) => (c._id || c.id) === selectedClass)?.className ||
                'Selected'
              : 'Select My Class'}
          </Text>
          <Ionicons name={showClassPicker ? 'chevron-up' : 'chevron-down'} size={16} color={NAVY} />
        </TouchableOpacity>
        <View style={styles.dateDisplay}>
          <Ionicons name="today-outline" size={16} color="#6B7280" />
          <Text style={styles.dateText}>Today</Text>
        </View>
      </View>

      {/* Dropdown */}
      {showClassPicker && (
        <View style={styles.dropdown}>
          {classesLoading ? (
            <ActivityIndicator size="small" color={NAVY} style={{ padding: 12 }} />
          ) : classes.length === 0 ? (
            <Text style={styles.dropdownEmpty}>No classes assigned to you</Text>
          ) : (
            <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
              {classes.map((cls) => (
                <TouchableOpacity
                  key={cls._id || cls.id}
                  style={[
                    styles.dropdownItem,
                    selectedClass === (cls._id || cls.id) && styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    setSelectedClass(cls._id || cls.id);
                    setAttendance({});
                    setShowClassPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      selectedClass === (cls._id || cls.id) && { color: NAVY, fontWeight: '700' },
                    ]}
                  >
                    {cls.name || cls.className}
                    {cls.section ? ` - ${cls.section}` : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* Mark All */}
      {selectedClass && students.length > 0 && (
        <View style={styles.markAllRow}>
          <Text style={styles.markAllLabel}>Mark all:</Text>
          {STATUS_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.markAllBtn, { backgroundColor: opt.bg, borderColor: opt.color }]}
              onPress={() => markAll(opt.key)}
            >
              <Text style={[styles.markAllBtnText, { color: opt.color }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Summary */}
      {selectedClass && students.length > 0 && (
        <View style={styles.summaryRow}>
          {STATUS_OPTIONS.map((opt) => (
            <View key={opt.key} style={[styles.summaryItem, { backgroundColor: opt.bg }]}>
              <Text style={[styles.summaryCount, { color: opt.color }]}>{summary[opt.key]}</Text>
              <Text style={[styles.summaryLabel, { color: opt.color }]}>{opt.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Prompt */}
      {!selectedClass && (
        <View style={styles.promptBox}>
          <Ionicons name="school-outline" size={48} color="#D1D5DB" />
          <Text style={styles.promptText}>Select one of your assigned classes</Text>
        </View>
      )}

      {/* Students Loading */}
      {studentsLoading && selectedClass && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={NAVY} />
          <Text style={styles.loadingText}>Loading students…</Text>
        </View>
      )}

      {/* Students List */}
      {!studentsLoading && selectedClass && (
        <FlatList
          data={students}
          keyExtractor={(item, i) => item._id || item.id || String(i)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const id = item._id || item.id;
            const current = attendance[id] || 'P';
            return (
              <View style={styles.studentRow}>
                <View style={styles.studentNum}>
                  <Text style={styles.studentNumText}>{index + 1}</Text>
                </View>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName} numberOfLines={1}>
                    {item.name || item.fullName || `${item.firstName || ''} ${item.lastName || ''}`}
                  </Text>
                  <Text style={styles.studentRoll}>
                    #{item.rollNo || item.rollNumber || item.admissionNo || 'N/A'}
                  </Text>
                </View>
                <View style={styles.statusBtns}>
                  {STATUS_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.key}
                      style={[
                        styles.statusBtn,
                        current === opt.key && {
                          backgroundColor: opt.bg,
                          borderColor: opt.color,
                        },
                      ]}
                      onPress={() => setStatus(id, opt.key)}
                    >
                      <Text
                        style={[
                          styles.statusBtnText,
                          current === opt.key && { color: opt.color, fontWeight: '800' },
                        ]}
                      >
                        {opt.key}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="people-outline" size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>No students in this class</Text>
            </View>
          }
        />
      )}

      {/* Save Button */}
      {selectedClass && students.length > 0 && (
        <View style={styles.saveContainer}>
          <TouchableOpacity
            style={[styles.saveBtn, saveMutation.isPending && styles.saveBtnDisabled]}
            onPress={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            activeOpacity={0.8}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Save Attendance</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  controls: { flexDirection: 'row', padding: 12, gap: 10, alignItems: 'center' },
  classPicker: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  classPickerText: { flex: 1, fontSize: 14, color: '#111827', fontWeight: '600' },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  dateText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  dropdown: {
    marginHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownEmpty: { padding: 12, color: '#9CA3AF', textAlign: 'center' },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dropdownItemActive: { backgroundColor: '#EEF2FF' },
  dropdownItemText: { fontSize: 14, color: '#374151' },
  markAllRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 8, gap: 6 },
  markAllLabel: { fontSize: 13, color: '#6B7280', fontWeight: '600', marginRight: 4 },
  markAllBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  markAllBtnText: { fontSize: 12, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 8 },
  summaryItem: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 8 },
  summaryCount: { fontSize: 18, fontWeight: '800' },
  summaryLabel: { fontSize: 11, fontWeight: '600' },
  listContent: { paddingHorizontal: 12, paddingBottom: 100 },
  studentRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  studentNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  studentNumText: { fontSize: 12, fontWeight: '700', color: NAVY },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  studentRoll: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  statusBtns: { flexDirection: 'row', gap: 4 },
  statusBtn: {
    width: 32, height: 32, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB',
  },
  statusBtnText: { fontSize: 11, fontWeight: '600', color: '#9CA3AF' },
  promptBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  promptText: { fontSize: 15, color: '#9CA3AF', textAlign: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 40 },
  loadingText: { color: '#6B7280', fontSize: 14 },
  emptyBox: { alignItems: 'center', padding: 40, gap: 10 },
  emptyText: { color: '#9CA3AF', fontSize: 14 },
  saveContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  saveBtn: {
    backgroundColor: NAVY, borderRadius: 12, height: 52,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
