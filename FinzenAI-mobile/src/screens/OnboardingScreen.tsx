import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../stores/auth';
import ZenioChat from '../components/ZenioChat';
import HelpCenterScreen from './HelpCenterScreen';
import api, { configAPI, onboardingAPI } from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomModal from '../components/modals/CustomModal';

import { logger } from '../utils/logger';
export default function OnboardingScreen() {
  const navigation = useNavigation<any>();
  const { user, updateUser } = useAuthStore();
  const [onboardingFinished, setOnboardingFinished] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  // Si el feature flag está activo, este usuario está en grupo "menos fricción":
  // 1) se omite el HelpCenter automático (y modal "Ver Planes" encadenado),
  // 2) se usa el endpoint POST /auth/onboarding/complete (con validación) en lugar
  //    del PUT directo a /auth/profile. Falla segura: si el endpoint falla, se
  //    mantiene comportamiento actual (legacy).
  const [reduceFrictionEnabled, setReduceFrictionEnabled] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completingErrorMsg, setCompletingErrorMsg] = useState<string | null>(null);

  // Rastrear si el backend ya completó el onboarding (v2.1 via flag)
  const backendCompletedRef = React.useRef(false);

  // Track mount status para evitar setState tras unmount cuando hay request en vuelo.
  const mountedRef = React.useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await configAPI.getFeatures();
        if (!cancelled) {
          setReduceFrictionEnabled(!!res.data?.onboardingSkipEnabled);
        }
      } catch (err) {
        logger.error('[Onboarding] Error cargando features:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Handler para detectar el fin del onboarding desde ZenioChat
  const handleZenioMessage = async (msg: string, responseData?: any) => {
    // Si el backend envía el flag onboardingCompleted, registrarlo pero NO mostrar
    // el botón "Continuar" todavía — Zenio puede seguir hablando (ej: ofrecer primer gasto).
    if (responseData?.onboardingCompleted === true) {
      backendCompletedRef.current = true;
    }

    // Detección por keywords para mostrar el botón "Continuar".
    // En v2.1: el flag ya se recibió antes, y ahora Zenio envía el mensaje de cierre.
    // En onboarding actual: los keywords son la única señal.
    const lowerMsg = msg.toLowerCase();
    const completedByKeywords = msg && (
      // Frases del onboarding actual
      lowerMsg.includes('ya tengo toda la información') ||
      lowerMsg.includes('tu perfil está listo') ||
      lowerMsg.includes('te veo en el dashboard') ||
      lowerMsg.includes('ahora puedes comenzar a usar todas las herramientas') ||
      lowerMsg.includes('ha sido un placer conocerte') ||
      lowerMsg.includes('copiloto financiero personal') ||
      (lowerMsg.includes('perfil') && lowerMsg.includes('listo')) ||
      (lowerMsg.includes('toda la información') && lowerMsg.includes('necesito')) ||
      (lowerMsg.includes('herramientas') && lowerMsg.includes('finzen')) ||
      lowerMsg.includes('perfil completado') ||
      lowerMsg.includes('onboarding completado') ||
      lowerMsg.includes('configuración terminada') ||
      (lowerMsg.includes('todo listo') && lowerMsg.includes('perfil')) ||
      lowerMsg.includes('ya puedes empezar') ||
      lowerMsg.includes('estás listo para usar') ||
      lowerMsg.includes('onboarding finalizado') ||
      lowerMsg.includes('tu perfil ha sido registrado') ||
      lowerMsg.includes('perfil registrado') ||
      lowerMsg.includes('camino hacia una mejor planificación') ||
      lowerMsg.includes('acompañarte en tu camino') ||
      lowerMsg.includes('registrado y preparado') ||
      lowerMsg.includes('cuando estés listo') ||
      lowerMsg.includes('planificación financiera plena') ||
      // Keywords v2.1
      lowerMsg.includes('presupuestos activos') ||
      (lowerMsg.includes('meta de') && lowerMsg.includes('en marcha')) ||
      (lowerMsg.includes('plan de pago') && lowerMsg.includes('activo')) ||
      lowerMsg.includes('tu perfil está registrado y') ||
      lowerMsg.includes('— zenio, tu copiloto financiero')
    );

    if (completedByKeywords) {
      Keyboard.dismiss();
      setOnboardingFinished(true);

      // En modo "menos fricción": NO hacer PUT preventivo aquí.
      // La verificación + marca de completed se hace al tap del botón Continuar
      // vía onboardingAPI.complete() que valida que exista perfil.
      // En modo legacy: comportamiento actual (PUT preventivo).
      if (!reduceFrictionEnabled && !backendCompletedRef.current) {
        try {
          const profileResponse = await api.get('/auth/profile');
          const currentProfile = profileResponse.data;

          await api.put('/auth/profile', {
            ...currentProfile,
            onboardingCompleted: true
          });
        } catch (error: any) {
          logger.error('Error marcando onboarding como completado:', error.message);
          Alert.alert(
            'Advertencia',
            'No se pudo guardar tu progreso. Por favor verifica tu conexión.',
            [{ text: 'OK' }]
          );
        }
      }
    }
  };

  // Salida alternativa cuando el complete falla con 409 (perfil incompleto).
  // Usa el mismo flow que el botón Skip de la pantalla de bienvenida.
  const handleSkipFromError = async () => {
    setCompletingErrorMsg(null);
    try {
      const res = await onboardingAPI.skip();
      const updatedUser = res.data?.user;
      if (updatedUser && user) {
        updateUser({ ...user, ...updatedUser, onboardingCompleted: true });
      }
    } catch (err: any) {
      logger.error('[Onboarding] Error en skip desde error modal:', err);
      Alert.alert(
        'Error',
        'No pudimos saltar la personalización. Verifica tu conexión.'
      );
    }
  };

  const handleContinue = async () => {
    if (completing) return;

    if (reduceFrictionEnabled) {
      // Modo "menos fricción": validar y marcar completed vía endpoint nuevo.
      // Si NO hay perfil financiero en la tabla Onboarding (LLM no invocó la función),
      // el backend devuelve 409 → ofrecemos al user reintentar el chat o saltar.
      setCompleting(true);
      try {
        const res = await onboardingAPI.complete();
        if (!mountedRef.current) return;
        const updatedUser = res.data?.user;
        // Setear completing=false ANTES de updateUser para evitar setState
        // sobre componente desmontado (updateUser dispara navegación inmediata).
        setCompleting(false);
        if (updatedUser && user) {
          updateUser({ ...user, ...updatedUser, onboardingCompleted: true });
        }
        // AppNavigator detecta el cambio y navega al Main automáticamente.
        // No setear AsyncStorage flag (HelpCenter ya gateado en este modo).
      } catch (err: any) {
        if (!mountedRef.current) return;
        setCompleting(false);
        const status = err?.response?.status;
        const code = err?.response?.data?.code;
        if (status === 409 && code === 'ONBOARDING_PROFILE_MISSING') {
          // Bug del LLM: dijo keywords pero no invocó onboarding_financiero.
          // Ocultar el botón "Continuar" y ofrecer salida en un modal.
          logger.error('[Onboarding] Backend rechazó complete por perfil faltante');
          setOnboardingFinished(false);
          setCompletingErrorMsg(
            'No pudimos guardar tu perfil financiero. Puedes seguir el chat con Zenio para terminarlo, o saltar la personalización por ahora.'
          );
        } else {
          logger.error('[Onboarding] Error completando:', err);
          Alert.alert(
            'Error',
            'No pudimos guardar tu progreso. Verifica tu conexión e intenta de nuevo.'
          );
        }
      }
      return;
    }

    // Modo legacy (sin "menos fricción"): comportamiento actual.
    // El PUT preventivo ya se hizo en handleZenioMessage.
    // Setear flag para que MainNavigator abra el HelpCenter.
    await AsyncStorage.setItem('openHelpCenterAfterOnboarding', 'true');
    if (user) {
      updateUser({ ...user, onboardingCompleted: true });
    }
  };

  const handleCloseHelpCenter = () => {
    setShowHelpCenter(false);

    // AHORA SÍ actualizar el store para que el AppNavigator cambie a MainNavigator
    if (user) {
      updateUser({ ...user, onboardingCompleted: true });
    }

    // Navegar al Dashboard
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  return (
    <>
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo y título */}
        <View style={styles.header}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>Tu copiloto financiero</Text>
        </View>

        <Text style={styles.title}>Onboarding con Zenio</Text>

        {/* Chat de Zenio con KeyboardAvoidingView */}
        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
        >
          <ZenioChat
            isOnboarding={true}
            initialMessage="Hola Zenio, soy nuevo y quiero empezar mi onboarding"
            onZenioMessage={handleZenioMessage}
          />
        </KeyboardAvoidingView>
      </View>

      {/* Botón para continuar - POSICIÓN ABSOLUTA en la parte inferior */}
      {onboardingFinished && (
        <View style={styles.continueButtonContainer}>
          <TouchableOpacity
            style={[styles.continueButton, completing && { opacity: 0.6 }]}
            onPress={handleContinue}
            disabled={completing}
          >
            <Text style={styles.continueButtonText}>
              {completing ? 'Guardando…' : 'Continuar'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>

    {/* Modal del Centro de Ayuda - FUERA del SafeAreaView */}
    <Modal
      visible={showHelpCenter}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleCloseHelpCenter}
    >
      <HelpCenterScreen onClose={handleCloseHelpCenter} />
    </Modal>

    {/* Modal de error cuando el backend rechaza complete por perfil faltante.
        Solo aparece en modo "menos fricción" — ofrece al user dos salidas:
        seguir el chat o saltar la personalización. */}
    <CustomModal
      visible={!!completingErrorMsg}
      type="warning"
      title="No pudimos guardar tu perfil"
      message={completingErrorMsg || ''}
      buttonText="Saltar personalización"
      showSecondaryButton={true}
      secondaryButtonText="Seguir con Zenio"
      onClose={handleSkipFromError}
      onSecondaryPress={() => setCompletingErrorMsg(null)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f6ff', // Gradiente azul claro como en web
  },
  content: {
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: 'white',
    margin: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    width: 56,
    height: 56,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563EB',
    textAlign: 'center',
    marginBottom: 8,
  },
  chatContainer: {
    flex: 1,
    marginBottom: 4,
  },
  continueButtonContainer: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    backgroundColor: 'transparent',
  },
  continueButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 16,
    shadowColor: '#2563EB',
    shadowOffset: {
      width: 0,
      height: 4,
    },
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
});