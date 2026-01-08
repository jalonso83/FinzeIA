import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { BillingPeriod } from '../../types/subscription';
import CustomModal from '../modals/CustomModal';

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  limitType: 'budgets' | 'goals' | 'zenio' | 'export' | 'reminders' | 'textToSpeech' | 'budgetAlerts' | 'antExpenseAnalysis' | 'advancedCalculators';
}

const PRICES = {
  PREMIUM: {
    monthly: 4.99,
    yearly: 49.99,
    yearlySavings: 9.89,
    savingsPercent: 17,
  },
  PRO: {
    monthly: 9.99,
    yearly: 99.99,
    yearlySavings: 19.89,
    savingsPercent: 17,
  },
};

const UpgradeModal: React.FC<UpgradeModalProps> = ({
  visible,
  onClose,
  limitType,
}) => {
  const { createCheckout } = useSubscriptionStore();
  const [loading, setLoading] = useState(false);
  const [loadingPro, setLoadingPro] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('yearly');

  const getLimitInfo = () => {
    switch (limitType) {
      case 'budgets':
        return {
          icon: 'wallet',
          title: 'Limite de Presupuestos',
          description: 'Has alcanzado el maximo de 2 presupuestos en el plan Gratis.',
        };
      case 'goals':
        return {
          icon: 'trophy',
          title: 'Limite de Metas',
          description: 'Has alcanzado el maximo de 1 meta en el plan Gratis.',
        };
      case 'zenio':
        return {
          icon: 'chatbubble-ellipses',
          title: 'Limite de Zenio AI',
          description: 'Has usado las 15 consultas a Zenio AI de este mes.',
        };
      case 'export':
        return {
          icon: 'download',
          title: 'Exportar Datos',
          description: 'La exportación de datos está disponible en planes PLUS y PRO.',
        };
      case 'reminders':
        return {
          icon: 'notifications',
          title: 'Limite de Recordatorios',
          description: 'Has alcanzado el maximo de 2 recordatorios de pago en el plan Gratis.',
        };
      case 'textToSpeech':
        return {
          icon: 'volume-high',
          title: 'Respuestas con Voz',
          description: 'Las respuestas de voz de Zenio están disponibles en planes PLUS y PRO.',
        };
      case 'budgetAlerts':
        return {
          icon: 'alert-circle',
          title: 'Alertas de Presupuesto',
          description: 'Las alertas de umbral de presupuesto están disponibles en planes PLUS y PRO.',
        };
      case 'antExpenseAnalysis':
        return {
          icon: 'bug',
          title: 'Análisis Completo',
          description: 'El análisis completo de gastos hormiga está disponible en planes PLUS y PRO.',
        };
      case 'advancedCalculators':
        return {
          icon: 'calculator',
          title: 'Calculadora Avanzada',
          description: 'La calculadora "Gastar o Ahorrar" está disponible en planes PLUS y PRO.',
        };
      default:
        return {
          icon: 'lock-closed',
          title: 'Limite Alcanzado',
          description: 'Has alcanzado el limite de tu plan.',
        };
    }
  };

  const limitInfo = getLimitInfo();

  const getCurrentPrice = () => {
    return billingPeriod === 'yearly'
      ? PRICES.PREMIUM.yearly
      : PRICES.PREMIUM.monthly;
  };

  const getMonthlyEquivalent = () => {
    if (billingPeriod === 'yearly') {
      return (PRICES.PREMIUM.yearly / 12).toFixed(2);
    }
    return PRICES.PREMIUM.monthly.toFixed(2);
  };

  const getProPrice = () => {
    return billingPeriod === 'yearly'
      ? PRICES.PRO.yearly
      : PRICES.PRO.monthly;
  };

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const { url } = await createCheckout('PREMIUM', billingPeriod);
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        onClose();
      } else {
        Alert.alert('Error', 'No se puede abrir el navegador');
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'No se pudo crear la sesion de pago');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradePro = async () => {
    setLoadingPro(true);
    try {
      const { url } = await createCheckout('PRO', billingPeriod);
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        onClose();
      } else {
        Alert.alert('Error', 'No se puede abrir el navegador');
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'No se pudo crear la sesion de pago');
      setShowErrorModal(true);
    } finally {
      setLoadingPro(false);
    }
  };

  return (
    <>
      <Modal
        visible={visible}
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
                    size={36}
                    color="#F59E0B"
                  />
                </View>
              </View>

              {/* Title */}
              <Text style={styles.title}>{limitInfo.title}</Text>
              <Text style={styles.description}>{limitInfo.description}</Text>

              {/* Billing Toggle */}
              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[
                    styles.toggleOption,
                    billingPeriod === 'monthly' && styles.toggleOptionActive,
                  ]}
                  onPress={() => setBillingPeriod('monthly')}
                >
                  <Text style={[
                    styles.toggleText,
                    billingPeriod === 'monthly' && styles.toggleTextActive,
                  ]}>
                    Mensual
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.toggleOption,
                    billingPeriod === 'yearly' && styles.toggleOptionActive,
                  ]}
                  onPress={() => setBillingPeriod('yearly')}
                >
                  <Text style={[
                    styles.toggleText,
                    billingPeriod === 'yearly' && styles.toggleTextActive,
                  ]}>
                    Anual
                  </Text>
                  {billingPeriod === 'yearly' && (
                    <View style={styles.savingsBadgeSmall}>
                      <Text style={styles.savingsBadgeSmallText}>-17%</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Price Card */}
              <View style={styles.priceCard}>
                <View style={styles.priceHeader}>
                  <Text style={styles.planName}>Plan Plus</Text>
                  {billingPeriod === 'yearly' && (
                    <View style={styles.savingsBadge}>
                      <Ionicons name="pricetag" size={14} color="#059669" />
                      <Text style={styles.savingsBadgeText}>
                        Ahorras ${PRICES.PREMIUM.yearlySavings.toFixed(2)}/ano
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.priceRow}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <Text style={styles.priceAmount}>{getCurrentPrice().toFixed(2)}</Text>
                  <Text style={styles.pricePeriod}>
                    /{billingPeriod === 'yearly' ? 'ano' : 'mes'}
                  </Text>
                </View>

                {billingPeriod === 'yearly' && (
                  <Text style={styles.monthlyEquivalent}>
                    Solo ${getMonthlyEquivalent()}/mes
                  </Text>
                )}

                {billingPeriod === 'monthly' && (
                  <TouchableOpacity
                    style={styles.switchToYearlyHint}
                    onPress={() => setBillingPeriod('yearly')}
                  >
                    <Ionicons name="arrow-up-circle" size={16} color="#059669" />
                    <Text style={styles.switchToYearlyText}>
                      Cambia a anual y ahorra ${PRICES.PREMIUM.yearlySavings.toFixed(2)}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Features */}
              <View style={styles.featuresContainer}>
                <Text style={styles.featuresTitle}>Todo incluido:</Text>
                <View style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#059669" />
                  <Text style={styles.featureText}>Presupuestos ilimitados</Text>
                </View>
                <View style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#059669" />
                  <Text style={styles.featureText}>Metas ilimitadas</Text>
                </View>
                <View style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#059669" />
                  <Text style={styles.featureText}>Recordatorios ilimitados</Text>
                </View>
                <View style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#059669" />
                  <Text style={styles.featureText}>Zenio AI sin limites</Text>
                </View>
                <View style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#059669" />
                  <Text style={styles.featureText}>Exportar a PDF/Excel</Text>
                </View>
                <View style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#059669" />
                  <Text style={styles.featureText}>Alertas de presupuesto</Text>
                </View>
                <View style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#059669" />
                  <Text style={styles.featureText}>Calculadoras avanzadas</Text>
                </View>
              </View>

              {/* Upgrade Button */}
              <TouchableOpacity
                style={[styles.upgradeButton, loading && styles.buttonDisabled]}
                onPress={handleUpgrade}
                disabled={loading}
              >
                <Ionicons name="diamond" size={20} color="#fff" />
                <Text style={styles.upgradeButtonText}>
                  {loading ? 'Procesando...' : `Mejorar a Plus - $${getCurrentPrice().toFixed(2)}`}
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

              {/* PRO Upsell Section */}
              <View style={styles.proSection}>
                <View style={styles.proDivider}>
                  <View style={styles.proDividerLine} />
                  <Text style={styles.proDividerText}>o</Text>
                  <View style={styles.proDividerLine} />
                </View>

                <TouchableOpacity
                  style={[styles.proCard, loadingPro && styles.proCardDisabled]}
                  onPress={handleUpgradePro}
                  disabled={loadingPro || loading}
                  activeOpacity={0.7}
                >
                  <View style={styles.proCardContent}>
                    <View style={styles.proCardLeft}>
                      <View style={styles.proIconContainer}>
                        <Ionicons name="mail" size={18} color="#1E40AF" />
                      </View>
                      <View style={styles.proTextContainer}>
                        <Text style={styles.proTitle}>Plan Pro</Text>
                        <Text style={styles.proSubtitle}>
                          Sincronizacion bancaria automatica
                        </Text>
                      </View>
                    </View>
                    <View style={styles.proCardRight}>
                      {loadingPro ? (
                        <Text style={styles.proPrice}>...</Text>
                      ) : (
                        <>
                          <Text style={styles.proPrice}>${getProPrice().toFixed(2)}</Text>
                          <Text style={styles.proPeriod}>
                            /{billingPeriod === 'yearly' ? 'ano' : 'mes'}
                          </Text>
                        </>
                      )}
                      <Ionicons name="chevron-forward" size={16} color="#1E40AF" />
                    </View>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Footer */}
              <Text style={styles.footerText}>
                Cancela cuando quieras. Sin compromisos.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
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
    marginBottom: 12,
    marginTop: 8,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  toggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  toggleOptionActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  toggleTextActive: {
    color: '#1F2937',
  },
  savingsBadgeSmall: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  savingsBadgeSmallText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  priceCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  priceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#92400E',
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  savingsBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 6,
  },
  priceAmount: {
    fontSize: 48,
    fontWeight: '800',
    color: '#92400E',
    lineHeight: 52,
  },
  pricePeriod: {
    fontSize: 16,
    color: '#B45309',
    marginBottom: 8,
    marginLeft: 4,
  },
  monthlyEquivalent: {
    textAlign: 'center',
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
    marginTop: 8,
  },
  switchToYearlyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
  },
  switchToYearlyText: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '500',
  },
  featuresContainer: {
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
    gap: 10,
    marginBottom: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#4B5563',
  },
  upgradeButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
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
    fontWeight: '700',
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
    marginTop: 4,
  },
  // PRO Section Styles
  proSection: {
    marginTop: 16,
    marginBottom: 8,
  },
  proDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  proDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  proDividerText: {
    paddingHorizontal: 12,
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  proCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    overflow: 'hidden',
  },
  proCardDisabled: {
    opacity: 0.6,
  },
  proCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  proCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  proIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  proTextContainer: {
    flex: 1,
  },
  proTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5B21B6',
    marginBottom: 2,
  },
  proSubtitle: {
    fontSize: 12,
    color: '#1E40AF',
  },
  proCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  proPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#5B21B6',
  },
  proPeriod: {
    fontSize: 11,
    color: '#1E40AF',
    marginRight: 4,
  },
});

export default UpgradeModal;
