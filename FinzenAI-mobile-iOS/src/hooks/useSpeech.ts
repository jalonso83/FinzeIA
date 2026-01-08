import React, { useState, useRef, useEffect } from 'react';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform, AppState } from 'react-native';
import { useAuthStore } from '../stores/auth';

import { logger } from '../utils/logger';
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

  const { user, token } = useAuthStore();
  const recordingRef = useRef<Audio.Recording | null>(null);

  // Manejar interrupciones de app state
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Si la app va a background mientras graba, detener grabación
        if (state.isListening && recordingRef.current) {
          logger.log('[Speech] App en background, deteniendo grabación...');
          stopListening().catch(logger.error);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [state.isListening]);

  // Iniciar grabación de audio
  const startListening = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null, transcript: '' }));

      // Solicitar permisos de audio
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        throw new Error('Se requieren permisos de micrófono');
      }

      // Remover verificación estricta - dejar que iOS maneje naturalmente

      // Configuración de audio simple y confiable
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Iniciar grabación
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setState(prev => ({ ...prev, isListening: true, isLoading: false }));
      logger.log('🎤 Iniciando grabación de audio...');

    } catch (error) {
      logger.error('❌ Error iniciando grabación:', error);

      let errorMessage = 'Error iniciando grabación de audio';

      // Manejar errores específicos más suavemente
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          errorMessage = 'Se requieren permisos de micrófono para usar esta función.';
        } else if (error.message.includes('EXModulesErrorDomain')) {
          errorMessage = 'Intenta nuevamente. Asegúrate de mantener la app abierta.';
        } else {
          errorMessage = 'Error con el micrófono. Intenta nuevamente.';
        }
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
    }
  };

  // Detener grabación y enviar a Whisper API
  const stopListening = async () => {
    try {
      if (!recordingRef.current) {
        throw new Error('No hay grabación activa');
      }

      setState(prev => ({ ...prev, isListening: false, isLoading: true }));

      // Detener grabación
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        throw new Error('No se pudo obtener el archivo de audio');
      }

      logger.log('🎤 Grabación detenida, enviando a Whisper API...');

      // Crear FormData para envío
      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: 'audio/wav',
        name: 'audio.wav',
      } as any);

      // Enviar a backend
      const response = await fetch(`https://finzenai-backend-production.up.railway.app/api/zenio/transcribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      // Limpiar archivo temporal
      await FileSystem.deleteAsync(uri, { idempotent: true });

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Error en la transcripción');
      }

      const transcript = result.transcription || '';
      logger.log('🎤 Transcripción completada:', transcript);

      setState(prev => ({
        ...prev,
        transcript,
        isLoading: false
      }));

      return transcript;

    } catch (error) {
      logger.error('❌ Error procesando audio:', error);
      setState(prev => ({
        ...prev,
        isListening: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error procesando audio'
      }));
      return null;
    }
  };

  // Zenio habla (Text-to-Speech)
  const speakResponse = async (text: string) => {
    try {
      setState(prev => ({ ...prev, isSpeaking: true, error: null }));

      // Configurar audio mode para reproducción por altavoz (NO auricular)
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      // Configuraciones específicas por plataforma
      const speechOptions: Speech.SpeechOptions = {
        language: 'es-ES',
        pitch: Platform.OS === 'ios' ? 1.0 : 1.0, // Pitch natural en ambas plataformas
        rate: Platform.OS === 'ios' ? 1.1 : 1.4,  // Velocidad aumentada en ambas plataformas
      };

      // Obtener voces disponibles
      const availableVoices = await Speech.getAvailableVoicesAsync();
      logger.log('🔊 Voces disponibles:', availableVoices.map(v => `${v.name} (${v.language})`));

      // Buscar la mejor voz española disponible (priorizando calidad sobre género)
      const bestSpanishVoice = availableVoices.find(voice =>
        voice.language.startsWith('es') &&
        (voice.quality === 'Enhanced' || voice.quality === 'Premium')
      );

      // Si no hay voces mejoradas, buscar cualquier voz española nativa
      const spanishVoice = bestSpanishVoice || availableVoices.find(voice =>
        voice.language.startsWith('es')
      );

      if (spanishVoice) {
        speechOptions.voice = spanishVoice.identifier;
        logger.log('🔊 Usando voz española de calidad:', spanishVoice.name, '- Calidad:', spanishVoice.quality);
      } else {
        logger.log('🔊 Usando voz por defecto del sistema');
      }

      logger.log('🔊 Zenio hablando:', text);

      return new Promise<void>((resolve) => {
        Speech.speak(text, {
          ...speechOptions,
          onDone: () => {
            setState(prev => ({ ...prev, isSpeaking: false }));
            logger.log('🔊 Zenio terminó de hablar');
            resolve();
          },
          onError: (error) => {
            logger.error('Error en speech:', error);
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
      logger.error('Error speaking response:', error);
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