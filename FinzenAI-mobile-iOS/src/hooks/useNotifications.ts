import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import notificationService, {
  NotificationPreferences,
  NotificationHistoryItem,
} from '../services/notificationService';

interface UseNotificationsOptions {
  autoRegister?: boolean;
  onNotificationReceived?: (notification: Notifications.Notification) => void;
  onNotificationTapped?: (data: Record<string, any>) => void;
}

interface UseNotificationsReturn {
  isEnabled: boolean;
  isLoading: boolean;
  preferences: NotificationPreferences | null;
  history: NotificationHistoryItem[];
  token: string | null;
  initialize: () => Promise<boolean>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<boolean>;
  refreshHistory: () => Promise<void>;
  markAsRead: (id: string) => Promise<boolean>;
  sendTestNotification: () => Promise<boolean>;
  unregister: () => Promise<boolean>;
}

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const { autoRegister = true, onNotificationReceived, onNotificationTapped } = options;

  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [token, setToken] = useState<string | null>(null);

  const navigation = useNavigation();
  const appState = useRef(AppState.currentState);

  // Inicializar notificaciones
  const initialize = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Inicializar servicio
      const pushToken = await notificationService.initialize();
      setToken(pushToken);

      // Verificar si están habilitadas
      const enabled = await notificationService.isEnabled();
      setIsEnabled(enabled);

      if (enabled && pushToken) {
        // Registrar dispositivo en backend
        const registered = await notificationService.registerDevice();

        if (registered) {
          // Cargar preferencias
          const prefs = await notificationService.getPreferences();
          setPreferences(prefs);

          // Cargar historial
          const hist = await notificationService.getHistory(20);
          setHistory(hist);
        }

        return registered;
      }

      return false;
    } catch (error) {
      console.error('[useNotifications] Error inicializando:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Manejar respuesta a notificación (tap)
  const handleNotificationResponse = useCallback((response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data as Record<string, any>;

    if (onNotificationTapped) {
      onNotificationTapped(data);
    }

    // Navegación automática basada en el tipo de notificación
    const screen = data?.screen;
    if (screen && navigation) {
      try {
        // @ts-ignore - La navegación depende de las rutas disponibles
        navigation.navigate(screen);
      } catch (error) {
        console.log('[useNotifications] Error navegando a:', screen);
      }
    }
  }, [navigation, onNotificationTapped]);

  // Actualizar preferencias
  const updatePreferences = useCallback(async (prefs: Partial<NotificationPreferences>): Promise<boolean> => {
    try {
      const updated = await notificationService.updatePreferences(prefs);
      if (updated) {
        setPreferences(updated);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[useNotifications] Error actualizando preferencias:', error);
      return false;
    }
  }, []);

  // Refrescar historial
  const refreshHistory = useCallback(async (): Promise<void> => {
    try {
      const hist = await notificationService.getHistory(50);
      setHistory(hist);
    } catch (error) {
      console.error('[useNotifications] Error refrescando historial:', error);
    }
  }, []);

  // Marcar como leída
  const markAsRead = useCallback(async (id: string): Promise<boolean> => {
    try {
      const success = await notificationService.markAsRead(id);
      if (success) {
        setHistory((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, status: 'READ', readAt: new Date().toISOString() } : item
          )
        );
      }
      return success;
    } catch (error) {
      console.error('[useNotifications] Error marcando como leída:', error);
      return false;
    }
  }, []);

  // Enviar notificación de prueba
  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    try {
      return await notificationService.sendTest();
    } catch (error) {
      console.error('[useNotifications] Error enviando prueba:', error);
      return false;
    }
  }, []);

  // Desregistrar dispositivo
  const unregister = useCallback(async (): Promise<boolean> => {
    try {
      const success = await notificationService.unregisterDevice();
      if (success) {
        setToken(null);
        setPreferences(null);
        setHistory([]);
      }
      return success;
    } catch (error) {
      console.error('[useNotifications] Error desregistrando:', error);
      return false;
    }
  }, []);

  // Efecto para configurar listeners
  useEffect(() => {
    // Configurar listeners de notificaciones
    notificationService.setupListeners(
      onNotificationReceived,
      handleNotificationResponse
    );

    return () => {
      notificationService.removeListeners();
    };
  }, [onNotificationReceived, handleNotificationResponse]);

  // Efecto para auto-registro
  useEffect(() => {
    if (autoRegister) {
      initialize();
    }
  }, [autoRegister, initialize]);

  // Efecto para verificar permisos al volver a la app
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // La app vuelve a primer plano, verificar permisos
        const enabled = await notificationService.isEnabled();
        setIsEnabled(enabled);
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return {
    isEnabled,
    isLoading,
    preferences,
    history,
    token,
    initialize,
    updatePreferences,
    refreshHistory,
    markAsRead,
    sendTestNotification,
    unregister,
  };
}

export default useNotifications;
