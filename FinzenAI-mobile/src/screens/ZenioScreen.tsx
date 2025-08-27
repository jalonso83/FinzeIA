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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/auth';
import api from '../utils/api';
import { categoriesAPI } from '../utils/api';

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
  
  const { user } = useAuthStore();
  
  const scrollViewRef = useRef<ScrollView>(null);

  // Cargar categorías al montar el componente
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
            autoGreeting: true
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
          
          setHasSentFirst(true);
        } catch (error) {
          console.error('Error al inicializar conversación:', error);
          setMessages([{
            id: '1',
            text: 'Ocurrió un error al inicializar la conversación. Intenta escribir un mensaje.',
            isUser: false,
            timestamp: new Date(),
          }]);
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
      
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'No se pudo enviar el mensaje');
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
        <TouchableOpacity style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={24} color="#64748b" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
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

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
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
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  settingsButton: {
    padding: 8,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 80,
  },
  messageWrapper: {
    marginBottom: 16,
  },
  userMessageWrapper: {
    alignItems: 'flex-end',
  },
  botMessageWrapper: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
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
    marginBottom: 16,
  },
  typingDots: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 44,
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
});