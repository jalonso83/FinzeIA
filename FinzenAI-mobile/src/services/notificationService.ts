import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import api from '../utils/api';

import { logger } from '../utils/logger';
// Configurar cómo se muestran las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationPreferences {
  emailSyncEnabled: boolean;
  budgetAlertsEnabled: boolean;
  goalRemindersEnabled: boolean;
  weeklyReportEnabled: boolean;
  tipsEnabled: boolean;
  antExpenseAlertsEnabled: boolean;
  budgetAlertThreshold: number;
  goalReminderFrequency: number; // 0=nunca, 3, 7, 14, 30 días
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
  // Configuración de detección de gastos hormiga (PRO)
  antExpenseAmountThreshold: number;  // Monto máximo (default 500)
  antExpenseMinFrequency: number;     // Frecuencia mínima (default 3)
}

export interface NotificationHistoryItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, any> | null;
  status: string;
  sentAt: string | null;
  readAt: string | null;
  createdAt: string;
}

class NotificationService {
  private pushToken: string | null = null;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;

  /**
   * Inicializa el servicio de notificaciones
   * Debe llamarse al iniciar la app o después del login
   */
  async initialize(): Promise<string | null> {
    // Limpiar error anterior
    this.lastError = null;

    try {
      // Verificar si estamos en un dispositivo físico
      if (!Device.isDevice) {
        throw new Error('No es dispositivo físico');
      }

      // Solicitar permisos
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        throw new Error('Permisos denegados: ' + finalStatus);
      }

      // Configurar canal de Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('finzenai_notifications', {
          name: 'FinZenAI',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#10B981',
          sound: 'default',
        });
      }

      // Obtener token de push
      const token = await this.getExpoPushToken();
      if (!token) {
        // Si getExpoPushToken ya estableció un error específico, no sobreescribirlo
        if (!this.lastError) {
          this.lastError = 'getExpoPushToken devolvió null sin error específico';
        }
        return null;
      }
      this.pushToken = token;

      return token;

    } catch (error: any) {
      // Solo guardar si no hay un error más específico ya guardado
      if (!this.lastError) {
        this.lastError = error.message || 'Error desconocido';
      }
      return null;
    }
  }

  // Para debugging
  public lastError: string | null = null;

  /**
   * Obtiene el Expo Push Token del dispositivo
   * Funciona tanto para iOS como Android con un formato unificado
   */
  private async getExpoPushToken(): Promise<string | null> {
    try {
      // Obtener el projectId de la configuración de Expo
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      if (!projectId) {
        this.lastError = 'No se encontró projectId en la configuración de Expo';
        logger.error('[NotificationService] projectId no encontrado');
        return null;
      }

      // Obtener Expo Push Token (funciona para iOS y Android)
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      const expoPushToken = tokenData.data;
      logger.log('[NotificationService] Expo Push Token obtenido:', expoPushToken);
      return expoPushToken;
    } catch (error: any) {
      const errorMsg = error.message || JSON.stringify(error);
      this.lastError = `Token error: ${errorMsg}`;
      logger.error('[NotificationService] Error obteniendo Expo Push token:', errorMsg);
      return null;
    }
  }

  /**
   * Registra el dispositivo en el backend
   */
  async registerDevice(deviceName?: string, appVersion?: string): Promise<boolean> {
    try {
      if (!this.pushToken) {
        await this.initialize();
      }

      if (!this.pushToken) {
        return false;
      }

      const response = await api.post('/notifications/device', {
        fcmToken: this.pushToken,
        platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
        deviceName: deviceName || Device.modelName || 'Unknown Device',
        appVersion: appVersion || Constants.expoConfig?.version || '1.0.0',
      });

      return response.data?.success === true;

    } catch (error: any) {
      logger.error('[NotificationService] Error registrando:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Desregistra el dispositivo (llamar al hacer logout)
   */
  async unregisterDevice(): Promise<boolean> {
    try {
      if (!this.pushToken) {
        return true;
      }

      await api.delete('/notifications/device', {
        data: { fcmToken: this.pushToken }
      });

      logger.log('[NotificationService] Dispositivo desregistrado');
      return true;

    } catch (error: any) {
      logger.error('[NotificationService] Error desregistrando dispositivo:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Obtiene las preferencias de notificación del usuario
   */
  async getPreferences(): Promise<NotificationPreferences | null> {
    try {
      const response = await api.get('/notifications/preferences');
      return response.data;
    } catch (error: any) {
      logger.error('[NotificationService] Error obteniendo preferencias:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Actualiza las preferencias de notificación
   */
  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences | null> {
    try {
      const response = await api.put('/notifications/preferences', preferences);
      return response.data?.preferences || response.data;
    } catch (error: any) {
      logger.error('[NotificationService] Error actualizando preferencias:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Obtiene el historial de notificaciones
   */
  async getHistory(limit: number = 50): Promise<NotificationHistoryItem[]> {
    try {
      const response = await api.get(`/notifications/history?limit=${limit}`);
      return response.data?.notifications || [];
    } catch (error: any) {
      logger.error('[NotificationService] Error obteniendo historial:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Marca una notificación como leída
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      return true;
    } catch (error: any) {
      logger.error('[NotificationService] Error marcando como leída:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Envía una notificación de prueba (solo desarrollo)
   */
  async sendTest(): Promise<boolean> {
    try {
      const response = await api.post('/notifications/test');
      return response.data?.success === true;
    } catch (error: any) {
      logger.error('[NotificationService] Error enviando prueba:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Configura listeners para notificaciones recibidas
   */
  setupListeners(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationResponse?: (response: Notifications.NotificationResponse) => void
  ): void {
    // Limpiar listeners anteriores
    this.removeListeners();

    // Listener para notificaciones recibidas (app en primer plano)
    this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      logger.log('[NotificationService] Notificación recibida:', notification);
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    });

    // Listener para cuando el usuario interactúa con la notificación
    this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      logger.log('[NotificationService] Usuario respondió a notificación:', response);
      if (onNotificationResponse) {
        onNotificationResponse(response);
      }
    });
  }

  /**
   * Remueve los listeners de notificaciones
   */
  removeListeners(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
      this.notificationListener = null;
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }
  }

  /**
   * Obtiene el token actual
   */
  getToken(): string | null {
    return this.pushToken;
  }

  /**
   * Verifica si las notificaciones están habilitadas
   */
  async isEnabled(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Abre la configuración de notificaciones del sistema
   */
  async openSettings(): Promise<void> {
    if (Platform.OS === 'ios') {
      // En iOS, no hay una forma directa de abrir la configuración de notificaciones
      // Se puede abrir la configuración general de la app
      await Notifications.getPermissionsAsync();
    } else {
      // En Android, tampoco hay una forma directa con Expo
      // Pero podemos solicitar permisos de nuevo
      await Notifications.requestPermissionsAsync();
    }
  }

  /**
   * Programa una notificación local
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: Record<string, any>,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string> {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: 'default',
      },
      trigger: trigger || null, // null = inmediata
    });

    return identifier;
  }

  /**
   * Cancela todas las notificaciones programadas
   */
  async cancelAllScheduledNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Obtiene el badge count actual
   */
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Establece el badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }
}

// Exportar instancia singleton
export const notificationService = new NotificationService();
export default notificationService;
