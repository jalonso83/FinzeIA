import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  Image,
  Text,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { setStringAsync } from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { useAuthStore } from '../stores/auth';
import { useDashboardStore } from '../stores/dashboard';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import api from '../utils/api';
import { categoriesAPI } from '../utils/api';
import { useSpeech } from '../hooks/useSpeech';
import CustomModal from './modals/CustomModal';

import { logger } from '../utils/logger';
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ZenioFloatingButtonProps {
  onTransactionCreated?: () => void;
  onTransactionUpdated?: () => void;
  onTransactionDeleted?: () => void;
  onBudgetCreated?: () => void;
  onBudgetUpdated?: () => void;
  onBudgetDeleted?: () => void;
  onGoalCreated?: () => void;
  onGoalUpdated?: () => void;
  onGoalDeleted?: () => void;
}

const ZenioFloatingButton: React.FC<ZenioFloatingButtonProps> = ({
  onTransactionCreated,
  onTransactionUpdated,
  onTransactionDeleted,
  onBudgetCreated,
  onBudgetUpdated,
  onBudgetDeleted,
  onGoalCreated,
  onGoalUpdated,
  onGoalDeleted,
}) => {
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [hasSentFirst, setHasSentFirst] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [autoPlay, setAutoPlay] = useState(false);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const [showTipsModal, setShowTipsModal] = useState(false);
  const [showProModalTTS, setShowProModalTTS] = useState(false);

  const { user } = useAuthStore();
  const { updateZenioUsage, canUseTextToSpeech, openPlansModal } = useSubscriptionStore();
  const { refreshDashboard, onTransactionChange, onBudgetChange, onGoalChange } = useDashboardStore();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  // Animaciones
  const scale = useRef(new Animated.Value(1)).current;

  // Hook de voz
  const speech = useSpeech();

  // Función para limpiar markdown del texto
  const cleanMarkdownForSpeech = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')  // **texto** → texto
      .replace(/\*(.*?)\*/g, '$1')     // *texto* → texto
      .replace(/#{1,6}\s+/g, '')       // ### Título → Título
      .replace(/`(.*?)`/g, '$1')       // `código` → código
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [link](url) → link
      .replace(/^\s*[-*+]\s+/gm, '')   // - lista → lista
      .replace(/^\s*\d+\.\s+/gm, '')   // 1. lista → lista
      .trim();
  };

  // Función para reproducir mensaje individual
  const playMessage = async (messageId: string, text: string) => {
    // Verificar si el usuario tiene acceso a TTS según su plan (solo PRO)
    if (!canUseTextToSpeech()) {
      // iOS: cerrar el chat modal primero para evitar modales anidados
      setShowChat(false);
      setTimeout(() => {
        setShowProModalTTS(true);
      }, 400);
      return;
    }

    if (speech.isSpeaking && currentlyPlayingId === messageId) {
      speech.stopSpeaking();
      setCurrentlyPlayingId(null);
      return;
    }

    if (speech.isSpeaking) {
      speech.stopSpeaking();
    }

    setCurrentlyPlayingId(messageId);
    const cleanText = cleanMarkdownForSpeech(text);
    await speech.speakResponse(cleanText);
    setCurrentlyPlayingId(null);
  };

  // Manejar transcripción de voz
  useEffect(() => {
    if (speech.transcript) {
      setInputText(speech.transcript);
      speech.clearTranscript();
    }
  }, [speech.transcript]);

  // Manejar errores de voz
  useEffect(() => {
    if (speech.error) {
      Alert.alert('Error de Voz', speech.error, [
        { text: 'OK', onPress: speech.clearError },
      ]);
    }
  }, [speech.error]);

  // Cargar categorías al montar el componente
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await categoriesAPI.getAll();
        setCategories(response.data || []);
      } catch (error) {
        logger.error('Error loading categories:', error);
        setCategories([]);
      }
    };
    
    loadCategories();
  }, []);

  // Auto-inicializar conversación cuando se abre el chat
  useEffect(() => {
    const initializeConversation = async () => {
      if (showChat && !hasSentFirst && user && categories.length > 0) {
        const userName = user.name || user.email || 'Usuario';
        const userMessage = `Hola Zenio, soy ${userName}`;
        
        try {
          setLoading(true);
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
            setMessages([{
              id: '1',
              text: response.data.message,
              isUser: false,
              timestamp: new Date(),
            }]);
          }

          if (response.data.threadId) {
            setThreadId(response.data.threadId);
          }

          // Actualizar uso de Zenio si viene en la respuesta
          if (response.data.zenioUsage) {
            updateZenioUsage(response.data.zenioUsage);
          }

          setHasSentFirst(true);
        } catch (error: any) {
          logger.error('Error al inicializar conversación:', error);
          logger.log('Error status:', error.response?.status);

          // Detectar error 403 - límite de Zenio alcanzado
          if (error.response?.status === 403) {
            setMessages([{
              id: '1',
              text: '¡Hola! Has alcanzado el límite de consultas de este mes. Mejora tu plan para seguir conversando conmigo sin límites. 🚀',
              isUser: false,
              timestamp: new Date(),
            }]);
            // iOS: cerrar el chat modal primero para evitar modales anidados
            setShowTipsModal(false);
            setShowChat(false);
            setTimeout(() => {
              openPlansModal();
            }, 400);
          } else {
            setMessages([{
              id: '1',
              text: 'Ocurrió un error al inicializar la conversación. Intenta escribir un mensaje.',
              isUser: false,
              timestamp: new Date(),
            }]);
          }
          // IMPORTANTE: Siempre marcar como enviado para evitar loop infinito
          setHasSentFirst(true);
        } finally {
          setLoading(false);
        }
      }
    };

    if (showChat) {
      initializeConversation();
    }
  }, [showChat, user, categories, hasSentFirst]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (isVoiceMessage = false) => {
    if (!inputText.trim() || loading) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    setLoading(true);

    try {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      const payload = {
        message: inputText.trim(),
        threadId,
        categories: categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          type: cat.type
        })),
        timezone: userTimezone
      };

      const response = await api.post('/zenio/chat', payload);
      
      if (response.data.message) {
        const messageId = (Date.now() + 1).toString();
        const zenioMessage: Message = {
          id: messageId,
          text: response.data.message,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, zenioMessage]);

        // Auto-reproducir si está habilitado o si el mensaje original fue por voz
        // Solo si el usuario tiene acceso a TTS (PLUS/PRO)
        if ((autoPlay || isVoiceMessage) && !speech.isSpeaking && canUseTextToSpeech()) {
          logger.log('🔊 Zenio va a responder hablando...');
          setCurrentlyPlayingId(messageId);
          const cleanText = cleanMarkdownForSpeech(response.data.message);
          await speech.speakResponse(cleanText);
          setCurrentlyPlayingId(null);
        }
      }

      // Log para debugging de acciones ejecutadas
      if (response.data.executedActions) {
        logger.log('[ZenioFloatingButton] Acciones ejecutadas:', response.data.executedActions);
      }

      if (response.data.threadId && !threadId) {
        setThreadId(response.data.threadId);
      }

      // Actualizar uso de Zenio si viene en la respuesta
      if (response.data.zenioUsage) {
        updateZenioUsage(response.data.zenioUsage);
      }

      // Trigger callbacks if needed
      if (response.data.action) {
        switch (response.data.action) {
          case 'transaction_created':
            onTransactionCreated?.();
            onTransactionChange(); // Refresh dashboard AND transaction module
            break;
          case 'transaction_updated':
            onTransactionUpdated?.();
            onTransactionChange(); // Refresh dashboard AND transaction module
            break;
          case 'transaction_deleted':
            onTransactionDeleted?.();
            onTransactionChange(); // Refresh dashboard AND transaction module
            break;
          case 'budget_created':
            onBudgetCreated?.();
            onBudgetChange(); // Refresh dashboard AND budget module
            break;
          case 'budget_updated':
            onBudgetUpdated?.();
            onBudgetChange(); // Refresh dashboard AND budget module
            break;
          case 'budget_deleted':
            onBudgetDeleted?.();
            onBudgetChange(); // Refresh dashboard AND budget module
            break;
          case 'goal_created':
            onGoalCreated?.();
            onGoalChange(); // Refresh dashboard AND goal module
            break;
          case 'goal_updated':
            onGoalUpdated?.();
            onGoalChange(); // Refresh dashboard AND goal module
            break;
          case 'goal_deleted':
            onGoalDeleted?.();
            onGoalChange(); // Refresh dashboard AND goal module
            break;
          case 'budget_limit_reached':
          case 'goal_limit_reached':
            // Mostrar modal de upgrade cuando se alcanza límite de presupuestos o metas
            setTimeout(() => {
              openPlansModal();
            }, 500);
            break;
        }
      }

      // También verificar si la respuesta indica que se debe hacer upgrade
      if (response.data.upgrade === true) {
        setTimeout(() => {
          openPlansModal();
        }, 500);
      }

    } catch (error: any) {
      logger.error('Error sending message:', error);
      logger.log('Error status:', error.response?.status);

      // Detectar error 403 - límite de Zenio alcanzado
      if (error.response?.status === 403) {
        const limitMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Has alcanzado el límite de consultas de este mes. Mejora tu plan para seguir conversando conmigo sin límites. 🚀',
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, limitMessage]);
        // iOS: cerrar el chat modal primero para evitar modales anidados
        setShowTipsModal(false);
        setShowChat(false);
        setTimeout(() => {
          openPlansModal();
        }, 400);
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Error al enviar mensaje. Por favor intenta de nuevo.',
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setLoading(false);
    }
  };

  const startVoiceRecording = async () => {
    if (speech.isListening) {
      // Detener grabación
      const transcript = await speech.stopListening();
      if (transcript) {
        // Enviar mensaje automáticamente si hay transcripción
        await sendMessage(true);
      }
      setIsRecording(false);
    } else {
      // Iniciar grabación
      if (speech.isSpeaking) {
        speech.stopSpeaking();
      }
      setIsRecording(true);
      await speech.startListening();
    }
  };

  // Función para copiar mensaje al clipboard
  const copyMessage = async (message: Message) => {
    try {
      // Limpiar markdown del texto para copiar solo texto plano
      const cleanText = cleanMarkdownForSpeech(message.text);
      await setStringAsync(cleanText);

      // Mostrar feedback sutil al usuario
      Alert.alert(
        '📋 Copiado',
        'Mensaje copiado al portapapeles',
        [{ text: 'OK' }]
      );
    } catch (error) {
      logger.error('Error copying message:', error);
      Alert.alert('Error', 'No se pudo copiar el mensaje');
    }
  };

  const handlePress = () => {
    // Animate button press
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setShowChat(true);
  };

  const handleCloseChat = () => {
    setShowChat(false);
  };

  return (
    <>
      {/* Floating Button */}
      <Animated.View
        style={[
          styles.floatingButton,
          {
            transform: [{ scale }],
            bottom: 100 + insets.bottom,
            right: 20,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.button}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <Image 
            source={require('../assets/isotipo.png')} 
            style={styles.zenioIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>

      </Animated.View>

      {/* Chat Modal */}
      <Modal
        key={showChat ? 'chat-open' : 'chat-closed'}
        visible={showChat}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={handleCloseChat}
        pointerEvents={showChat ? 'auto' : 'none'}
      >
        <KeyboardAvoidingView
          style={styles.chatModalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* Header del chat */}
          <View style={[styles.chatHeader, { paddingTop: insets.top + 10 }]}>
            <View style={styles.chatHeaderLeft}>
              <Image
                source={require('../assets/isotipo.png')}
                style={styles.chatHeaderIcon}
                resizeMode="contain"
              />
              <View>
                <Text style={styles.chatHeaderTitle}>Zenio</Text>
                <Text style={styles.chatHeaderSubtitle}>Tu copiloto financiero</Text>
              </View>
            </View>

            <View style={styles.headerControls}>
              {/* Botón de información/tips */}
              <TouchableOpacity
                onPress={() => {
                  logger.log('Info button pressed, showing tips modal');
                  setShowTipsModal(true);
                }}
                style={styles.infoButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Ionicons name="information-circle-outline" size={18} color="#2563EB" />
              </TouchableOpacity>

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

              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCloseChat}
              >
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>


          {/* Chat Content */}
          <View style={styles.chatContent}>
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.map((message) => (
                <TouchableOpacity
                  key={message.id}
                  style={[
                    styles.messageContainer,
                    message.isUser ? styles.userMessage : styles.zenioMessage,
                  ]}
                  onLongPress={() => copyMessage(message)}
                  activeOpacity={0.8}
                  delayLongPress={500}
                >
                  {message.isUser ? (
                    <Text
                      style={[
                        styles.messageText,
                        styles.userMessageText,
                      ]}
                    >
                      {message.text}
                    </Text>
                  ) : (
                    <Markdown
                      style={{
                        body: {
                          ...styles.messageText,
                          ...styles.zenioMessageText,
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
                        },
                        heading1: {
                          fontSize: 18,
                          fontWeight: 'bold',
                          marginBottom: 8,
                        },
                        heading2: {
                          fontSize: 16,
                          fontWeight: 'bold',
                          marginBottom: 6,
                        },
                        heading3: {
                          fontSize: 14,
                          fontWeight: 'bold',
                          marginBottom: 4,
                        },
                        list_item: {
                          marginBottom: 2,
                        },
                      }}
                    >
                      {message.text}
                    </Markdown>
                  )}
                  <View style={styles.messageFooter}>
                    <Text
                      style={[
                        styles.messageTime,
                        message.isUser ? styles.userMessageTime : styles.zenioMessageTime,
                      ]}
                    >
                      {message.timestamp.toLocaleTimeString('es-DO', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                    <Ionicons
                      name="copy-outline"
                      size={10}
                      color={message.isUser ? "#94a3b8" : "#9ca3af"}
                      style={styles.copyIcon}
                    />
                  </View>

                  {/* Botón de play para mensajes de Zenio */}
                  {!message.isUser && (
                    <TouchableOpacity
                      style={[
                        styles.playButton,
                        currentlyPlayingId === message.id && styles.playButtonActive
                      ]}
                      onPress={() => playMessage(message.id, message.text)}
                    >
                      <Ionicons
                        name={currentlyPlayingId === message.id ? "pause" : "play"}
                        size={12}
                        color={currentlyPlayingId === message.id ? "#ffffff" : "#64748b"}
                      />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))}
              {loading && (
                <View style={styles.typingIndicator}>
                  <Text style={styles.typingText}>Zenio está escribiendo...</Text>
                </View>
              )}
              {speech.isSpeaking && (
                <View style={styles.speakingIndicator}>
                  <Ionicons name="volume-high" size={16} color="#10B981" />
                  <Text style={styles.speakingText}>Zenio está hablando...</Text>
                </View>
              )}
            </ScrollView>

            {/* Input Container */}
            <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 10 }]}>
              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder={Platform.OS === 'ios'
                  ? "Escribe tu mensaje o usa el micrófono del teclado..."
                  : "Escribe tu mensaje..."
                }
                placeholderTextColor="#9ca3af"
                multiline
                maxLength={500}
                onSubmitEditing={() => sendMessage()}
                blurOnSubmit={false}
              />
              <View style={styles.inputActions}>
                {Platform.OS === 'android' && (
                  <TouchableOpacity
                    style={[
                      styles.voiceButton,
                      (speech.isListening || speech.isLoading) && styles.voiceButtonActive
                    ]}
                    onPress={startVoiceRecording}
                    disabled={loading || speech.isLoading}
                  >
                    {speech.isLoading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Ionicons
                        name={speech.isListening ? "stop" : "mic"}
                        size={20}
                        color={(speech.isListening || speech.isLoading) ? "white" : "#64748b"}
                      />
                    )}
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!inputText.trim() || loading) && styles.sendButtonDisabled
                  ]}
                  onPress={() => sendMessage()}
                  disabled={!inputText.trim() || loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Ionicons name="send" size={20} color="#ffffff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Overlay de Tips - DENTRO del Modal de Chat para evitar conflictos en iOS */}
          {showTipsModal && (
        <TouchableOpacity
          style={styles.tipsModalContainer}
          activeOpacity={1}
          onPress={() => {
            logger.log('Tips modal backdrop pressed');
            setShowTipsModal(false);
          }}
        >
          <TouchableOpacity
            style={styles.tipsModal}
            activeOpacity={1}
            onPress={(e) => {
              // Prevenir que el click se propague al backdrop
              e.stopPropagation();
            }}
          >
            <View style={styles.tipsModalHeader}>
              <Text style={styles.tipsModalTitle}>💡 Tips para usar Zenio</Text>
              <TouchableOpacity
                onPress={() => {
                  logger.log('Tips modal close button pressed');
                  setShowTipsModal(false);
                }}
                style={styles.tipsModalClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.tipsContent}>
              {/* iOS Voice Tip */}
              {Platform.OS === 'ios' && (
                <View style={styles.tipItem}>
                  <View style={styles.tipIcon}>
                    <Ionicons name="mic" size={20} color="#2563EB" />
                  </View>
                  <View style={styles.tipText}>
                    <Text style={styles.tipTitle}>Micrófono en iOS</Text>
                    <Text style={styles.tipDescription}>
                      Usa el 🎤 del teclado para hablar con Zenio de forma más confiable
                    </Text>
                  </View>
                </View>
              )}

              {/* Android Voice Tip */}
              {Platform.OS === 'android' && (
                <View style={styles.tipItem}>
                  <View style={styles.tipIcon}>
                    <Ionicons name="mic" size={20} color="#2563EB" />
                  </View>
                  <View style={styles.tipText}>
                    <Text style={styles.tipTitle}>Micrófono en Android</Text>
                    <Text style={styles.tipDescription}>
                      Toca el botón de micrófono para hablar directamente con Zenio
                    </Text>
                  </View>
                </View>
              )}

              {/* Copy Tip */}
              <View style={styles.tipItem}>
                <View style={styles.tipIcon}>
                  <Ionicons name="copy-outline" size={20} color="#2563EB" />
                </View>
                <View style={styles.tipText}>
                  <Text style={styles.tipTitle}>Copiar mensajes</Text>
                  <Text style={styles.tipDescription}>
                    Mantén presionado cualquier mensaje para copiarlo al portapapeles
                  </Text>
                </View>
              </View>

              {/* Auto-play Tip */}
              <View style={styles.tipItem}>
                <View style={styles.tipIcon}>
                  <Ionicons name="volume-high" size={20} color="#2563EB" />
                </View>
                <View style={styles.tipText}>
                  <Text style={styles.tipTitle}>Respuestas por voz</Text>
                  <Text style={styles.tipDescription}>
                    Activa el botón de volumen para que Zenio responda hablando automáticamente
                  </Text>
                </View>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
          )}
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal PRO - Para TTS */}
      <CustomModal
        visible={showProModalTTS}
        type="warning"
        title="Función PRO"
        message={`La voz de Zenio está disponible exclusivamente para usuarios del plan PRO.\n\n¡Mejora tu plan para desbloquear esta y más funciones!`}
        buttonText="Ver Planes"
        onClose={() => {
          setShowProModalTTS(false);
          // iOS: esperar que el modal cierre antes de abrir el siguiente
          setTimeout(() => {
            openPlansModal();
          }, 350);
        }}
        showSecondaryButton={true}
        secondaryButtonText="Cerrar"
        onSecondaryPress={() => setShowProModalTTS(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    width: 60,
    height: 60,
    zIndex: 1000,
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 12,
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  zenioIcon: {
    width: 36,
    height: 36,
  },
  chatModalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatHeaderIcon: {
    width: 32,
    height: 32,
    marginRight: 12,
  },
  chatHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  chatHeaderSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  chatContent: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingVertical: 16,
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: '80%',
    position: 'relative',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#2563EB',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  zenioMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#ffffff',
  },
  zenioMessageText: {
    color: '#1e293b',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  userMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  zenioMessageTime: {
    color: '#9ca3af',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  copyIcon: {
    marginLeft: 4,
    opacity: 0.6,
  },
  typingIndicator: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginVertical: 4,
  },
  typingText: {
    color: '#64748b',
    fontSize: 14,
    fontStyle: 'italic',
  },
  speakingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#dcfdf7',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginVertical: 4,
  },
  speakingText: {
    color: '#059669',
    fontSize: 14,
    fontStyle: 'italic',
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  voiceButtonActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  sendButton: {
    backgroundColor: '#2563EB',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
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
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonActive: {
    backgroundColor: '#2563EB',
  },
  // Info Button styles
  infoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Tips Modal styles
  tipsModalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 9999,
  },
  tipsModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 0,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%', // Limitar altura para permitir scroll
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  tipsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tipsModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  tipsModalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipsContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexGrow: 0, // Evitar que crezca más allá del maxHeight
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tipText: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  // Upgrade Overlay styles
  upgradeOverlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 9999,
  },
  upgradeOverlayModal: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    paddingTop: 16,
    width: '100%',
    maxWidth: 380,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  upgradeCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  upgradeIconContainer: {
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  upgradeIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upgradeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 6,
  },
  upgradeDescription: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  upgradeComparisonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  upgradeComparisonCard: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  upgradePremiumCard: {
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  upgradeComparisonLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '600',
  },
  upgradePremiumLabel: {
    color: '#92400E',
  },
  upgradeComparisonValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  upgradePremiumValue: {
    color: '#B45309',
  },
  upgradeFeaturesContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  upgradeFeaturesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  upgradeFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  upgradeFeatureText: {
    fontSize: 12,
    color: '#4B5563',
  },
  upgradeTrialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: '#D1FAE5',
    borderRadius: 20,
    alignSelf: 'center',
  },
  upgradeTrialText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  upgradeButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  upgradeContinueButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  upgradeContinueButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ZenioFloatingButton;