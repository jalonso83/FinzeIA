import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import StripeWebView from './StripeWebView';

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  limitType: 'budgets' | 'goals' | 'zenio';
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({
  visible,
  onClose,
  limitType,
}) => {
  const { createCheckout } = useSubscriptionStore();
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [showWebView, setShowWebView] = useState(false);
  const [loading, setLoading] = useState(false);

  const getLimitInfo = () => {
    switch (limitType) {
      case 'budgets':
        return {
          icon: 'wallet',
          title: 'Budget Limit Reached',
          description: 'You have reached the maximum of 3 budgets on the Free plan.',
          freeCurrent: '3/3',
          premiumLimit: 'Unlimited',
        };
      case 'goals':
        return {
          icon: 'trophy',
          title: 'Goal Limit Reached',
          description: 'You have reached the maximum of 2 goals on the Free plan.',
          freeCurrent: '2/2',
          premiumLimit: 'Unlimited',
        };
      case 'zenio':
        return {
          icon: 'chatbubble-ellipses',
          title: 'Zenio Queries Limit Reached',
          description: 'You have used all 10 Zenio AI queries for this month.',
          freeCurrent: '10/10',
          premiumLimit: 'Unlimited',
        };
      default:
        return {
          icon: 'lock-closed',
          title: 'Limit Reached',
          description: 'You have reached your plan limit.',
          freeCurrent: 'Max',
          premiumLimit: 'Unlimited',
        };
    }
  };

  const limitInfo = getLimitInfo();

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const { url } = await createCheckout('PREMIUM');
      setCheckoutUrl(url);
      setShowWebView(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Could not create payment session');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowWebView(false);
    setCheckoutUrl(null);
    onClose();

    Alert.alert(
      'Success!',
      'You are now a Premium member! Enjoy unlimited access.',
      [{ text: 'OK' }]
    );
  };

  const handlePaymentCancel = () => {
    setShowWebView(false);
    setCheckoutUrl(null);
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

  return (
    <>
      <Modal
        visible={visible && !showWebView}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.container}>
            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Icon */}
              <View style={styles.iconContainer}>
                <View style={styles.iconCircle}>
                  <Ionicons
                    name={limitInfo.icon as any}
                    size={40}
                    color="#F59E0B"
                  />
                </View>
              </View>

              {/* Title */}
              <Text style={styles.title}>{limitInfo.title}</Text>

              {/* Description */}
              <Text style={styles.description}>{limitInfo.description}</Text>

              {/* Comparison */}
              <View style={styles.comparisonContainer}>
                <View style={styles.comparisonCard}>
                  <Text style={styles.comparisonLabel}>Current (Free)</Text>
                  <Text style={styles.comparisonValue}>{limitInfo.freeCurrent}</Text>
                </View>
                <Ionicons name="arrow-forward" size={24} color="#9CA3AF" />
                <View style={[styles.comparisonCard, styles.premiumCard]}>
                  <Text style={[styles.comparisonLabel, styles.premiumLabel]}>
                    Premium
                  </Text>
                  <Text style={[styles.comparisonValue, styles.premiumValue]}>
                    {limitInfo.premiumLimit}
                  </Text>
                </View>
              </View>

              {/* Features */}
              <View style={styles.featuresContainer}>
                <Text style={styles.featuresTitle}>Premium Features:</Text>
                <View style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#F59E0B" />
                  <Text style={styles.featureText}>Unlimited budgets</Text>
                </View>
                <View style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#F59E0B" />
                  <Text style={styles.featureText}>Unlimited goals</Text>
                </View>
                <View style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#F59E0B" />
                  <Text style={styles.featureText}>Unlimited Zenio AI queries</Text>
                </View>
                <View style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#F59E0B" />
                  <Text style={styles.featureText}>Advanced reports with AI</Text>
                </View>
                <View style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#F59E0B" />
                  <Text style={styles.featureText}>Export to PDF/Excel</Text>
                </View>
                <View style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#F59E0B" />
                  <Text style={styles.featureText}>Ad-free experience</Text>
                </View>
              </View>

              {/* Trial Badge */}
              <View style={styles.trialBadge}>
                <Ionicons name="gift" size={16} color="#059669" />
                <Text style={styles.trialText}>7 days free trial</Text>
              </View>

              {/* Buttons */}
              <TouchableOpacity
                style={[styles.upgradeButton, loading && styles.buttonDisabled]}
                onPress={handleUpgrade}
                disabled={loading}
              >
                <Ionicons name="diamond" size={20} color="#fff" />
                <Text style={styles.upgradeButtonText}>
                  {loading ? 'Processing...' : 'Upgrade to Premium'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.continueButton}
                onPress={onClose}
              >
                <Text style={styles.continueButtonText}>
                  Continue with Free
                </Text>
              </TouchableOpacity>

              {/* Footer */}
              <Text style={styles.footerText}>
                Cancel anytime • No questions asked
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  comparisonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  comparisonCard: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  premiumCard: {
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  comparisonLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '600',
  },
  premiumLabel: {
    color: '#92400E',
  },
  comparisonValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  premiumValue: {
    color: '#B45309',
  },
  featuresContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#4B5563',
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#D1FAE5',
    borderRadius: 20,
    alignSelf: 'center',
  },
  trialText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  upgradeButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default UpgradeModal;
