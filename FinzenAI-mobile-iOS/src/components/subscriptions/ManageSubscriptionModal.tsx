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
      'Cancelar Suscripción',
      `¿Estás seguro que deseas cancelar tu suscripción ${subscription.plan}?\n\nTendrás acceso hasta ${new Date(subscription.currentPeriodEnd!).toLocaleDateString('es-ES')}.`,
      [
        { text: 'Mantener', style: 'cancel' },
        {
          text: 'Sí, Cancelar',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await cancelSubscription();
              Alert.alert(
                'Suscripción Cancelada',
                'Tu suscripción ha sido cancelada. Tendrás acceso hasta el final del período de facturación.'
              );
              onClose();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo cancelar la suscripción');
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
        'Suscripción Reactivada',
        '¡Tu suscripción ha sido reactivada exitosamente!'
      );
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo reactivar la suscripción');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePlan = () => {
    const targetPlan = isPremium ? 'PRO' : 'PREMIUM';
    const targetPrice = isPremium ? '$19.99' : '$9.99';

    Alert.alert(
      'Cambiar Plan',
      `¿Deseas ${isPremium ? 'mejorar' : 'cambiar'} a ${targetPlan}?\n\nNuevo precio: ${targetPrice}/mes\n\nEl cambio se aplicará de inmediato con prorrateo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Cambiar',
          onPress: async () => {
            setLoading(true);
            try {
              await changePlan(targetPlan);
              Alert.alert(
                'Plan Cambiado',
                `¡Tu plan ha sido cambiado a ${targetPlan} exitosamente!`
              );
              onClose();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo cambiar el plan');
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
          <Text style={styles.headerTitle}>Gestionar Suscripción</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          {/* Current Plan Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Plan Actual</Text>
            <View style={styles.planBox}>
              <View style={styles.planHeader}>
                <Text style={styles.planName}>{subscription.plan}</Text>
                <Text style={styles.planPrice}>
                  ${subscription.planDetails.price.toFixed(2)}/mes
                </Text>
              </View>
              <Text style={styles.planStatus}>
                Estado: {subscription.status}
                {isCanceled && ' (Se cancelará al final del período)'}
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Acciones</Text>

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
                    {isPremium ? 'Mejorar a Pro' : 'Cambiar a Premium'}
                  </Text>
                  <Text style={styles.actionSubtitle}>
                    {isPremium ? '$19.99/mes' : '$9.99/mes'} • Prorrateo
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
                      Reactivar Suscripción
                    </Text>
                    <Text style={styles.actionSubtitle}>
                      Reanuda tu suscripción ahora
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
                      Cancelar Suscripción
                    </Text>
                    <Text style={styles.actionSubtitle}>
                      Acceso hasta {new Date(subscription.currentPeriodEnd!).toLocaleDateString('es-ES')}
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
              Los cambios en tu suscripción se aplican de inmediato. Puedes cancelar
              en cualquier momento y tendrás acceso hasta el final de tu período de facturación.
            </Text>
          </View>
        </ScrollView>

        {/* Loading Overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#6C47FF" />
              <Text style={styles.loadingText}>Procesando...</Text>
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
