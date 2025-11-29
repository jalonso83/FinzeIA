import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { Subscription } from '../../types/subscription';

interface ManageSubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
  subscription: Subscription;
}

const ManageSubscriptionModal: React.FC<ManageSubscriptionModalProps> = ({
  visible,
  onClose,
  subscription,
}) => {
  const { cancelSubscription, reactivateSubscription, changePlan } = useSubscriptionStore();
  const [loading, setLoading] = useState(false);

  const isPremium = subscription.plan === 'PREMIUM';
  const isPro = subscription.plan === 'PRO';
  const isCanceled = subscription.cancelAtPeriodEnd;

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancel Subscription',
      `Are you sure you want to cancel your ${subscription.plan} subscription?\n\nYou'll continue to have access until ${new Date(subscription.currentPeriodEnd!).toLocaleDateString('es-ES')}.`,
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await cancelSubscription();
              Alert.alert(
                'Subscription Canceled',
                'Your subscription has been canceled. You will have access until the end of the billing period.'
              );
              onClose();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Could not cancel subscription');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleReactivateSubscription = async () => {
    setLoading(true);
    try {
      await reactivateSubscription();
      Alert.alert(
        'Subscription Reactivated',
        'Your subscription has been reactivated successfully!'
      );
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Could not reactivate subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePlan = () => {
    const targetPlan = isPremium ? 'PRO' : 'PREMIUM';
    const targetPrice = isPremium ? '$19.99' : '$9.99';

    Alert.alert(
      'Change Plan',
      `Do you want to ${isPremium ? 'upgrade' : 'downgrade'} to ${targetPlan}?\n\nNew price: ${targetPrice}/month\n\nThe change will be prorated and applied immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Change Plan',
          onPress: async () => {
            setLoading(true);
            try {
              await changePlan(targetPlan);
              Alert.alert(
                'Plan Changed',
                `Your plan has been changed to ${targetPlan} successfully!`
              );
              onClose();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Could not change plan');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Subscription</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          {/* Current Plan Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Plan</Text>
            <View style={styles.planBox}>
              <View style={styles.planHeader}>
                <Text style={styles.planName}>{subscription.plan}</Text>
                <Text style={styles.planPrice}>
                  ${subscription.planDetails.price.toFixed(2)}/month
                </Text>
              </View>
              <Text style={styles.planStatus}>
                Status: {subscription.status}
                {isCanceled && ' (Canceling at period end)'}
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions</Text>

            {/* Change Plan */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleChangePlan}
              disabled={loading || isCanceled}
            >
              <View style={styles.actionLeft}>
                <Ionicons name="swap-horizontal" size={24} color="#6C47FF" />
                <View>
                  <Text style={styles.actionTitle}>
                    {isPremium ? 'Upgrade to Pro' : 'Downgrade to Premium'}
                  </Text>
                  <Text style={styles.actionSubtitle}>
                    {isPremium ? '$19.99/month' : '$9.99/month'} • Prorated billing
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Reactivate or Cancel */}
            {isCanceled ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.reactivateButton]}
                onPress={handleReactivateSubscription}
                disabled={loading}
              >
                <View style={styles.actionLeft}>
                  <Ionicons name="refresh" size={24} color="#10B981" />
                  <View>
                    <Text style={[styles.actionTitle, { color: '#10B981' }]}>
                      Reactivate Subscription
                    </Text>
                    <Text style={styles.actionSubtitle}>
                      Resume your subscription now
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={handleCancelSubscription}
                disabled={loading}
              >
                <View style={styles.actionLeft}>
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                  <View>
                    <Text style={[styles.actionTitle, { color: '#EF4444' }]}>
                      Cancel Subscription
                    </Text>
                    <Text style={styles.actionSubtitle}>
                      Access until {new Date(subscription.currentPeriodEnd!).toLocaleDateString('es-ES')}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Info */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#6C47FF" />
            <Text style={styles.infoText}>
              Changes to your subscription take effect immediately. You can cancel
              at any time and will have access until the end of your billing period.
            </Text>
          </View>
        </ScrollView>

        {/* Loading Overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#6C47FF" />
              <Text style={styles.loadingText}>Processing...</Text>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
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
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: 36,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  planBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  planPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C47FF',
  },
  planStatus: {
    fontSize: 13,
    color: '#6B7280',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  reactivateButton: {
    borderColor: '#10B981',
    borderWidth: 1.5,
  },
  cancelButton: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#EEF2FF',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#6C47FF',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
});

export default ManageSubscriptionModal;
