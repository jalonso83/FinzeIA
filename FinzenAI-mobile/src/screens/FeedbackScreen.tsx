import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import api from '../utils/api';
import CustomModal from '../components/modals/CustomModal';
import { logger } from '../utils/logger';

interface FeedbackScreenProps {
  onClose: () => void;
  onSuccess: (message: string) => void;
}

type FeedbackType = 'BUG' | 'SUGGESTION' | 'OTHER';

interface ModuleOption {
  value: string;
  label: string;
}

const TYPE_OPTIONS: { value: FeedbackType; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { value: 'BUG', label: 'Bug', icon: 'bug', color: '#dc2626' },
  { value: 'SUGGESTION', label: 'Sugerencia', icon: 'bulb', color: '#f59e0b' },
  { value: 'OTHER', label: 'Otro', icon: 'chatbubble-ellipses', color: '#6366f1' },
];

const MODULE_OPTIONS: ModuleOption[] = [
  { value: 'dashboard', label: 'Dashboard / Inicio' },
  { value: 'transactions', label: 'Transacciones' },
  { value: 'budgets', label: 'Presupuestos' },
  { value: 'goals', label: 'Metas' },
  { value: 'zenio', label: 'Zenio (Asistente IA)' },
  { value: 'tools', label: 'Calculadoras y Herramientas' },
  { value: 'subscriptions', label: 'Suscripciones y Pagos' },
  { value: 'email_sync', label: 'Email Bancario' },
  { value: 'notifications', label: 'Notificaciones y Recordatorios' },
  { value: 'gamification', label: 'Gamificación' },
  { value: 'auth', label: 'Login / Registro' },
  { value: 'other', label: 'Otro' },
];

const MIN_MESSAGE = 10;
const MAX_MESSAGE = 2000;

export default function FeedbackScreen({ onClose, onSuccess }: FeedbackScreenProps) {
  const [type, setType] = useState<FeedbackType>('BUG');
  const [moduleValue, setModuleValue] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModuleDropdown, setShowModuleDropdown] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const selectedModule = MODULE_OPTIONS.find((m) => m.value === moduleValue);
  const trimmedMessage = message.trim();
  const messageValid = trimmedMessage.length >= MIN_MESSAGE && trimmedMessage.length <= MAX_MESSAGE;
  const moduleValid = moduleValue !== null;
  const canSubmit = !loading && messageValid && moduleValid;

  const handleSubmit = async () => {
    if (!canSubmit) {
      if (!moduleValid) {
        setErrorMessage('Selecciona el módulo al que se refiere tu feedback.');
      } else if (trimmedMessage.length < MIN_MESSAGE) {
        setErrorMessage(`El mensaje debe tener al menos ${MIN_MESSAGE} caracteres.`);
      } else if (trimmedMessage.length > MAX_MESSAGE) {
        setErrorMessage(`El mensaje no puede exceder ${MAX_MESSAGE} caracteres.`);
      }
      setShowErrorModal(true);
      return;
    }

    setLoading(true);
    try {
      const appVersion = Constants.expoConfig?.version ?? null;
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';

      await api.post('/feedback', {
        type,
        module: moduleValue,
        message: trimmedMessage,
        appVersion,
        platform,
      });

      onSuccess('¡Gracias por tu feedback! Lo revisaremos pronto.');
    } catch (err: any) {
      logger.error('[FeedbackScreen] Error enviando:', err);
      const apiMessage = err?.response?.data?.error || err?.response?.data?.message;
      const isRateLimit = err?.response?.status === 429;

      if (isRateLimit) {
        setErrorMessage('Has enviado mucho feedback. Intenta de nuevo en 1 hora.');
      } else if (apiMessage) {
        setErrorMessage(apiMessage);
      } else {
        setErrorMessage('No pudimos enviar tu feedback. Verifica tu conexión e intenta de nuevo.');
      }
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={26} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Enviar Feedback</Text>
          <View style={styles.closeButton} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Intro */}
          <Text style={styles.intro}>
            Cuéntanos qué pasó. Tu feedback nos ayuda a mejorar FinZen AI para todos.
          </Text>

          {/* Tipo */}
          <Text style={styles.label}>Tipo de feedback</Text>
          <View style={styles.typeRow}>
            {TYPE_OPTIONS.map((opt) => {
              const selected = type === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.typeChip,
                    selected && { backgroundColor: opt.color, borderColor: opt.color },
                  ]}
                  onPress={() => setType(opt.value)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={opt.icon}
                    size={18}
                    color={selected ? '#fff' : opt.color}
                  />
                  <Text
                    style={[
                      styles.typeChipText,
                      selected && { color: '#fff' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Módulo */}
          <Text style={styles.label}>Módulo</Text>
          <TouchableOpacity
            style={styles.dropdownTrigger}
            onPress={() => setShowModuleDropdown(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.dropdownText, !selectedModule && styles.dropdownPlaceholder]}>
              {selectedModule?.label ?? 'Selecciona un módulo'}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#64748b" />
          </TouchableOpacity>

          {/* Mensaje */}
          <View style={styles.messageHeader}>
            <Text style={styles.label}>Cuéntanos qué pasó</Text>
            <Text
              style={[
                styles.charCount,
                trimmedMessage.length > MAX_MESSAGE && styles.charCountError,
              ]}
            >
              {trimmedMessage.length}/{MAX_MESSAGE}
            </Text>
          </View>
          <TextInput
            style={styles.textArea}
            placeholder={
              type === 'BUG'
                ? 'Describe qué estabas haciendo, qué pasó y qué esperabas...'
                : type === 'SUGGESTION'
                  ? 'Cuéntanos tu idea para mejorar la app...'
                  : 'Comparte tu comentario...'
            }
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={8}
            value={message}
            onChangeText={setMessage}
            maxLength={MAX_MESSAGE + 100}
            textAlignVertical="top"
          />
          {trimmedMessage.length > 0 && trimmedMessage.length < MIN_MESSAGE && (
            <Text style={styles.helperError}>
              Mínimo {MIN_MESSAGE} caracteres ({MIN_MESSAGE - trimmedMessage.length} más)
            </Text>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={styles.submitButtonText}>Enviar feedback</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.privacyNote}>
            Enviado como {''}
            <Text style={{ fontWeight: '600' }}>FinZen AI</Text>{' '}
            v{Constants.expoConfig?.version ?? '?'} • {Platform.OS === 'ios' ? 'iOS' : 'Android'}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Module Dropdown Modal */}
      <Modal
        visible={showModuleDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModuleDropdown(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowModuleDropdown(false)}
        >
          <View style={styles.dropdownMenu}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownHeaderText}>Selecciona el módulo</Text>
              <TouchableOpacity onPress={() => setShowModuleDropdown(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {MODULE_OPTIONS.map((opt) => {
                const selected = opt.value === moduleValue;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.dropdownItem, selected && styles.dropdownItemSelected]}
                    onPress={() => {
                      setModuleValue(opt.value);
                      setShowModuleDropdown(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        selected && styles.dropdownItemTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {selected && <Ionicons name="checkmark" size={18} color="#2563EB" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Error Modal */}
      <CustomModal
        visible={showErrorModal}
        type="error"
        title="No pudimos enviar"
        message={errorMessage}
        buttonText="Entendido"
        onClose={() => setShowErrorModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
  },
  closeButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  intro: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
    marginTop: 4,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  typeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f8fafc',
    marginBottom: 20,
  },
  dropdownText: {
    fontSize: 14,
    color: '#1e293b',
    flex: 1,
  },
  dropdownPlaceholder: {
    color: '#94a3b8',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
    marginTop: 4,
  },
  charCount: {
    fontSize: 12,
    color: '#94a3b8',
  },
  charCountError: {
    color: '#dc2626',
  },
  textArea: {
    minHeight: 160,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
    lineHeight: 20,
  },
  helperError: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 6,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 28,
  },
  submitButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  privacyNote: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 16,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownMenu: {
    backgroundColor: '#fff',
    borderRadius: 14,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownHeaderText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  dropdownItemSelected: {
    backgroundColor: '#eff6ff',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#374151',
  },
  dropdownItemTextSelected: {
    fontWeight: '600',
    color: '#2563EB',
  },
});
