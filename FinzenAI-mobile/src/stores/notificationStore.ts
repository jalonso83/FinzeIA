// Notification Store - Zustand
// Manejo global del estado de notificaciones

import { create } from 'zustand';
import { notificationsAPI } from '../utils/api';

import { logger } from '../utils/logger';
export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, any> | null;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'READ';
  sentAt: string | null;
  readAt: string | null;
  createdAt: string;
}

interface NotificationState {
  // Estado
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;

  // Acciones
  fetchNotifications: (limit?: number) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: NotificationItem) => void;
  deleteNotification: (id: string) => Promise<boolean>;
  deleteAllNotifications: () => Promise<void>;

  // Reset
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  // Estado inicial
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,

  // Obtener notificaciones
  fetchNotifications: async (limit = 50) => {
    set({ loading: true, error: null });
    try {
      const response = await notificationsAPI.getHistory(limit);
      const notifications = response.data?.notifications || [];

      // Calcular no leídas
      const unreadCount = notifications.filter(
        (n: NotificationItem) => n.status !== 'READ'
      ).length;

      set({
        notifications,
        unreadCount,
        loading: false
      });
    } catch (error: any) {
      logger.error('[NotificationStore] Error fetching notifications:', error);
      set({
        error: error.message || 'Error cargando notificaciones',
        loading: false
      });
    }
  },

  // Obtener solo el contador de no leídas (más ligero)
  fetchUnreadCount: async () => {
    try {
      const response = await notificationsAPI.getHistory(100);
      const notifications = response.data?.notifications || [];

      const unreadCount = notifications.filter(
        (n: NotificationItem) => n.status !== 'READ'
      ).length;

      set({ unreadCount });
    } catch (error: any) {
      logger.error('[NotificationStore] Error fetching unread count:', error);
    }
  },

  // Marcar como leída
  markAsRead: async (id: string) => {
    try {
      await notificationsAPI.markAsRead(id);

      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, status: 'READ' as const, readAt: new Date().toISOString() } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error: any) {
      logger.error('[NotificationStore] Error marking as read:', error);
    }
  },

  // Marcar todas como leídas
  markAllAsRead: async () => {
    const { notifications } = get();
    const unreadIds = notifications
      .filter((n) => n.status !== 'READ')
      .map((n) => n.id);

    // Marcar cada una (podrías crear un endpoint batch en el backend)
    for (const id of unreadIds) {
      try {
        await notificationsAPI.markAsRead(id);
      } catch (error) {
        logger.error('[NotificationStore] Error marking notification as read:', id);
      }
    }

    set((state) => ({
      notifications: state.notifications.map((n) => ({
        ...n,
        status: 'READ' as const,
        readAt: n.readAt || new Date().toISOString(),
      })),
      unreadCount: 0,
    }));
  },

  // Agregar notificación (cuando llega una push)
  addNotification: (notification: NotificationItem) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  // Eliminar una notificación
  deleteNotification: async (id: string): Promise<boolean> => {
    try {
      await notificationsAPI.delete(id);

      set((state) => {
        const notification = state.notifications.find((n) => n.id === id);
        const wasUnread = notification && notification.status !== 'READ';

        return {
          notifications: state.notifications.filter((n) => n.id !== id),
          unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
        };
      });

      return true;
    } catch (error: any) {
      logger.error('[NotificationStore] Error deleting notification:', error);
      return false;
    }
  },

  // Eliminar todas las notificaciones
  deleteAllNotifications: async () => {
    try {
      await notificationsAPI.deleteAll();

      set({
        notifications: [],
        unreadCount: 0,
      });
    } catch (error: any) {
      logger.error('[NotificationStore] Error deleting all notifications:', error);
    }
  },

  // Reset
  reset: () => {
    set({
      notifications: [],
      unreadCount: 0,
      loading: false,
      error: null,
    });
  },
}));

export default useNotificationStore;
