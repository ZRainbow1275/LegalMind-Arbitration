// dev/src/app/(private)/notifications/page.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  FileText,
  Gavel,
  MessageSquare,
  Search,
  Trash2,
  Users,
} from 'lucide-react';

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

type PriorityFilter = 'all' | ApiNotification['priority'];
type CategoryFilter = 'all' | 'hearing' | 'document' | 'case' | 'mediation' | 'system' | 'ai';
type StatusFilter = 'all' | 'unread' | 'read' | 'archived';

const isPriorityFilter = (value: string): value is PriorityFilter => {
  return value === 'all' || value === 'LOW' || value === 'MEDIUM' || value === 'HIGH' || value === 'URGENT';
};

const isCategoryFilter = (value: string): value is CategoryFilter => {
  return value === 'all' || value === 'hearing' || value === 'document' || value === 'case' || value === 'mediation' || value === 'system' || value === 'ai';
};

const isStatusFilter = (value: string): value is StatusFilter => {
  return value === 'all' || value === 'unread' || value === 'read' || value === 'archived';
};

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

function getCategory(type: ApiNotification['type']) {
  switch (type) {
    case 'HEARING_REMINDER':
      return 'hearing';
    case 'DOCUMENT_UPLOADED':
      return 'document';
    case 'CASE_UPDATE':
      return 'case';
    case 'MEDIATION_REQUEST':
      return 'mediation';
    case 'SYSTEM_ANNOUNCEMENT':
      return 'system';
    case 'AI_SUGGESTION':
      return 'ai';
    default:
      return 'system';
  }
}

function getNotificationIcon(type: ApiNotification['type']) {
  switch (type) {
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

function getNotificationColor(priority: ApiNotification['priority']) {
  if (priority === 'URGENT' || priority === 'HIGH') return 'bg-red-50 text-red-700 border-red-200';
  if (priority === 'MEDIUM') return 'bg-yellow-50 text-yellow-700 border-yellow-200';
  return 'bg-blue-50 text-blue-700 border-blue-200';
}

function getPriorityText(priority: ApiNotification['priority']) {
  if (priority === 'URGENT') return '紧急';
  if (priority === 'HIGH') return '高';
  if (priority === 'MEDIUM') return '中';
  return '低';
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/notifications?page=1&limit=100', { credentials: 'include' });
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

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

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

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.status !== 'READ' && n.status !== 'ARCHIVED').length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      const matchesSearch =
        notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.content.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesPriority = priorityFilter === 'all' || notification.priority === priorityFilter;
      const matchesCategory = categoryFilter === 'all' || getCategory(notification.type) === categoryFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'unread' && notification.status !== 'READ' && notification.status !== 'ARCHIVED') ||
        (statusFilter === 'read' && notification.status === 'READ') ||
        (statusFilter === 'archived' && notification.status === 'ARCHIVED');

      return matchesSearch && matchesPriority && matchesCategory && matchesStatus;
    });
  }, [categoryFilter, notifications, priorityFilter, searchTerm, statusFilter]);

  const markAsRead = useCallback(
    async (id: string) => {
      await updateNotifications([id], 'mark_read');
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, status: 'READ' } : n)));
    },
    [updateNotifications]
  );

  const markAsUnread = useCallback(
    async (id: string) => {
      await updateNotifications([id], 'mark_unread');
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, status: 'DELIVERED' } : n)));
    },
    [updateNotifications]
  );

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => n.status !== 'READ' && n.status !== 'ARCHIVED').map((n) => n.id);
    if (unreadIds.length === 0) return;
    await updateNotifications(unreadIds, 'mark_read');
    setNotifications((prev) => prev.map((n) => (n.status === 'ARCHIVED' ? n : { ...n, status: 'READ' })));
  }, [notifications, updateNotifications]);

  const archiveNotification = useCallback(
    async (id: string) => {
      await updateNotifications([id], 'archive');
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, status: 'ARCHIVED' } : n)));
    },
    [updateNotifications]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">通知中心</h1>
          <p className="text-gray-600 mt-1">查看和管理系统通知</p>
        </div>
        <div className="flex items-center space-x-3">
          {unreadCount > 0 && <Badge className="bg-red-500 text-white">{unreadCount} 条未读</Badge>}
          {unreadCount > 0 && (
            <Button onClick={() => void markAllAsRead()} variant="outline">
              <CheckCircle className="h-4 w-4 mr-2" />
              全部标记为已读
            </Button>
          )}
          <Button onClick={() => void fetchNotifications()} variant="outline" disabled={loading}>
            <Clock className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            刷新
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              获取失败
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-red-800">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索通知内容..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

              <Select value={priorityFilter} onValueChange={(v) => {
                if (!isPriorityFilter(v)) return;
                setPriorityFilter(v);
              }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="优先级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部优先级</SelectItem>
                <SelectItem value="URGENT">紧急</SelectItem>
                <SelectItem value="HIGH">高</SelectItem>
                <SelectItem value="MEDIUM">中</SelectItem>
                <SelectItem value="LOW">低</SelectItem>
              </SelectContent>
            </Select>

              <Select value={categoryFilter} onValueChange={(v) => {
                if (!isCategoryFilter(v)) return;
                setCategoryFilter(v);
              }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                <SelectItem value="hearing">庭审</SelectItem>
                <SelectItem value="document">文档</SelectItem>
                <SelectItem value="case">案件</SelectItem>
                <SelectItem value="mediation">调解</SelectItem>
                <SelectItem value="system">系统</SelectItem>
                <SelectItem value="ai">AI</SelectItem>
              </SelectContent>
            </Select>

              <Select value={statusFilter} onValueChange={(v) => {
                if (!isStatusFilter(v)) return;
                setStatusFilter(v);
              }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="unread">未读</SelectItem>
                <SelectItem value="read">已读</SelectItem>
                <SelectItem value="archived">已归档</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="unread">未读</TabsTrigger>
          <TabsTrigger value="archived">归档</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <NotificationList
            loading={loading}
            notifications={filteredNotifications}
            onMarkRead={(id) => void markAsRead(id)}
            onMarkUnread={(id) => void markAsUnread(id)}
            onArchive={(id) => void archiveNotification(id)}
          />
        </TabsContent>

        <TabsContent value="unread">
          <NotificationList
            loading={loading}
            notifications={filteredNotifications.filter(
              (n) => n.status !== 'READ' && n.status !== 'ARCHIVED'
            )}
            onMarkRead={(id) => void markAsRead(id)}
            onMarkUnread={(id) => void markAsUnread(id)}
            onArchive={(id) => void archiveNotification(id)}
          />
        </TabsContent>

        <TabsContent value="archived">
          <NotificationList
            loading={loading}
            notifications={filteredNotifications.filter((n) => n.status === 'ARCHIVED')}
            onMarkRead={(id) => void markAsRead(id)}
            onMarkUnread={(id) => void markAsUnread(id)}
            onArchive={(id) => void archiveNotification(id)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NotificationList({
  loading,
  notifications,
  onMarkRead,
  onMarkUnread,
  onArchive,
}: {
  loading: boolean;
  notifications: ApiNotification[];
  onMarkRead: (id: string) => void;
  onMarkUnread: (id: string) => void;
  onArchive: (id: string) => void;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">加载中…</CardContent>
      </Card>
    );
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">暂无通知</h4>
          <p className="text-gray-500">当有新消息时会显示在这里</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {notifications.map((n) => {
        const Icon = getNotificationIcon(n.type);
        const colorClass = getNotificationColor(n.priority);
        const timeText = formatRelativeTime(n.createdAt);
        const isUnread = n.status !== 'READ' && n.status !== 'ARCHIVED';

        return (
          <Card
            key={n.id}
            className={cn('transition-all duration-200 hover:shadow-md', isUnread && 'border-orange-200 bg-orange-50')}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={cn('w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0', colorClass)}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 truncate">{n.title}</h3>
                      <Badge variant="outline" className="text-xs">
                        {getPriorityText(n.priority)}
                      </Badge>
                      {isUnread && <Badge className="bg-orange-500 text-white text-xs">未读</Badge>}
                      {n.status === 'ARCHIVED' && <Badge variant="secondary" className="text-xs">已归档</Badge>}
                    </div>
                    <p className="text-gray-600 text-sm line-clamp-2">{n.content}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {timeText}
                      </span>
                      <span className="text-gray-400">{n.type}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {isUnread ? (
                    <Button variant="ghost" size="sm" onClick={() => onMarkRead(n.id)} title="标记已读">
                      <Eye className="h-4 w-4" />
                    </Button>
                  ) : n.status === 'READ' ? (
                    <Button variant="ghost" size="sm" onClick={() => onMarkUnread(n.id)} title="标记未读">
                      <EyeOff className="h-4 w-4" />
                    </Button>
                  ) : null}
                  {n.status !== 'ARCHIVED' && (
                    <Button variant="ghost" size="sm" onClick={() => onArchive(n.id)} title="归档">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/notifications?focus=${n.id}`}>查看</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
