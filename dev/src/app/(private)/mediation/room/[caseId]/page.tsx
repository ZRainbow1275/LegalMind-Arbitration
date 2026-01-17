// dev/src/app/(private)/mediation/room/[caseId]/page.tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { z } from 'zod';
import { ArrowLeft, RefreshCw, Send, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useNotificationHelpers } from '@/components/ui/notification';
import { useRole } from '@/components/layout/role-switcher';
import { useUserStore } from '@/store';
import { cn } from '@/lib/utils';

const errorSchema = z.object({
  success: z.literal(false),
  error: z
    .object({
      message: z.string(),
    })
    .optional(),
});

const roomResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    room: z.object({
      caseId: z.string(),
      caseNumber: z.string(),
      title: z.string(),
    }),
    stage: z.object({
      currentStageKey: z.string(),
      updatedAt: z.string().nullable(),
      sequence: z.string().nullable(),
    }),
    events: z.array(
      z.object({
        id: z.string(),
        sequence: z.string(),
        eventType: z.string(),
        createdAt: z.string(),
        traceId: z.string().nullable().optional(),
        hash: z.string().nullable().optional(),
        actor: z
          .object({
            id: z.string(),
            displayName: z.string(),
          })
          .nullable(),
        payload: z.unknown(),
      })
    ),
    nextAfterSequence: z.string(),
  }),
  message: z.string().optional(),
});

const messagePostSchema = z.object({
  success: z.literal(true),
  data: z.object({
    event: z.object({
      id: z.string(),
      sequence: z.string(),
      createdAt: z.string(),
    }),
    traceId: z.string(),
  }),
  message: z.string().optional(),
});

const stagePostSchema = z.object({
  success: z.literal(true),
  data: z.object({
    stage: z.object({
      previousStageKey: z.string(),
      currentStageKey: z.string(),
      sequence: z.string(),
      createdAt: z.string(),
    }),
    traceId: z.string().optional(),
  }),
  message: z.string().optional(),
});

type RoomData = z.infer<typeof roomResponseSchema>['data'];
type RoomEvent = RoomData['events'][number];

const STAGE_OPTIONS = [
  { key: 'PREPARE', label: '准备/身份核验' },
  { key: 'OPENING', label: '开始/宣示' },
  { key: 'STATEMENTS', label: '陈述' },
  { key: 'ISSUE_FRAMING', label: '争点梳理' },
  { key: 'EVIDENCE_EXCHANGE', label: '证据交换' },
  { key: 'NEGOTIATION', label: '方案磋商' },
  { key: 'DRAFT_AGREEMENT', label: '协议草案' },
  { key: 'SIGNING', label: '签署' },
  { key: 'ARCHIVE', label: '归档' },
] as const;

function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const parts = document.cookie.split('; ').find((p) => p.startsWith(`${name}=`));
  if (!parts) return null;
  return decodeURIComponent(parts.slice(name.length + 1));
}

function formatTime(iso: string) {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseRoomMessage(event: RoomEvent): { type: string; text: string } | null {
  if (event.eventType !== 'MEDIATION_ROOM_MESSAGE') return null;
  if (!isRecord(event.payload)) return null;
  const message = event.payload.message;
  if (!isRecord(message)) return null;
  const type = typeof message.type === 'string' ? message.type : 'USER_MESSAGE';
  const text = typeof message.text === 'string' ? message.text : '';
  if (!text) return null;
  return { type, text };
}

function parseStageChange(event: RoomEvent): { previousStageKey: string | null; stageKey: string | null } | null {
  if (event.eventType !== 'MEDIATION_ROOM_STAGE_CHANGED') return null;
  if (!isRecord(event.payload)) return null;
  const stageKey = typeof event.payload.stageKey === 'string' ? event.payload.stageKey : null;
  const previousStageKey = typeof event.payload.previousStageKey === 'string' ? event.payload.previousStageKey : null;
  return { previousStageKey, stageKey };
}

function stageLabel(stageKey: string): string {
  const found = STAGE_OPTIONS.find((s) => s.key === stageKey);
  return found ? found.label : stageKey;
}

export default function MediationRoomPage() {
  const router = useRouter();
  const params = useParams<{ caseId: string }>();
  const caseId = params.caseId;

  const notify = useNotificationHelpers();
  const { currentRole } = useRole();
  const currentUserId = useUserStore((s) => s.currentUser?.id) || null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomData['room'] | null>(null);
  const [stageKey, setStageKey] = useState<string>('PREPARE');
  const [stageUpdatedAt, setStageUpdatedAt] = useState<string | null>(null);
  const [events, setEvents] = useState<RoomEvent[]>([]);
  const [nextAfterSequence, setNextAfterSequence] = useState('0');

  const [messageText, setMessageText] = useState('');
  const [sendBusy, setSendBusy] = useState(false);

  const [nextStageKey, setNextStageKey] = useState<string>('OPENING');
  const [stageReason, setStageReason] = useState('');
  const [stageBusy, setStageBusy] = useState(false);

  const pollBusyRef = useRef(false);

  const fetchRoom = useCallback(
    async (input: { afterSequence?: string | null; limit?: number; replace?: boolean }) => {
      const afterSequence = input.afterSequence ?? null;
      const limit = input.limit ?? 50;

      const url = new URL(`/api/cases/${caseId}/mediation-room`, window.location.origin);
      url.searchParams.set('limit', String(limit));
      if (afterSequence) url.searchParams.set('afterSequence', afterSequence);

      const res = await fetch(url.toString(), { credentials: 'include' });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const parsedError = errorSchema.safeParse(json);
        throw new Error(parsedError.success ? parsedError.data.error?.message ?? '获取失败' : '获取失败');
      }

      const parsed = roomResponseSchema.safeParse(json);
      if (!parsed.success) {
        throw new Error('调解会议室数据格式不正确');
      }

      const data = parsed.data.data;
      if (input.replace) {
        setEvents(data.events);
      } else {
        setEvents((prev) => {
          const seen = new Set(prev.map((e) => e.id));
          const merged = [...prev];
          data.events.forEach((e) => {
            if (!seen.has(e.id)) merged.push(e);
          });
          return merged;
        });
      }

      setRoom(data.room);
      setStageKey(data.stage.currentStageKey);
      setStageUpdatedAt(data.stage.updatedAt);
      setNextAfterSequence(data.nextAfterSequence);
    },
    [caseId]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchRoom({ replace: true, limit: 80 });
    } catch (e) {
      setError(e instanceof Error ? e.message : '获取失败');
    } finally {
      setLoading(false);
    }
  }, [fetchRoom]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (loading) return;
    if (error) return;
    let timer: number | null = null;

    timer = window.setInterval(() => {
      if (pollBusyRef.current) return;
      pollBusyRef.current = true;
      void fetchRoom({ afterSequence: nextAfterSequence, limit: 100 })
        .catch(() => undefined)
        .finally(() => {
          pollBusyRef.current = false;
        });
    }, 3000);

    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [error, fetchRoom, loading, nextAfterSequence]);

  const canAdvanceStage = useMemo(() => currentRole === 'mediator' || currentRole === 'admin', [currentRole]);

  const handleSend = useCallback(async () => {
    if (sendBusy) return;
    const text = messageText.trim();
    if (!text) {
      notify.warning('请输入消息内容');
      return;
    }

    if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') {
      notify.error('当前环境不支持发送', '缺少 crypto.randomUUID');
      return;
    }

    setSendBusy(true);
    try {
      const csrfToken = getCookieValue('csrf-token');
      const res = await fetch(`/api/cases/${caseId}/mediation-room/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        body: JSON.stringify({
          clientMessageId: crypto.randomUUID(),
          type: 'USER_MESSAGE',
          text,
        }),
      });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const parsedError = errorSchema.safeParse(json);
        throw new Error(parsedError.success ? parsedError.data.error?.message ?? '发送失败' : '发送失败');
      }

      const parsed = messagePostSchema.safeParse(json);
      if (!parsed.success) throw new Error('发送响应格式不正确');

      setMessageText('');
      await fetchRoom({ afterSequence: nextAfterSequence, limit: 100 });
    } catch (e) {
      notify.error('发送失败', e instanceof Error ? e.message : '发送失败');
    } finally {
      setSendBusy(false);
    }
  }, [caseId, fetchRoom, messageText, nextAfterSequence, notify, sendBusy]);

  const handleAdvanceStage = useCallback(async () => {
    if (stageBusy) return;
    if (!canAdvanceStage) {
      notify.error('当前身份不可推进阶段', '请切换到调解员/管理员视角后重试');
      return;
    }

    setStageBusy(true);
    try {
      const csrfToken = getCookieValue('csrf-token');
      const res = await fetch(`/api/cases/${caseId}/mediation-room/stage`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        body: JSON.stringify({
          stageKey: nextStageKey,
          ...(stageReason.trim() ? { reason: stageReason.trim() } : {}),
        }),
      });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const parsedError = errorSchema.safeParse(json);
        throw new Error(parsedError.success ? parsedError.data.error?.message ?? '推进失败' : '推进失败');
      }

      const parsed = stagePostSchema.safeParse(json);
      if (!parsed.success) throw new Error('推进响应格式不正确');

      notify.success('阶段已推进');
      setStageReason('');
      await refresh();
    } catch (e) {
      notify.error('推进失败', e instanceof Error ? e.message : '推进失败');
    } finally {
      setStageBusy(false);
    }
  }, [canAdvanceStage, caseId, nextStageKey, notify, refresh, stageBusy, stageReason]);

  const renderedEvents = useMemo(() => {
    return events
      .slice()
      .sort((a, b) => Number(a.sequence) - Number(b.sequence))
      .map((event) => {
        const stageChange = parseStageChange(event);
        if (stageChange?.stageKey) {
          return (
            <div key={event.id} className="flex items-center justify-center">
              <Badge variant="secondary" className="px-3 py-1">
                阶段变更：{stageChange.previousStageKey ? `${stageLabel(stageChange.previousStageKey)} → ` : ''}
                {stageLabel(stageChange.stageKey)}
                <span className="ml-2 text-xs text-muted-foreground">{formatTime(event.createdAt)}</span>
              </Badge>
            </div>
          );
        }

        const message = parseRoomMessage(event);
        if (!message) return null;

        const isMine = currentUserId && event.actor?.id === currentUserId;
        const bubbleClass =
          message.type === 'SYSTEM_MESSAGE'
            ? 'bg-slate-100 text-slate-800'
            : isMine
              ? 'bg-orange-500 text-white'
              : 'bg-white border text-gray-900';

        return (
          <div key={event.id} className={cn('flex', message.type === 'SYSTEM_MESSAGE' ? 'justify-center' : isMine ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[85%] rounded-lg px-3 py-2 shadow-sm', bubbleClass)}>
              {message.type !== 'SYSTEM_MESSAGE' ? (
                <div className={cn('text-xs mb-1', isMine ? 'text-orange-100' : 'text-muted-foreground')}>
                  {event.actor?.displayName ?? '匿名'}
                  <span className="ml-2">{formatTime(event.createdAt)}</span>
                </div>
              ) : null}
              <div className="text-sm whitespace-pre-wrap break-words">{message.text}</div>
            </div>
          </div>
        );
      })
      .filter(Boolean);
  }, [currentUserId, events]);

  return (
    <div className="container mx-auto p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              返回
            </Button>
            <Badge variant="secondary">调解会议室</Badge>
            <Badge className="bg-indigo-100 text-indigo-800">{stageLabel(stageKey)}</Badge>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">文字版调解庭审</h1>
          <p className="text-sm text-muted-foreground">
            房间基于业务事件流（CaseEvent）留痕；阶段推进与系统提示可回放与审计。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading ? 'animate-spin' : '')} />
            刷新
          </Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">加载中…</CardContent>
        </Card>
      ) : error ? (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              无法进入会议室
            </CardTitle>
            <CardDescription className="text-red-700">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => void refresh()}>
              重试
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card className="card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>会话</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{room?.caseNumber ?? caseId}</Badge>
                    {stageUpdatedAt ? (
                      <Badge variant="secondary">阶段更新：{formatTime(stageUpdatedAt)}</Badge>
                    ) : null}
                  </div>
                </CardTitle>
                <CardDescription className="truncate">{room?.title ?? '—'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="max-h-[55vh] overflow-auto space-y-2 pr-2">
                  {renderedEvents.length === 0 ? (
                    <div className="text-sm text-muted-foreground">暂无消息</div>
                  ) : (
                    renderedEvents
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Textarea
                    rows={3}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="输入消息（支持多行；建议引用证据编号/版本/哈希）"
                    disabled={sendBusy}
                  />
                  <div className="flex items-center justify-end">
                    <Button onClick={() => void handleSend()} disabled={sendBusy}>
                      <Send className="w-4 h-4 mr-1" />
                      发送
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="card">
              <CardHeader>
                <CardTitle>阶段推进</CardTitle>
                <CardDescription>仅调解员/管理员可推进（服务端强制校验）</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">下一阶段</div>
                  <Select value={nextStageKey} onValueChange={setNextStageKey}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择阶段" />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGE_OPTIONS.map((s) => (
                        <SelectItem key={s.key} value={s.key}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">原因（可选）</div>
                  <Input value={stageReason} onChange={(e) => setStageReason(e.target.value)} />
                </div>

                <Button onClick={() => void handleAdvanceStage()} disabled={stageBusy || !canAdvanceStage}>
                  推进阶段
                </Button>
                {!canAdvanceStage ? (
                  <div className="text-xs text-muted-foreground">当前视角：{currentRole}（可切换为调解员/管理员后操作）</div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="card">
              <CardHeader>
                <CardTitle>说明</CardTitle>
                <CardDescription>本页面为 M3 最小闭环</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <div>服务端事件：<code>MEDIATION_ROOM_MESSAGE</code>、<code>MEDIATION_ROOM_STAGE_CHANGED</code></div>
                <div>增量拉取：<code>GET /api/cases/&lt;caseId&gt;/mediation-room?afterSequence=...</code></div>
                <div>发送消息：<code>POST /api/cases/&lt;caseId&gt;/mediation-room/messages</code></div>
                <div>推进阶段：<code>POST /api/cases/&lt;caseId&gt;/mediation-room/stage</code></div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

