import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from './useAuth';
import { api } from '@/lib/django-api';

export interface Notification {
  id: string;
  type: 'booking_created' | 'booking_approved' | 'booking_cancelled' | 'user_registered' | 'doctor_approved' | 'system' | 'warning' | 'info';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'system' | 'booking' | 'user' | 'doctor' | 'general';
  read: boolean;
  archived: boolean;
  actionUrl?: string;
  actionText?: string;
  metadata?: Record<string, any>;
  created_at: string;
  expires_at?: string;
  sound?: boolean;
  desktop?: boolean;
}

interface NotificationFilters {
  category?: string;
  priority?: string;
  read?: boolean;
  archived?: boolean;
}

interface NotificationSystemState {
  notifications: Notification[];
  unreadCount: number;
  filters: NotificationFilters;
  isLoading: boolean;
  error: string | null;
}

const POLL_INTERVAL = 30000; // 30 seconds

export const useNotificationSystem = () => {
  const { user } = useAuth();
  const [state, setState] = useState<NotificationSystemState>({
    notifications: [],
    unreadCount: 0,
    filters: {},
    isLoading: false,
    error: null,
  });

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const response = await api.request('/notifications/notifications/');
      if (response.ok) {
        const data = await response.json();
        const results = Array.isArray(data) ? data : data.results || [];
        
        const mapped: Notification[] = results.map((n: any) => ({
            id: String(n.id),
            type: n.type || 'system',
            title: n.title,
            message: n.message,
            priority: inferPriority(n.type),
            category: inferCategory(n.type),
            read: n.read,
            archived: false, 
            metadata: n.data,
            created_at: n.created_at,
            actionUrl: n.data?.actionUrl,
        }));

        setState(prev => ({
            ...prev,
            notifications: mapped,
            unreadCount: mapped.filter(n => !n.read).length,
            error: null
        }));
      }
    } catch (err) {
        console.error('Failed to fetch notifications', err);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Mark as read
  const markAsRead = useCallback(async (id: string) => {
    // Optimistic update
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: prev.notifications.filter(n => !n.read && n.id !== id).length
    }));

    try {
        await api.request(`/notifications/notifications/${id}/mark_read/`, { method: 'POST' });
    } catch (e) {
        console.error('Failed to mark as read', e);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0
    }));

    try {
        await api.request(`/notifications/notifications/mark_all_read/`, { method: 'POST' });
    } catch (e) {
        console.error('Failed to mark all as read', e);
    }
  }, []);

  // Archive notification 
  const archiveNotification = useCallback(async (id: string) => {
      // Treat as delete for now to clean up
      await deleteNotification(id);
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (id: string) => {
    setState(prev => ({
        ...prev,
        notifications: prev.notifications.filter(n => n.id !== id),
        unreadCount: prev.notifications.filter(n => !n.read && n.id !== id).length
    }));
    
    try {
        await api.request(`/notifications/notifications/${id}/`, { method: 'DELETE' });
    } catch (e) {
        console.error('Failed to delete notification', e);
    }
  }, []);
  
  // Clear all
  const clearAllNotifications = useCallback(async () => {
      setState(prev => ({ ...prev, notifications: [], unreadCount: 0 }));
  }, []);

  // Set filters
  const setFilters = useCallback((filters: NotificationFilters) => {
    setState(prev => ({
      ...prev,
      filters,
    }));
  }, []);

  // Get filtered notifications
  const filteredNotifications = useMemo(() => {
    let filtered = state.notifications;

    if (state.filters.category) {
      filtered = filtered.filter(n => n.category === state.filters.category);
    }
    if (state.filters.priority) {
      filtered = filtered.filter(n => n.priority === state.filters.priority);
    }
    if (typeof state.filters.read === 'boolean') {
      filtered = filtered.filter(n => n.read === state.filters.read);
    }

    return filtered;
  }, [state.notifications, state.filters]);

  // Add notification (Client-side only for temporary alerts)
  const addNotification = useCallback((notificationData: Omit<Notification, 'id' | 'created_at' | 'read' | 'archived'>) => {
     toast({
         title: notificationData.title,
         description: notificationData.message,
         variant: notificationData.priority === 'urgent' ? 'destructive' : 'default'
     });
  }, []);
  
  const requestDesktopPermission = useCallback(async () => {
      if ('Notification' in window && Notification.permission === 'default') {
          await Notification.requestPermission();
      }
  }, []);

  return {
    notifications: filteredNotifications,
    unreadCount: state.unreadCount,
    isLoading: state.isLoading,
    error: state.error,
    addNotification,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    deleteNotification,
    clearAllNotifications,
    setFilters,
    requestDesktopPermission
  };
};

function inferPriority(type: string): 'low' | 'medium' | 'high' | 'urgent' {
    if (type.includes('cancelled') || type === 'urgent') return 'high';
    if (type.includes('approved') || type === 'booking_created') return 'medium';
    return 'low';
}

function inferCategory(type: string): 'system' | 'booking' | 'user' | 'doctor' | 'general' {
    if (type.includes('booking')) return 'booking';
    if (type.includes('doctor')) return 'doctor';
    if (type.includes('user')) return 'user';
    return 'system';
}
