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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import PlanCard from '../components/subscriptions/PlanCard';
import CurrentPlanCard from '../components/subscriptions/CurrentPlanCard';
import StripeWebView from '../components/subscriptions/StripeWebView';
import ManageSubscriptionModal from '../components/subscriptions/ManageSubscriptionModal';
import CustomModal from '../components/modals/CustomModal';
import { SubscriptionPlan } from '../types/subscription';
import { subscriptionsAPI } from '../utils/api';

import { logger } from '../utils/logger';
interface SubscriptionsScreenProps {
  onClose?: () => void;
  onViewPayments?: () => void;
}

const SubscriptionsScreen: React.FC<SubscriptionsScreenProps> = ({ onClose, onViewPayments }) => {
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
  const [processingPlan, setProcessingPlan] = useState<SubscriptionPlan | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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

    // Si ya tiene este plan, no hacer nada
    if (subscription && subscription.plan === planId) {
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

    // Confirmación de pago real con CustomModal
    setModalConfig({
      visible: true,
      type: 'warning',
      title: 'Confirmar Suscripción',
      message: `Estás a punto de suscribirte a ${selectedPlan.name} por $${selectedPlan.price.toFixed(2)}/mes.\n\n• 7 días de prueba gratis\n• Tarjeta de crédito real requerida\n• Los cargos aplican después del periodo de prueba\n• Cancela en cualquier momento\n\n¿Deseas continuar?`,
      buttonText: 'Continuar',
      showSecondaryButton: true,
      secondaryButtonText: 'Cancelar',
      onSecondaryPress: () => setModalConfig({ ...modalConfig, visible: false }),
      onClose: () => {
        setModalConfig({ ...modalConfig, visible: false });
        processCheckout(planId);
      },
    });
  };

  const processCheckout = async (planId: SubscriptionPlan) => {
    setProcessingPlan(planId);

    try {
      const { url, sessionId } = await createCheckout(planId);
      logger.log('Checkout session created:', sessionId);
      setCheckoutUrl(url);
      setShowWebView(true);
    } catch (error: any) {
      setModalConfig({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudo crear la sesión de pago',
        buttonText: 'Entendido',
        onClose: () => setModalConfig({ ...modalConfig, visible: false }),
      });
    } finally{
      setProcessingPlan(null);
    }
  };

  const handlePaymentSuccess = async (sessionId?: string) => {
    setShowWebView(false);
    setCheckoutUrl(null);

    logger.log('💳 Pago exitoso detectado, sessionId:', sessionId);

    // Si tenemos sessionId, sincronizar inmediatamente
    if (sessionId) {
      try {
        logger.log('🔄 Sincronizando suscripción con sessionId:', sessionId);
        const response = await subscriptionsAPI.checkCheckoutSession(sessionId);
        logger.log('✅ Respuesta de sincronización:', response.data);

        // CRÍTICO: Refrescar suscripción INMEDIATAMENTE después de sincronizar
        await fetchSubscription();
        logger.log('✅ Suscripción refrescada después de sincronización');
      } catch (syncError: any) {
        logger.error('❌ Error sincronizando:', syncError);
        logger.error('❌ Detalles del error:', syncError.response?.data);
      }
    }

    setModalConfig({
      visible: true,
      type: 'success',
      title: '¡Éxito!',
      message: 'Tu suscripción ha sido activada. ¡Gracias!',
      buttonText: 'Continuar',
      onClose: () => {
        setModalConfig({ ...modalConfig, visible: false });
        // Ya no es necesario refrescar aquí porque ya se hizo arriba
      },
    });
  };

  const handlePaymentCancel = () => {
    setShowWebView(false);
    setCheckoutUrl(null);
    setModalConfig({
      visible: true,
      type: 'info',
      title: 'Pago Cancelado',
      message: 'Puedes mejorar tu plan en cualquier momento desde tu perfil.',
      buttonText: 'Entendido',
      onClose: () => setModalConfig({ ...modalConfig, visible: false }),
    });
  };

  const handleCloseWebView = () => {
    setModalConfig({
      visible: true,
      type: 'warning',
      title: 'Cerrar Pago',
      message: '¿Estás seguro que deseas cancelar este pago?',
      buttonText: 'Sí, Salir',
      showSecondaryButton: true,
      secondaryButtonText: 'Continuar',
      onSecondaryPress: () => setModalConfig({ ...modalConfig, visible: false }),
      onClose: () => {
        setModalConfig({ ...modalConfig, visible: false });
        setShowWebView(false);
        setCheckoutUrl(null);
      },
    });
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
            {isFree ? 'Elige tu Plan' : 'Tu Suscripción'}
          </Text>
          <Text style={styles.subtitle}>
            {isFree
              ? 'Desbloquea funciones premium y acceso ilimitado'
              : 'Administra tu suscripción y facturación'}
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
            onViewPayments={() => onViewPayments?.()}
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
            • Todos los planes incluyen 7 días de prueba gratis{'\n'}
            • Cancela en cualquier momento, sin preguntas{'\n'}
            • Pago seguro con Stripe{'\n'}
            • Acceso instantáneo después de suscribirte
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
});

export default SubscriptionsScreen;
