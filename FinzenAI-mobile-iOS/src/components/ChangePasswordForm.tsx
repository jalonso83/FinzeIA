import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';
import { useAuthStore } from '../stores/auth';

interface ChangePasswordFormProps {
  visible: boolean;
  onClose: () => void;
}

export default function ChangePasswordForm({ visible, onClose }: ChangePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const { logout } = useAuthStore();

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    // Validaciones
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Todos los campos son requeridos');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas nuevas no coinciden');
      setLoading(false);
      return;
    }

    if (currentPassword === newPassword) {
      setError('La nueva contraseña debe ser diferente a la actual');
      setLoading(false);
      return;
    }

    try {
      await api.put('/auth/change-password', {
        currentPassword,
        newPassword
      });

      setSuccess(true);
      
      // Mostrar mensaje de éxito y cerrar sesión después de 3 segundos
      setTimeout(async () => {
        await logout();
        onClose();
      }, 3000);

    } catch (error: any) {
      setError(error.response?.data?.message || 'Error al cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setError('');
    setSuccess(false);
    setLoading(false);
  };

  const handleClose = () => {
    if (!loading && !success) {
      resetForm();
      onClose();
    }
  };

  if (success) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Ionicons name="lock-closed" size={32} color="#059669" />
            </View>
            <Text style={styles.successTitle}>
              ¡Contraseña cambiada exitosamente!
            </Text>
            <Text style={styles.successMessage}>
              Serás redirigido al login para que inicies sesión con tu nueva contraseña.
            </Text>
            <ActivityIndicator size="large" color="#2563EB" style={styles.spinner} />
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Cambiar Contraseña</Text>
            <TouchableOpacity onPress={handleClose} disabled={loading}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* Contraseña actual */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Contraseña actual</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  secureTextEntry={!showCurrentPassword}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Ingresa tu contraseña actual"
                  editable={!loading}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  disabled={loading}
                >
                  <Ionicons 
                    name={showCurrentPassword ? 'eye-off' : 'eye'} 
                    size={20} 
                    color="#64748b" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Nueva contraseña */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nueva contraseña</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  secureTextEntry={!showNewPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Ingresa tu nueva contraseña"
                  editable={!loading}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  disabled={loading}
                >
                  <Ionicons 
                    name={showNewPassword ? 'eye-off' : 'eye'} 
                    size={20} 
                    color="#64748b" 
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.hint}>Mínimo 6 caracteres</Text>
            </View>

            {/* Confirmar nueva contraseña */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirmar nueva contraseña</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirma tu nueva contraseña"
                  editable={!loading}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                >
                  <Ionicons 
                    name={showConfirmPassword ? 'eye-off' : 'eye'} 
                    size={20} 
                    color="#64748b" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Error */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Botones */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.cancelButton, loading && styles.disabledButton]}
                onPress={handleClose}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.changeButton, loading && styles.disabledButton]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.changeButtonText}>Cambiar Contraseña</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
  },
  content: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  eyeButton: {
    padding: 12,
  },
  hint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  changeButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  changeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  successContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 32,
    width: '85%',
    maxWidth: 320,
    alignItems: 'center',
  },
  successIcon: {
    width: 64,
    height: 64,
    backgroundColor: '#ecfdf5',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  spinner: {
    marginTop: 8,
  },
});