import React from 'react';
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

export default function OnboardingWelcomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();

  const navigateToOnboarding = () => {
    navigation.navigate('Onboarding');
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

        {/* Mensaje personalizado de bienvenida */}
        <Text style={styles.welcomeTitle}>
          ¡Hola {user?.name || ''}! 👋
        </Text>

        <Text style={styles.welcomeText}>
          Bienvenido a FinZen AI, soy Zenio, tu copiloto financiero. Antes de empezar, me gustaría conocerte un poco mejor para poder acompañarte y ofrecerte recomendaciones 100% adaptadas a tus metas y hábitos.{'\n\n'}
          Te haré unas preguntas sencillas, como si estuviéramos charlando, para que juntos construyamos tu plan financiero personalizado.{'\n\n'}
          Pulsa <Text style={styles.boldText}>"Comenzar"</Text> y prepárate para transformar tu relación con el dinero. 😉
        </Text>

        {/* Botón para comenzar */}
        <TouchableOpacity 
          style={styles.beginButton}
          onPress={navigateToOnboarding}
        >
          <Text style={styles.beginButtonText}>Comenzar</Text>
        </TouchableOpacity>
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
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  boldText: {
    fontWeight: 'bold',
  },
  beginButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    shadowColor: '#2563EB',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  beginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});