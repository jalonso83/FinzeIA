import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/auth';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import api from '../utils/api';
import { categoriesAPI } from '../utils/api';
import UpgradeModal from '../components/subscriptions/UpgradeModal';

import { logger } from '../utils/logger';
interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function ZenioScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [hasSentFirst, setHasSentFirst] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [showTips, setShowTips] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const { user } = useAuthStore();
  const { updateZenioUsage, fetchSubscription } = useSubscriptionStore();

  const scrollViewRef = useRef<ScrollView>(null);

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

  // Auto-inicializar conversación (como en la web)
  useEffect(() => {
    const initializeConversation = async () => {
      if (!hasSentFirst && user && categories.length > 0) {
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
            autoGreeting: true,
            isOnboarding: false // IMPORTANTE: NO es onboarding, es un saludo normal
          };

          const response = await api.post('/zenio/chat', payload);
          
          if (response.data.message) {
            // Solo agregar la respuesta de Zenio, NO el mensaje del usuario
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
          logger.error('Error al inicializar conversación:', error.message);

          // Verificar si es error de límite alcanzado (403)
          if (error.response?.status === 403) {
            // Cerrar cualquier modal activo primero (evitar modales anidados en iOS)
            setShowTips(false);

            setMessages([{
              id: '1',
              text: '¡Hola! Has alcanzado el límite de consultas de este mes. Mejora tu plan para seguir conversando conmigo sin límites. 🚀',
              isUser: false,
              timestamp: new Date(),
            }]);

            // Ocultar teclado y dar tiempo a iOS de cerrar modales antes de abrir otro
            Keyboard.dismiss();
            setTimeout(() => {
              setShowUpgradeModal(true);
            }, 300);
          } else {
            setMessages([{
              id: '1',
              text: 'Ocurrió un error al inicializar la conversación. Intenta escribir un mensaje.',
              isUser: false,
              timestamp: new Date(),
            }]);
          }
          // IMPORTANTE: Siempre marcar como enviado para evitar loop infinito de reintentos
          setHasSentFirst(true);
        } finally {
          setLoading(false);
        }
      }
    };

    initializeConversation();
  }, [user, hasSentFirst, categories]);

  useEffect(() => {
    // Auto scroll to bottom when new messages are added
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
    };

    const messageText = inputText;
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      // Obtener zona horaria del usuario
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      let payload: any = { message: messageText };
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
        const botResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: response.data.message,
          isUser: false,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, botResponse]);
      }

      // Actualizar threadId si viene en la respuesta
      if (response.data.threadId) {
        setThreadId(response.data.threadId);
      }

      // Actualizar uso de Zenio si viene en la respuesta
      if (response.data.zenioUsage) {
        updateZenioUsage(response.data.zenioUsage);
      }

    } catch (error: any) {
      logger.error('Error sending message:', error.message);

      // Verificar si es error de límite alcanzado (403)
      if (error.response?.status === 403) {
        // Cerrar cualquier modal activo primero (evitar modales anidados en iOS)
        setShowTips(false);

        const limitMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Has alcanzado el límite de consultas de este mes. Mejora tu plan para seguir conversando conmigo sin límites. 🚀',
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, limitMessage]);

        // Ocultar teclado y dar tiempo a iOS de cerrar modales antes de abrir otro
        Keyboard.dismiss();
        setTimeout(() => {
          setShowUpgradeModal(true);
        }, 300);
      } else {
        Alert.alert('Error', 'No se pudo enviar el mensaje');
      }
    } finally {
      setLoading(false);
    }
  };


  const startVoiceRecording = () => {
    // TODO: Implementar grabación de voz con expo-av
    setIsRecording(true);
    Alert.alert('Próximamente', 'La funcionalidad de voz estará disponible pronto');
    setTimeout(() => setIsRecording(false), 2000);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };


  return (
    <>
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            <Image
              source={require('../assets/isotipo.png')}
              style={styles.zenioIcon}
              resizeMode="contain"
            />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Zenio</Text>
            <Text style={styles.subtitle}>Tu copiloto financiero</Text>
          </View>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowTips(true)}
            activeOpacity={0.6}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Ionicons name="information-circle-outline" size={28} color="#2563EB" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            activeOpacity={0.6}
          >
            <Ionicons name="mic-outline" size={28} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            activeOpacity={0.6}
          >
            <Ionicons name="close" size={28} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageWrapper,
                message.isUser ? styles.userMessageWrapper : styles.botMessageWrapper,
              ]}
            >
              <View
                style={[
                  styles.messageBubble,
                  message.isUser ? styles.userMessage : styles.botMessage,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    message.isUser ? styles.userMessageText : styles.botMessageText,
                  ]}
                >
                  {message.text}
                </Text>
                <Text
                  style={[
                    styles.messageTime,
                    message.isUser ? styles.userMessageTime : styles.botMessageTime,
                  ]}
                >
                  {formatTime(message.timestamp)}
                </Text>
              </View>
            </View>
          ))}

          {loading && (
            <View style={styles.typingIndicator}>
              <View style={styles.typingDots}>
                <View style={[styles.dot, styles.dot1]} />
                <View style={[styles.dot, styles.dot2]} />
                <View style={[styles.dot, styles.dot3]} />
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Escribe tu pregunta..."
              placeholderTextColor="#9ca3af"
              multiline
              maxLength={500}
            />
            <View style={styles.inputActions}>
              <TouchableOpacity
                style={[styles.voiceButton, isRecording && styles.voiceButtonActive]}
                onPress={startVoiceRecording}
              >
                <Ionicons
                  name={isRecording ? "mic" : "mic-outline"}
                  size={20}
                  color={isRecording ? "white" : "#64748b"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                onPress={sendMessage}
                disabled={!inputText.trim() || loading}
              >
                <Ionicons name="send" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>

    {/* Modal de Tips - FUERA del SafeAreaView para que funcione en iOS */}
    {showTips && (
      <Modal
        visible={true}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTips(false)}
        statusBarTranslucent={false}
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : 'none'}
      >
      <TouchableOpacity
        style={styles.tipsModalContainer}
        activeOpacity={1}
        onPress={() => setShowTips(false)}
      >
        <TouchableOpacity
          style={styles.tipsModal}
          activeOpacity={1}
          onPress={(e) => {
            e.stopPropagation();
          }}
        >
          <View style={styles.tipsModalHeader}>
            <Text style={styles.tipsModalTitle}>💡 Tips para usar Zenio</Text>
            <TouchableOpacity
              onPress={() => setShowTips(false)}
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
                    Usa el 🎤 del teclado del teléfono para hablar con Zenio de forma más confiable
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
      </Modal>
    )}

    {/* Upgrade Modal */}
    <UpgradeModal
      visible={showUpgradeModal}
      onClose={() => {
        setShowUpgradeModal(false);
        // Refrescar suscripción después de cerrar
        fetchSubscription();
      }}
      limitType="zenio"
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    borderRadius: 22,
    backgroundColor: 'rgba(37, 99, 235, 0.1)', // Fondo sutil azul
  },
  settingsButton: {
    padding: 8,
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
  },
  messageWrapper: {
    marginBottom: 12,
  },
  userMessageWrapper: {
    alignItems: 'flex-end',
  },
  botMessageWrapper: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  userMessage: {
    backgroundColor: '#2563EB',
  },
  botMessage: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: 'white',
  },
  botMessageText: {
    color: '#1e293b',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  userMessageTime: {
    color: '#bfdbfe',
  },
  botMessageTime: {
    color: '#9ca3af',
  },
  typingIndicator: {
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  typingDots: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9ca3af',
    marginHorizontal: 2,
  },
  dot1: {
    // Animation would be added here in a real implementation
  },
  dot2: {
    // Animation would be added here in a real implementation
  },
  dot3: {
    // Animation would be added here in a real implementation
  },
  inputContainer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 16 : 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minHeight: 40,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    maxHeight: 100,
    paddingVertical: 8,
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  voiceButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  voiceButtonActive: {
    backgroundColor: '#dc2626',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  zenioIcon: {
    width: 24,
    height: 24,
  },
  tipsModalContainer: {
    flex: 1,
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
    maxHeight: '80%',
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
    flexGrow: 0,
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
});