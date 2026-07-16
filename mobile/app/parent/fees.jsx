import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SectionList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '../../src/api/client';

const NAVY = '#1B2F6E';

function FeeInvoiceRow({ invoice }) {
  const isPaid = invoice.status === 'paid' || invoice.isPaid;
  const amount = invoice.amount || invoice.totalAmount || 0;
  const month = invoice.month || invoice.period || invoice.description || 'Fee';

  return (
    <View style={[styles.invoiceRow, isPaid && styles.invoiceRowPaid]}>
      <View style={styles.invoiceLeft}>
        <View style={[styles.invoiceDot, { backgroundColor: isPaid ? '#059669' : '#F59E0B' }]} />
        <View>
          <Text style={styles.invoiceMonth}>{month}</Text>
          {invoice.dueDate && (
            <Text style={styles.invoiceDue}>
              Due: {new Date(invoice.dueDate).toLocaleDateString('en-PK')}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.invoiceRight}>
        <Text style={styles.invoiceAmount}>Rs {Number(amount).toLocaleString()}</Text>
        <View style={[styles.statusPill, { backgroundColor: isPaid ? '#D1FAE5' : '#FEF3C7' }]}>
          <Text style={[styles.statusPillText, { color: isPaid ? '#059669' : '#D97706' }]}>
            {isPaid ? 'Paid' : 'Pending'}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function ParentFees() {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['parent-fees'],
    queryFn: async () => {
      const res = await api.get('/parent/fees');
      return res.data?.data || res.data;
    },
  });

  // data might be grouped by child or flat list
  const feeData = data?.children || data?.data || data || [];
  const isGrouped = Array.isArray(feeData) && feeData[0]?.invoices;

  const sections = isGrouped
    ? feeData.map((child) => ({
        title:
          child.name ||
          child.fullName ||
          `${child.firstName || ''} ${child.lastName || ''}`.trim() ||
          'Child',
        data: child.invoices || child.fees || [],
        childId: child._id || child.id,
        totalPending: (child.invoices || child.fees || [])
          .filter((i) => i.status !== 'paid' && !i.isPaid)
          .reduce((s, i) => s + (i.amount || 0), 0),
      }))
    : [];

  const flatInvoices = !isGrouped && Array.isArray(feeData) ? feeData : [];

  const grandTotalPending = isGrouped
    ? sections.reduce((s, sec) => s + sec.totalPending, 0)
    : flatInvoices
        .filter((i) => i.status !== 'paid' && !i.isPaid)
        .reduce((s, i) => s + (i.amount || 0), 0);

  return (
    <View style={styles.container}>
      {/* Summary Banner */}
      <View style={styles.summaryBanner}>
        <View>
          <Text style={styles.summaryLabel}>Total Pending</Text>
          <Text style={styles.summaryAmount}>Rs {Number(grandTotalPending).toLocaleString()}</Text>
        </View>
        <TouchableOpacity
          style={styles.payAllBtn}
          onPress={() =>
            Alert.alert('Online Payment', 'Online payment integration coming soon.')
          }
          activeOpacity={0.8}
        >
          <Ionicons name="card-outline" size={16} color="#fff" />
          <Text style={styles.payAllBtnText}>Pay Online</Text>
        </TouchableOpacity>
      </View>

      {/* Loading */}
      {isLoading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={NAVY} />
          <Text style={styles.loadingText}>Loading fee details…</Text>
        </View>
      )}

      {/* Error */}
      {error && !isLoading && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={24} color="#DC2626" />
          <Text style={styles.errorText}>Could not load fee data.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Grouped by child */}
      {!isLoading && isGrouped && sections.length > 0 && (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => item._id || item.id || String(index)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
              {section.totalPending > 0 && (
                <Text style={styles.sectionPending}>
                  Pending: Rs {Number(section.totalPending).toLocaleString()}
                </Text>
              )}
            </View>
          )}
          renderItem={({ item }) => <FeeInvoiceRow invoice={item} />}
        />
      )}

      {/* Flat list */}
      {!isLoading && !isGrouped && flatInvoices.length > 0 && (
        <FlatList
          data={flatInvoices}
          keyExtractor={(item, i) => item._id || item.id || String(i)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <FeeInvoiceRow invoice={item} />}
        />
      )}

      {/* Empty */}
      {!isLoading && !error && (isGrouped ? sections.length === 0 : flatInvoices.length === 0) && (
        <View style={styles.emptyBox}>
          <Ionicons name="receipt-outline" size={56} color="#D1D5DB" />
          <Text style={styles.emptyText}>No fee records found</Text>
          <Text style={styles.emptySubText}>Contact school for fee details.</Text>
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
  summaryBanner: {
    backgroundColor: NAVY,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#A5B4FC',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryAmount: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 4,
  },
  payAllBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  payAllBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  sectionHeaderText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  sectionPending: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  invoiceRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  invoiceRowPaid: {
    borderLeftColor: '#059669',
  },
  invoiceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  invoiceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  invoiceMonth: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  invoiceDue: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  invoiceRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  invoiceAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  statusPillText: {
    fontSize: 11,
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
  },
  emptySubText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
