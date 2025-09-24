import { useState, useRef } from 'react';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuthStore } from '../stores/auth';

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

  // Iniciar grabación de audio
  const startListening = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null, transcript: '' }));

      // Solicitar permisos de audio
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        throw new Error('Se requieren permisos de micrófono');
      }

      // Configurar modo de audio
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
      console.log('🎤 Iniciando grabación de audio...');

    } catch (error) {
      console.error('❌ Error iniciando grabación:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error iniciando grabación de audio'
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

      console.log('🎤 Grabación detenida, enviando a Whisper API...');

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
      console.log('🎤 Transcripción completada:', transcript);

      setState(prev => ({
        ...prev,
        transcript,
        isLoading: false
      }));

      return transcript;

    } catch (error) {
      console.error('❌ Error procesando audio:', error);
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

      const speechOptions: Speech.SpeechOptions = {
        language: 'es-ES',
        pitch: 1.0,
        rate: 1.2,
      };

      // Obtener voces disponibles
      const availableVoices = await Speech.getAvailableVoicesAsync();
      console.log('🔊 Voces disponibles:', availableVoices.map(v => `${v.name} (${v.language})`));

      // Buscar específicamente voces masculinas comunes en iOS
      const maleSpanishVoice = availableVoices.find(voice =>
        voice.language.startsWith('es') &&
        (voice.name.toLowerCase().includes('diego') ||
         voice.name.toLowerCase().includes('jorge') ||
         voice.name.toLowerCase().includes('carlos') ||
         voice.name.toLowerCase().includes('male') ||
         voice.name.toLowerCase().includes('man') ||
         voice.name.toLowerCase().includes('masculine') ||
         voice.name.toLowerCase().includes('hombre'))
      );

      // Voces iOS conocidas masculinas en español
      const iosMaleVoices = availableVoices.find(voice =>
        (voice.identifier === 'com.apple.ttsbundle.Diego-compact' ||
         voice.identifier === 'com.apple.ttsbundle.Jorge-compact' ||
         voice.identifier === 'com.apple.voice.compact.es-ES.Diego' ||
         voice.identifier === 'com.apple.voice.compact.es-MX.Diego')
      );

      // Intentar configurar pitch más bajo para voz más masculina
      speechOptions.pitch = 0.8; // Más grave

      if (maleSpanishVoice) {
        speechOptions.voice = maleSpanishVoice.identifier;
        console.log('🔊 Usando voz masculina encontrada:', maleSpanishVoice.name);
      } else if (iosMaleVoices) {
        speechOptions.voice = iosMaleVoices.identifier;
        console.log('🔊 Usando voz iOS masculina:', iosMaleVoices.name);
      } else {
        // Buscar cualquier voz española y hacerla más grave
        const spanishVoice = availableVoices.find(voice => voice.language.startsWith('es'));
        if (spanishVoice) {
          speechOptions.voice = spanishVoice.identifier;
          speechOptions.pitch = 0.7; // Aún más grave para simular voz masculina
          console.log('🔊 Usando voz española con pitch bajo:', spanishVoice.name);
        }
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