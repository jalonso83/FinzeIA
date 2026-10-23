import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import PlanCard from '../components/subscriptions/PlanCard';
import CurrentPlanCard from '../components/subscriptions/CurrentPlanCard';
import ManageSubscriptionModal from '../components/subscriptions/ManageSubscriptionModal';
import { SubscriptionPlan, BillingPeriod } from '../types/subscription';
import { revenueCatMobileService } from '../services/revenueCatService';
import type { PurchasesOfferings, PurchasesPackage } from 'react-native-purchases';
import { logger } from '../utils/logger';
interface SubscriptionsScreenProps {
  onClose?: () => void;
  onViewPayments?: () => void;
  /** Por qué se abrió esta pantalla. Viaja hasta el evento `ver_planes` para
   *  poder separar la demanda concreta (tocó "Gastos en automático") de la
   *  curiosidad (entró a mirar precios). */
  origen?: 'gastos_automatico' | 'menu' | 'limite' | 'vencimiento';
}

const SubscriptionsScreen: React.FC<SubscriptionsScreenProps> = ({ onClose, onViewPayments, origen }) => {
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
    purchaseWithRevenueCat,
    restoreRevenueCatPurchases,
    trialConfig,
  } = useSubscriptionStore();

  // Respaldo en 7 solo por si el backend todavía no manda `trial` (app nueva
  // contra backend viejo). No es el valor "de verdad": el de verdad lo decide
  // el servidor, y si esto se queda corto el usuario ve el número equivocado.
  const diasDeTrial = trialConfig?.durationDays ?? 7;
  const planDelTrial = trialConfig?.grantedPlan ?? null;

  const [showManageModal, setShowManageModal] = useState(false);
  const [processingPlan, setProcessingPlan] = useState<SubscriptionPlan | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('yearly');
  const [rcOfferings, setRcOfferings] = useState<PurchasesOfferings | null>(null);
  const [restoringPurchases, setRestoringPurchases] = useState(false);

  const isIOS = Platform.OS === 'ios';

  useEffect(() => {
    loadData();
  }, []);

  // Cargar offerings de RevenueCat (iOS only)
  useEffect(() => {
    if (isIOS) {
      loadRCOfferings();
    }
  }, []);

  const loadData = async () => {
    await Promise.all([
      fetchSubscription(),
      fetchPlans(origen),
    ]);
  };

  const loadRCOfferings = async () => {
    try {
      const offerings = await revenueCatMobileService.getOfferings();
      setRcOfferings(offerings);
      logger.log('[RC] Offering actual:', offerings?.current?.identifier);
      logger.log('[RC] Packages:', offerings?.current?.availablePackages?.map(
        (pkg) => `${pkg.identifier} (${pkg.product.identifier}) - ${pkg.product.priceString}`
      ));
    } catch (error) {
      logger.error('Error cargando RC offerings:', error);
    }
  };

  /**
   * Obtener el package de RC que corresponde al plan y periodo seleccionado
   */
  const getRCPackage = (planId: SubscriptionPlan, period: BillingPeriod): PurchasesPackage | null => {
    if (!rcOfferings?.current?.availablePackages) {
      logger.log('[RC] No hay availablePackages en current offering');
      return null;
    }

    // Log para debug: ver qué packages hay disponibles
    logger.log('[RC] Packages disponibles:', rcOfferings.current.availablePackages.map(
      (pkg) => `${pkg.identifier} -> ${pkg.product.identifier}`
    ));

    // Mapear planId + period a identificadores
    const identifierMap: Record<string, string> = {
      'PREMIUM_monthly': 'premium_monthly',
      'PREMIUM_yearly': 'premium_yearly',
      'PRO_monthly': 'pro_monthly',
      'PRO_yearly': 'pro_yearly',
    };

    const targetId = identifierMap[`${planId}_${period}`];
    if (!targetId) return null;

    // Buscar por package identifier O por product identifier
    return rcOfferings.current.availablePackages.find(
      (pkg) => pkg.identifier === targetId || pkg.product.identifier === targetId
    ) || null;
  };

  /**
   * Obtener precio formateado desde RC offerings
   */
  const getRCPrice = (planId: SubscriptionPlan, period: BillingPeriod): string | null => {
    const pkg = getRCPackage(planId, period);
    if (!pkg) return null;
    return pkg.product.priceString;
  };

  const processRCPurchase = async (planId: SubscriptionPlan) => {
    const pkg = getRCPackage(planId, billingPeriod);
    if (!pkg) {
      Alert.alert('Error', 'Producto no disponible en este momento');
      return;
    }

    setProcessingPlan(planId);
    try {
      await purchaseWithRevenueCat(pkg);
      Alert.alert(
        '¡Compra Exitosa!',
        `Ahora tienes acceso a ${planId === 'PREMIUM' ? 'Plus' : 'Pro'}. ¡Disfruta!`,
        [{ text: '¡Genial!', style: 'default' }]
      );
    } catch (error: any) {
      if (!error.message?.includes('cancelada') && !error.message?.includes('cancelled')) {
        Alert.alert('Error', error.message || 'No se pudo completar la compra');
      }
    } finally {
      setProcessingPlan(null);
    }
  };

  const handleRestorePurchases = async () => {
    setRestoringPurchases(true);
    try {
      await restoreRevenueCatPurchases();
      Alert.alert(
        'Compras Restauradas',
        'Tus compras han sido restauradas exitosamente.',
        [{ text: 'Entendido' }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudieron restaurar las compras');
    } finally {
      setRestoringPurchases(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSelectPlan = async (planId: SubscriptionPlan) => {
    if (planId === 'FREE') {
      Alert.alert('Información', 'Ya estás en el plan Gratis');
      return;
    }

    // Si está en trial, verificar si quiere cambiar de plan o ya tiene el seleccionado
    if (isTrialing()) {
      const daysRemaining = getTrialDaysRemaining();
      const currentTrialPlan = subscription?.plan;

      // Si selecciona el mismo plan que ya tiene en trial
      if (currentTrialPlan === planId) {
        const planName = planId === 'PRO' ? 'Pro' : 'Plus';
        Alert.alert(
          `¡Ya tienes acceso ${planName}!`,
          `Estás en tu periodo de prueba gratuito.\n\nTe quedan ${daysRemaining} día${daysRemaining !== 1 ? 's' : ''} de acceso completo a todas las funciones ${planName}.\n\nNo necesitas hacer nada más por ahora. Disfruta tu trial.`
        );
        return;
      }

      // Si quiere cambiar de plan durante el trial (ej: PLUS -> PRO o PRO -> PLUS)
      const currentPlanName = currentTrialPlan === 'PRO' ? 'Pro' : 'Plus';
      const newPlanName = planId === 'PRO' ? 'Pro' : 'Plus';
      Alert.alert(
        `Cambiar a ${newPlanName}`,
        `Actualmente estás probando ${currentPlanName}.\n\n¿Deseas cambiar tu trial a ${newPlanName}?\n\nTe quedan ${daysRemaining} día${daysRemaining !== 1 ? 's' : ''} de prueba que continuarán con el nuevo plan.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Cambiar Plan', onPress: () => processChangePlanInTrial(planId) },
        ]
      );
      return;
    }

    // Si ya tiene este plan pagado, no hacer nada
    if (subscription && subscription.plan === planId && subscription.status === 'ACTIVE') {
      Alert.alert('Información', `Ya tienes el plan ${planId}`);
      return;
    }

    // Obtener información del plan
    const selectedPlan = plans.find(p => p.id === planId);
    if (!selectedPlan) return;

    // Si el usuario puede usar trial (FREE y no ha usado trial antes)
    const canStartTrial = subscription?.canUseTrial && subscription?.plan === 'FREE';

    if (canStartTrial) {
      // Los días y el plan salen del servidor. Cuando el servidor concede un
      // plan fijo, la pantalla anuncia ESE plan y no el que el usuario tocó:
      // celebrar "Plus" a alguien que va a recibir Pro es empezar mintiendo.
      const nombrePlanTrial = planDelTrial
        ? (planDelTrial === 'PRO' ? 'Pro' : 'Plus')
        : selectedPlan.name;

      Alert.alert(
        'Iniciar Período de Prueba',
        `¡Obtén ${diasDeTrial} días GRATIS de ${nombrePlanTrial}!\n\n• Acceso completo a todas las funciones\n• Sin necesidad de tarjeta de crédito\n• Cancela cuando quieras\n\nAl finalizar los ${diasDeTrial} días, podrás decidir si quieres continuar.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Iniciar', onPress: () => processStartTrial(planId) },
        ]
      );
    } else {
      // Usuario ya usó trial - comprar suscripción

      if (isIOS) {
        // iOS: Compra nativa via RevenueCat / App Store
        const rcPrice = getRCPrice(planId, billingPeriod);
        const periodText = billingPeriod === 'yearly' ? 'año' : 'mes';

        Alert.alert(
          'Confirmar Suscripción',
          `Estás a punto de suscribirte a ${selectedPlan.name} por ${rcPrice || `$${(billingPeriod === 'yearly' ? selectedPlan.price.yearly : selectedPlan.price.monthly).toFixed(2)}`}/${periodText}.\n\n• Cancela en cualquier momento\n• Pago seguro via App Store`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Continuar', onPress: () => processRCPurchase(planId) },
          ]
        );
      } else {
        // Android: Mantener flujo Stripe existente
        const planPrice = typeof selectedPlan.price === 'object' && selectedPlan.price !== null
          ? (billingPeriod === 'yearly' ? (selectedPlan.price.yearly ?? 0) : (selectedPlan.price.monthly ?? 0))
          : (typeof selectedPlan.price === 'number' ? selectedPlan.price : 0);

        const periodText = billingPeriod === 'yearly' ? 'año' : 'mes';
        const savingsText = billingPeriod === 'yearly' ? '\n• ¡Ahorras 17% con el plan anual!' : '';

        Alert.alert(
          'Confirmar Suscripción',
          `Estás a punto de suscribirte a ${selectedPlan.name} por $${planPrice.toFixed(2)}/${periodText}.${savingsText}\n\n• Cancela en cualquier momento\n• Pago seguro con Stripe\n\n¿Deseas continuar?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Continuar', onPress: () => processCheckout(planId) },
          ]
        );
      }
    }
  };

  const processCheckout = async (planId: SubscriptionPlan) => {
    setProcessingPlan(planId);

    try {
      const { url, sessionId } = await createCheckout(planId as 'PREMIUM' | 'PRO', billingPeriod);
      logger.log('Checkout session created:', sessionId);

      // Mostrar modal de advertencia requerido por Apple antes de abrir navegador externo
      Alert.alert(
        'Serás redirigido',
        'El pago se procesará de forma segura en una página web externa (Stripe).\n\nAl completar el pago, regresarás automáticamente a FinZen AI.',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => {
              logger.log('Usuario canceló redirección a Stripe');
            }
          },
          {
            text: 'Continuar',
            onPress: async () => {
              try {
                const supported = await Linking.canOpenURL(url);
                if (supported) {
                  logger.log('Abriendo navegador externo para checkout:', url);
                  await Linking.openURL(url);
                } else {
                  logger.error('No se puede abrir la URL:', url);
                  Alert.alert('Error', 'No se pudo abrir el navegador para completar el pago');
                }
              } catch (linkError: any) {
                logger.error('Error abriendo URL:', linkError);
                Alert.alert('Error', 'No se pudo abrir el navegador para completar el pago');
              }
            }
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo crear la sesión de pago');
    } finally {
      setProcessingPlan(null);
    }
  };

  const processStartTrial = async (planId: SubscriptionPlan) => {
    setProcessingPlan(planId);

    try {
      await startTrial(planId as 'PREMIUM' | 'PRO');
      logger.log('✅ Trial iniciado exitosamente para plan:', planId);

      Alert.alert(
        '¡Felicidades! 🎉',
        // El plan concedido manda sobre el que se tocó, por lo mismo de arriba.
        `Tu período de prueba de ${diasDeTrial} días ha comenzado.\n\nAhora tienes acceso completo a todas las funciones de ${(planDelTrial ?? planId) === 'PREMIUM' ? 'Plus' : 'Pro'}.\n\n¡Disfruta la experiencia!`,
        [{ text: 'Entendido', style: 'default' }]
      );
    } catch (error: any) {
      logger.error('Error iniciando trial:', error);

      // Refrescar suscripción para obtener canUseTrial actualizado del backend
      await fetchSubscription();

      // Si el trial falló por dispositivo ya usado, ofrecer compra directa
      const isDeviceOrTrialUsed =
        error.message?.includes('dispositivo') ||
        error.message?.includes('período de prueba');

      if (isDeviceOrTrialUsed) {
        Alert.alert(
          'Trial no disponible',
          'Este dispositivo ya utilizó el período de prueba. ¿Deseas suscribirte directamente?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Suscribirme',
              onPress: () => {
                if (isIOS) {
                  processRCPurchase(planId);
                } else {
                  processCheckout(planId);
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', error.message || 'No se pudo iniciar el período de prueba');
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
      Alert.alert(
        '¡Plan Cambiado!',
        `Tu trial ahora es de ${planName}.\n\nTus días restantes de prueba continúan con el nuevo plan.`,
        [{ text: 'Entendido', style: 'default' }]
      );

      // Refrescar suscripción
      await fetchSubscription();
    } catch (error: any) {
      logger.error('Error cambiando plan en trial:', error);
      Alert.alert('Error', error.message || 'No se pudo cambiar el plan');
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
            onViewPayments={() => onViewPayments?.()}
            rcPriceString={isIOS ? (getRCPrice(subscription.plan as SubscriptionPlan, 'monthly') || undefined) : undefined}
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
          {plans.map((plan) => {
            const rcPkg = isIOS ? getRCPackage(plan.id as SubscriptionPlan, billingPeriod) : null;
            return (
              <PlanCard
                key={plan.id}
                plan={plan}
                currentPlan={subscription?.plan || 'FREE'}
                onSelect={handleSelectPlan}
                disabled={processingPlan !== null}
                billingPeriod={billingPeriod}
                rcPriceString={rcPkg?.product.priceString || undefined}
                rcYearlyPriceNum={isIOS && billingPeriod === 'yearly' ? (rcPkg?.product.price || undefined) : undefined}
                trialDays={diasDeTrial}
                trialGrantedPlan={planDelTrial}
              />
            );
          })}
        </View>

        {/* Restore Purchases Button (iOS only, required by Apple) */}
        {isIOS && (
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestorePurchases}
            disabled={restoringPurchases}
          >
            {restoringPurchases ? (
              <ActivityIndicator size="small" color="#6C47FF" />
            ) : (
              <>
                <Ionicons name="refresh" size={18} color="#6C47FF" />
                <Text style={styles.restoreButtonText}>Restaurar Compras</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Footer Info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {inTrial
              ? `• Tu trial termina en ${trialDaysLeft} día${trialDaysLeft !== 1 ? 's' : ''}\n• No se te cobrará durante el trial\n• Cancela cuando quieras`
              : isIOS
                ? `• Cancela en cualquier momento desde Ajustes > Suscripciones\n• El pago se cargará a tu cuenta de Apple ID\n• La suscripción se renueva automáticamente a menos que la canceles al menos 24 horas antes del fin del período actual`
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
          rcPrices={isIOS ? {
            premiumMonthly: getRCPrice('PREMIUM', 'monthly') || undefined,
            proMonthly: getRCPrice('PRO', 'monthly') || undefined,
          } : undefined}
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
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginBottom: 16,
    gap: 8,
  },
  restoreButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C47FF',
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
