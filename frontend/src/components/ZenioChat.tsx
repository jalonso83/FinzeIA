import React, { useState, useRef, useEffect } from 'react';
import isotipo from '../assets/isotipo.png';
import api from '../utils/api';
import { Send } from 'lucide-react';
import { useCategoriesStore } from '../stores/categories';

interface ZenioChatProps {
  onClose?: () => void;
  isOnboarding?: boolean;
  initialMessage?: string;
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

const ZenioChat: React.FC<ZenioChatProps> = ({ onClose, isOnboarding = false, initialMessage, onTransactionCreated, onTransactionUpdated, onTransactionDeleted, onBudgetCreated, onBudgetUpdated, onBudgetDeleted, onGoalCreated, onGoalUpdated, onGoalDeleted, onZenioMessage }) => {
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

  // Obtener categorías del store
  const { categories, fetchCategories } = useCategoriesStore();

  // Cargar categorías al montar el componente
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

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
        
        switch (response.data.action) {
          case 'transaction_created':
            if (onTransactionCreated && response.data.transaction) {
              onTransactionCreated(response.data.transaction);
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
      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2 px-6 py-4 border-t border-border bg-white rounded-b-2xl">
        <input
          type="text"
          className="flex-1 px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder={submitting ? 'Zenio está procesando...' : 'Escribe tu mensaje...'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={submitting}
          readOnly={submitting}
        />
        <button
          type="submit"
          className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-secondary transition disabled:opacity-50 flex items-center justify-center"
          disabled={submitting || !input.trim()}
          aria-label="Enviar mensaje"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};

export default ZenioChat; 