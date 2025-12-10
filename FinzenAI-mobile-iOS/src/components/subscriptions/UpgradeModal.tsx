import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import StripeWebView from './StripeWebView';
import CustomModal from '../modals/CustomModal';

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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const getLimitInfo = () => {
    switch (limitType) {
      case 'budgets':
        return {
          icon: 'wallet',
          title: 'Límite de Presupuestos Alcanzado',
          description: 'Has alcanzado el máximo de 3 presupuestos en el plan Gratis.',
          freeCurrent: '3/3',
          premiumLimit: 'Ilimitado',
        };
      case 'goals':
        return {
          icon: 'trophy',
          title: 'Límite de Metas Alcanzado',
          description: 'Has alcanzado el máximo de 2 metas en el plan Gratis.',
          freeCurrent: '2/2',
          premiumLimit: 'Ilimitado',
        };
      case 'zenio':
        return {
          icon: 'chatbubble-ellipses',
          title: 'Límite de Consultas a Zenio Alcanzado',
          description: 'Has usado las 10 consultas a Zenio AI de este mes.',
          freeCurrent: '10/10',
          premiumLimit: 'Ilimitado',
        };
      default:
        return {
          icon: 'lock-closed',
          title: 'Límite Alcanzado',
          description: 'Has alcanzado el límite de tu plan.',
          freeCurrent: 'Máx',
          premiumLimit: 'Ilimitado',
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
      setErrorMessage(error.message || 'No se pudo crear la sesión de pago');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowWebView(false);
    setCheckoutUrl(null);
    setShowSuccessModal(true);
  };

  const handlePaymentCancel = () => {
    setShowWebView(false);
    setCheckoutUrl(null);
  };

  const handleCloseWebView = () => {
    // Simplemente cerrar el WebView, no necesitamos confirmación
    setShowWebView(false);
    setCheckoutUrl(null);
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
                  <Text style={styles.comparisonLabel}>Actual (Gratis)</Text>
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
                <Text style={styles.featuresTitle}>Características Premium:</Text>
                <View style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#F59E0B" />
                  <Text style={styles.featureText}>Presupuestos ilimitados</Text>
                </View>
                <View style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#F59E0B" />
                  <Text style={styles.featureText}>Metas ilimitadas</Text>
                </View>
                <View style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#F59E0B" />
                  <Text style={styles.featureText}>Consultas ilimitadas a Zenio AI</Text>
                </View>
                <View style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#F59E0B" />
                  <Text style={styles.featureText}>Acceso a reportes</Text>
                </View>
                <View style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#F59E0B" />
                  <Text style={styles.featureText}>Exportar a PDF/Excel</Text>
                </View>
                <View style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#F59E0B" />
                  <Text style={styles.featureText}>Experiencia sin anuncios</Text>
                </View>
              </View>

              {/* Trial Badge */}
              <View style={styles.trialBadge}>
                <Ionicons name="gift" size={16} color="#059669" />
                <Text style={styles.trialText}>7 días de prueba gratis</Text>
              </View>

              {/* Buttons */}
              <TouchableOpacity
                style={[styles.upgradeButton, loading && styles.buttonDisabled]}
                onPress={handleUpgrade}
                disabled={loading}
              >
                <Ionicons name="diamond" size={20} color="#fff" />
                <Text style={styles.upgradeButtonText}>
                  {loading ? 'Procesando...' : 'Mejorar a Premium'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.continueButton}
                onPress={onClose}
              >
                <Text style={styles.continueButtonText}>
                  Continuar con Gratis
                </Text>
              </TouchableOpacity>

              {/* Footer */}
              <Text style={styles.footerText}>
                Cancela en cualquier momento • Sin preguntas
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

      {/* Success Modal */}
      <CustomModal
        visible={showSuccessModal}
        type="success"
        title="¡Éxito!"
        message="¡Ahora eres miembro Premium! Disfruta del acceso ilimitado."
        buttonText="Continuar"
        onClose={() => {
          setShowSuccessModal(false);
          onClose();
        }}
      />

      {/* Error Modal */}
      <CustomModal
        visible={showErrorModal}
        type="error"
        title="Error"
        message={errorMessage}
        buttonText="Entendido"
        onClose={() => setShowErrorModal(false)}
      />
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
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
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
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
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
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  premiumCard: {
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.2,
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
    borderRadius: 14,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
    shadowColor: '#F59E0B',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
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
