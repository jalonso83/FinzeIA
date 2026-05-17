import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/auth';
import ZenioChat from '../components/ZenioChat';
import api from '../utils/api';
import { logger } from '../utils/logger';

type Step = 'welcome' | 'chat';

interface RePersonalizationScreenProps {
  onClose: () => void;
}

/**
 * Pantalla de re-personalización (modal full-screen invocado desde el menú de perfil).
 *
 * Tres flujos posibles:
 *   1. welcome → tap Continuar → chat → tap Continuar (al completar) → cierra modal
 *   2. welcome → tap Abandonar → cierra modal sin guardar nada
 *   3. chat → tap X arriba → confirmación inline → cierra modal o vuelve al chat
 *
 * No anidamos Modal en iOS (regla del proyecto): la confirmación de abandono
 * es un overlay con position: absolute dentro del mismo Modal padre.
 */
export default function RePersonalizationScreen({ onClose }: RePersonalizationScreenProps) {
  const { user, updateUser } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<Step>('welcome');
  const [chatFinished, setChatFinished] = useState(false);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Detecta cuando el backend confirma que el perfil fue actualizado.
  // 1. PATH IDEAL: backend devuelve responseData.onboardingCompleted=true cuando
  //    Zenio invoca onboarding_financiero correctamente → upsert hecho.
  // 2. PATH FALLBACK: el LLM a veces dice el mensaje de cierre sin invocar la
  //    función (mismo bug que rompió a los 205 usuarios originales). Detectamos
  //    las frases EXACTAS de cierre que pusimos en el prompt (reglas 4 y 6 del
  //    rePersonalizationContext en zenioV2.ts). Si matchean, mostramos el botón
  //    aunque el upsert no haya pasado. El user puede salir; el perfil queda
  //    como estaba (no se rompe nada porque ya era completed antes).
  const handleZenioMessage = (msg: string, responseData?: any) => {
    if (responseData?.onboardingCompleted === true) {
      Keyboard.dismiss();
      setChatFinished(true);
      return;
    }
    const lower = (msg || '').toLowerCase();
    const isClosingMessage =
      lower.includes('tu perfil ha sido actualizado') ||
      lower.includes('tu personalización está lista') ||
      lower.includes('pulsa continuar para guardar') ||
      lower.includes('recomendaciones más alineadas a tu momento actual');
    if (isClosingMessage) {
      Keyboard.dismiss();
      setChatFinished(true);
    }
  };

  // Al tap "Continuar" tras chat completado: refresca el perfil del backend
  // (para tener datos frescos en el store) y cierra el modal.
  const handleContinueAfterChat = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const res = await api.get('/auth/profile');
      if (res.data && user) {
        updateUser({ ...user, ...res.data });
      }
    } catch (err) {
      logger.error('[RePersonalization] Error refrescando perfil:', err);
      // Aunque falle el refresh, igual cerramos — el upsert ya pasó en el backend.
    } finally {
      setRefreshing(false);
      onClose();
    }
  };

  const handleAbandonRequest = () => {
    if (view === 'welcome') {
      // En welcome no hay nada que abandonar — cierre directo.
      onClose();
      return;
    }
    setShowAbandonConfirm(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      {view === 'welcome' && (
        <View style={styles.card}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.header}>
              <Image
                source={require('../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.subtitle}>Tu copiloto financiero</Text>
            </View>

            <Text style={styles.welcomeTitle}>
              ¡Hola {user?.name || ''}! 👋
            </Text>

            <Text style={styles.welcomeText}>
              Vamos a actualizar tu personalización con Zenio.{'\n\n'}
              Tus prioridades pueden haber cambiado, tus metas evolucionan, y tu experiencia financiera debe acompañarte. Por eso es bueno revisarla de vez en cuando.{'\n\n'}
              Te haré las mismas preguntas pero con tus respuestas de hoy. Esto reemplazará tu perfil actual y Zenio podrá darte recomendaciones más alineadas a tu momento actual. 😉
            </Text>

            <View style={styles.buttonsRow}>
              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleAbandonRequest}
              >
                <Text style={styles.skipButtonText}>Abandonar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.beginButton}
                onPress={() => setView('chat')}
              >
                <Text style={styles.beginButtonText}>Continuar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}

      {view === 'chat' && (
        <View style={styles.chatWrapper}>
          {/* Header del chat con botón X para abandonar */}
          <View style={styles.chatHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleAbandonRequest}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={26} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.chatTitle}>Personalización con Zenio</Text>
            <View style={styles.headerSpacer} />
          </View>

          <KeyboardAvoidingView
            style={styles.chatContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
          >
            <ZenioChat
              isOnboarding={true}
              isRePersonalization={true}
              // disableTTS=true porque vivimos dentro de un Modal — el CustomModal
              // interno de "Función PRO" rompería en iOS si se anidan dos Modales.
              disableTTS={true}
              initialMessage="Hola Zenio, quiero actualizar mi perfil"
              onZenioMessage={handleZenioMessage}
            />
          </KeyboardAvoidingView>

          {chatFinished && (
            <View style={[styles.continueButtonContainer, { paddingBottom: Math.max(insets.bottom + 12, 16) }]}>
              <TouchableOpacity
                style={[styles.continueButton, refreshing && { opacity: 0.6 }]}
                onPress={handleContinueAfterChat}
                disabled={refreshing}
              >
                <Text style={styles.continueButtonText}>
                  {refreshing ? 'Guardando…' : 'Continuar'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Overlay de confirmación de abandono — inline para no anidar Modal en iOS */}
      {showAbandonConfirm && (
        <View style={styles.abandonOverlay} pointerEvents="auto">
          <View style={styles.abandonDialog}>
            <View style={styles.abandonIconCircle}>
              <Ionicons name="warning" size={48} color="#FFFFFF" />
            </View>
            <Text style={styles.abandonTitle}>¿Abandonar?</Text>
            <Text style={styles.abandonMessage}>
              Si abandonas ahora, tu perfil actual no se actualizará. Tus respuestas se perderán.
            </Text>
            <View style={styles.abandonButtonsRow}>
              <TouchableOpacity
                style={styles.abandonSecondary}
                onPress={() => setShowAbandonConfirm(false)}
              >
                <Text style={styles.abandonSecondaryText}>Seguir editando</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.abandonPrimary}
                onPress={() => {
                  setShowAbandonConfirm(false);
                  onClose();
                }}
              >
                <Text style={styles.abandonPrimaryText}>Sí, abandonar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f6ff',
  },
  // ===== WELCOME =====
  card: {
    flex: 1,
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
    overflow: 'hidden',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 112,
    height: 112,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  welcomeTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#2563EB',
    textAlign: 'center',
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 18,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 8,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginTop: 32,
    gap: 12,
    paddingHorizontal: 4,
  },
  beginButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  beginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    paddingVertical: 10, // 2px menos para compensar borderWidth y alinear con beginButton
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  // ===== CHAT =====
  chatWrapper: {
    flex: 1,
    backgroundColor: 'white',
    margin: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  chatContainer: {
    flex: 1,
  },
  // Container del botón "Continuar" tras completar el chat.
  // Cubre toda el área inferior con fondo opaco para tapar el input del ZenioChat —
  // así el user no puede seguir escribiendo y queda claro que el flujo terminó.
  // paddingBottom se aplica dinámicamente con useSafeAreaInsets para respetar
  // el área segura de iPhones con notch/Dynamic Island.
  continueButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    zIndex: 10,
    elevation: 10,
  },
  continueButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 16,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  // ===== ABANDON CONFIRM =====
  abandonOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    // En Android, elevation manda sobre zIndex. El chatWrapper tiene elevation: 8,
    // así que necesitamos elevation mayor para que el overlay quede encima.
    zIndex: 100,
    elevation: 100,
  },
  abandonDialog: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 110, // arriba del overlay (Android: elevation > zIndex)
  },
  abandonIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  abandonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 12,
  },
  abandonMessage: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  abandonButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  abandonSecondary: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abandonSecondaryText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '600',
  },
  abandonPrimary: {
    flex: 1,
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abandonPrimaryText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});
