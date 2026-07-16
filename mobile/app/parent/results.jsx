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

const GRADE_COLORS = {
  'A+': { bg: '#D1FAE5', text: '#059669' },
  A: { bg: '#D1FAE5', text: '#059669' },
  'A-': { bg: '#D1FAE5', text: '#059669' },
  B: { bg: '#DBEAFE', text: '#1D4ED8' },
  'B+': { bg: '#DBEAFE', text: '#1D4ED8' },
  C: { bg: '#FEF3C7', text: '#D97706' },
  D: { bg: '#FEE2E2', text: '#DC2626' },
  F: { bg: '#FEE2E2', text: '#DC2626' },
};

function getGradeStyle(grade) {
  return GRADE_COLORS[grade] || { bg: '#F3F4F6', text: '#374151' };
}

function SubjectRow({ subject }) {
  const marks = subject.marks || subject.obtainedMarks || subject.score || 0;
  const total = subject.totalMarks || subject.maxMarks || subject.outOf || 100;
  const grade = subject.grade || subject.letterGrade || '';
  const percentage = total > 0 ? Math.round((marks / total) * 100) : 0;
  const gradeStyle = getGradeStyle(grade);
  const name = subject.subject?.name || subject.subjectName || subject.name || 'Subject';

  return (
    <View style={styles.subjectRow}>
      <View style={styles.subjectLeft}>
        <Text style={styles.subjectName}>{name}</Text>
        <Text style={styles.subjectMarks}>
          {marks} / {total}
        </Text>
      </View>
      <View style={styles.subjectRight}>
        <View style={styles.percentageBar}>
          <View style={[styles.percentageFill, { width: `${percentage}%`, backgroundColor: percentage >= 80 ? '#059669' : percentage >= 60 ? '#D97706' : '#DC2626' }]} />
        </View>
        <Text style={styles.percentageText}>{percentage}%</Text>
      </View>
      {grade && (
        <View style={[styles.gradeBadge, { backgroundColor: gradeStyle.bg }]}>
          <Text style={[styles.gradeText, { color: gradeStyle.text }]}>{grade}</Text>
        </View>
      )}
    </View>
  );
}

function ExamCard({ exam }) {
  const [expanded, setExpanded] = useState(false);
  const subjects = exam.subjects || exam.results || exam.marks || [];
  const totalMarks = subjects.reduce((s, sub) => s + (sub.marks || sub.obtainedMarks || sub.score || 0), 0);
  const maxMarks = subjects.reduce((s, sub) => s + (sub.totalMarks || sub.maxMarks || sub.outOf || 100), 0);
  const percentage = maxMarks > 0 ? Math.round((totalMarks / maxMarks) * 100) : 0;

  return (
    <View style={styles.examCard}>
      <TouchableOpacity
        style={styles.examHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.examHeaderLeft}>
          <View style={[styles.examIcon, { backgroundColor: '#EEF2FF' }]}>
            <Ionicons name="document-text-outline" size={20} color={NAVY} />
          </View>
          <View>
            <Text style={styles.examName}>
              {exam.examName || exam.name || exam.title || 'Exam'}
            </Text>
            <Text style={styles.examDate}>
              {exam.date
                ? new Date(exam.date).toLocaleDateString('en-PK')
                : exam.term || exam.semester || 'N/A'}
            </Text>
          </View>
        </View>
        <View style={styles.examHeaderRight}>
          <Text style={styles.examPercentage}>{percentage}%</Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color="#6B7280"
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.examBody}>
          {subjects.length === 0 ? (
            <Text style={styles.noSubjects}>No subject marks available.</Text>
          ) : (
            subjects.map((sub, i) => (
              <SubjectRow key={sub._id || sub.subjectId || i} subject={sub} />
            ))
          )}
          {subjects.length > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {totalMarks} / {maxMarks} ({percentage}%)
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function ParentResults() {
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

  const { data: resultsData, isLoading, error, refetch } = useQuery({
    queryKey: ['child-results', activeChildId],
    queryFn: async () => {
      const res = await api.get(`/results/student/${activeChildId}`);
      return res.data?.data || res.data;
    },
    enabled: !!activeChildId,
  });

  const results = Array.isArray(resultsData)
    ? resultsData
    : resultsData?.results || resultsData?.exams || resultsData?.data || [];

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

      {/* Loading */}
      {isLoading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={NAVY} />
          <Text style={styles.loadingText}>Loading results…</Text>
        </View>
      )}

      {/* Error */}
      {error && !isLoading && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={24} color="#DC2626" />
          <Text style={styles.errorText}>Could not load results.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Results List */}
      {!isLoading && results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item, i) => item._id || item.id || String(i)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <ExamCard exam={item} />}
        />
      )}

      {/* Empty */}
      {!isLoading && !error && results.length === 0 && (
        <View style={styles.emptyBox}>
          <Ionicons name="ribbon-outline" size={56} color="#D1D5DB" />
          <Text style={styles.emptyText}>No results available yet</Text>
          <Text style={styles.emptySubText}>
            Results will appear here after exams are entered by teachers.
          </Text>
        </View>
      )}

      {/* No children */}
      {!activeChildId && !isLoading && (
        <View style={styles.emptyBox}>
          <Ionicons name="people-outline" size={56} color="#D1D5DB" />
          <Text style={styles.emptyText}>No children linked</Text>
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
  listContent: {
    padding: 12,
    paddingBottom: 24,
  },
  examCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  examHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  examIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  examName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  examDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  examHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  examPercentage: {
    fontSize: 16,
    fontWeight: '800',
    color: NAVY,
  },
  examBody: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    padding: 14,
    paddingTop: 10,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
    gap: 8,
  },
  subjectLeft: {
    width: 130,
  },
  subjectName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  subjectMarks: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  subjectRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  percentageBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  percentageFill: {
    height: '100%',
    borderRadius: 3,
  },
  percentageText: {
    fontSize: 12,
    color: '#6B7280',
    width: 36,
    textAlign: 'right',
  },
  gradeBadge: {
    width: 36,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  noSubjects: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: NAVY,
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
