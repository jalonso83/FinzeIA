import React, { useState, useRef, useEffect } from 'react';
import isotipo from '../assets/isotipo.png';
import api from '../utils/api';
import { Send, Mic, MicOff, StopCircle, RotateCcw } from 'lucide-react';
import { useCategoriesStore } from '../stores/categories';

interface ZenioChatProps {
  onClose?: () => void;
  isOnboarding?: boolean;
  initialMessage?: string;
  user?: any;
  onTransactionCreated?: (transaction: any) => void;
  onTransactionUpdated?: (transaction: any) => void;
  onTransactionDeleted?: (transaction: any) => void;
  onBudgetCreated?: (budget: any) => void;
  onBudgetUpdated?: (budget: any) => void;
  onBudgetDeleted?: (budget: any) => void;
  onGoalCreated?: (goal: any) => void;
  onGoalUpdated?: (goal: any) => void;
  onGoalDeleted?: (goal: any) => void;
  onZenioMessage?: (msg: string) => void;
}

const ZenioChat: React.FC<ZenioChatProps> = ({ onClose, isOnboarding = false, initialMessage, user, onTransactionCreated, onTransactionUpdated, onTransactionDeleted, onBudgetCreated, onBudgetUpdated, onBudgetDeleted, onGoalCreated, onGoalUpdated, onGoalDeleted, onZenioMessage }) => {
  // Si es onboarding, inicia con saludo. Si no, inicia vacío.
  const [messages, setMessages] = useState<any[]>(
    isOnboarding
      ? [{ from: 'zenio', text: '¡Hola! Soy Zenio, tu asistente financiero. ¿En qué puedo ayudarte hoy?' }]
      : []
  );
  const [input, setInput] = useState(isOnboarding ? (initialMessage || 'Hola Zenio, soy nuevo y quiero empezar mi onboarding') : '');
  const [submitting, setSubmitting] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [hasSentFirst, setHasSentFirst] = useState(false);
  const zenioMessageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  // Estados para funcionalidad de audio
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isAudioSupported, setIsAudioSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const workingMicrophoneRef = useRef<string | null>(null);

  // Obtener categorías del store
  const { categories, fetchCategories } = useCategoriesStore();

  // Cargar categorías al montar el componente
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Inicializar Web Speech API
  useEffect(() => {
    const initializeSpeechRecognition = () => {
      // Verificar soporte del navegador para Web Speech API
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        setIsAudioSupported(true);
        
        const recognition = new SpeechRecognition();
        
        // Configuración optimizada para Chrome con Realtek Audio
        recognition.lang = 'es-ES';
        recognition.continuous = true; // Cambiar a true para mantener la sesión
        recognition.interimResults = true;
        recognition.maxAlternatives = 3; // Más alternativas para mejor detección
        
        // Configuraciones específicas del navegador para mejorar sensibilidad
        if ('webkitSpeechRecognition' in window) {
          console.log('🎤 🔧 Aplicando configuraciones WebKit...');
          // Configuraciones específicas de Chrome/WebKit
          (recognition as any).serviceURI = undefined;
          
          // Intentar configuraciones adicionales para mejor detección
          try {
            // Configurar para usar micrófono específico si está disponible
            if (window.navigator.mediaDevices) {
              console.log('🎤 🔧 MediaDevices disponible para configuraciones avanzadas');
            }
            console.log('🎤 ✅ Configuraciones WebKit aplicadas correctamente');
          } catch (e) {
            console.log('🎤 No se pudieron aplicar configuraciones adicionales:', e);
          }
        }
        
        recognition.onstart = () => {
          console.log('🎤 Reconocimiento iniciado');
          setIsRecording(true);
          setIsProcessingAudio(false);
          setVoiceError(null);
          setRecordingTime(0);
          
          // Iniciar timer
          recordingTimerRef.current = window.setInterval(() => {
            setRecordingTime(prev => prev + 1);
          }, 1000);
        };
        
        recognition.onresult = (event: any) => {
          console.log('🎤 Procesando resultado de voz...');
          
          let finalTranscript = '';
          
          // Procesar solo los resultados finales para evitar conflictos
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              const transcript = result[0].transcript.trim();
              if (transcript) {
                finalTranscript += transcript + ' ';
                console.log('🎤 ✅ Transcripción final:', transcript);
              }
            }
          }
          
          // Si hay transcripción final, usarla
          if (finalTranscript.trim()) {
            const cleanText = finalTranscript.trim();
            setInput(cleanText);
            setVoiceError(null);
            console.log('🎤 ✅ Texto establecido en input:', cleanText);
            
            // Detener reconocimiento después de obtener resultado
            if (recognitionRef.current) {
              recognitionRef.current.stop();
            }
          }
        };
        
        recognition.onerror = (event: any) => {
          console.error('❌ ===== ERROR EN RECONOCIMIENTO =====');
          console.error('❌ Tipo de error:', event.error);
          console.error('❌ Evento completo:', event);
          
          let errorMessage = 'Error al procesar el audio';
          switch (event.error) {
            case 'not-allowed':
              errorMessage = 'Permisos de micrófono denegados. Habilítalos en tu navegador.';
              break;
            case 'no-speech':
              // Solo mostrar error si no hay texto en el input
              if (!input.trim()) {
                errorMessage = 'No se detectó voz clara. Intenta hablar inmediatamente después de presionar el micrófono.';
                console.log('🎤 ⚠️ Error no-speech - intentando de nuevo...');
              } else {
                console.log('🎤 ℹ️ Error no-speech pero hay texto en input, ignorando error');
                errorMessage = ''; // No mostrar error si ya hay texto
              }
              break;
            case 'audio-capture':
              errorMessage = 'No se pudo acceder al micrófono. Verifica que esté conectado.';
              break;
            case 'network':
              errorMessage = 'Error de conexión. Verifica tu internet y intenta de nuevo.';
              break;
            case 'aborted':
              errorMessage = ''; // No mostrar error si fue cancelado por el usuario
              console.log('🎤 ℹ️ Reconocimiento cancelado por el usuario');
              break;
            default:
              errorMessage = `Error desconocido: ${event.error}. Intenta de nuevo.`;
          }
          
          if (errorMessage && errorMessage.trim()) {
            setVoiceError(errorMessage);
            console.error('❌ Estableciendo mensaje de error:', errorMessage);
          }
          setIsProcessingAudio(false);
          setIsRecording(false);
          console.error('❌ ===== FIN ERROR =====');
        };
        
        // Eventos adicionales para debugging
        recognition.onspeechstart = () => {
          console.log('🎤 Voz detectada - empezando a grabar');
        };
        
        recognition.onspeechend = () => {
          console.log('🎤 Voz terminada - procesando');
        };
        
        recognition.onsoundstart = () => {
          console.log('🎤 Sonido detectado');
        };
        
        recognition.onsoundend = () => {
          console.log('🎤 Sonido terminado');
        };
        
        recognition.onnomatch = () => {
          console.log('🎤 No se encontró coincidencia en el reconocimiento');
          setVoiceError('No se pudo entender lo que dijiste. Intenta hablar más claro.');
        };

        recognition.onend = () => {
          console.log('🎤 Reconocimiento terminado');
          
          // Limpiar timeout
          if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          
          // Limpiar timer de grabación
          if (recordingTimerRef.current) {
            window.clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
          }
          
          setIsRecording(false);
          setIsProcessingAudio(false);
        };
        
        recognitionRef.current = recognition;
      } else {
        console.warn('⚠️ Web Speech API no soportado en este navegador');
        setIsAudioSupported(false);
      }
    };
    
    initializeSpeechRecognition();
    
    // Cleanup
    return () => {
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
      }
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Auto-inicializar conversación para modal (no onboarding)
  useEffect(() => {
    const initializeConversation = async () => {
      if (!isOnboarding && !hasSentFirst && user && categories.length > 0) {
        const userName = user.name || user.email || 'Usuario';
        const userMessage = `Hola Zenio, soy ${userName}`;
        
        try {
          setSubmitting(true);
          const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          
          const payload = {
            message: userMessage,
            categories: categories.map(cat => ({
              id: cat.id,
              name: cat.name,
              type: cat.type
            })),
            timezone: userTimezone,
            autoGreeting: true
          };

          const response = await api.post('/zenio/chat', payload);
          
          if (response.data.message) {
            // Solo agregar la respuesta de Zenio, NO el mensaje del usuario
            setMessages([{ from: 'zenio', text: response.data.message }]);
            
            if (isOnboarding && onZenioMessage) {
              onZenioMessage(response.data.message);
            }
          }

          if (response.data.threadId) {
            setThreadId(response.data.threadId);
          }
          
          setHasSentFirst(true);
        } catch (error) {
          console.error('Error al inicializar conversación:', error);
          setMessages([{ from: 'zenio', text: 'Ocurrió un error al inicializar la conversación. Intenta escribir un mensaje.' }]);
        } finally {
          setSubmitting(false);
        }
      }
    };

    initializeConversation();
  }, [user, isOnboarding, hasSentFirst, categories]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    // Busca el último mensaje de Zenio
    const lastZenioIdx = [...messages].reverse().findIndex(msg => msg.from === 'zenio');
    if (lastZenioIdx !== -1) {
      // El índice real desde el inicio del array
      const realIdx = messages.length - 1 - lastZenioIdx;
      const el = zenioMessageRefs.current[realIdx];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [messages]);

  const sendToZenio = async (message: string) => {
    if (!message.trim()) return;

    setSubmitting(true);
    try {
      // Obtener zona horaria del usuario
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      let payload: any = { message: message };
      if (threadId) payload.threadId = threadId;
      
      // Enviar categorías en el payload (solo id, name, type)
      payload.categories = categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        type: cat.type
      }));
      
      // Enviar zona horaria del usuario
      payload.timezone = userTimezone;

      const response = await api.post('/zenio/chat', payload);
      
      if (response.data.message) {
        setMessages(prev => [...prev, { from: 'zenio', text: response.data.message }]);
        
        // Notificar al componente padre si es onboarding
        if (isOnboarding && onZenioMessage) {
          onZenioMessage(response.data.message);
        }
      }
      
      // Verificar si hay acciones que ejecutar
      if (response.data.action) {
        console.log('[ZenioChat] Acción detectada:', response.data.action);
        console.log('[ZenioChat] Datos de la acción:', response.data);
        
        switch (response.data.action) {
          case 'transaction_created':
            console.log('[ZenioChat] Procesando transaction_created');
            if (onTransactionCreated && response.data.transaction) {
              console.log('[ZenioChat] Llamando onTransactionCreated con:', response.data.transaction);
              onTransactionCreated(response.data.transaction);
            } else {
              console.log('[ZenioChat] onTransactionCreated no disponible o transaction no encontrada');
            }
            break;
          case 'transaction_updated':
            if (onTransactionUpdated && response.data.transaction) {
              onTransactionUpdated(response.data.transaction);
            }
            break;
          case 'transaction_deleted':
            if (onTransactionDeleted && response.data.transaction) {
              onTransactionDeleted(response.data.transaction);
            }
            break;
          case 'budget_created':
            if (onBudgetCreated && response.data.budget) {
              onBudgetCreated(response.data.budget);
            }
            break;
          case 'budget_updated':
            if (onBudgetUpdated && response.data.budget) {
              onBudgetUpdated(response.data.budget);
            }
            break;
          case 'budget_deleted':
            if (onBudgetDeleted && response.data.budget) {
              onBudgetDeleted(response.data.budget);
            }
            break;
          case 'goal_created':
            if (onGoalCreated && response.data.goal) {
              onGoalCreated(response.data.goal);
            }
            break;
          case 'goal_updated':
            if (onGoalUpdated && response.data.goal) {
              onGoalUpdated(response.data.goal);
            }
            break;
          case 'goal_deleted':
            if (onGoalDeleted && response.data.goal) {
              onGoalDeleted(response.data.goal);
            }
            break;
        }
      }
      
      if (response.data.threadId && !threadId) {
        setThreadId(response.data.threadId);
      }
      
    } catch (error: any) {
      // Manejo especial para run activo
      if (error.response?.status === 429 && error.response.data?.message) {
        setRetryCount((prev) => prev + 1);
        setMessages((msgs: any[]) => {
          const lastMsg = msgs[msgs.length - 1];
          if (!lastMsg || lastMsg.text !== error.response.data.message) {
            return [...msgs, { from: 'zenio', text: error.response.data.message }];
          }
          return msgs;
        });
        if (retryCount < MAX_RETRIES) {
          setTimeout(() => sendToZenio(message), 2000);
        } else {
          setMessages((msgs: any[]) => [
            ...msgs,
            { from: 'zenio', text: 'Zenio está tardando más de lo normal. Por favor, intenta de nuevo en unos minutos o recarga la página.' }
          ]);
          setRetryCount(0);
          setSubmitting(false);
        }
        return;
      }
      // Manejo especial para ECONNRESET
      if (error.response?.status === 503 && error.response.data?.message) {
        setMessages((msgs: any[]) => [
          ...msgs,
          { from: 'zenio', text: error.response.data.message }
        ]);
        setSubmitting(false); // Permite reintentar manualmente
        return;
      }
      setMessages((msgs: any[]) => [
        ...msgs,
        { from: 'zenio', text: 'Ocurrió un error con Zenio. Intenta de nuevo.' }
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  // Verificar permisos de micrófono y nivel de audio
  const checkMicrophonePermissions = async () => {
    try {
      // Primero obtener lista de dispositivos
      console.log('🎤 📋 Obteniendo lista de dispositivos...');
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      
      console.log('🎤 🎧 Dispositivos de audio encontrados:', audioInputs.map(d => ({
        deviceId: d.deviceId,
        label: d.label || 'Micrófono desconocido'
      })));
      
      // Probar con diferentes micrófonos hasta encontrar uno que funcione
      let workingDeviceId = null;
      let stream = null;
      
      // Primero intentar con configuración por defecto
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: true
        });
        console.log('🎤 ✅ Permisos concedidos con dispositivo por defecto');
      } catch (error) {
        console.log('🎤 ⚠️ Dispositivo por defecto falló, probando específicos...');
      }
      
      // Si no funciona, probar con cada micrófono específico
      if (!stream) {
        for (const device of audioInputs) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: { deviceId: { exact: device.deviceId } }
            });
            workingDeviceId = device.deviceId;
            console.log(`🎤 ✅ Micrófono específico funcionando: ${device.label}`);
            break;
          } catch (error) {
            console.log(`🎤 ❌ Falló micrófono: ${device.label}`);
          }
        }
      }
      
      if (!stream) {
        throw new Error('No se pudo acceder a ningún micrófono');
      }
      
      console.log('🎤 🎚️ Stream obtenido:', stream.getTracks().map(track => ({
        kind: track.kind,
        label: track.label,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState
      })));
      
      // Verificar nivel de audio con tiempo extendido
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      // Tomar múltiples muestras durante 2 segundos
      console.log('🎤 🔍 Analizando nivel de audio por 2 segundos... ¡HABLA AHORA!');
      let maxLevel = 0;
      let samples = 0;
      
      const checkAudio = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const peak = Math.max(...Array.from(dataArray));
        
        if (average > maxLevel) maxLevel = average;
        samples++;
        
        console.log(`🎤 📊 Muestra ${samples}: promedio=${average.toFixed(1)}, pico=${peak}`);
        
        if (samples < 20) { // 20 muestras durante ~2 segundos
          setTimeout(checkAudio, 100);
        } else {
          // Limpiar recursos
          microphone.disconnect();
          audioContext.close();
          stream.getTracks().forEach(track => track.stop());
          
          console.log('🎤 🎯 Nivel máximo detectado:', maxLevel);
          
          if (maxLevel < 1) {
            console.log('🎤 ❌ Sin actividad de audio detectada');
            setVoiceError('El micrófono no parece estar funcionando. Verifica que no esté silenciado y que otras aplicaciones no lo estén usando.');
          } else if (maxLevel < 5) {
            console.log('🎤 ⚠️ Nivel de audio muy bajo');
            workingMicrophoneRef.current = workingDeviceId; // Guardar micrófono que funciona
          } else {
            console.log('🎤 ✅ Nivel de audio adecuado');
            workingMicrophoneRef.current = workingDeviceId; // Guardar micrófono que funciona
            console.log('🎤 💾 Micrófono guardado para Speech API:', workingDeviceId);
          }
        }
      };
      
      checkAudio();
      
      return true;
    } catch (error) {
      console.error('🎤 ❌ Error de permisos de micrófono:', error);
      setVoiceError('Necesitas conceder permisos de micrófono para usar esta función.');
      return false;
    }
  };

  // Funciones para manejo de audio
  const startVoiceRecording = async () => {
    if (!recognitionRef.current || !isAudioSupported) return;
    
    try {
      console.log('🎤 Iniciando grabación...');
      setVoiceError(null);
      
      // Verificar permisos primero
      const hasPermissions = await checkMicrophonePermissions();
      if (!hasPermissions) {
        return;
      }
      
      console.log('🎤 🚀 Iniciando Web Speech Recognition...');
      console.log('🎤 📍 Micrófono de trabajo guardado:', workingMicrophoneRef.current);
      
      // Si tenemos un micrófono específico que funciona, intentar configurarlo como predeterminado
      if (workingMicrophoneRef.current && navigator.mediaDevices) {
        try {
          console.log('🎤 🔄 Intentando pre-configurar micrófono específico...');
          // Hacer una llamada rápida para "activar" el micrófono específico
          const testStream = await navigator.mediaDevices.getUserMedia({
            audio: { deviceId: workingMicrophoneRef.current }
          });
          // Cerrar inmediatamente
          testStream.getTracks().forEach(track => track.stop());
          console.log('🎤 ✅ Micrófono específico pre-configurado');
        } catch (error) {
          console.log('🎤 ⚠️ No se pudo pre-configurar micrófono específico:', error);
        }
      }
      
      // Timeout de 15 segundos para continuous mode
      timeoutRef.current = window.setTimeout(() => {
        console.log('🎤 ⏰ Timeout alcanzado - deteniendo reconocimiento');
        if (recognitionRef.current && isRecording) {
          try {
            recognitionRef.current.stop();
          } catch (e) {
            console.log('🎤 ⚠️ Error al detener por timeout:', e);
          }
          // Solo mostrar error si no hay texto en el input
          if (!input.trim()) {
            setVoiceError('Tiempo agotado. Intenta hablar inmediatamente después de presionar el micrófono.');
          }
        }
      }, 15000);
      
      console.log('🎤 🎯 Lanzando recognition.start()...');
      recognitionRef.current.start();
    } catch (error) {
      console.error('❌ Error al iniciar grabación:', error);
      setVoiceError('Error al iniciar la grabación: ' + (error as Error).message);
    }
  };

  const stopVoiceRecording = () => {
    console.log('🎤 ⚠️ STOP LLAMADO - Estado actual:', {
      isRecording,
      isProcessingAudio,
      hasRecognition: !!recognitionRef.current
    });
    
    // Agregar stack trace para ver desde dónde se llama
    console.trace('🎤 Stack trace de stopVoiceRecording:');
    
    if (!recognitionRef.current) {
      console.log('🎤 ❌ No hay referencia de reconocimiento para detener');
      return;
    }
    
    try {
      console.log('🎤 Deteniendo grabación manualmente...');
      
      // Limpiar timeout
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      recognitionRef.current.stop();
    } catch (error) {
      console.error('❌ Error al detener grabación:', error);
    }
  };

  const cancelVoiceRecording = () => {
    if (!recognitionRef.current) return;
    
    try {
      recognitionRef.current.abort();
      setInput(''); // Limpiar cualquier transcripción parcial
      setVoiceError(null);
      setIsProcessingAudio(false);
    } catch (error) {
      console.error('❌ Error al cancelar grabación:', error);
    }
  };

  const retryVoiceRecording = () => {
    setVoiceError(null);
    setInput('');
    startVoiceRecording();
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || submitting) return;
    setMessages((msgs: any[]) => [...msgs, { from: 'user', text: input }]);
    setInput('');
    await sendToZenio(input);
    setHasSentFirst(true);
  };

  return (
    <div className="w-full max-w-3xl mx-4 p-0 flex flex-col relative animate-fadeIn bg-white rounded-2xl shadow-2xl">
      {/* Header (opcional) */}
      {onClose && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-primary rounded-t-2xl">
          <div className="flex items-center gap-2">
            <img src={isotipo} alt="Zenio" className="w-8 h-8 rounded-full bg-white border border-blue-200" />
            <span className="text-lg font-semibold text-white">Zenio</span>
          </div>
          <button onClick={onClose} className="text-white hover:text-warning text-xl font-bold px-2 py-1 rounded-lg focus:outline-none">×</button>
        </div>
      )}
      {/* Chat */}
      <div ref={chatRef} className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50" style={{ maxHeight: 400, minHeight: 220 }}>
        {messages.length === 0 && !isOnboarding && (
          <div className="text-center text-gray-400 mt-12">Inicia la conversación con Zenio…</div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            ref={msg.from === 'zenio' ? (el) => { zenioMessageRefs.current[idx] = el; } : undefined}
            className={`flex my-2 ${msg.from === 'zenio' ? 'justify-start' : 'justify-end'}`}
          >
            {msg.from === 'zenio' && <img src={isotipo} alt="Zenio" className="w-8 h-8 rounded-full mr-2 bg-white border border-primary/20" />}
            <div className={`px-4 py-2 rounded-lg ${msg.from === 'zenio' ? 'bg-primary/10 text-primary' : 'bg-primary text-white'} max-w-xs whitespace-pre-line`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Voice Error Message */}
      {voiceError && (
        <div className="px-6 py-2 bg-red-50 border-t border-red-200">
          <div className="flex items-center justify-between">
            <span className="text-red-600 text-sm">❌ {voiceError}</span>
            <button
              onClick={retryVoiceRecording}
              className="text-red-600 hover:text-red-800 p-1"
              aria-label="Reintentar grabación"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Recording Status */}
      {(isRecording || isProcessingAudio) && (
        <div className="px-6 py-2 bg-blue-50 border-t border-blue-200">
          <div className="flex items-center justify-center gap-2">
            {isRecording && (
              <>
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-blue-700 text-sm font-medium">
                  Grabando... {formatRecordingTime(recordingTime)}
                </span>
              </>
            )}
            {isProcessingAudio && (
              <>
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-blue-700 text-sm font-medium">Transcribiendo...</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-6 py-4 border-t border-border bg-white rounded-b-2xl">
        {/* Recording Controls */}
        {isRecording && (
          <div className="flex gap-2 mb-3 justify-center">
            <button
              type="button"
              onClick={stopVoiceRecording}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
            >
              <StopCircle size={18} />
              Detener
            </button>
            <button
              type="button"
              onClick={cancelVoiceRecording}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition"
            >
              Cancelar
            </button>
          </div>
        )}
        
        <form onSubmit={handleSend} className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary pr-12"
              placeholder={
                submitting ? 'Zenio está procesando...' : 
                isRecording ? `🎤 Escuchando... (${recordingTime}s)` :
                isProcessingAudio ? '✨ Transcribiendo...' :
                'Escribe tu mensaje o usa el micrófono 🎤'
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={submitting || isRecording || isProcessingAudio}
              readOnly={submitting || isRecording || isProcessingAudio}
            />
            
            {/* Microphone Button */}
            {isAudioSupported && (
              <button
                type="button"
                onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-lg transition-colors ${
                  isRecording 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'bg-primary text-white hover:bg-primary/90'
                }`}
                disabled={submitting}
                title={isRecording ? 'Detener grabación' : 'Grabar mensaje de voz'}
              >
                {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            )}
          </div>
          
          {/* Error de voz */}
          {voiceError && (
            <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              ⚠️ {voiceError}
            </div>
          )}
          
          <button
            type="submit"
            className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-secondary transition disabled:opacity-50 flex items-center justify-center"
            disabled={submitting || !input.trim() || isRecording || isProcessingAudio}
            aria-label="Enviar mensaje"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ZenioChat; 