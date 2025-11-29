import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import PlanCard from '../components/subscriptions/PlanCard';
import CurrentPlanCard from '../components/subscriptions/CurrentPlanCard';
import StripeWebView from '../components/subscriptions/StripeWebView';
import ManageSubscriptionModal from '../components/subscriptions/ManageSubscriptionModal';
import PaymentHistoryScreen from './PaymentHistoryScreen';
import { SubscriptionPlan } from '../types/subscription';

const SubscriptionsScreen = () => {
  const {
    subscription,
    plans,
    loading,
    error,
    fetchSubscription,
    fetchPlans,
    createCheckout,
  } = useSubscriptionStore();

  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [showWebView, setShowWebView] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [processingPlan, setProcessingPlan] = useState<SubscriptionPlan | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([
      fetchSubscription(),
      fetchPlans(),
    ]);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSelectPlan = async (planId: SubscriptionPlan) => {
    if (planId === 'FREE') {
      Alert.alert('Info', 'You are already on the Free plan');
      return;
    }

    // Si ya tiene este plan, no hacer nada
    if (subscription && subscription.plan === planId) {
      Alert.alert('Info', `You already have the ${planId} plan`);
      return;
    }

    // Obtener información del plan
    const selectedPlan = plans.find(p => p.id === planId);
    if (!selectedPlan) return;

    // Confirmación de pago real
    Alert.alert(
      'Confirm Subscription',
      `You are about to subscribe to ${selectedPlan.name} for $${selectedPlan.price.toFixed(2)}/month.\n\n• 7 days free trial\n• Real credit card required\n• Charges apply after trial period\n• Cancel anytime\n\nDo you want to continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue to Payment',
          onPress: () => processCheckout(planId),
        },
      ]
    );
  };

  const processCheckout = async (planId: SubscriptionPlan) => {
    setProcessingPlan(planId);

    try {
      const { url, sessionId } = await createCheckout(planId);
      console.log('Checkout session created:', sessionId);
      setCheckoutUrl(url);
      setShowWebView(true);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Could not create payment session'
      );
    } finally {
      setProcessingPlan(null);
    }
  };

  const handlePaymentSuccess = async () => {
    setShowWebView(false);
    setCheckoutUrl(null);

    Alert.alert(
      'Success!',
      'Your subscription has been activated. Thank you!',
      [
        {
          text: 'OK',
          onPress: async () => {
            // Refrescar suscripción para ver el nuevo plan
            await fetchSubscription();
          },
        },
      ]
    );
  };

  const handlePaymentCancel = () => {
    setShowWebView(false);
    setCheckoutUrl(null);
    Alert.alert(
      'Payment Canceled',
      'You can upgrade anytime from your profile.'
    );
  };

  const handleCloseWebView = () => {
    Alert.alert(
      'Close Payment',
      'Are you sure you want to cancel this payment?',
      [
        { text: 'Continue Payment', style: 'cancel' },
        {
          text: 'Cancel Payment',
          style: 'destructive',
          onPress: () => {
            setShowWebView(false);
            setCheckoutUrl(null);
          },
        },
      ]
    );
  };

  const handleManageClose = async () => {
    setShowManageModal(false);
    // Refrescar suscripción después de gestionar
    await fetchSubscription();
  };

  if (loading && !subscription && plans.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C47FF" />
          <Text style={styles.loadingText}>Loading plans...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isFree = !subscription || subscription.plan === 'FREE';
  const isPaidPlan = subscription && (subscription.plan === 'PREMIUM' || subscription.plan === 'PRO');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {isFree ? 'Choose Your Plan' : 'Your Subscription'}
          </Text>
          <Text style={styles.subtitle}>
            {isFree
              ? 'Unlock premium features and unlimited access'
              : 'Manage your subscription and billing'}
          </Text>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Current Plan Card (only for paid plans) */}
        {isPaidPlan && subscription && (
          <CurrentPlanCard
            subscription={subscription}
            onManage={() => setShowManageModal(true)}
            onViewPayments={() => setShowPaymentHistory(true)}
          />
        )}

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {isFree ? 'Available Plans' : 'Other Plans'}
          </Text>
          {!isFree && (
            <Text style={styles.sectionSubtitle}>
              Switch plans anytime
            </Text>
          )}
        </View>

        {/* Plans */}
        <View style={styles.plansContainer}>
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currentPlan={subscription?.plan || 'FREE'}
              onSelect={handleSelectPlan}
              disabled={processingPlan !== null}
            />
          ))}
        </View>

        {/* Footer Info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            • All plans include 7-day free trial{'\n'}
            • Cancel anytime, no questions asked{'\n'}
            • Secure payment powered by Stripe{'\n'}
            • Instant access after subscription
          </Text>
        </View>
      </ScrollView>

      {/* Stripe WebView */}
      {checkoutUrl && (
        <StripeWebView
          visible={showWebView}
          checkoutUrl={checkoutUrl}
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
          onClose={handleCloseWebView}
        />
      )}

      {/* Manage Subscription Modal */}
      {isPaidPlan && subscription && (
        <ManageSubscriptionModal
          visible={showManageModal}
          onClose={handleManageClose}
          subscription={subscription}
        />
      )}

      {/* Payment History Modal */}
      <Modal
        visible={showPaymentHistory}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPaymentHistory(false)}
      >
        <PaymentHistoryScreen onClose={() => setShowPaymentHistory(false)} />
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 22,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 14,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  plansContainer: {
    marginBottom: 24,
  },
  footer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
  },
});

export default SubscriptionsScreen;
