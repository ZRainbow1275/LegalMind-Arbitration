// src/app/(private)/ops/page.tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { AlertTriangle, RefreshCw, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useUserStore } from '@/store';
import { useRole } from '@/components/layout/role-switcher';

const errorSchema = z.object({
  success: z.literal(false),
  error: z
    .object({
      message: z.string(),
    })
    .optional(),
});

const metricsSchema = z.object({
  success: z.literal(true),
  data: z.object({
    system: z.object({
      timestamp: z.string(),
      uptime: z.number(),
      memory: z.object({
        used: z.number(),
        total: z.number(),
        external: z.number(),
        rss: z.number(),
      }),
      cpu: z.object({
        usage: z.number(),
      }),
      nodeVersion: z.string(),
      platform: z.string(),
      environment: z.string().optional().nullable(),
    }),
    database: z
      .object({
        status: z.string(),
        responseTime: z.string().optional(),
        tables: z.record(z.string(), z.number()).optional(),
        totalRecords: z.number().optional(),
        error: z.string().optional(),
      })
      .optional(),
    redis: z.unknown().optional(),
    api: z.unknown().optional(),
    business: z.unknown().optional(),
    performance: z.unknown().optional(),
    queue: z.unknown().optional(),
    storage: z.unknown().optional(),
  }),
  message: z.string().optional(),
  meta: z.object({ timestamp: z.string() }).optional(),
});

type Metrics = z.infer<typeof metricsSchema>['data'];

const paginationInfoSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

const auditLogItemSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string(),
  level: z.string(),
  eventType: z.string(),
  result: z.string(),
  userId: z.string().uuid().nullable().optional(),
  userName: z.string().nullable().optional(),
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  resource: z.string().nullable().optional(),
  action: z.string().nullable().optional(),
  details: z.unknown().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
});

const paginatedAuditLogsSchema = z.object({
  success: z.literal(true),
  data: z.array(auditLogItemSchema),
  message: z.string().optional(),
  meta: z.object({
    timestamp: z.string(),
    pagination: paginationInfoSchema,
  }),
});

const roleKeySchema = z.enum([
  'END_USER',
  'LAWYER',
  'ARBITRATOR',
  'MEDIATOR',
  'COURT',
  'NOTARY',
  'ADMIN',
  'OPS_ADMIN',
  'AUDITOR_READONLY',
  'APPLICANT',
  'RESPONDENT',
]);

const userStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']);
const userTypeSchema = z.enum(['INDIVIDUAL', 'ENTERPRISE']);

const userRoleSchema = z.object({
  id: z.string().uuid(),
  role: roleKeySchema,
  isActive: z.boolean(),
  assignedAt: z.string(),
  assignedBy: z.string().uuid().nullable().optional(),
});

const userItemSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  phone: z.string().nullable().optional(),
  userType: userTypeSchema,
  status: userStatusSchema,
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
  roles: z.array(userRoleSchema),
});

const paginatedUsersSchema = z.object({
  success: z.literal(true),
  data: z.array(userItemSchema),
  message: z.string().optional(),
  meta: z.object({
    timestamp: z.string(),
    pagination: paginationInfoSchema,
  }),
});

const updateUserRoleResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    userId: z.string().uuid(),
    roles: z.array(userRoleSchema),
    traceId: z.string(),
  }),
  message: z.string().optional(),
});

type RoleKey = z.infer<typeof roleKeySchema>;
type AuditLogItem = z.infer<typeof auditLogItemSchema>;
type PaginationInfo = z.infer<typeof paginationInfoSchema>;
type UserItem = z.infer<typeof userItemSchema>;

const ROLE_LABELS: Record<RoleKey, string> = {
  END_USER: '普通用户',
  LAWYER: '律师',
  ARBITRATOR: '仲裁员',
  MEDIATOR: '调解员',
  COURT: '法院',
  NOTARY: '公证机构',
  ADMIN: '业务管理员',
  OPS_ADMIN: '运维管理员',
  AUDITOR_READONLY: '审计只读',
  APPLICANT: '申请人（兼容）',
  RESPONDENT: '被申请人（兼容）',
};

const MANAGED_PLATFORM_ROLES: RoleKey[] = [
  'END_USER',
  'LAWYER',
  'ARBITRATOR',
  'MEDIATOR',
  'COURT',
  'NOTARY',
  'ADMIN',
  'OPS_ADMIN',
  'AUDITOR_READONLY',
];

const LEGACY_ROLES: RoleKey[] = ['APPLICANT', 'RESPONDENT'];

const redisStatsSchema = z.object({
  connected: z.boolean(),
  keys: z.number(),
  memory: z.string(),
  hits: z.number(),
  misses: z.number(),
  hitRate: z.string(),
});

const queueStatsSchema = z.record(
  z.string(),
  z.object({
    waiting: z.number(),
    active: z.number(),
    delayed: z.number(),
    failed: z.number(),
    completed: z.number(),
  })
);

const storageStatsSchema = z.object({
  status: z.string(),
  bucket: z.string().optional(),
  endpoint: z.string().optional(),
  region: z.string().optional(),
  forcePathStyle: z.boolean().optional(),
  presignExpiresSeconds: z.number().optional(),
  serverSideEncryption: z.string().nullable().optional(),
  error: z.string().optional(),
});

function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const parts = document.cookie.split('; ').find((p) => p.startsWith(`${name}=`));
  if (!parts) return null;
  return decodeURIComponent(parts.slice(name.length + 1));
}

function formatSeconds(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return `${hours}h ${minutes}m ${secs}s`;
}

export default function OpsPage() {
  const { capabilities } = useUserStore();
  const { currentRole } = useRole();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const initialOpsLoadedRef = useRef(false);

  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditPagination, setAuditPagination] = useState<PaginationInfo | null>(null);
  const [auditFilters, setAuditFilters] = useState({
    userId: '',
    eventType: '',
    level: '',
    result: '',
    from: '',
    to: '',
  });
  const [auditPage, setAuditPage] = useState(1);
  const [auditLimit, setAuditLimit] = useState(20);
  const [auditDetails, setAuditDetails] = useState<AuditLogItem | null>(null);
  const [auditDetailsOpen, setAuditDetailsOpen] = useState(false);

  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [usersPagination, setUsersPagination] = useState<PaginationInfo | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | RoleKey>('ALL');
  const [usersPage, setUsersPage] = useState(1);
  const [usersLimit, setUsersLimit] = useState(20);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [manageRolesOpen, setManageRolesOpen] = useState(false);
  const [roleUpdateBusy, setRoleUpdateBusy] = useState(false);
  const [roleUpdateError, setRoleUpdateError] = useState<string | null>(null);

  const canAccessOps = capabilities?.admin?.canAccessOps === true;
  const storageParsed = metrics
    ? storageStatsSchema.safeParse(metrics.storage)
    : { success: false as const };
  const storageStats = storageParsed.success ? storageParsed.data : null;

  const fetchMetrics = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    setActionMessage(null);
    try {
      const res = await fetch('/api/system/metrics?timeRange=1h&includeDetails=false', {
        credentials: 'include',
      });
      const json: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const parsedError = errorSchema.safeParse(json);
        setMetrics(null);
        setError(parsedError.success ? parsedError.data.error?.message ?? '获取失败' : '获取失败');
        return;
      }

      const parsed = metricsSchema.safeParse(json);
      if (!parsed.success) {
        setMetrics(null);
        setError('指标数据格式不正确');
        return;
      }

      setMetrics(parsed.data.data);
    } catch (e) {
      setMetrics(null);
      setError(e instanceof Error ? e.message : '获取失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const runOpsAction = useCallback(
    async (input: {
      url: string;
      method: 'POST' | 'DELETE';
      confirmText: string;
      successMessage: string;
    }): Promise<void> => {
      if (actionBusy) return;
      if (!window.confirm(input.confirmText)) return;

      setActionBusy(true);
      setActionMessage(null);
      setError(null);
      try {
        const csrfToken = getCookieValue('csrf-token');
        const res = await fetch(input.url, {
          method: input.method,
          credentials: 'include',
          headers: csrfToken ? { 'x-csrf-token': csrfToken } : undefined,
        });

        const json: unknown = await res.json().catch(() => null);
        if (!res.ok) {
          const parsedError = errorSchema.safeParse(json);
          setError(parsedError.success ? parsedError.data.error?.message ?? '操作失败' : '操作失败');
          return;
        }

        setActionMessage(input.successMessage);
        await fetchMetrics();
      } catch (e) {
        setError(e instanceof Error ? e.message : '操作失败');
      } finally {
        setActionBusy(false);
      }
    },
    [actionBusy, fetchMetrics]
  );

  const toIsoDateTime = useCallback((value: string): string | undefined => {
    if (!value) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return date.toISOString();
  }, []);

  const fetchAuditLogs = useCallback(
    async (input?: { page?: number; limit?: number }): Promise<void> => {
      setAuditLoading(true);
      setAuditError(null);
      try {
        const params = new URLSearchParams();
        params.set('page', String(input?.page ?? auditPage));
        params.set('limit', String(input?.limit ?? auditLimit));

        const userId = auditFilters.userId.trim();
        const eventType = auditFilters.eventType.trim();
        const level = auditFilters.level.trim();
        const result = auditFilters.result.trim();

        if (userId) params.set('userId', userId);
        if (eventType) params.set('eventType', eventType);
        if (level) params.set('level', level);
        if (result) params.set('result', result);

        const fromIso = toIsoDateTime(auditFilters.from);
        const toIso = toIsoDateTime(auditFilters.to);
        if (fromIso) params.set('from', fromIso);
        if (toIso) params.set('to', toIso);

        const res = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
          credentials: 'include',
        });
        const json: unknown = await res.json().catch(() => null);

        if (!res.ok) {
          const parsedError = errorSchema.safeParse(json);
          setAuditLogs([]);
          setAuditPagination(null);
          setAuditError(
            parsedError.success ? parsedError.data.error?.message ?? '获取失败' : '获取失败'
          );
          return;
        }

        const parsed = paginatedAuditLogsSchema.safeParse(json);
        if (!parsed.success) {
          setAuditLogs([]);
          setAuditPagination(null);
          setAuditError('审计日志数据格式不正确');
          return;
        }

        setAuditLogs(parsed.data.data);
        setAuditPagination(parsed.data.meta.pagination);
        setAuditPage(parsed.data.meta.pagination.page);
        setAuditLimit(parsed.data.meta.pagination.limit);
      } catch (e) {
        setAuditLogs([]);
        setAuditPagination(null);
        setAuditError(e instanceof Error ? e.message : '获取失败');
      } finally {
        setAuditLoading(false);
      }
    },
    [auditFilters, auditLimit, auditPage, toIsoDateTime]
  );

  const fetchUsers = useCallback(
    async (input?: { page?: number; limit?: number }): Promise<void> => {
      setUsersLoading(true);
      setUsersError(null);
      try {
        const params = new URLSearchParams();
        params.set('page', String(input?.page ?? usersPage));
        params.set('limit', String(input?.limit ?? usersLimit));

        const search = userSearch.trim();
        if (search) params.set('search', search);
        if (userRoleFilter !== 'ALL') params.set('role', userRoleFilter);

        const res = await fetch(`/api/admin/users?${params.toString()}`, {
          credentials: 'include',
        });
        const json: unknown = await res.json().catch(() => null);

        if (!res.ok) {
          const parsedError = errorSchema.safeParse(json);
          setUsers([]);
          setUsersPagination(null);
          setUsersError(
            parsedError.success ? parsedError.data.error?.message ?? '获取失败' : '获取失败'
          );
          return;
        }

        const parsed = paginatedUsersSchema.safeParse(json);
        if (!parsed.success) {
          setUsers([]);
          setUsersPagination(null);
          setUsersError('用户列表数据格式不正确');
          return;
        }

        setUsers(parsed.data.data);
        setUsersPagination(parsed.data.meta.pagination);
        setUsersPage(parsed.data.meta.pagination.page);
        setUsersLimit(parsed.data.meta.pagination.limit);
      } catch (e) {
        setUsers([]);
        setUsersPagination(null);
        setUsersError(e instanceof Error ? e.message : '获取失败');
      } finally {
        setUsersLoading(false);
      }
    },
    [userRoleFilter, userSearch, usersLimit, usersPage]
  );

  const updateUserRole = useCallback(
    async (input: { userId: string; role: RoleKey; isActive: boolean }): Promise<void> => {
      if (roleUpdateBusy) return;

      const label = ROLE_LABELS[input.role] ?? input.role;
      if (!window.confirm(`确认${input.isActive ? '启用' : '停用'}角色「${label}」？`)) {
        return;
      }

      setRoleUpdateBusy(true);
      setRoleUpdateError(null);
      try {
        const csrfToken = getCookieValue('csrf-token');
        const res = await fetch(`/api/admin/users/${input.userId}/roles`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
          },
          body: JSON.stringify({ role: input.role, isActive: input.isActive }),
        });

        const json: unknown = await res.json().catch(() => null);
        if (!res.ok) {
          const parsedError = errorSchema.safeParse(json);
          setRoleUpdateError(
            parsedError.success ? parsedError.data.error?.message ?? '操作失败' : '操作失败'
          );
          return;
        }

        const parsed = updateUserRoleResponseSchema.safeParse(json);
        if (!parsed.success) {
          setRoleUpdateError('角色更新响应格式不正确');
          return;
        }

        const nextRoles = parsed.data.data.roles;
        setUsers((prev) =>
          prev.map((u) => (u.id === input.userId ? { ...u, roles: nextRoles } : u))
        );
        setSelectedUser((prev) =>
          prev && prev.id === input.userId ? { ...prev, roles: nextRoles } : prev
        );
      } catch (e) {
        setRoleUpdateError(e instanceof Error ? e.message : '操作失败');
      } finally {
        setRoleUpdateBusy(false);
      }
    },
    [roleUpdateBusy]
  );

  useEffect(() => {
    void fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    if (!canAccessOps || currentRole !== 'ops') return;
    if (initialOpsLoadedRef.current) return;
    initialOpsLoadedRef.current = true;
    void fetchAuditLogs({ page: 1, limit: auditLimit });
    void fetchUsers({ page: 1, limit: usersLimit });
  }, [
    auditLimit,
    canAccessOps,
    currentRole,
    fetchAuditLogs,
    fetchUsers,
    usersLimit,
  ]);

  if (!canAccessOps) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-700" />
            运维后台
          </h1>
          <Badge variant="secondary">禁止访问</Badge>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              无权访问
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-red-800">
            当前账号没有运维后台访问权限（需要平台角色 <code>OPS_ADMIN</code>）。请联系管理员分配权限后重试。
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentRole !== 'ops') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-700" />
            运维后台
          </h1>
          <Badge variant="secondary">需切换身份</Badge>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>请切换到「运维后台」身份</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            当前处于「{currentRole}」视角。为避免权限混用，请在右上角身份切换中选择「运维后台」。
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-700" />
            运维后台
          </h1>
          <p className="text-sm text-muted-foreground">
            系统状态、基础设施与关键指标（仅展示实时数据，不改业务事实）
          </p>
        </div>
        <Button variant="outline" onClick={() => void fetchMetrics()} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              获取失败
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-red-800">{error}</CardContent>   
        </Card>
      )}

      {actionMessage && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">操作成功</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-green-800">{actionMessage}</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>系统</CardTitle>
            <Badge variant="secondary">{loading ? '加载中' : '已更新'}</Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <div>
                <span className="text-muted-foreground">Uptime：</span>
                <span className="font-medium">{metrics ? formatSeconds(metrics.system.uptime) : '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">CPU：</span>
                <span className="font-medium">{metrics ? `${metrics.system.cpu.usage}%` : '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Node：</span>
                <span className="font-medium">{metrics ? metrics.system.nodeVersion : '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Platform：</span>
                <span className="font-medium">{metrics ? metrics.system.platform : '-'}</span>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded border bg-muted/20">
                <div className="text-muted-foreground">Heap Used</div>
                <div className="text-lg font-semibold">{metrics ? `${metrics.system.memory.used} MB` : '-'}</div>
              </div>
              <div className="p-3 rounded border bg-muted/20">
                <div className="text-muted-foreground">Heap Total</div>
                <div className="text-lg font-semibold">{metrics ? `${metrics.system.memory.total} MB` : '-'}</div>
              </div>
              <div className="p-3 rounded border bg-muted/20">
                <div className="text-muted-foreground">External</div>
                <div className="text-lg font-semibold">{metrics ? `${metrics.system.memory.external} MB` : '-'}</div>
              </div>
              <div className="p-3 rounded border bg-muted/20">
                <div className="text-muted-foreground">RSS</div>
                <div className="text-lg font-semibold">{metrics ? `${metrics.system.memory.rss} MB` : '-'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>数据库</CardTitle>
            <Badge variant="secondary">
              {metrics?.database?.status ? metrics.database.status : '-'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {metrics?.database?.error ? (
              <div className="text-red-700">{metrics.database.error}</div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">响应</span>
                  <span className="font-medium">{metrics?.database?.responseTime ?? '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">记录总数</span>
                  <span className="font-medium">{metrics?.database?.totalRecords ?? '-'}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>缓存与性能</CardTitle>
            <Badge variant="secondary">{actionBusy ? '执行中' : '就绪'}</Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="destructive"
                disabled={actionBusy}
                onClick={() =>
                  void runOpsAction({
                    url: '/api/admin/cache?type=all',
                    method: 'DELETE',
                    confirmText: '确认清除全部缓存？该操作会影响所有用户的缓存命中率。',
                    successMessage: '已清除全部缓存',
                  })
                }
              >
                清除全部缓存
              </Button>
              <Button
                variant="outline"
                disabled={actionBusy}
                onClick={() =>
                  void runOpsAction({
                    url: '/api/admin/cache',
                    method: 'POST',
                    confirmText: '确认执行缓存预热？',
                    successMessage: '缓存预热已触发',
                  })
                }
              >
                预热缓存
              </Button>
              <Button
                variant="outline"
                disabled={actionBusy}
                onClick={() =>
                  void runOpsAction({
                    url: '/api/admin/performance',
                    method: 'DELETE',
                    confirmText: '确认清除全部性能指标？',
                    successMessage: '已清除全部性能指标',
                  })
                }
              >
                清除性能指标
              </Button>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded border bg-muted/20">
                <div className="text-muted-foreground">Redis Keys</div>
                <div className="text-lg font-semibold">
                  {metrics && redisStatsSchema.safeParse(metrics.redis).success
                    ? redisStatsSchema.parse(metrics.redis).keys
                    : '-'}
                </div>
              </div>
              <div className="p-3 rounded border bg-muted/20">
                <div className="text-muted-foreground">Redis 内存</div>
                <div className="text-lg font-semibold">
                  {metrics && redisStatsSchema.safeParse(metrics.redis).success
                    ? redisStatsSchema.parse(metrics.redis).memory
                    : '-'}
                </div>
              </div>
              <div className="p-3 rounded border bg-muted/20">
                <div className="text-muted-foreground">缓存命中率</div>     
                <div className="text-lg font-semibold">
                  {metrics && redisStatsSchema.safeParse(metrics.redis).success
                    ? redisStatsSchema.parse(metrics.redis).hitRate
                    : '-'}
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="text-sm font-medium">消息队列（BullMQ）</div>
              {metrics && queueStatsSchema.safeParse(metrics.queue).success ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {Object.entries(queueStatsSchema.parse(metrics.queue)).map(([name, counts]) => (
                    <div key={name} className="p-3 rounded border bg-muted/20">
                      <div className="text-muted-foreground break-all">{name}</div>
                      <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        <div>
                          <span className="text-muted-foreground">Waiting</span>{' '}
                          <span className="font-medium">{counts.waiting}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Active</span>{' '}
                          <span className="font-medium">{counts.active}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Delayed</span>{' '}
                          <span className="font-medium">{counts.delayed}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Failed</span>{' '}
                          <span className="font-medium text-red-700">{counts.failed}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">队列指标不可用</div>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex flex-row items-center justify-between gap-2">
                <div className="text-sm font-medium">对象存储（MinIO / S3）</div>
                <Badge
                  variant={
                    storageStats?.status === 'healthy'
                      ? 'secondary'
                      : storageStats?.status === 'not_configured'
                        ? 'outline'
                        : 'destructive'
                  }
                >
                  {storageStats?.status === 'healthy'
                    ? '健康'
                    : storageStats?.status === 'not_configured'
                      ? '未配置'
                      : storageStats?.status === 'unreachable'
                        ? '不可达'
                        : storageStats?.status === 'error'
                          ? '异常'
                          : '未知'}
                </Badge>
              </div>

              {storageStats ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 rounded border bg-muted/20">
                    <div className="text-muted-foreground">Bucket</div>
                    <div className="text-sm font-semibold break-all">
                      {storageStats.bucket ?? '-'}
                    </div>
                  </div>
                  <div className="p-3 rounded border bg-muted/20">
                    <div className="text-muted-foreground">Endpoint</div>
                    <div className="text-sm font-semibold break-all">
                      {storageStats.endpoint ?? '-'}
                    </div>
                  </div>
                  <div className="p-3 rounded border bg-muted/20">
                    <div className="text-muted-foreground">Region</div>
                    <div className="text-sm font-semibold break-all">
                      {storageStats.region ?? '-'}
                    </div>
                  </div>
                  <div className="p-3 rounded border bg-muted/20">
                    <div className="text-muted-foreground">Force Path Style</div>
                    <div className="text-sm font-semibold">
                      {typeof storageStats.forcePathStyle === 'boolean'
                        ? storageStats.forcePathStyle
                          ? 'true'
                          : 'false'
                        : '-'}
                    </div>
                  </div>
                  <div className="p-3 rounded border bg-muted/20">
                    <div className="text-muted-foreground">Presign TTL</div>
                    <div className="text-sm font-semibold">
                      {typeof storageStats.presignExpiresSeconds === 'number'
                        ? `${storageStats.presignExpiresSeconds}s`
                        : '-'}
                    </div>
                  </div>
                  <div className="p-3 rounded border bg-muted/20">
                    <div className="text-muted-foreground">SSE</div>
                    <div className="text-sm font-semibold break-all">
                      {storageStats.serverSideEncryption ?? '-'}
                    </div>
                  </div>

                  {storageStats.error ? (
                    <div className="md:col-span-3 p-3 rounded border bg-red-50 text-red-700">
                      <div className="text-muted-foreground">错误</div>
                      <div className="text-sm break-all">{storageStats.error}</div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">对象存储指标不可用</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>访问控制</CardTitle>
            <Badge variant="secondary">运维隔离</Badge>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div>本页仅在「运维后台」身份下可用。</div>
            <div>高危操作默认二次确认，并写入审计日志。</div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle>审计日志查询</CardTitle>
            <div className="text-xs text-muted-foreground">
              仅运维可访问；按条件查询安全审计日志（AuditLog）。
            </div>
          </div>
          <Button
            variant="outline"
            disabled={auditLoading}
            onClick={() => void fetchAuditLogs({ page: 1, limit: auditLimit })}
          >
            刷新
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {auditError ? (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              {auditError}
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-2 space-y-1">
              <Label htmlFor="audit-userId">用户ID</Label>
              <Input
                id="audit-userId"
                value={auditFilters.userId}
                onChange={(e) =>
                  setAuditFilters((prev) => ({ ...prev, userId: e.target.value }))
                }
                placeholder="UUID（可选）"
              />
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label htmlFor="audit-eventType">事件类型</Label>
              <Input
                id="audit-eventType"
                value={auditFilters.eventType}
                onChange={(e) =>
                  setAuditFilters((prev) => ({ ...prev, eventType: e.target.value }))
                }
                placeholder="如 USER_LOGIN / CASE_UPDATED"
              />
            </div>
            <div className="space-y-1">
              <Label>级别</Label>
              <Select
                value={auditFilters.level || 'ALL'}
                onValueChange={(value) =>
                  setAuditFilters((prev) => ({
                    ...prev,
                    level: value === 'ALL' ? '' : value,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">全部</SelectItem>
                  <SelectItem value="INFO">INFO</SelectItem>
                  <SelectItem value="WARNING">WARNING</SelectItem>
                  <SelectItem value="ERROR">ERROR</SelectItem>
                  <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>结果</Label>
              <Select
                value={auditFilters.result || 'ALL'}
                onValueChange={(value) =>
                  setAuditFilters((prev) => ({
                    ...prev,
                    result: value === 'ALL' ? '' : value,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">全部</SelectItem>
                  <SelectItem value="SUCCESS">SUCCESS</SelectItem>
                  <SelectItem value="FAILURE">FAILURE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3 space-y-1">
              <Label htmlFor="audit-from">开始时间</Label>
              <Input
                id="audit-from"
                type="datetime-local"
                value={auditFilters.from}
                onChange={(e) =>
                  setAuditFilters((prev) => ({ ...prev, from: e.target.value }))
                }
              />
            </div>
            <div className="md:col-span-3 space-y-1">
              <Label htmlFor="audit-to">结束时间</Label>
              <Input
                id="audit-to"
                type="datetime-local"
                value={auditFilters.to}
                onChange={(e) => setAuditFilters((prev) => ({ ...prev, to: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={auditLoading}
              onClick={() => void fetchAuditLogs({ page: 1, limit: auditLimit })}
            >
              应用过滤
            </Button>
            <Button
              variant="outline"
              disabled={auditLoading}
              onClick={() => {
                setAuditFilters({
                  userId: '',
                  eventType: '',
                  level: '',
                  result: '',
                  from: '',
                  to: '',
                });
                void fetchAuditLogs({ page: 1, limit: auditLimit });
              }}
            >
              清空过滤
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>时间</TableHead>
                <TableHead>级别</TableHead>
                <TableHead>事件</TableHead>
                <TableHead>资源/动作</TableHead>
                <TableHead>用户</TableHead>
                <TableHead>结果</TableHead>
                <TableHead>详情</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-sm text-muted-foreground">
                    {auditLoading ? '加载中…' : '暂无数据'}
                  </TableCell>
                </TableRow>
              ) : (
                auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          log.level === 'ERROR' || log.level === 'CRITICAL'
                            ? 'destructive'
                            : log.level === 'WARNING'
                              ? 'outline'
                              : 'secondary'
                        }
                      >
                        {log.level}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{log.eventType}</TableCell>
                    <TableCell className="text-xs">
                      {(log.resource || '-') + ' / ' + (log.action || '-')}
                    </TableCell>
                    <TableCell className="text-xs">
                      {log.userName || log.userId || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.result === 'SUCCESS' ? 'secondary' : 'destructive'}>
                        {log.result}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setAuditDetails(log);
                          setAuditDetailsOpen(true);
                        }}
                      >
                        查看
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between text-sm">
            <div className="text-muted-foreground">
              {auditPagination
                ? `第 ${auditPagination.page} / ${auditPagination.totalPages} 页，合计 ${auditPagination.total} 条`
                : '—'}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={auditLoading || auditPage <= 1}
                onClick={() => void fetchAuditLogs({ page: Math.max(1, auditPage - 1) })}
              >
                上一页
              </Button>
              <Button
                variant="outline"
                disabled={
                  auditLoading || (auditPagination ? auditPage >= auditPagination.totalPages : false)
                }
                onClick={() => void fetchAuditLogs({ page: auditPage + 1 })}
              >
                下一页
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={auditDetailsOpen} onOpenChange={setAuditDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>审计日志详情</DialogTitle>
            <DialogDescription className="break-all">
              {auditDetails ? `${auditDetails.eventType} · ${auditDetails.id}` : '-'}
            </DialogDescription>
          </DialogHeader>
          {auditDetails ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded border bg-muted/20">
                  <div className="text-muted-foreground">时间</div>
                  <div className="text-xs break-all">{auditDetails.timestamp}</div>
                </div>
                <div className="p-3 rounded border bg-muted/20">
                  <div className="text-muted-foreground">用户</div>
                  <div className="text-xs break-all">
                    {auditDetails.userName || auditDetails.userId || '-'}
                  </div>
                </div>
                <div className="p-3 rounded border bg-muted/20">
                  <div className="text-muted-foreground">IP</div>
                  <div className="text-xs break-all">{auditDetails.ipAddress || '-'}</div>
                </div>
              </div>
              <div className="p-3 rounded border bg-muted/20">
                <div className="text-muted-foreground">资源/动作</div>
                <div className="text-xs break-all">
                  {(auditDetails.resource || '-') + ' / ' + (auditDetails.action || '-')}
                </div>
              </div>
              {auditDetails.errorMessage ? (
                <div className="p-3 rounded border bg-red-50 text-red-700">
                  <div className="text-muted-foreground">错误</div>
                  <div className="text-xs break-all">{auditDetails.errorMessage}</div>
                </div>
              ) : null}
              <div className="space-y-1">
                <div className="text-muted-foreground">Details</div>
                <pre className="max-h-[50vh] overflow-auto rounded border bg-muted/10 p-3 text-xs leading-relaxed">
                  {JSON.stringify(auditDetails.details ?? null, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">暂无</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAuditDetailsOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Separator />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle>用户与平台角色</CardTitle>
            <div className="text-xs text-muted-foreground">
              仅运维可操作。角色变更会写入审计日志；对已登录用户生效存在短暂缓存延迟（约 60 秒）。
            </div>
          </div>
          <Button variant="outline" disabled={usersLoading} onClick={() => void fetchUsers()}>
            刷新
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {usersError ? (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              {usersError}
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-4 space-y-1">
              <Label htmlFor="user-search">搜索</Label>
              <Input
                id="user-search"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="邮箱/手机号/用户ID（可选）"
              />
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label>角色筛选</Label>
              <Select
                value={userRoleFilter}
                onValueChange={(value) => {
                  if (value === 'ALL') setUserRoleFilter('ALL');
                  else setUserRoleFilter(value as RoleKey);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">全部</SelectItem>
                  {MANAGED_PLATFORM_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role] ?? role}
                    </SelectItem>
                  ))}
                  {LEGACY_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role] ?? role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={usersLoading}
              onClick={() => void fetchUsers({ page: 1, limit: usersLimit })}
            >
              应用过滤
            </Button>
            <Button
              variant="outline"
              disabled={usersLoading}
              onClick={() => {
                setUserSearch('');
                setUserRoleFilter('ALL');
                void fetchUsers({ page: 1, limit: usersLimit });
              }}
            >
              清空过滤
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>邮箱</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>角色（Active）</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">
                    {usersLoading ? '加载中…' : '暂无数据'}
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => {
                  const activeRoles = u.roles.filter((r) => r.isActive);
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="text-xs break-all">
                        <div className="font-medium">{u.email}</div>
                        <div className="text-muted-foreground">{u.id}</div>
                      </TableCell>
                      <TableCell className="text-xs">{u.userType}</TableCell>
                      <TableCell>
                        <Badge variant={u.status === 'ACTIVE' ? 'secondary' : 'outline'}>
                          {u.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-wrap gap-1">
                          {activeRoles.length === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            activeRoles.map((r) => (
                              <Badge key={r.id} variant="secondary">
                                {ROLE_LABELS[r.role] ?? r.role}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(u);
                            setRoleUpdateError(null);
                            setManageRolesOpen(true);
                          }}
                        >
                          管理角色
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between text-sm">
            <div className="text-muted-foreground">
              {usersPagination
                ? `第 ${usersPagination.page} / ${usersPagination.totalPages} 页，合计 ${usersPagination.total} 条`
                : '—'}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={usersLoading || usersPage <= 1}
                onClick={() => void fetchUsers({ page: Math.max(1, usersPage - 1) })}
              >
                上一页
              </Button>
              <Button
                variant="outline"
                disabled={
                  usersLoading || (usersPagination ? usersPage >= usersPagination.totalPages : false)
                }
                onClick={() => void fetchUsers({ page: usersPage + 1 })}
              >
                下一页
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={manageRolesOpen}
        onOpenChange={(open) => {
          setManageRolesOpen(open);
          if (!open) setSelectedUser(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>管理平台角色</DialogTitle>
            <DialogDescription className="break-all">
              {selectedUser ? `${selectedUser.email} · ${selectedUser.id}` : '-'}
            </DialogDescription>
          </DialogHeader>

          {roleUpdateError ? (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              {roleUpdateError}
            </div>
          ) : null}

          {selectedUser ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                勾选表示该用户拥有对应平台角色（isActive=true）。
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {MANAGED_PLATFORM_ROLES.map((role) => {
                  const checked = selectedUser.roles.some((r) => r.role === role && r.isActive);
                  return (
                    <div key={role} className="flex items-center justify-between rounded border p-3">
                      <div className="space-y-1">
                        <div className="font-medium">{ROLE_LABELS[role] ?? role}</div>
                        <div className="text-xs text-muted-foreground">{role}</div>
                      </div>
                      <Checkbox
                        checked={checked}
                        disabled={roleUpdateBusy}
                        onCheckedChange={(next) =>
                          void updateUserRole({
                            userId: selectedUser.id,
                            role,
                            isActive: next,
                          })
                        }
                      />
                    </div>
                  );
                })}
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="text-sm font-medium">历史/兼容（谨慎使用）</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {LEGACY_ROLES.map((role) => {
                    const checked = selectedUser.roles.some((r) => r.role === role && r.isActive);
                    return (
                      <div key={role} className="flex items-center justify-between rounded border p-3">
                        <div className="space-y-1">
                          <div className="font-medium">{ROLE_LABELS[role] ?? role}</div>
                          <div className="text-xs text-muted-foreground">{role}</div>
                        </div>
                        <Checkbox
                          checked={checked}
                          disabled={roleUpdateBusy}
                          onCheckedChange={(next) =>
                            void updateUserRole({
                              userId: selectedUser.id,
                              role,
                              isActive: next,
                            })
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">未选择用户</div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setManageRolesOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
