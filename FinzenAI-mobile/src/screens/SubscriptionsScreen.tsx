import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import PlanCard from '../components/subscriptions/PlanCard';
import CurrentPlanCard from '../components/subscriptions/CurrentPlanCard';
import ManageSubscriptionModal from '../components/subscriptions/ManageSubscriptionModal';
import PaymentHistoryScreen from './PaymentHistoryScreen';
import CustomModal from '../components/modals/CustomModal';
import { SubscriptionPlan, BillingPeriod } from '../types/subscription';
import { logger } from '../utils/logger';
interface SubscriptionsScreenProps {
  onClose?: () => void;
}

const SubscriptionsScreen: React.FC<SubscriptionsScreenProps> = ({ onClose }) => {
  const {
    subscription,
    plans,
    loading,
    error,
    fetchSubscription,
    fetchPlans,
    createCheckout,
    startTrial,
    changePlan,
    isTrialing,
    getTrialDaysRemaining,
  } = useSubscriptionStore();

  const [showManageModal, setShowManageModal] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [processingPlan, setProcessingPlan] = useState<SubscriptionPlan | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('yearly');

  // Estados para CustomModal
  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    buttonText?: string;
    showSecondaryButton?: boolean;
    secondaryButtonText?: string;
    onSecondaryPress?: () => void;
    onClose?: () => void;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });

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
      setModalConfig({
        visible: true,
        type: 'info',
        title: 'Información',
        message: 'Ya estás en el plan Gratis',
        buttonText: 'Entendido',
        onClose: () => setModalConfig({ ...modalConfig, visible: false }),
      });
      return;
    }

    // Si está en trial, verificar si quiere cambiar de plan o ya tiene el seleccionado
    if (isTrialing()) {
      const daysRemaining = getTrialDaysRemaining();
      const currentTrialPlan = subscription?.plan;

      // Si selecciona el mismo plan que ya tiene en trial
      if (currentTrialPlan === planId) {
        const planName = planId === 'PRO' ? 'Pro' : 'Plus';
        setModalConfig({
          visible: true,
          type: 'success',
          title: `¡Ya tienes acceso ${planName}!`,
          message: `Estás en tu periodo de prueba gratuito.\n\nTe quedan ${daysRemaining} día${daysRemaining !== 1 ? 's' : ''} de acceso completo a todas las funciones ${planName}.\n\nNo necesitas hacer nada más por ahora. Disfruta tu trial.`,
          buttonText: 'Entendido',
          onClose: () => setModalConfig({ ...modalConfig, visible: false }),
        });
        return;
      }

      // Si quiere cambiar de plan durante el trial (ej: PLUS -> PRO o PRO -> PLUS)
      const currentPlanName = currentTrialPlan === 'PRO' ? 'Pro' : 'Plus';
      const newPlanName = planId === 'PRO' ? 'Pro' : 'Plus';
      setModalConfig({
        visible: true,
        type: 'info',
        title: `Cambiar a ${newPlanName}`,
        message: `Actualmente estás probando ${currentPlanName}.\n\n¿Deseas cambiar tu trial a ${newPlanName}?\n\nTe quedan ${daysRemaining} día${daysRemaining !== 1 ? 's' : ''} de prueba que continuarán con el nuevo plan.`,
        buttonText: 'Cambiar Plan',
        showSecondaryButton: true,
        secondaryButtonText: 'Cancelar',
        onSecondaryPress: () => setModalConfig({ ...modalConfig, visible: false }),
        onClose: () => {
          setModalConfig({ ...modalConfig, visible: false });
          processChangePlanInTrial(planId);
        },
      });
      return;
    }

    // Si ya tiene este plan pagado, no hacer nada
    if (subscription && subscription.plan === planId && subscription.status === 'ACTIVE') {
      setModalConfig({
        visible: true,
        type: 'info',
        title: 'Información',
        message: `Ya tienes el plan ${planId}`,
        buttonText: 'Entendido',
        onClose: () => setModalConfig({ ...modalConfig, visible: false }),
      });
      return;
    }

    // Obtener información del plan
    const selectedPlan = plans.find(p => p.id === planId);
    if (!selectedPlan) return;

    // Si el usuario puede usar trial (FREE y no ha usado trial antes)
    const canStartTrial = subscription?.canUseTrial && subscription?.plan === 'FREE';

    if (canStartTrial) {
      // Mostrar confirmación de trial (sin Stripe)
      setModalConfig({
        visible: true,
        type: 'success',
        title: 'Iniciar Período de Prueba',
        message: `¡Obtén 7 días GRATIS de ${selectedPlan.name}!\n\n• Acceso completo a todas las funciones\n• Sin necesidad de tarjeta de crédito\n• Cancela cuando quieras\n\nAl finalizar los 7 días, podrás decidir si quieres continuar.`,
        buttonText: 'Iniciar',
        showSecondaryButton: true,
        secondaryButtonText: 'Cancelar',
        onSecondaryPress: () => setModalConfig({ ...modalConfig, visible: false }),
        onClose: () => {
          setModalConfig({ ...modalConfig, visible: false });
          processStartTrial(planId);
        },
      });
    } else {
      // Usuario ya usó trial - mostrar checkout de Stripe
      const planPrice = typeof selectedPlan.price === 'object' && selectedPlan.price !== null
        ? (billingPeriod === 'yearly' ? (selectedPlan.price.yearly ?? 0) : (selectedPlan.price.monthly ?? 0))
        : (typeof selectedPlan.price === 'number' ? selectedPlan.price : 0);
      const periodText = billingPeriod === 'yearly' ? 'año' : 'mes';
      const savingsText = billingPeriod === 'yearly' ? '\n• ¡Ahorras 17% con el plan anual!' : '';
      setModalConfig({
        visible: true,
        type: 'warning',
        title: 'Confirmar Suscripción',
        message: `Estás a punto de suscribirte a ${selectedPlan.name} por $${planPrice.toFixed(2)}/${periodText}.${savingsText}\n\n• Cancela en cualquier momento\n• Pago seguro con Stripe\n\n¿Deseas continuar?`,
        buttonText: 'Continuar',
        showSecondaryButton: true,
        secondaryButtonText: 'Cancelar',
        onSecondaryPress: () => setModalConfig({ ...modalConfig, visible: false }),
        onClose: () => {
          setModalConfig({ ...modalConfig, visible: false });
          processCheckout(planId);
        },
      });
    }
  };

  const processCheckout = async (planId: SubscriptionPlan) => {
    setProcessingPlan(planId);

    try {
      const { url, sessionId } = await createCheckout(planId as 'PREMIUM' | 'PRO', billingPeriod);
      logger.log('Checkout session created:', sessionId);

      // Mostrar modal de advertencia requerido por Apple/Google antes de abrir navegador externo
      setModalConfig({
        visible: true,
        type: 'info',
        title: 'Serás redirigido',
        message: 'El pago se procesará de forma segura en una página web externa (Stripe).\n\nAl completar el pago, regresarás automáticamente a FinZen AI.',
        buttonText: 'Continuar',
        showSecondaryButton: true,
        secondaryButtonText: 'Cancelar',
        onSecondaryPress: () => {
          logger.log('Usuario canceló redirección a Stripe');
          setModalConfig({ ...modalConfig, visible: false });
        },
        onClose: async () => {
          setModalConfig({ ...modalConfig, visible: false });
          try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
              logger.log('Abriendo navegador externo para checkout:', url);
              await Linking.openURL(url);
            } else {
              logger.error('No se puede abrir la URL:', url);
              setModalConfig({
                visible: true,
                type: 'error',
                title: 'Error',
                message: 'No se pudo abrir el navegador para completar el pago',
                buttonText: 'Entendido',
                onClose: () => setModalConfig({ ...modalConfig, visible: false }),
              });
            }
          } catch (linkError: any) {
            logger.error('Error abriendo URL:', linkError);
            setModalConfig({
              visible: true,
              type: 'error',
              title: 'Error',
              message: 'No se pudo abrir el navegador para completar el pago',
              buttonText: 'Entendido',
              onClose: () => setModalConfig({ ...modalConfig, visible: false }),
            });
          }
        },
      });
    } catch (error: any) {
      setModalConfig({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudo crear la sesión de pago',
        buttonText: 'Entendido',
        onClose: () => setModalConfig({ ...modalConfig, visible: false }),
      });
    } finally {
      setProcessingPlan(null);
    }
  };

  const processStartTrial = async (planId: SubscriptionPlan) => {
    setProcessingPlan(planId);

    try {
      await startTrial(planId as 'PREMIUM' | 'PRO');
      logger.log('✅ Trial iniciado exitosamente para plan:', planId);

      setModalConfig({
        visible: true,
        type: 'success',
        title: '¡Felicidades! 🎉',
        message: `Tu período de prueba de 7 días ha comenzado.\n\nAhora tienes acceso completo a todas las funciones de ${planId === 'PREMIUM' ? 'Plus' : 'Pro'}.\n\n¡Disfruta la experiencia!`,
        buttonText: 'Entendido',
        onClose: () => setModalConfig({ ...modalConfig, visible: false }),
      });
    } catch (error: any) {
      logger.error('Error iniciando trial:', error);

      // Refrescar suscripción para obtener canUseTrial actualizado del backend
      await fetchSubscription();

      // Si el trial falló por dispositivo ya usado, ofrecer compra directa
      const isDeviceOrTrialUsed =
        error.message?.includes('dispositivo') ||
        error.message?.includes('período de prueba');

      if (isDeviceOrTrialUsed) {
        setModalConfig({
          visible: true,
          type: 'warning',
          title: 'Trial no disponible',
          message: 'Este dispositivo ya utilizó el período de prueba. ¿Deseas suscribirte directamente?',
          buttonText: 'Suscribirme',
          showSecondaryButton: true,
          secondaryButtonText: 'Cancelar',
          onSecondaryPress: () => setModalConfig({ ...modalConfig, visible: false }),
          onClose: () => {
            setModalConfig({ ...modalConfig, visible: false });
            processCheckout(planId);
          },
        });
      } else {
        setModalConfig({
          visible: true,
          type: 'error',
          title: 'Error',
          message: error.message || 'No se pudo iniciar el período de prueba',
          buttonText: 'Entendido',
          onClose: () => setModalConfig({ ...modalConfig, visible: false }),
        });
      }
    } finally {
      setProcessingPlan(null);
    }
  };

  const processChangePlanInTrial = async (planId: SubscriptionPlan) => {
    setProcessingPlan(planId);

    try {
      await changePlan(planId as 'PREMIUM' | 'PRO');
      logger.log('✅ Plan cambiado en trial a:', planId);

      const planName = planId === 'PRO' ? 'Pro' : 'Plus';
      setModalConfig({
        visible: true,
        type: 'success',
        title: '¡Plan Cambiado!',
        message: `Tu trial ahora es de ${planName}.\n\nTus días restantes de prueba continúan con el nuevo plan.`,
        buttonText: 'Entendido',
        onClose: () => setModalConfig({ ...modalConfig, visible: false }),
      });

      // Refrescar suscripción
      await fetchSubscription();
    } catch (error: any) {
      logger.error('Error cambiando plan en trial:', error);
      setModalConfig({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudo cambiar el plan',
        buttonText: 'Entendido',
        onClose: () => setModalConfig({ ...modalConfig, visible: false }),
      });
    } finally {
      setProcessingPlan(null);
    }
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
          <Text style={styles.loadingText}>Cargando planes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isFree = !subscription || subscription.plan === 'FREE';
  const isPaidPlan = subscription && (subscription.plan === 'PREMIUM' || subscription.plan === 'PRO');
  const inTrial = isTrialing();
  const trialDaysLeft = getTrialDaysRemaining();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Close Button */}
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={28} color="#1F2937" />
          </TouchableOpacity>
        )}

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {inTrial
              ? `Tu Trial ${subscription?.plan === 'PRO' ? 'Pro' : 'Plus'}`
              : (isFree ? 'Elige tu Plan' : 'Tu Suscripción')}
          </Text>
          <Text style={styles.subtitle}>
            {inTrial
              ? `Disfruta de todas las funciones ${subscription?.plan === 'PRO' ? 'Pro' : 'Plus'}`
              : (isFree
                ? 'Desbloquea funciones premium y acceso ilimitado'
                : 'Administra tu suscripción y facturación')}
          </Text>
        </View>

        {/* Trial Banner */}
        {inTrial && (
          <View style={styles.trialBanner}>
            <Ionicons name="star" size={24} color="#F59E0B" />
            <View style={styles.trialBannerContent}>
              <Text style={styles.trialBannerTitle}>
                ¡Estás en tu periodo de prueba!
              </Text>
              <Text style={styles.trialBannerText}>
                Te quedan {trialDaysLeft} día{trialDaysLeft !== 1 ? 's' : ''} de acceso completo a {subscription?.plan === 'PRO' ? 'Pro' : 'Plus'}.
                No se requiere tarjeta de crédito.
              </Text>
            </View>
          </View>
        )}

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
            {isFree ? 'Planes Disponibles' : 'Otros Planes'}
          </Text>
          {!isFree && (
            <Text style={styles.sectionSubtitle}>
              Cambia de plan en cualquier momento
            </Text>
          )}
        </View>

        {/* Billing Period Toggle */}
        <View style={styles.billingToggleContainer}>
          <TouchableOpacity
            style={[
              styles.billingToggleOption,
              billingPeriod === 'monthly' && styles.billingToggleOptionActive,
            ]}
            onPress={() => setBillingPeriod('monthly')}
          >
            <Text style={[
              styles.billingToggleText,
              billingPeriod === 'monthly' && styles.billingToggleTextActive,
            ]}>
              Mensual
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.billingToggleOption,
              billingPeriod === 'yearly' && styles.billingToggleOptionActive,
            ]}
            onPress={() => setBillingPeriod('yearly')}
          >
            <Text style={[
              styles.billingToggleText,
              billingPeriod === 'yearly' && styles.billingToggleTextActive,
            ]}>
              Anual
            </Text>
            {billingPeriod === 'yearly' && (
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsBadgeText}>-17%</Text>
              </View>
            )}
          </TouchableOpacity>
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
              billingPeriod={billingPeriod}
            />
          ))}
        </View>

        {/* Footer Info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {inTrial
              ? `• Tu trial termina en ${trialDaysLeft} día${trialDaysLeft !== 1 ? 's' : ''}\n• No se te cobrará durante el trial\n• Cancela cuando quieras`
              : `• Cancela en cualquier momento, sin preguntas\n• Pago seguro con Stripe\n• Acceso instantáneo después de suscribirte`}
          </Text>
          <View style={styles.legalLinks}>
            <Text
              style={styles.legalLink}
              onPress={() => Linking.openURL('https://www.abundancelabllc.com/terms')}
            >
              Términos de Uso (EULA)
            </Text>
            <Text style={styles.legalSeparator}>|</Text>
            <Text
              style={styles.legalLink}
              onPress={() => Linking.openURL('https://www.abundancelabllc.com/privacy')}
            >
              Política de Privacidad
            </Text>
          </View>
        </View>
      </ScrollView>

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

      {/* Custom Modal */}
      <CustomModal
        visible={modalConfig.visible}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        buttonText={modalConfig.buttonText}
        showSecondaryButton={modalConfig.showSecondaryButton}
        secondaryButtonText={modalConfig.secondaryButtonText}
        onSecondaryPress={modalConfig.onSecondaryPress}
        onClose={modalConfig.onClose || (() => setModalConfig({ ...modalConfig, visible: false }))}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
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
  trialBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  trialBannerContent: {
    flex: 1,
    marginLeft: 12,
  },
  trialBannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  trialBannerText: {
    fontSize: 14,
    color: '#B45309',
    lineHeight: 20,
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
  billingToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  billingToggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  billingToggleOptionActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  billingToggleText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
  },
  billingToggleTextActive: {
    color: '#1F2937',
    fontWeight: '600',
  },
  savingsBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  savingsBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  plansContainer: {
    marginBottom: 24,
  },
  footer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  footerText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  legalLink: {
    fontSize: 13,
    color: '#6C47FF',
    fontWeight: '500',
  },
  legalSeparator: {
    fontSize: 13,
    color: '#D1D5DB',
    marginHorizontal: 8,
  },
});

export default SubscriptionsScreen;
