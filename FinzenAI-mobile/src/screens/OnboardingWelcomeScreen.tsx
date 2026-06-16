import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../stores/auth';
import { onboardingAPI, configAPI } from '../utils/api';
import CustomModal from '../components/modals/CustomModal';
import { logger } from '../utils/logger';

export default function OnboardingWelcomeScreen() {
  const navigation = useNavigation<any>();
  const { user, updateUser } = useAuthStore();

  const [skipEnabled, setSkipEnabled] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [skipErrorMsg, setSkipErrorMsg] = useState<string | null>(null);

  // Track mount status para evitar setState tras unmount cuando hay request en vuelo.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Lee feature flag desde backend al montar.
  // Si falla (red, 401, etc.) deja el botón oculto — falla de forma segura.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await configAPI.getFeatures();
        if (!cancelled) {
          setSkipEnabled(!!res.data?.onboardingSkipEnabled);
        }
      } catch (err) {
        logger.error('[OnboardingWelcome] Error cargando features:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const navigateToOnboarding = () => {
    navigation.navigate('Onboarding');
  };

  const handleSkip = async () => {
    if (skipping) return;
    setSkipping(true);
    try {
      const res = await onboardingAPI.skip();
      if (!mountedRef.current) return;
      const updatedUser = res.data?.user;
      if (updatedUser && user) {
        updateUser({ ...user, ...updatedUser, onboardingCompleted: true });
      }
      setShowSkipConfirm(false);
      // El AppNavigator detectará onboardingCompleted=true y navegará al Main automáticamente.
    } catch (err: any) {
      logger.error('[OnboardingWelcome] Error saltando onboarding:', err);
      if (!mountedRef.current) return;
      setShowSkipConfirm(false);
      const status = err?.response?.status;
      if (status === 403) {
        // Backend apagó el flag — ocultar botón silenciosamente.
        setSkipEnabled(false);
      } else {
        // Mostrar error al usuario en un segundo modal (tras cerrar el de confirmación).
        // Pequeño delay evita conflicto de animación entre modales.
        setTimeout(() => {
          if (mountedRef.current) {
            setSkipErrorMsg(
              'No pudimos saltar la personalización. Verifica tu conexión e intenta de nuevo.'
            );
          }
        }, 350);
      }
    } finally {
      if (mountedRef.current) {
        setSkipping(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Logo y título */}
          <View style={styles.header}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.subtitle}>Tu copiloto financiero</Text>
          </View>

          {/* Mensaje personalizado de bienvenida */}
          <Text style={styles.welcomeTitle}>
            ¡Hola {user?.name || ''}! 👋
          </Text>

          <Text style={styles.welcomeText}>
            Bienvenido a FinZen AI, soy Zenio, tu copiloto financiero. Antes de empezar, me gustaría conocerte un poco mejor para poder acompañarte y ofrecerte recomendaciones 100% adaptadas a tus metas y hábitos.{'\n\n'}
            Te haré unas preguntas sencillas, como si estuviéramos charlando, para que juntos construyamos tu plan financiero personalizado.{'\n\n'}
            Pulsa <Text style={styles.boldText}>"Comenzar"</Text> y prepárate para transformar tu relación con el dinero. 😉
          </Text>

          {/* Mensaje opcional de salida — sólo si el feature flag está activo */}
          {skipEnabled && (
            <Text style={styles.skipHint}>
              ¿Prefieres explorar primero? Puedes saltar este paso y personalizar tu experiencia más adelante desde tu perfil.
            </Text>
          )}

          {/* Botones de acción.
              Si el flag está activo: Saltar (secundario, outlined) + Comenzar (primario, azul).
              Si el flag está OFF: solo Comenzar (comportamiento legacy). */}
          {skipEnabled ? (
            <View style={styles.buttonsRow}>
              <TouchableOpacity
                style={styles.skipButton}
                onPress={() => setShowSkipConfirm(true)}
                disabled={skipping}
              >
                <Text style={styles.skipButtonText}>Saltar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.beginButton, styles.beginButtonFlex]}
                onPress={navigateToOnboarding}
              >
                <Text style={styles.beginButtonText}>Comenzar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.beginButton}
              onPress={navigateToOnboarding}
            >
              <Text style={styles.beginButtonText}>Comenzar</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Modal de confirmación de skip */}
      <CustomModal
        visible={showSkipConfirm}
        type="info"
        title="¿Saltar la personalización?"
        message="Puedes hacerlo después desde tu perfil cuando quieras."
        buttonText={skipping ? 'Saltando…' : 'Sí, saltar'}
        showSecondaryButton={true}
        secondaryButtonText="No, continuar"
        onClose={handleSkip}
        onSecondaryPress={() => {
          if (!skipping) setShowSkipConfirm(false);
        }}
      />

      {/* Modal de error si el skip falla por algo distinto a 403 */}
      <CustomModal
        visible={!!skipErrorMsg}
        type="error"
        title="No se pudo saltar"
        message={skipErrorMsg || ''}
        buttonText="Entendido"
        onClose={() => setSkipErrorMsg(null)}
      />

      {/* Overlay de loading mientras se procesa el skip */}
      {skipping && (
        <View style={styles.skippingOverlay} pointerEvents="auto">
          <ActivityIndicator size="large" color="#2563EB" />
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
  boldText: {
    fontWeight: 'bold',
  },
  skipHint: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
    marginTop: 20,
    fontStyle: 'italic',
  },
  beginButton: {
    marginTop: 32,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  // Cuando está al lado del botón Saltar, el Comenzar ocupa flex 1
  // y se le quita el marginTop (lo da el contenedor buttonsRow).
  beginButtonFlex: {
    flex: 1,
    marginTop: 0,
    paddingHorizontal: 12,
  },
  beginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonsRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginTop: 32,
    gap: 12,
    paddingHorizontal: 4,
  },
  skipButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    // 2px menos que beginButton para compensar el borderWidth y alinear alturas.
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  skippingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
