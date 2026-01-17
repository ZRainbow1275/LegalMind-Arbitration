// src/components/layout/notification-panel.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle,
  Clock,
  FileText,
  Gavel,
  MessageSquare,
  MoreHorizontal,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const notificationTypeSchema = z.enum([
  'CASE_UPDATE',
  'HEARING_REMINDER',
  'DOCUMENT_UPLOADED',
  'MEDIATION_REQUEST',
  'SYSTEM_ANNOUNCEMENT',
  'AI_SUGGESTION',
]);
const notificationStatusSchema = z.enum(['PENDING', 'DELIVERED', 'READ', 'ARCHIVED']);
const prioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

const apiNotificationSchema = z.object({
  id: z.string(),
  type: notificationTypeSchema,
  title: z.string(),
  content: z.string(),
  status: notificationStatusSchema,
  priority: prioritySchema,
  createdAt: z.string(),
  relatedEntity: z.unknown().nullable().optional(),
});

const paginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

const notificationsResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    notifications: z.array(apiNotificationSchema),
    stats: z.object({ total: z.number(), unread: z.number() }).optional(),
  }),
  meta: z.object({ pagination: paginationSchema }).optional(),
});

const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({ message: z.string() }).optional(),
});

type ApiNotification = z.infer<typeof apiNotificationSchema>;

function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const parts = document.cookie.split('; ').find((p) => p.startsWith(`${name}=`));
  if (!parts) return null;
  return decodeURIComponent(parts.slice(name.length + 1));
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  if (!Number.isFinite(diffMs)) return '';

  if (diffMs < 60_000) return '刚刚';
  if (diffMs < 3_600_000) return `${Math.max(1, Math.floor(diffMs / 60_000))}分钟前`;
  if (diffMs < 86_400_000) return `${Math.max(1, Math.floor(diffMs / 3_600_000))}小时前`;
  if (diffMs < 7 * 86_400_000) return `${Math.max(1, Math.floor(diffMs / 86_400_000))}天前`;
  return date.toLocaleDateString();
}

function getNotificationIcon(notification: ApiNotification) {
  switch (notification.type) {
    case 'HEARING_REMINDER':
      return Gavel;
    case 'DOCUMENT_UPLOADED':
      return FileText;
    case 'CASE_UPDATE':
      return Users;
    case 'MEDIATION_REQUEST':
      return MessageSquare;
    case 'SYSTEM_ANNOUNCEMENT':
      return Bell;
    case 'AI_SUGGESTION':
      return CheckCircle;
    default:
      return Bell;
  }
}

function getNotificationColor(notification: ApiNotification) {
  if (notification.priority === 'URGENT' || notification.priority === 'HIGH') {
    return 'text-red-600 bg-red-50 border-red-200';
  }
  if (notification.priority === 'MEDIUM') {
    return 'text-yellow-700 bg-yellow-50 border-yellow-200';
  }
  return 'text-blue-600 bg-blue-50 border-blue-200';
}

function getNotificationHref(notification: ApiNotification): string | null {
  const related = notification.relatedEntity;
  if (!related || typeof related !== 'object') return null;

  const parsed = z
    .object({ type: z.string().optional(), id: z.string().optional() })
    .safeParse(related);
  if (!parsed.success) return null;

  const { type, id } = parsed.data;
  if (!type || !id) return null;

  if (type === 'case') return `/cases/${id}`;
  if (type === 'hearing') return `/hearings`;
  if (type === 'document') return `/documents`;
  if (type === 'mediation') return `/mediation`;
  return null;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.status !== 'READ' && n.status !== 'ARCHIVED').length,
    [notifications]
  );

  const getDisplayCount = (count: number) => {
    if (count === 0) return null;
    if (count > 99) return '99+';
    return String(count);
  };

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/notifications?page=1&limit=30', { credentials: 'include' });
      const json: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const parsedError = errorResponseSchema.safeParse(json);
        setNotifications([]);
        setError(parsedError.success ? parsedError.data.error?.message ?? '获取失败' : '获取失败');
        return;
      }

      const parsed = notificationsResponseSchema.safeParse(json);
      if (!parsed.success) {
        setNotifications([]);
        setError('通知数据格式不正确');
        return;
      }

      setNotifications(parsed.data.data.notifications);
    } catch (e) {
      setNotifications([]);
      setError(e instanceof Error ? e.message : '获取失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateNotifications = useCallback(
    async (notificationIds: string[], action: 'mark_read' | 'mark_unread' | 'archive') => {
      const csrfToken = getCookieValue('csrf-token');
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        body: JSON.stringify({ notificationIds, action }),
      });

      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const parsedError = errorResponseSchema.safeParse(json);
        throw new Error(parsedError.success ? parsedError.data.error?.message ?? '操作失败' : '操作失败');
      }
    },
    []
  );

  const markAsRead = useCallback(
    async (id: string) => {
      await updateNotifications([id], 'mark_read');
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, status: 'READ' } : n)));
    },
    [updateNotifications]
  );

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => n.status !== 'READ').map((n) => n.id);
    if (unreadIds.length === 0) return;
    await updateNotifications(unreadIds, 'mark_read');
    setNotifications((prev) => prev.map((n) => ({ ...n, status: 'READ' })));
  }, [notifications, updateNotifications]);

  const archiveNotification = useCallback(
    async (id: string) => {
      await updateNotifications([id], 'archive');
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    },
    [updateNotifications]
  );

  const handleNotificationClick = useCallback(
    async (notification: ApiNotification) => {
      try {
        if (notification.status !== 'READ') {
          await markAsRead(notification.id);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : '标记已读失败');
      }

      const href = getNotificationHref(notification);
      router.push(href || '/notifications');
      onClose();
    },
    [markAsRead, onClose, router]
  );

  useEffect(() => {
    if (!isOpen) return;
    void fetchNotifications();
  }, [fetchNotifications, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed top-16 right-4 w-96 max-h-[80vh] bg-white rounded-lg shadow-brand-lg border border-gray-200 z-50 animate-scale-in">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Bell className="h-5 w-5 text-orange-500" />
          <h3 className="text-lg font-semibold text-gray-900">通知</h3>
          {unreadCount > 0 && (
            <Badge className="bg-red-500 text-white transition-all duration-2000">
              {getDisplayCount(unreadCount)}
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void markAllAsRead()}
              className="text-xs text-orange-600 hover:text-orange-700"
            >
              全部已读
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-2 text-sm text-red-700 bg-red-50 border-b border-red-100">
          {error}
        </div>
      )}

      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">加载中…</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">暂无通知</h4>
            <p className="text-gray-500">您的通知会显示在这里</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification, index) => {
              const IconComponent = getNotificationIcon(notification);
              const colorClass = getNotificationColor(notification);
              const timeText = formatRelativeTime(notification.createdAt);

              return (
                <div
                  key={notification.id}
                  className={cn(
                    'p-4 hover:bg-gray-50 transition-all duration-200 cursor-pointer animate-fade-in hover:scale-[1.01] hover:shadow-sm',
                    notification.status !== 'READ' && 'bg-orange-50 hover:bg-orange-100'
                  )}
                  style={{ animationDelay: `${index * 0.06}s` }}
                  onClick={() => void handleNotificationClick(notification)}
                >
                  <div className="flex items-start space-x-3">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                        colorClass
                      )}
                    >
                      <IconComponent className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4
                          className={cn(
                            'text-sm font-medium',
                            notification.status !== 'READ' ? 'text-gray-900' : 'text-gray-700'
                          )}
                        >
                          {notification.title}
                        </h4>
                        {notification.status !== 'READ' && (
                          <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" />
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{notification.content}</p>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {timeText}
                        </span>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              void archiveNotification(notification.id);
                            }}
                            className="text-xs text-gray-500 hover:text-gray-700 p-0 h-auto"
                          >
                            归档
                          </Button>
                          {getNotificationHref(notification) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                const href = getNotificationHref(notification);
                                if (href) router.push(href);
                                onClose();
                              }}
                              className="text-xs text-orange-600 hover:text-orange-700 p-0 h-auto transition-all duration-200 hover:scale-105"
                            >
                              查看
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200">
        <Button variant="outline" className="w-full" asChild>
          <Link href="/notifications" onClick={onClose}>
            <MoreHorizontal className="h-4 w-4 mr-2" />
            查看全部通知
          </Link>
        </Button>
      </div>
    </div>
  );
}

interface NotificationTriggerProps {
  className?: string;
}

export function NotificationTrigger({ className }: NotificationTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const getDisplayCount = (count: number) => {
    if (count === 0) return null;
    if (count > 99) return '99+';
    return String(count);
  };

  const refreshUnreadCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?page=1&limit=1&unreadOnly=true', {
        credentials: 'include',
      });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) return;
      const parsed = notificationsResponseSchema.safeParse(json);
      if (!parsed.success) return;
      const totalUnread = parsed.data.meta?.pagination.total;
      if (typeof totalUnread === 'number') setUnreadCount(totalUnread);
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    void refreshUnreadCount();
    const timer = setInterval(() => {
      void refreshUnreadCount();
    }, 30_000);
    return () => clearInterval(timer);
  }, [refreshUnreadCount]);

  const displayCount = getDisplayCount(unreadCount);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={cn('relative hover-lift', className)}
        onClick={() => setIsOpen((v) => !v)}
      >
        <Bell className="w-5 h-5" />
        {displayCount && (
          <Badge
            variant="destructive"
            className={cn(
              'absolute -top-1 -right-1 p-0 flex items-center justify-center text-xs bg-red-500 hover:bg-red-600 transition-all duration-200',
              displayCount.length > 2 ? 'w-6 h-5 px-1' : 'w-5 h-5'
            )}
          >
            {displayCount}
          </Badge>
        )}
      </Button>

      <NotificationPanel
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          void refreshUnreadCount();
        }}
      />
    </>
  );
}
