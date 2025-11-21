import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { useSpeech } from '../hooks/useSpeech';
import { zenioAPI, categoriesAPI } from '../utils/api';
import { useAuthStore } from '../stores/auth';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isVoice?: boolean;
}

interface VoiceZenioChatProps {
  onClose?: () => void;
  threadId?: string;
  isOnboarding?: boolean;
}

const VoiceZenioChat: React.FC<VoiceZenioChatProps> = ({
  onClose,
  threadId: initialThreadId,
  isOnboarding = false,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [threadId, setThreadId] = useState<string | undefined>(initialThreadId);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSentFirst, setHasSentFirst] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [autoPlay, setAutoPlay] = useState(false);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const speech = useSpeech();
  const { user } = useAuthStore();

  // Función para reproducir un mensaje específico
  const playMessage = async (messageId: string, text: string) => {
    if (currentlyPlayingId === messageId) {
      // Si ya se está reproduciendo este mensaje, detenerlo
      speech.stopSpeaking();
      setCurrentlyPlayingId(null);
    } else {
      // Detener cualquier reproducción actual
      speech.stopSpeaking();
      setCurrentlyPlayingId(messageId);

      try {
        await speech.speakResponse(text);
        setCurrentlyPlayingId(null);
      } catch (error) {
        console.error('Error playing message:', error);
        setCurrentlyPlayingId(null);
      }
    }
  };

  // Función para auto-reproducir cuando llega respuesta de Zenio
  const autoPlayResponse = async (text: string) => {
    if (autoPlay && !speech.isSpeaking) {
      try {
        await speech.speakResponse(text);
      } catch (error) {
        console.error('Error auto-playing response:', error);
      }
    }
  };

  // Cargar categorías al montar
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await categoriesAPI.getAll();
        setCategories(response.data || []);
      } catch (error) {
        console.error('Error loading categories:', error);
        setCategories([]);
      }
    };

    loadCategories();
  }, []);

  // Auto-inicializar conversación cuando se abre el chat
  useEffect(() => {
    const initializeConversation = async () => {
      if (!hasSentFirst && user && categories.length > 0) {
        const userName = user.name || user.email || 'Usuario';
        const userMessage = `Hola Zenio, soy ${userName}`;

        try {
          setIsLoading(true);
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

          const response = await zenioAPI.chat(payload.message, threadId, isOnboarding);

          if (response.data) {
            const { message: zenioResponse, threadId: newThreadId } = response.data;

            if (newThreadId && newThreadId !== threadId) {
              setThreadId(newThreadId);
            }

            addMessage(zenioResponse, false);
          }

          setHasSentFirst(true);
        } catch (error) {
          console.error('Error al inicializar conversación:', error);
          addMessage('Hola! Soy Zenio, tu asistente financiero. ¿En qué puedo ayudarte hoy?', false);
        } finally {
          setIsLoading(false);
        }
      }
    };

    initializeConversation();
  }, [user, categories, hasSentFirst]);

  // Auto-scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // Usar transcripción del speech como input
  useEffect(() => {
    if (speech.transcript) {
      setInputText(speech.transcript);
      speech.clearTranscript();
    }
  }, [speech.transcript]);

  // Manejar errores del speech
  useEffect(() => {
    if (speech.error) {
      Alert.alert('Error de Voz', speech.error, [
        { text: 'OK', onPress: speech.clearError },
      ]);
    }
  }, [speech.error]);

  const addMessage = (text: string, isUser: boolean, isVoice = false) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser,
      timestamp: new Date(),
      isVoice,
    };
    setMessages(prev => [...prev, newMessage]);

    // Auto-reproducir si es mensaje de Zenio y auto-play está activado
    if (!isUser) {
      autoPlayResponse(text);
    }
  };

  const handleSendMessage = async (message: string, isVoice = false) => {
    if (!message.trim()) return;

    try {
      setIsLoading(true);
      
      // Agregar mensaje del usuario
      addMessage(message, true, isVoice);
      setInputText('');

      // Enviar a Zenio
      console.log('📤 Enviando mensaje a Zenio:', message);
      const response = await zenioAPI.chat(message, threadId, isOnboarding);
      
      if (response.data) {
        const { message: zenioResponse, threadId: newThreadId } = response.data;
        
        // Actualizar threadId si es nuevo
        if (newThreadId && newThreadId !== threadId) {
          setThreadId(newThreadId);
        }

        // Agregar respuesta de Zenio
        addMessage(zenioResponse, false);

        // Si el mensaje original fue por voz, Zenio responde hablando
        if (isVoice && !speech.isSpeaking) {
          console.log('🔊 Zenio va a responder hablando...');
          await speech.speakResponse(zenioResponse);
        }

        console.log('✅ Conversación completada');
      }
    } catch (error) {
      console.error('❌ Error enviando mensaje:', error);
      addMessage('Lo siento, ocurrió un error. Por favor intenta de nuevo.', false);
      Alert.alert('Error', 'No se pudo enviar el mensaje. Verifica tu conexión.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoicePress = async () => {
    if (speech.isListening) {
      // Detener grabación
      const transcript = await speech.stopListening();
      if (transcript) {
        await handleSendMessage(transcript, true);
      }
    } else {
      // Iniciar grabación
      if (speech.isSpeaking) {
        speech.stopSpeaking();
      }
      await speech.startListening();
    }
  };

  const handleTextSubmit = async () => {
    if (inputText.trim()) {
      await handleSendMessage(inputText.trim(), false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="chatbubble-ellipses" size={24} color="#2563EB" />
          <Text style={styles.headerTitle}>Chat con Zenio</Text>
          {speech.isSpeaking && (
            <TouchableOpacity
              style={styles.stopButton}
              onPress={() => {
                speech.stopSpeaking();
                setCurrentlyPlayingId(null);
              }}
            >
              <Ionicons name="stop" size={16} color="#ef4444" />
              <Text style={styles.stopButtonText}>DETENER</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.headerControls}>
          <TouchableOpacity
            style={[styles.autoPlayToggle, autoPlay && styles.autoPlayActive]}
            onPress={() => setAutoPlay(!autoPlay)}
          >
            <Ionicons
              name={autoPlay ? "volume-high" : "volume-mute"}
              size={16}
              color={autoPlay ? "#10B981" : "#64748b"}
            />
            <Text style={[
              styles.autoPlayText,
              autoPlay && styles.autoPlayActiveText
            ]}>
              Auto
            </Text>
          </TouchableOpacity>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageContainer,
              message.isUser ? styles.userMessage : styles.zenioMessage,
            ]}
          >
            <View
              style={[
                styles.messageBubble,
                message.isUser ? styles.userBubble : styles.zenioBubble,
              ]}
            >
              {!message.isUser ? (
                <Markdown style={{
                  body: {
                    ...styles.messageText,
                    ...styles.zenioText
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
                <Text
                  style={[
                    styles.messageText,
                    styles.userText,
                  ]}
                >
                  {message.text}
                </Text>
              )}
              <View style={styles.messageFooter}>
                <Text
                  style={[
                    styles.messageTime,
                    message.isUser ? styles.userTime : styles.zenioTime,
                  ]}
                >
                  {formatTime(message.timestamp)}
                </Text>
                {message.isVoice && (
                  <Ionicons
                    name="mic"
                    size={12}
                    color={message.isUser ? '#1e293b' : '#64748b'}
                    style={styles.voiceIcon}
                  />
                )}
                {!message.isUser && (
                  <TouchableOpacity
                    style={[
                      styles.playButton,
                      currentlyPlayingId === message.id && styles.playButtonActive
                    ]}
                    onPress={() => playMessage(message.id, message.text)}
                  >
                    <Ionicons
                      name={
                        currentlyPlayingId === message.id
                          ? "pause"
                          : "play"
                      }
                      size={12}
                      color={
                        currentlyPlayingId === message.id
                          ? "#ef4444"
                          : "#2563EB"
                      }
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        ))}
        
        {isLoading && (
          <View style={styles.typingContainer}>
            <View style={styles.typingBubble}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.typingText}>Zenio está escribiendo...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Escribe o mantén presionado el micrófono..."
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={500}
            editable={!speech.isListening && !isLoading}
          />
          
          <View style={styles.inputButtons}>
            {/* Botón de voz */}
            <TouchableOpacity
              style={[
                styles.voiceButton,
                speech.isListening && styles.voiceButtonActive,
                speech.isLoading && styles.voiceButtonLoading,
              ]}
              onPress={handleVoicePress}
              disabled={speech.isLoading || isLoading}
            >
              {speech.isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons
                  name={speech.isListening ? "stop" : "mic"}
                  size={20}
                  color="white"
                />
              )}
            </TouchableOpacity>

            {/* Botón de envío */}
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
              ]}
              onPress={handleTextSubmit}
              disabled={!inputText.trim() || isLoading || speech.isListening}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="send" size={18} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Indicadores de estado */}
        {speech.isListening && (
          <View style={styles.listeningIndicator}>
            <View style={styles.pulseContainer}>
              <View style={[styles.pulse, styles.pulse1]} />
              <View style={[styles.pulse, styles.pulse2]} />
              <View style={[styles.pulse, styles.pulse3]} />
            </View>
            <Text style={styles.listeningText}>Escuchando... Toca para detener</Text>
          </View>
        )}
      </View>
    </View>
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
    borderBottomColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 8,
  },
  speakingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    backgroundColor: '#dcfdf7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  speakingText: {
    fontSize: 12,
    color: '#059669',
    marginLeft: 4,
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  zenioMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#2563EB',
    borderBottomRightRadius: 4,
  },
  zenioBubble: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: 'white',
  },
  zenioText: {
    color: '#1e293b',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 12,
    opacity: 0.7,
  },
  userTime: {
    color: 'white',
  },
  zenioTime: {
    color: '#64748b',
  },
  voiceIcon: {
    marginLeft: 4,
  },
  typingContainer: {
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  typingText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  inputContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
    color: '#1e293b',
    backgroundColor: '#f9fafb',
  },
  inputButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voiceButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  voiceButtonActive: {
    backgroundColor: '#dc2626',
  },
  voiceButtonLoading: {
    backgroundColor: '#6b7280',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  listeningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 8,
  },
  pulseContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  pulse: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#dc2626',
    opacity: 0.8,
  },
  pulse1: {
    // Animación CSS no disponible en RN, usar Animated API si necesario
  },
  pulse2: {
    // Animación CSS no disponible en RN
  },
  pulse3: {
    // Animación CSS no disponible en RN
  },
  listeningText: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '500',
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  autoPlayToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  autoPlayActive: {
    backgroundColor: '#dcfce7',
  },
  autoPlayText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 4,
    fontWeight: '500',
  },
  autoPlayActiveText: {
    color: '#10B981',
  },
  playButton: {
    marginLeft: 8,
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  playButtonActive: {
    backgroundColor: '#fee2e2',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fee2e2',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  stopButtonText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#ef4444',
    fontWeight: 'bold',
  },
});

export default VoiceZenioChat;