import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import api from '../utils/api';
import { useSpeech } from '../hooks/useSpeech';

interface ZenioChatProps {
  onClose?: () => void;
  isOnboarding?: boolean;
  initialMessage?: string;
  onZenioMessage?: (msg: string) => void;
}

interface Message {
  from: 'user' | 'zenio';
  text: string;
  timestamp?: Date;
  id?: string;
}

const ZenioChat: React.FC<ZenioChatProps> = ({ 
  onClose, 
  isOnboarding = false, 
  initialMessage, 
  onZenioMessage 
}) => {
  // Si es onboarding, inicia con saludo. Si no, inicia vacío.
  const [messages, setMessages] = useState<Message[]>(
    isOnboarding
      ? [{ from: 'zenio', text: '¡Hola! Soy Zenio, tu asistente financiero. ¿En qué puedo ayudarte hoy?', timestamp: new Date(), id: 'initial' }]
      : []
  );
  const [input, setInput] = useState(isOnboarding ? (initialMessage || 'Hola Zenio, soy nuevo y quiero empezar mi onboarding') : '');
  const [submitting, setSubmitting] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [hasSentFirst, setHasSentFirst] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Speech hook
  const speech = useSpeech();

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Función para reproducir mensaje individual
  const playMessage = async (messageId: string, text: string) => {
    if (speech.isSpeaking && currentlyPlayingId === messageId) {
      speech.stopSpeaking();
      setCurrentlyPlayingId(null);
      return;
    }

    if (speech.isSpeaking) {
      speech.stopSpeaking();
    }

    setCurrentlyPlayingId(messageId);
    await speech.speakResponse(text);
    setCurrentlyPlayingId(null);
  };

  // Función para enviar mensaje a Zenio
  const sendMessage = async () => {
    if (!input.trim() || submitting) return;

    const userMessage = input.trim();
    setInput('');
    
    // Agregar mensaje del usuario
    const newUserMessage: Message = {
      from: 'user',
      text: userMessage,
      timestamp: new Date(),
      id: Date.now().toString()
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    setSubmitting(true);

    try {
      // Preparar payload como en la web de producción
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      const payload: any = {
        message: userMessage,
        isOnboarding: isOnboarding,
        timezone: userTimezone
      };

      if (threadId) {
        payload.threadId = threadId;
      }

      // Hacer llamada al API de Zenio con payload completo
      const response = await api.post('/zenio/chat', payload);

      if (response.data.message) {
        const zenioResponse = response.data.message;
        const newThreadId = response.data.threadId;

        // Actualizar threadId si es nuevo
        if (newThreadId && newThreadId !== threadId) {
          setThreadId(newThreadId);
        }

        // Agregar respuesta de Zenio
        const messageId = (Date.now() + 1).toString();
        const zenioMessage: Message = {
          from: 'zenio',
          text: zenioResponse,
          timestamp: new Date(),
          id: messageId
        };

        setMessages(prev => [...prev, zenioMessage]);

        // Auto-reproducir si está habilitado
        if (autoPlay && !speech.isSpeaking) {
          setCurrentlyPlayingId(messageId);
          await speech.speakResponse(zenioResponse);
          setCurrentlyPlayingId(null);
        }

        // Notificar al parent si hay callback
        if (onZenioMessage) {
          onZenioMessage(zenioResponse);
        }

        setHasSentFirst(true);
      } else {
        throw new Error('No se recibió respuesta de Zenio');
      }
    } catch (error: any) {
      console.error('Error enviando mensaje a Zenio:', error);
      console.error('Error code:', error.code);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);
      
      let errorMessage = 'Error al comunicarse con Zenio. Intenta nuevamente.';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'La respuesta de Zenio tomó demasiado tiempo. Intenta nuevamente.';
      } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        errorMessage = 'Error de red. Verifica tu conexión e intenta nuevamente.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Agregar mensaje de error
      const errorMsg: Message = {
        from: 'zenio',
        text: `❌ ${errorMessage}`,
        timestamp: new Date(),
        id: (Date.now() + 2).toString()
      };
      
      setMessages(prev => [...prev, errorMsg]);
      
      Alert.alert('Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Enviar mensaje inicial si es onboarding
  useEffect(() => {
    if (isOnboarding && !hasSentFirst && input.trim()) {
      sendMessage();
    }
  }, [isOnboarding]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      {/* Header del chat */}
      <View style={styles.header}>
        <View style={styles.zenioInfo}>
          <View style={styles.zenioAvatar}>
            <Ionicons name="chatbubble" size={20} color="#2563EB" />
          </View>
          <View>
            <Text style={styles.zenioName}>Zenio AI</Text>
            <Text style={styles.zenioStatus}>Tu copiloto financiero</Text>
          </View>
        </View>
        <View style={styles.headerControls}>
          {/* Botón toggle auto-play */}
          <TouchableOpacity
            onPress={() => setAutoPlay(!autoPlay)}
            style={[styles.autoPlayButton, autoPlay && styles.autoPlayButtonActive]}
          >
            <Ionicons
              name={autoPlay ? "volume-high" : "volume-mute"}
              size={18}
              color={autoPlay ? "#2563EB" : "#64748b"}
            />
          </TouchableOpacity>

          {/* Botón STOP si hay audio reproduciéndose */}
          {speech.isSpeaking && (
            <TouchableOpacity
              onPress={() => {
                speech.stopSpeaking();
                setCurrentlyPlayingId(null);
              }}
              style={styles.stopButton}
            >
              <Ionicons name="stop" size={18} color="#ef4444" />
            </TouchableOpacity>
          )}

          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Mensajes */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message, index) => (
          <View
            key={index}
            style={[
              styles.messageWrapper,
              message.from === 'user' ? styles.userMessageWrapper : styles.zenioMessageWrapper
            ]}
          >
            {message.from === 'zenio' && (
              <View style={styles.zenioMessageAvatar}>
                <Ionicons name="chatbubble" size={16} color="#2563EB" />
              </View>
            )}
            <View
              style={[
                styles.message,
                message.from === 'user' ? styles.userMessage : styles.zenioMessage
              ]}
            >
              {message.from === 'zenio' ? (
                <Markdown style={{
                  body: {
                    ...styles.messageText,
                    ...styles.zenioMessageText
                  },
                  paragraph: {
                    margin: 0,
                    marginBottom: 4,
                  },
                  strong: {
                    fontWeight: 'bold',
                  },
                  em: {
                    fontStyle: 'italic',
                  }
                }}>
                  {message.text}
                </Markdown>
              ) : (
                <Text style={[
                  styles.messageText,
                  styles.userMessageText
                ]}>
                  {message.text}
                </Text>
              )}
              {message.timestamp && (
                <Text style={[
                  styles.messageTime,
                  message.from === 'user' ? styles.userMessageTime : styles.zenioMessageTime
                ]}>
                  {formatTime(message.timestamp)}
                </Text>
              )}
            </View>

            {/* Botón de play para mensajes de Zenio */}
            {message.from === 'zenio' && message.id && (
              <TouchableOpacity
                style={[
                  styles.playButton,
                  currentlyPlayingId === message.id && styles.playButtonActive
                ]}
                onPress={() => playMessage(message.id!, message.text)}
              >
                <Ionicons
                  name={currentlyPlayingId === message.id ? "pause" : "play"}
                  size={12}
                  color={currentlyPlayingId === message.id ? "#ffffff" : "#64748b"}
                />
              </TouchableOpacity>
            )}
          </View>
        ))}
        
        {/* Indicador de typing cuando está enviando */}
        {submitting && (
          <View style={[styles.messageWrapper, styles.zenioMessageWrapper]}>
            <View style={styles.zenioMessageAvatar}>
              <Ionicons name="chatbubble" size={16} color="#2563EB" />
            </View>
            <View style={[styles.message, styles.zenioMessage]}>
              <View style={styles.typingIndicator}>
                <ActivityIndicator size="small" color="#64748b" />
                <Text style={styles.typingText}>Zenio está escribiendo...</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input para enviar mensajes */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Escribe tu mensaje..."
          placeholderTextColor="#9ca3af"
          multiline
          maxLength={1000}
          editable={!submitting}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!input.trim() || submitting) && styles.sendButtonDisabled
          ]}
          onPress={sendMessage}
          disabled={!input.trim() || submitting}
        >
          <Ionicons 
            name="send" 
            size={20} 
            color={(!input.trim() || submitting) ? "#9ca3af" : "#2563EB"} 
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  zenioInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  zenioAvatar: {
    width: 40,
    height: 40,
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  zenioName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  zenioStatus: {
    fontSize: 12,
    color: '#64748b',
  },
  closeButton: {
    padding: 8,
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messageWrapper: {
    marginBottom: 16,
  },
  userMessageWrapper: {
    alignItems: 'flex-end',
  },
  zenioMessageWrapper: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  zenioMessageAvatar: {
    width: 24,
    height: 24,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  message: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
  },
  userMessage: {
    backgroundColor: '#2563EB',
    borderBottomRightRadius: 4,
  },
  zenioMessage: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderBottomLeftRadius: 4,
    flex: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: 'white',
  },
  zenioMessageText: {
    color: '#1e293b',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7,
  },
  userMessageTime: {
    color: 'white',
    textAlign: 'right',
  },
  zenioMessageTime: {
    color: '#64748b',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    fontSize: 16,
    maxHeight: 100,
    backgroundColor: '#f9fafb',
  },
  sendButton: {
    width: 40,
    height: 40,
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#f1f5f9',
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  autoPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  autoPlayButtonActive: {
    backgroundColor: '#eff6ff',
  },
  stopButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginTop: 4,
  },
  playButtonActive: {
    backgroundColor: '#2563EB',
  },
});

export default ZenioChat;