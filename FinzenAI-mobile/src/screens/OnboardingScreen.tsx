import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../stores/auth';
import ZenioChat from '../components/ZenioChat';

export default function OnboardingScreen() {
  const navigation = useNavigation<any>();
  const { user, updateUser } = useAuthStore();
  const [onboardingFinished, setOnboardingFinished] = useState(false);

  // Handler para detectar el fin del onboarding desde ZenioChat
  const handleZenioMessage = (msg: string) => {
    // Detectar diferentes formas en que Zenio puede indicar que el onboarding está completo
    // (Copiado exacto del web)
    const lowerMsg = msg.toLowerCase();
    if (msg && (
      lowerMsg.includes('tu perfil está listo') ||
      lowerMsg.includes('perfil completado') ||
      lowerMsg.includes('onboarding completado') ||
      lowerMsg.includes('configuración terminada') ||
      lowerMsg.includes('todo listo') ||
      lowerMsg.includes('ya puedes empezar') ||
      lowerMsg.includes('estás listo para usar') ||
      lowerMsg.includes('onboarding finalizado') ||
      lowerMsg.includes('tu perfil ha sido registrado') ||
      lowerMsg.includes('ya tengo todo lo que necesito') ||
      lowerMsg.includes('perfil registrado') ||
      lowerMsg.includes('camino hacia una mejor planificación') ||
      lowerMsg.includes('acompañarte en tu camino') ||
      lowerMsg.includes('tu perfil está registrado') ||
      lowerMsg.includes('registrado y preparado') ||
      lowerMsg.includes('te veo en el dashboard') ||
      lowerMsg.includes('cuando estés listo') ||
      lowerMsg.includes('herramientas que ofrece finzen') ||
      lowerMsg.includes('planificación financiera plena')
    )) {
      setOnboardingFinished(true);
      if (user) {
        updateUser({ ...user, onboardingCompleted: true });
      }
    }
  };

  const navigateToDashboard = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }], // Reset al stack principal
    });
  };

  return (
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

        {/* Chat de Zenio */}
        <View style={styles.chatContainer}>
          <ZenioChat 
            isOnboarding={true}
            initialMessage="Hola Zenio, soy nuevo y quiero empezar mi onboarding"
            onZenioMessage={handleZenioMessage}
          />
        </View>

        {/* Botón para continuar (aparece cuando termina el onboarding) */}
        {onboardingFinished && (
          <TouchableOpacity 
            style={styles.continueButton}
            onPress={navigateToDashboard}
          >
            <Text style={styles.continueButtonText}>Continuar</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f6ff', // Gradiente azul claro como en web
  },
  content: {
    flex: 1,
    padding: 24,
    backgroundColor: 'white',
    margin: 16,
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563EB',
    textAlign: 'center',
    marginBottom: 24,
  },
  chatContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  continueButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 32,
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
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});