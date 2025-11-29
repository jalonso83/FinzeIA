import React, { useState } from 'react';
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
import api from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function OnboardingScreen() {
  const navigation = useNavigation<any>();
  const { user, updateUser } = useAuthStore();
  const [onboardingFinished, setOnboardingFinished] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);

  // Handler para detectar el fin del onboarding desde ZenioChat
  const handleZenioMessage = async (msg: string) => {
    // Detectar diferentes formas en que Zenio puede indicar que el onboarding está completo
    const lowerMsg = msg.toLowerCase();

    // Log para debugging - ver qué mensaje recibe (MENSAJE COMPLETO)
    console.log('📨 [OnboardingScreen] Mensaje COMPLETO de Zenio:', msg);
    console.log('📨 [OnboardingScreen] Mensaje en minúsculas:', lowerMsg);

    if (msg && (
      // Frases del mensaje EXACTO del backend (zenio.ts línea 580)
      // "¡Perfecto! Ha sido un placer conocerte... Ya tengo toda la información... Tu perfil está listo... ¡Te veo en el dashboard!"
      lowerMsg.includes('ya tengo toda la información') ||
      lowerMsg.includes('tu perfil está listo') ||
      lowerMsg.includes('te veo en el dashboard') ||
      lowerMsg.includes('ahora puedes comenzar a usar todas las herramientas') ||
      lowerMsg.includes('ha sido un placer conocerte') ||
      lowerMsg.includes('copiloto financiero personal') ||

      // Palabras clave que SEGURO están en el mensaje final
      (lowerMsg.includes('perfil') && lowerMsg.includes('listo')) ||
      (lowerMsg.includes('toda la información') && lowerMsg.includes('necesito')) ||
      (lowerMsg.includes('herramientas') && lowerMsg.includes('finzen')) ||

      // Otras variaciones posibles
      lowerMsg.includes('perfil completado') ||
      lowerMsg.includes('onboarding completado') ||
      lowerMsg.includes('configuración terminada') ||
      lowerMsg.includes('todo listo') ||
      lowerMsg.includes('ya puedes empezar') ||
      lowerMsg.includes('estás listo para usar') ||
      lowerMsg.includes('onboarding finalizado') ||
      lowerMsg.includes('tu perfil ha sido registrado') ||
      lowerMsg.includes('perfil registrado') ||
      lowerMsg.includes('camino hacia una mejor planificación') ||
      lowerMsg.includes('acompañarte en tu camino') ||
      lowerMsg.includes('registrado y preparado') ||
      lowerMsg.includes('cuando estés listo') ||
      lowerMsg.includes('planificación financiera plena')
    )) {
      console.log('🎉 [OnboardingScreen] Onboarding detectado como completado!');

      // Cerrar el teclado inmediatamente para que aparezca el botón "Continuar"
      Keyboard.dismiss();

      setOnboardingFinished(true);

      // Guardar en el backend que el onboarding está completo
      try {
        console.log('📝 [OnboardingScreen] Marcando onboarding como completado en el backend...');

        // Obtener el perfil completo del usuario desde el backend
        const profileResponse = await api.get('/auth/profile');
        const currentProfile = profileResponse.data;

        // Actualizar solo el campo onboardingCompleted manteniendo el resto de los datos
        await api.put('/auth/profile', {
          ...currentProfile,
          onboardingCompleted: true
        });

        console.log('✅ [OnboardingScreen] Onboarding marcado como completado en el backend');

        // NO ACTUALIZAR EL STORE AQUÍ - esperar a que el usuario presione "Continuar"
        // Si actualizamos el store aquí, el AppNavigator detecta el cambio y navega automáticamente
        // antes de que aparezca el botón "Continuar"
      } catch (error: any) {
        console.error('❌ [OnboardingScreen] Error marcando onboarding como completado:', error);
        console.error('Error response:', error.response?.data);
        Alert.alert(
          'Advertencia',
          'No se pudo guardar tu progreso. Por favor verifica tu conexión.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleContinue = async () => {
    console.log('🚀 [OnboardingScreen] Botón Continuar presionado, guardando flag para HelpCenter...');

    // Guardar flag en AsyncStorage ANTES de actualizar el store
    await AsyncStorage.setItem('openHelpCenterAfterOnboarding', 'true');
    console.log('✅ [OnboardingScreen] Flag guardado en AsyncStorage');

    // Actualizar el store para que el AppNavigator cambie a MainNavigator
    // El MainNavigator detectará el flag y abrirá el HelpCenter automáticamente
    if (user) {
      updateUser({ ...user, onboardingCompleted: true });
    }

    console.log('🔄 [OnboardingScreen] Store actualizado, AppNavigator debería cambiar a MainNavigator');
  };

  const handleCloseHelpCenter = () => {
    console.log('🚀 [OnboardingScreen] HelpCenter cerrado, actualizando store y yendo al Dashboard...');

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
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>Continuar</Text>
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