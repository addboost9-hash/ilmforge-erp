import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
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

function InvoiceCard({ invoice, onMarkPaid }) {
  const isPaid = invoice.status === 'paid' || invoice.isPaid;
  const amount = invoice.amount || invoice.totalAmount || 0;
  const month = invoice.month || invoice.period || invoice.description || 'N/A';

  return (
    <View style={[styles.invoiceCard, isPaid && styles.invoiceCardPaid]}>
      <View style={styles.invoiceTop}>
        <View>
          <Text style={styles.invoiceMonth}>{month}</Text>
          <Text style={styles.invoiceId}>#{invoice._id?.slice(-6) || invoice.id?.slice(-6) || 'N/A'}</Text>
        </View>
        <View style={styles.invoiceAmountBlock}>
          <Text style={styles.invoiceAmount}>Rs {Number(amount).toLocaleString()}</Text>
          <View style={[styles.invoiceStatus, { backgroundColor: isPaid ? '#D1FAE5' : '#FEF3C7' }]}>
            <Text style={[styles.invoiceStatusText, { color: isPaid ? '#059669' : '#D97706' }]}>
              {isPaid ? 'Paid' : 'Pending'}
            </Text>
          </View>
        </View>
      </View>

      {invoice.dueDate && (
        <Text style={styles.invoiceDue}>
          Due: {new Date(invoice.dueDate).toLocaleDateString('en-PK')}
        </Text>
      )}

      {!isPaid && (
        <TouchableOpacity
          style={styles.payBtn}
          onPress={() => onMarkPaid(invoice)}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
          <Text style={styles.payBtnText}>Mark as Paid</Text>
        </TouchableOpacity>
      )}

      {isPaid && invoice.paidAt && (
        <Text style={styles.paidDate}>
          Paid on: {new Date(invoice.paidAt).toLocaleDateString('en-PK')}
        </Text>
      )}
    </View>
  );
}

export default function FeesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const { data: studentResults, isLoading: searching, refetch: searchStudents } = useQuery({
    queryKey: ['student-search', searchQuery],
    queryFn: async () => {
      const res = await api.get('/students', {
        params: { search: searchQuery, limit: 10 },
      });
      return res.data?.data || res.data;
    },
    enabled: false,
  });

  const students = Array.isArray(studentResults)
    ? studentResults
    : studentResults?.students || studentResults?.data || studentResults?.items || [];

  const { data: invoicesData, isLoading: loadingInvoices, refetch: refetchInvoices } = useQuery({
    queryKey: ['student-invoices', selectedStudent?._id || selectedStudent?.id],
    queryFn: async () => {
      const id = selectedStudent._id || selectedStudent.id;
      const res = await api.get(`/fees/student/${id}`);
      return res.data?.data || res.data;
    },
    enabled: !!selectedStudent,
  });

  const invoices = Array.isArray(invoicesData)
    ? invoicesData
    : invoicesData?.invoices || invoicesData?.fees || invoicesData?.data || [];

  const payMutation = useMutation({
    mutationFn: async (invoice) => {
      const id = invoice._id || invoice.id;
      const res = await api.patch(`/fees/${id}/pay`, { paymentMethod: 'cash' });
      return res.data;
    },
    onSuccess: () => {
      Alert.alert('Success', 'Fee marked as paid successfully!');
      refetchInvoices();
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to mark fee as paid.';
      Alert.alert('Error', msg);
    },
  });

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      Alert.alert('Search', 'Please enter a student name or roll number.');
      return;
    }
    setHasSearched(true);
    searchStudents();
  };

  const handleMarkPaid = (invoice) => {
    Alert.alert(
      'Confirm Payment',
      `Mark fee of Rs ${Number(invoice.amount || 0).toLocaleString()} as paid?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => payMutation.mutate(invoice) },
      ]
    );
  };

  const totalPending = invoices
    .filter((inv) => inv.status !== 'paid' && !inv.isPaid)
    .reduce((sum, inv) => sum + (inv.amount || inv.totalAmount || 0), 0);

  const totalPaid = invoices
    .filter((inv) => inv.status === 'paid' || inv.isPaid)
    .reduce((sum, inv) => sum + (inv.amount || inv.totalAmount || 0), 0);

  return (
    <View style={styles.container}>
      {/* Search Section */}
      <View style={styles.searchSection}>
        <Text style={styles.searchTitle}>Find Student</Text>
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <Ionicons name="search-outline" size={18} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Name or roll number…"
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} activeOpacity={0.8}>
            {searching ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.searchBtnText}>Search</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Results */}
      {hasSearched && !searching && students.length > 0 && !selectedStudent && (
        <View style={styles.resultsDropdown}>
          <Text style={styles.resultsTitle}>Select Student</Text>
          <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled>
            {students.map((s, i) => (
              <TouchableOpacity
                key={s._id || s.id || i}
                style={styles.resultItem}
                onPress={() => {
                  setSelectedStudent(s);
                  setHasSearched(false);
                }}
              >
                <View style={styles.resultAvatar}>
                  <Text style={styles.resultAvatarText}>
                    {(s.name || s.fullName || 'S')[0].toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={styles.resultName}>
                    {s.name || s.fullName || `${s.firstName || ''} ${s.lastName || ''}`}
                  </Text>
                  <Text style={styles.resultMeta}>
                    Roll #{s.rollNo || s.rollNumber || 'N/A'} •{' '}
                    {s.class?.name || s.className || 'N/A'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {hasSearched && !searching && students.length === 0 && (
        <View style={styles.noResult}>
          <Text style={styles.noResultText}>No students found for "{searchQuery}"</Text>
        </View>
      )}

      {/* Selected Student */}
      {selectedStudent && (
        <View style={styles.selectedStudent}>
          <View style={styles.selectedInfo}>
            <View style={styles.selectedAvatar}>
              <Text style={styles.selectedAvatarText}>
                {(selectedStudent.name || selectedStudent.fullName || 'S')[0].toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.selectedName}>
                {selectedStudent.name ||
                  selectedStudent.fullName ||
                  `${selectedStudent.firstName || ''} ${selectedStudent.lastName || ''}`}
              </Text>
              <Text style={styles.selectedMeta}>
                Roll #{selectedStudent.rollNo || selectedStudent.rollNumber || 'N/A'} •{' '}
                {selectedStudent.class?.name || selectedStudent.className || 'N/A'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => {
              setSelectedStudent(null);
              setSearchQuery('');
            }}
          >
            <Ionicons name="close-circle" size={24} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Fee Summary */}
      {selectedStudent && !loadingInvoices && invoices.length > 0 && (
        <View style={styles.feeSummary}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardLabel}>Pending</Text>
            <Text style={[styles.summaryCardValue, { color: '#DC2626' }]}>
              Rs {Number(totalPending).toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardLabel}>Paid</Text>
            <Text style={[styles.summaryCardValue, { color: '#059669' }]}>
              Rs {Number(totalPaid).toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardLabel}>Invoices</Text>
            <Text style={styles.summaryCardValue}>{invoices.length}</Text>
          </View>
        </View>
      )}

      {/* Loading invoices */}
      {loadingInvoices && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={NAVY} />
          <Text style={styles.loadingText}>Loading invoices…</Text>
        </View>
      )}

      {/* Invoices List */}
      {selectedStudent && !loadingInvoices && (
        <FlatList
          data={invoices}
          keyExtractor={(item, i) => item._id || item.id || String(i)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <InvoiceCard invoice={item} onMarkPaid={handleMarkPaid} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="receipt-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No fee invoices found</Text>
            </View>
          }
        />
      )}

      {/* Initial Prompt */}
      {!selectedStudent && !hasSearched && (
        <View style={styles.promptBox}>
          <Ionicons name="search-circle-outline" size={64} color="#D1D5DB" />
          <Text style={styles.promptText}>Search for a student to view their fee invoices</Text>
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
  searchSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: '#F9FAFB',
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: '#111827',
  },
  searchBtn: {
    backgroundColor: NAVY,
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    height: 44,
  },
  searchBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  resultsDropdown: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  resultsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    padding: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  resultAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: NAVY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultAvatarText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  resultMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  noResult: {
    margin: 12,
    padding: 14,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    alignItems: 'center',
  },
  noResultText: {
    color: '#D97706',
    fontWeight: '600',
    fontSize: 13,
  },
  selectedStudent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EEF2FF',
    margin: 12,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  selectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectedAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: NAVY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedAvatarText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  selectedName: {
    fontSize: 15,
    fontWeight: '700',
    color: NAVY,
  },
  selectedMeta: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
  },
  feeSummary: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
  },
  summaryCardLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryCardValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
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
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  invoiceCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  invoiceCardPaid: {
    borderLeftColor: '#059669',
  },
  invoiceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  invoiceMonth: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  invoiceId: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  invoiceAmountBlock: {
    alignItems: 'flex-end',
    gap: 4,
  },
  invoiceAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  invoiceStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  invoiceStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  invoiceDue: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 10,
  },
  payBtn: {
    backgroundColor: NAVY,
    borderRadius: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  payBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  paidDate: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  promptBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 40,
  },
  promptText: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 22,
  },
  emptyBox: {
    alignItems: 'center',
    padding: 40,
    gap: 10,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
});
