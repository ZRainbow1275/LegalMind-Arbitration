// dev/src/components/ui/notification.tsx
'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { X, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

const typeConfig = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconColor: 'text-green-500',
    titleColor: 'text-green-800',
    messageColor: 'text-green-700'
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-500',
    titleColor: 'text-red-800',
    messageColor: 'text-red-700'
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    iconColor: 'text-yellow-500',
    titleColor: 'text-yellow-800',
    messageColor: 'text-yellow-700'
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-500',
    titleColor: 'text-blue-800',
    messageColor: 'text-blue-700'
  }
};

function NotificationItem({ notification, onRemove }: { 
  notification: Notification; 
  onRemove: (id: string) => void;
}) {
  const config = typeConfig[notification.type];
  const Icon = config.icon;

  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        onRemove(notification.id);
      }, notification.duration);

      return () => clearTimeout(timer);
    }
  }, [notification.id, notification.duration, onRemove]);

  return (
    <div className={cn(
      'flex items-start gap-3 p-4 rounded-lg border shadow-sm transition-all duration-300',
      config.bgColor,
      config.borderColor
    )}>
      <Icon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', config.iconColor)} />
      
      <div className="flex-1 min-w-0">
        <h4 className={cn('font-medium text-sm', config.titleColor)}>
          {notification.title}
        </h4>
        {notification.message && (
          <p className={cn('mt-1 text-sm', config.messageColor)}>
            {notification.message}
          </p>
        )}
        {notification.action && (
          <button
            onClick={notification.action.onClick}
            className={cn(
              'mt-2 text-sm font-medium underline hover:no-underline',
              config.titleColor
            )}
          >
            {notification.action.label}
          </button>
        )}
      </div>

      <button
        onClick={() => onRemove(notification.id)}
        className={cn(
          'flex-shrink-0 p-1 rounded-md hover:bg-black/5 transition-colors',
          config.iconColor
        )}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification: Notification = {
      id,
      duration: 5000, // 默认5秒
      ...notification
    };
    
    setNotifications(prev => [newNotification, ...prev]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      removeNotification,
      clearAll
    }}>
      {children}
      
      {/* 通知容器 */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
        {notifications.map(notification => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onRemove={removeNotification}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

// 便捷的通知 Hook（必须以 use 开头，避免违反 rules-of-hooks）
export function useNotificationHelpers() {
  const { addNotification } = useNotification();

  return {
    success: (title: string, message?: string, options?: Partial<Notification>) =>
      addNotification({ type: 'success', title, message, ...options }),
    
    error: (title: string, message?: string, options?: Partial<Notification>) =>
      addNotification({ type: 'error', title, message, ...options }),
    
    warning: (title: string, message?: string, options?: Partial<Notification>) =>
      addNotification({ type: 'warning', title, message, ...options }),
    
    info: (title: string, message?: string, options?: Partial<Notification>) =>
      addNotification({ type: 'info', title, message, ...options })
  };
}
