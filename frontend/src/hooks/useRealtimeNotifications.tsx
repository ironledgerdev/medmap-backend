import { useEffect, useState } from 'react';
// import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface Notification {
  id: string;
  type: 'booking_created' | 'booking_approved' | 'booking_cancelled' | 'user_registered' | 'doctor_approved';
  title: string;
  message: string;
  data?: any;
  created_at: string;
  read: boolean;
}

export const useRealtimeNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user || !profile) return;

    // Realtime notifications are disabled for now during migration.
    // TODO: Implement polling or WebSockets with Django.

  }, [user, profile]);

  const addNotification = (notification: Omit<Notification, 'id' | 'created_at' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Show toast
    toast({
      title: notification.title,
      description: notification.message,
    });
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    clearNotifications,
    addNotification
  };
};
