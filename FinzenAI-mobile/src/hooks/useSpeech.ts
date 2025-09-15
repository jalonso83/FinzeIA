import { useState, useEffect } from 'react';
import * as Speech from 'expo-speech';
import Voice from '@react-native-voice/voice';

export interface SpeechHookState {
  isListening: boolean;
  isSpeaking: boolean;
  isLoading: boolean;
  transcript: string;
  error: string | null;
}

export const useSpeech = () => {
  const [state, setState] = useState<SpeechHookState>({
    isListening: false,
    isSpeaking: false,
    isLoading: false,
    transcript: '',
    error: null,
  });

  useEffect(() => {
    // Configurar callbacks de Voice
    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechRecognized = onSpeechRecognized;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechError = onSpeechError;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechPartialResults = onSpeechPartialResults;

    return () => {
      // Cleanup
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const onSpeechStart = () => {
    console.log('🎤 Speech started');
    setState(prev => ({ ...prev, isListening: true, error: null }));
  };

  const onSpeechRecognized = () => {
    console.log('🎤 Speech recognized');
  };

  const onSpeechEnd = () => {
    console.log('🎤 Speech ended');
    setState(prev => ({ ...prev, isListening: false }));
  };

  const onSpeechError = (error: any) => {
    console.error('🎤 Speech error:', error);
    setState(prev => ({ 
      ...prev, 
      isListening: false, 
      error: error.error?.message || 'Error de reconocimiento de voz' 
    }));
  };

  const onSpeechResults = (event: any) => {
    console.log('🎤 Speech results:', event.value);
    const transcript = event.value[0] || '';
    setState(prev => ({ 
      ...prev, 
      transcript,
      isListening: false 
    }));
  };

  const onSpeechPartialResults = (event: any) => {
    console.log('🎤 Partial results:', event.value);
    // Opcional: mostrar resultados parciales
  };

  // Iniciar escucha de voz
  const startListening = async () => {
    try {
      setState(prev => ({ ...prev, error: null, transcript: '' }));
      
      // Verificar si el servicio está disponible
      const isAvailable = await Voice.isAvailable();
      if (!isAvailable) {
        throw new Error('El reconocimiento de voz no está disponible');
      }

      // Iniciar reconocimiento de voz
      await Voice.start('es-ES'); // Español
      console.log('🎤 Iniciando reconocimiento de voz...');
      
    } catch (error) {
      console.error('Error starting listening:', error);
      setState(prev => ({ 
        ...prev, 
        isListening: false, 
        error: error instanceof Error ? error.message : 'Error al iniciar reconocimiento de voz' 
      }));
    }
  };

  // Detener reconocimiento de voz
  const stopListening = async () => {
    try {
      await Voice.stop();
      console.log('🎤 Deteniendo reconocimiento de voz...');
      
      // El resultado vendrá por el callback onSpeechResults
      // Retornamos el transcript actual
      return state.transcript;
      
    } catch (error) {
      console.error('Error stopping listening:', error);
      setState(prev => ({ 
        ...prev, 
        isListening: false, 
        error: error instanceof Error ? error.message : 'Error al detener reconocimiento' 
      }));
      return null;
    }
  };

  // Zenio habla (Text-to-Speech)
  const speakResponse = async (text: string) => {
    try {
      setState(prev => ({ ...prev, isSpeaking: true, error: null }));

      const speechOptions: Speech.SpeechOptions = {
        language: 'es-ES',
        pitch: 1.0,
        rate: 0.75,
        quality: Speech.VoiceQuality.Enhanced,
      };

      // Obtener voces disponibles
      const availableVoices = await Speech.getAvailableVoicesAsync();
      const spanishVoice = availableVoices.find(voice => 
        voice.language.startsWith('es') && voice.quality === Speech.VoiceQuality.Enhanced
      );

      if (spanishVoice) {
        speechOptions.voice = spanishVoice.identifier;
      }

      console.log('🔊 Zenio hablando:', text);

      return new Promise<void>((resolve) => {
        Speech.speak(text, {
          ...speechOptions,
          onDone: () => {
            setState(prev => ({ ...prev, isSpeaking: false }));
            console.log('🔊 Zenio terminó de hablar');
            resolve();
          },
          onError: (error) => {
            console.error('Error en speech:', error);
            setState(prev => ({ 
              ...prev, 
              isSpeaking: false, 
              error: 'Error al reproducir respuesta' 
            }));
            resolve();
          },
        });
      });
    } catch (error) {
      console.error('Error speaking response:', error);
      setState(prev => ({ 
        ...prev, 
        isSpeaking: false, 
        error: error instanceof Error ? error.message : 'Error al hablar' 
      }));
    }
  };

  // Detener speech
  const stopSpeaking = () => {
    Speech.stop();
    setState(prev => ({ ...prev, isSpeaking: false }));
  };

  // Limpiar estado
  const clearError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  const clearTranscript = () => {
    setState(prev => ({ ...prev, transcript: '' }));
  };

  return {
    ...state,
    startListening,
    stopListening,
    speakResponse,
    stopSpeaking,
    clearError,
    clearTranscript,
  };
};