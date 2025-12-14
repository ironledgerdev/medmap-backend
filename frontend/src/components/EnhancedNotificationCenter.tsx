import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationSystem, Notification } from '@/hooks/useNotificationSystem';
import { 
  Bell, 
  BellRing, 
  Calendar, 
  CheckCircle, 
  Clock, 
  X, 
  Trash2,
  MessageSquare,
  UserCheck,
  Heart,
  Activity,
  AlertTriangle,
  Info
} from 'lucide-react';

interface EnhancedNotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const EnhancedNotificationCenter: React.FC<EnhancedNotificationCenterProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, clearAll, deleteNotification, isLoading } = useNotificationSystem();

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6 pointer-events-none">
          <Card className="w-full max-w-sm pointer-events-auto shadow-xl border-primary/20 animate-in slide-in-from-right-5 fade-in-0 duration-300 bg-background/95 backdrop-blur-sm">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Bell className="h-5 w-5 text-primary" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
                    )}
                  </div>
                  <CardTitle className="text-lg">Notifications</CardTitle>
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {unreadCount} New
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {notifications.length > 0 && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => clearAll()}
                      title="Clear all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-12rem)] sm:h-[400px]">
                {isLoading && notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <p>Loading...</p>
                  </div>
                ) : notifications.length > 0 ? (
                  <div className="divide-y">
                    {notifications.map((notification) => (
                      <div 
                        key={notification.id}
                        className={`p-4 hover:bg-muted/50 transition-colors relative group ${
                          !notification.read ? 'bg-primary/5' : ''
                        }`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex gap-3">
                          <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                            !notification.read ? 'bg-primary' : 'bg-transparent'
                          }`} />
                          
                          <div className="flex-1 space-y-1">
                            <div className="flex items-start justify-between">
                              <p className={`text-sm font-medium leading-none ${
                                !notification.read ? 'text-foreground' : 'text-muted-foreground'
                              }`}>
                                {notification.title}
                              </p>
                              <span className="text-xs text-muted-foreground shrink-0 ml-2">
                                {new Date(notification.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {notification.message}
                            </p>
                            {notification.actionUrl && (
                                <Button variant="link" size="sm" className="p-0 h-auto text-xs mt-2" asChild>
                                    <a href={notification.actionUrl}>View Details</a>
                                </Button>
                            )}
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification && deleteNotification(notification.id);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <BellRing className="h-12 w-12 opacity-20 mb-4" />
                    <p className="font-medium">No notifications</p>
                    <p className="text-xs">You're all caught up!</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default EnhancedNotificationCenter;