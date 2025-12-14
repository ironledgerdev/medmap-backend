import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';

interface PresenceState {
  user_id: string;
  online_at: string;
  status?: 'available' | 'busy' | 'away';
}

export const useRealtimePresence = (channelName: string = 'general') => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<PresenceState[]>([]);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Presence is disabled for now.
    // TODO: Implement Django equivalent.
    
    // Simulate current user online
    setIsOnline(true);
    setOnlineUsers([{
        user_id: user.id,
        online_at: new Date().toISOString(),
        status: 'available'
    }]);

    return () => {
    };
  }, [user, channelName]);

  const updateStatus = async (status: 'available' | 'busy' | 'away') => {
    // No-op
  };

  return {
    onlineUsers,
    isOnline,
    updateStatus,
    onlineCount: onlineUsers.length
  };
};