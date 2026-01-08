import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ModalType = 'success' | 'error' | 'warning' | 'info';

interface CustomModalProps {
  visible: boolean;
  type: ModalType;
  title: string;
  message: string;
  buttonText?: string;
  onClose: () => void;
  showSecondaryButton?: boolean;
  secondaryButtonText?: string;
  onSecondaryPress?: () => void;
  customContent?: React.ReactNode;
  hideDefaultButton?: boolean;
}

const CustomModal: React.FC<CustomModalProps> = ({
  visible,
  type,
  title,
  message,
  buttonText = 'Continuar',
  onClose,
  showSecondaryButton = false,
  secondaryButtonText = 'Cancelar',
  onSecondaryPress,
  customContent,
  hideDefaultButton = false,
}) => {
  // Configuración de colores e iconos según el tipo
  const getConfig = () => {
    switch (type) {
      case 'success':
        return {
          iconName: 'checkmark' as const,
          iconColor: '#FFFFFF',
          circleColor: '#10b981',
          shadowColor: '#10b981',
        };
      case 'error':
        return {
          iconName: 'close' as const,
          iconColor: '#FFFFFF',
          circleColor: '#ef4444',
          shadowColor: '#ef4444',
        };
      case 'warning':
        return {
          iconName: 'warning' as const,
          iconColor: '#FFFFFF',
          circleColor: '#f59e0b',
          shadowColor: '#f59e0b',
        };
      case 'info':
        return {
          iconName: 'information' as const,
          iconColor: '#FFFFFF',
          circleColor: '#3b82f6',
          shadowColor: '#3b82f6',
        };
      default:
        return {
          iconName: 'checkmark' as const,
          iconColor: '#FFFFFF',
          circleColor: '#10b981',
          shadowColor: '#10b981',
        };
    }
  };

  const config = getConfig();

  if (!visible) {
    return null;
  }

  return (
    <Modal
      key={visible ? 'modal-open' : 'modal-closed'}
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Icono */}
          <View style={styles.iconContainer}>
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: config.circleColor,
                  shadowColor: config.shadowColor,
                },
              ]}
            >
              <Ionicons name={config.iconName} size={60} color={config.iconColor} />
            </View>
          </View>

          {/* Título */}
          <Text style={styles.title}>{title}</Text>

          {/* Mensaje */}
          {message ? <Text style={styles.message}>{message}</Text> : null}

          {/* Contenido personalizado */}
          {customContent}

          {/* Botones */}
          {!hideDefaultButton && (
          <View style={styles.buttonsContainer}>
            {showSecondaryButton && (
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={onSecondaryPress || onClose}
              >
                <Text style={styles.secondaryButtonText}>{secondaryButtonText}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.button,
                styles.primaryButton,
                showSecondaryButton && styles.buttonHalf,
              ]}
              onPress={onClose}
            >
              <Text style={styles.primaryButtonText}>{buttonText}</Text>
              {!showSecondaryButton && (
                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color="#FFFFFF"
                  style={{ marginLeft: 8 }}
                />
              )}
            </TouchableOpacity>
          </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 9999,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 10000,
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  buttonsContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    flex: 1,
    shadowColor: '#2563EB',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    flex: 1,
  },
  buttonHalf: {
    flex: 1,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButtonText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default CustomModal;
