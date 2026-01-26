import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSubscriptionStore } from '../../stores/subscriptionStore';

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  limitType: 'budgets' | 'goals' | 'zenio' | 'export' | 'exportPdf' | 'reminders' | 'textToSpeech' | 'budgetAlerts' | 'antExpenseAnalysis' | 'advancedCalculators';
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({
  visible,
  onClose,
  limitType,
}) => {
  const { openPlansModal } = useSubscriptionStore();

  // Ocultar teclado cuando el modal se hace visible
  useEffect(() => {
    if (visible) {
      Keyboard.dismiss();
    }
  }, [visible]);

  const getLimitInfo = () => {
    switch (limitType) {
      case 'budgets':
        return {
          icon: 'wallet',
          title: 'Límite de Presupuestos',
          description: 'Has alcanzado el máximo de 2 presupuestos en el plan Gratis.',
        };
      case 'goals':
        return {
          icon: 'trophy',
          title: 'Límite de Metas',
          description: 'Has alcanzado el máximo de 1 meta en el plan Gratis.',
        };
      case 'zenio':
        return {
          icon: 'chatbubble-ellipses',
          title: 'Límite de Zenio AI',
          description: 'Has usado las 15 consultas a Zenio AI de este mes.',
        };
      case 'export':
        return {
          icon: 'download',
          title: 'Exportar Datos',
          description: 'La exportación de datos está disponible en planes Plus y Pro.',
        };
      case 'exportPdf':
        return {
          icon: 'document-text',
          title: 'Exportar a PDF',
          description: 'La exportación a PDF está disponible exclusivamente en el plan Pro.',
        };
      case 'reminders':
        return {
          icon: 'notifications',
          title: 'Límite de Recordatorios',
          description: 'Has alcanzado el máximo de 2 recordatorios de pago en el plan Gratis.',
        };
      case 'textToSpeech':
        return {
          icon: 'volume-high',
          title: 'Respuestas con Voz',
          description: 'Las respuestas de voz de Zenio están disponibles en planes Plus y Pro.',
        };
      case 'budgetAlerts':
        return {
          icon: 'alert-circle',
          title: 'Alertas de Presupuesto',
          description: 'Las alertas de umbral de presupuesto están disponibles en planes Plus y Pro.',
        };
      case 'antExpenseAnalysis':
        return {
          icon: 'bug',
          title: 'Análisis Completo',
          description: 'El análisis completo de gastos hormiga está disponible en planes Plus y Pro.',
        };
      case 'advancedCalculators':
        return {
          icon: 'calculator',
          title: 'Calculadora Avanzada',
          description: 'La calculadora "Gastar o Ahorrar" está disponible en planes Plus y Pro.',
        };
      default:
        return {
          icon: 'lock-closed',
          title: 'Límite Alcanzado',
          description: 'Has alcanzado el límite de tu plan.',
        };
    }
  };

  const limitInfo = getLimitInfo();

  const handleViewPlans = () => {
    onClose();
    openPlansModal();
  };

  return (
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
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            activeOpacity={0.6}
          >
            <View style={styles.closeButtonInner}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </View>
          </TouchableOpacity>

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

          {/* Trial Badge */}
          <View style={styles.trialBadge}>
            <Ionicons name="gift" size={16} color="#059669" />
            <Text style={styles.trialText}>7 días de prueba gratis</Text>
          </View>

          {/* View Plans Button */}
          <TouchableOpacity
            style={styles.viewPlansButton}
            onPress={handleViewPlans}
          >
            <Ionicons name="diamond" size={20} color="#fff" />
            <Text style={styles.viewPlansButtonText}>Ver Planes</Text>
          </TouchableOpacity>

          {/* Continue Button */}
          <TouchableOpacity
            style={styles.continueButton}
            onPress={onClose}
          >
            <Text style={styles.continueButtonText}>Continuar con Gratis</Text>
          </TouchableOpacity>

          {/* Footer */}
          <Text style={styles.footerText}>
            Cancela cuando quieras. Sin compromisos.
          </Text>
        </View>
      </View>
    </Modal>
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
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 8,
  },
  closeButtonInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
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
    fontSize: 20,
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
    paddingHorizontal: 10,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginBottom: 20,
  },
  trialText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  viewPlansButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    marginBottom: 12,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  viewPlansButtonText: {
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
    marginTop: 8,
  },
});

export default UpgradeModal;
