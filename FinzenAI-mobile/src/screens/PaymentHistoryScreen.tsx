import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import { Payment } from '../types/subscription';

interface PaymentHistoryScreenProps {
  onClose: () => void;
}

const PaymentHistoryScreen: React.FC<PaymentHistoryScreenProps> = ({ onClose }) => {
  const { payments, loading, fetchPayments } = useSubscriptionStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    await fetchPayments(20);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPayments();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCEEDED':
        return '#10B981';
      case 'FAILED':
        return '#EF4444';
      case 'PENDING':
        return '#F59E0B';
      case 'REFUNDED':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCEEDED':
        return 'checkmark-circle';
      case 'FAILED':
        return 'close-circle';
      case 'PENDING':
        return 'time';
      case 'REFUNDED':
        return 'return-up-back';
      default:
        return 'help-circle';
    }
  };

  const renderPaymentItem = ({ item }: { item: Payment }) => (
    <View style={styles.paymentCard}>
      <View style={styles.paymentHeader}>
        <View style={styles.paymentLeft}>
          <Ionicons
            name={getStatusIcon(item.status) as any}
            size={24}
            color={getStatusColor(item.status)}
          />
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentDescription}>
              {item.description || 'Payment for subscription'}
            </Text>
            <Text style={styles.paymentDate}>
              {formatDate(item.createdAt)} • {formatTime(item.createdAt)}
            </Text>
          </View>
        </View>
        <View style={styles.paymentRight}>
          <Text style={styles.paymentAmount}>
            ${item.amount.toFixed(2)}
          </Text>
          <Text style={styles.paymentCurrency}>{item.currency.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.paymentFooter}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: `${getStatusColor(item.status)}15` },
          ]}
        >
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>

        {item.stripeInvoiceId && (
          <Text style={styles.invoiceId}>
            Invoice: {item.stripeInvoiceId.substring(0, 20)}...
          </Text>
        )}
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No Payments Yet</Text>
      <Text style={styles.emptySubtitle}>
        Your payment history will appear here once you subscribe
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment History</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      {loading && payments.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C47FF" />
          <Text style={styles.loadingText}>Loading payments...</Text>
        </View>
      ) : (
        <FlatList
          data={payments}
          renderItem={renderPaymentItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  paymentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  paymentLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  paymentDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  paymentRight: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  paymentCurrency: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  paymentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  invoiceId: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
});

export default PaymentHistoryScreen;
