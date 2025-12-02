import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Subscription } from '../../types/subscription';

interface CurrentPlanCardProps {
  subscription: Subscription;
  onManage: () => void;
  onViewPayments: () => void;
}

const CurrentPlanCard: React.FC<CurrentPlanCardProps> = ({
  subscription,
  onManage,
  onViewPayments,
}) => {
  const isPremium = subscription.plan === 'PREMIUM';
  const isPro = subscription.plan === 'PRO';
  const isFree = subscription.plan === 'FREE';

  const getColors = () => {
    if (isPro) return { primary: '#8B5CF6', secondary: '#F3EEFF', icon: '💎' };
    if (isPremium) return { primary: '#F59E0B', secondary: '#FEF3C7', icon: '👑' };
    return { primary: '#6B7280', secondary: '#F3F4F6', icon: '🆓' };
  };

  const colors = getColors();

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.secondary }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.icon}>{colors.icon}</Text>
          <View>
            <Text style={styles.label}>Current Plan</Text>
            <Text style={[styles.planName, { color: colors.primary }]}>
              {subscription.planDetails.name}
            </Text>
          </View>
        </View>
        {!isFree && (
          <View style={[styles.statusBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.statusText}>{subscription.status}</Text>
          </View>
        )}
      </View>

      {/* Price */}
      {!isFree && (
        <View style={styles.priceContainer}>
          <Text style={styles.price}>
            ${subscription.planDetails.price.toFixed(2)}
          </Text>
          <Text style={styles.period}>/month</Text>
        </View>
      )}

      {/* Subscription Info */}
      {!isFree && subscription.currentPeriodEnd && (
        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text style={styles.infoLabel}>Next billing date:</Text>
            <Text style={styles.infoValue}>
              {formatDate(subscription.currentPeriodEnd)}
            </Text>
          </View>

          {subscription.cancelAtPeriodEnd && (
            <View style={styles.warningBox}>
              <Ionicons name="warning-outline" size={18} color="#F59E0B" />
              <Text style={styles.warningText}>
                Your subscription will end on {formatDate(subscription.currentPeriodEnd)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Limits Summary */}
      <View style={styles.limitsContainer}>
        <Text style={styles.limitsTitle}>Your Limits:</Text>
        <View style={styles.limitsGrid}>
          <View style={styles.limitItem}>
            <Ionicons name="wallet" size={18} color={colors.primary} />
            <Text style={styles.limitText}>
              {subscription.limits.budgets === -1 ? '∞' : subscription.limits.budgets} Budgets
            </Text>
          </View>
          <View style={styles.limitItem}>
            <Ionicons name="trophy" size={18} color={colors.primary} />
            <Text style={styles.limitText}>
              {subscription.limits.goals === -1 ? '∞' : subscription.limits.goals} Goals
            </Text>
          </View>
          <View style={styles.limitItem}>
            <Ionicons name="chatbubble-ellipses" size={18} color={colors.primary} />
            <Text style={styles.limitText}>
              {subscription.limits.zenioQueries === -1 ? '∞' : subscription.limits.zenioQueries} Zenio
            </Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {!isFree && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, { borderColor: colors.primary }]}
              onPress={onManage}
            >
              <Ionicons name="settings-outline" size={18} color={colors.primary} />
              <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                Manage Subscription
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { borderColor: colors.primary }]}
              onPress={onViewPayments}
            >
              <Ionicons name="receipt-outline" size={18} color={colors.primary} />
              <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                Payment History
              </Text>
            </TouchableOpacity>
          </>
        )}

        {isFree && (
          <Text style={styles.freeMessage}>
            Upgrade to unlock unlimited access and premium features
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    fontSize: 32,
  },
  label: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  price: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
  },
  period: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  infoContainer: {
    marginBottom: 16,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  limitsContainer: {
    marginBottom: 16,
  },
  limitsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  limitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  limitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  limitText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  actions: {
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  freeMessage: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});

export default CurrentPlanCard;
