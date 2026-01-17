// dev/src/app/(private)/arbitrator/invitations/[id]/page.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { z } from 'zod';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  Send,
  User,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useNotificationHelpers } from '@/components/ui/notification';
import { useRole } from '@/components/layout/role-switcher';
import { useUserStore } from '@/store';

const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),
});

const invitationDetailSchema = z.object({
  success: z.literal(true),
  data: z.object({
    invitation: z.object({
      id: z.string(),
      caseId: z.string(),
      neutralType: z.string(),
      status: z.string(),
      expiresAt: z.string().nullable(),
      sentAt: z.string().nullable(),
      respondedAt: z.string().nullable(),
      requirements: z.unknown().nullable().optional(),
      invitedUser: z.object({
        id: z.string(),
        email: z.string(),
        displayName: z.string(),
      }),
      invitedByUser: z.object({
        id: z.string(),
        email: z.string(),
        displayName: z.string(),
      }),
    }),
    case: z.object({
      id: z.string(),
      caseNumber: z.string(),
      title: z.string(),
      description: z.string().nullable().optional(),
      caseType: z.string(),
      disputeAmount: z.string().nullable(),
      applicant: z.object({ id: z.string(), displayName: z.string() }),
      respondent: z.object({ id: z.string(), displayName: z.string() }).nullable(),
    }),
    disclosures: z.array(
      z.object({
        id: z.string(),
        disclosureText: z.string(),
        attachments: z.unknown().nullable().optional(),
        signedAt: z.string().nullable(),
        signatureRef: z.string().nullable().optional(),
        createdAt: z.string(),
      })
    ),
    responses: z.array(
      z.object({
        id: z.string(),
        action: z.string(),
        reason: z.string().nullable().optional(),
        respondedAt: z.string(),
        createdAt: z.string(),
      })
    ),
    consent: z
      .object({
        id: z.string(),
        status: z.string(),
        applicantDecision: z.string(),
        respondentDecision: z.string(),
        applicantDecisionAt: z.string().nullable().optional(),
        respondentDecisionAt: z.string().nullable().optional(),
      })
      .nullable(),
    appointment: z
      .object({
        id: z.string(),
        status: z.string(),
        effectiveAt: z.string().nullable(),
      })
      .nullable()
      .optional(),
  }),
  message: z.string().optional(),
});

type InvitationDetail = z.infer<typeof invitationDetailSchema>['data'];

function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const parts = document.cookie.split('; ').find((p) => p.startsWith(`${name}=`));
  if (!parts) return null;
  return decodeURIComponent(parts.slice(name.length + 1));
}

function formatIso(iso: string | null | undefined): string {
  if (!iso) return '-';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleString();
}

function statusBadge(status: string) {
  switch (status) {
    case 'SENT':
      return <Badge className="bg-orange-100 text-orange-800">待处理</Badge>;
    case 'ACCEPTED':
      return <Badge className="bg-green-100 text-green-800">已接受</Badge>;
    case 'REJECTED':
      return <Badge className="bg-red-100 text-red-800">已拒绝</Badge>;
    case 'EXPIRED':
      return <Badge className="bg-gray-100 text-gray-800">已过期</Badge>;
    case 'WITHDRAWN':
      return <Badge className="bg-gray-100 text-gray-800">已撤回</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function ArbitratorInvitationDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const invitationId = params.id;

  const notify = useNotificationHelpers();
  const { currentRole } = useRole();
  const { currentUser } = useUserStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<InvitationDetail | null>(null);

  const [disclosureText, setDisclosureText] = useState('');
  const [disclosureAttachments, setDisclosureAttachments] = useState('');
  const [disclosureSignatureRef, setDisclosureSignatureRef] = useState('');
  const [disclosureBusy, setDisclosureBusy] = useState(false);

  const [responseReason, setResponseReason] = useState('');
  const [extendExpiresAtLocal, setExtendExpiresAtLocal] = useState('');
  const [respondBusy, setRespondBusy] = useState(false);

  const [consentDecision, setConsentDecision] = useState<'CONSENTED' | 'REJECTED' | 'WITHDRAWN'>('CONSENTED');
  const [consentReason, setConsentReason] = useState('');
  const [consentSignatureRef, setConsentSignatureRef] = useState('');
  const [consentBusy, setConsentBusy] = useState(false);

  const [appointBusy, setAppointBusy] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/neutrals/invitations/${invitationId}`, {
        method: 'GET',
        credentials: 'include',
      });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const parsedError = errorResponseSchema.safeParse(json);
        setDetail(null);
        setError(parsedError.success ? parsedError.data.error?.message ?? '获取失败' : '获取失败');
        return;
      }

      const parsed = invitationDetailSchema.safeParse(json);
      if (!parsed.success) {
        setDetail(null);
        setError('邀请详情数据格式不正确');
        return;
      }

      setDetail(parsed.data.data);
    } catch (e) {
      setDetail(null);
      setError(e instanceof Error ? e.message : '获取失败');
    } finally {
      setLoading(false);
    }
  }, [invitationId]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  const canOperate = useMemo(() => currentRole === 'arbitrator' || currentRole === 'mediator', [currentRole]);

  const handleSubmitDisclosure = useCallback(async () => {
    if (!disclosureText.trim()) {
      notify.warning('请填写披露内容');
      return;
    }
    if (disclosureBusy) return;
    setDisclosureBusy(true);
    setError(null);
    try {
      const csrfToken = getCookieValue('csrf-token');
      let attachments: unknown | undefined;
      if (disclosureAttachments.trim()) {
        try {
          attachments = JSON.parse(disclosureAttachments);
        } catch {
          notify.error('附件 JSON 解析失败', '请确认附件为合法 JSON（可留空）');
          return;
        }
      }

      const res = await fetch(`/api/neutrals/invitations/${invitationId}/disclosure`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        body: JSON.stringify({
          disclosureText: disclosureText.trim(),
          attachments,
          signatureRef: disclosureSignatureRef.trim() ? disclosureSignatureRef.trim() : undefined,
        }),
      });

      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const parsedError = errorResponseSchema.safeParse(json);
        throw new Error(parsedError.success ? parsedError.data.error?.message ?? '提交披露失败' : '提交披露失败');
      }

      notify.success('披露已提交');
      setDisclosureText('');
      setDisclosureAttachments('');
      setDisclosureSignatureRef('');
      await fetchDetail();
    } catch (e) {
      notify.error('提交披露失败', e instanceof Error ? e.message : '提交失败');
    } finally {
      setDisclosureBusy(false);
    }
  }, [
    disclosureAttachments,
    disclosureBusy,
    disclosureSignatureRef,
    disclosureText,
    fetchDetail,
    invitationId,
    notify,
  ]);

  const handleRespond = useCallback(
    async (action: 'ACCEPT' | 'REJECT' | 'REQUEST_MORE_TIME') => {
      if (respondBusy) return;
      if (!canOperate) {
        notify.error('当前身份不可操作', '请切换到仲裁员/调解员视角后重试');
        return;
      }

      if (action === 'REQUEST_MORE_TIME' && !extendExpiresAtLocal) {
        notify.warning('请选择延期截止时间');
        return;
      }

      setRespondBusy(true);
      setError(null);
      try {
        const csrfToken = getCookieValue('csrf-token');
        const extendExpiresAt = extendExpiresAtLocal
          ? new Date(extendExpiresAtLocal).toISOString()
          : undefined;

        const res = await fetch(`/api/neutrals/invitations/${invitationId}/respond`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
          },
          body: JSON.stringify({
            action,
            reason: responseReason.trim() ? responseReason.trim() : undefined,
            ...(action === 'REQUEST_MORE_TIME' ? { extendExpiresAt } : {}),
          }),
        });
        const json: unknown = await res.json().catch(() => null);
        if (!res.ok) {
          const parsedError = errorResponseSchema.safeParse(json);
          throw new Error(parsedError.success ? parsedError.data.error?.message ?? '操作失败' : '操作失败');
        }

        notify.success('操作成功');
        setResponseReason('');
        setExtendExpiresAtLocal('');
        await fetchDetail();
      } catch (e) {
        notify.error('响应邀请失败', e instanceof Error ? e.message : '操作失败');
      } finally {
        setRespondBusy(false);
      }
    },
    [canOperate, extendExpiresAtLocal, fetchDetail, invitationId, notify, respondBusy, responseReason]
  );

  const lastDisclosure = detail?.disclosures?.[0] ?? null;
  const hasDisclosure = (detail?.disclosures?.length ?? 0) > 0;

  return (
    <div className="container mx-auto p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              返回
            </Button>
            <Badge variant="secondary">邀请详情</Badge>
            {detail ? statusBadge(detail.invitation.status) : null}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">中立者邀请处理</h1>
          <p className="text-sm text-muted-foreground">
            接受邀请前必须完成利益冲突披露；所有操作均留痕并可审计。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/arbitrator/dashboard">
              <FileText className="w-4 h-4 mr-1" />
              返回工作台
            </Link>
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
              <XCircle className="w-5 h-5" />
              获取失败
            </CardTitle>
            <CardDescription className="text-red-700">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => void fetchDetail()}>
              重试
            </Button>
          </CardContent>
        </Card>
      ) : !detail ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">暂无数据</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-600" />
                  案件信息
                </CardTitle>
                <CardDescription>用于判断是否存在利益冲突或应回避情形</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-slate-100 text-slate-800">{detail.case.caseNumber}</Badge>
                  <Badge variant="secondary">{detail.case.caseType}</Badge>
                  {detail.invitation.neutralType ? (
                    <Badge className="bg-purple-100 text-purple-800">{detail.invitation.neutralType}</Badge>
                  ) : null}
                </div>
                <div className="text-base font-semibold text-gray-900">{detail.case.title}</div>
                {detail.case.description ? (
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">{detail.case.description}</div>
                ) : null}

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <div>
                      <div className="text-muted-foreground">申请人</div>
                      <div className="font-medium">{detail.case.applicant.displayName}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <div>
                      <div className="text-muted-foreground">被申请人</div>
                      <div className="font-medium">{detail.case.respondent?.displayName ?? '-'}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">争议金额</div>
                    <div className="font-medium">{detail.case.disputeAmount ? `¥${detail.case.disputeAmount}` : '-'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">截止时间</div>
                    <div className="font-medium text-orange-700">{formatIso(detail.invitation.expiresAt)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-blue-600" />
                  利益冲突披露
                </CardTitle>
                <CardDescription>接受邀请前必须提交披露（可多次提交，系统保留历史）</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasDisclosure && lastDisclosure ? (
                  <div className="p-4 rounded-lg border bg-blue-50 border-blue-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-blue-900">最近一次披露</div>
                      <Badge className="bg-blue-100 text-blue-800">{formatIso(lastDisclosure.createdAt)}</Badge>
                    </div>
                    <div className="text-sm whitespace-pre-wrap text-blue-900">{lastDisclosure.disclosureText}</div>
                    {lastDisclosure.signatureRef ? (
                      <div className="text-xs text-blue-800">
                        signatureRef：<code>{lastDisclosure.signatureRef}</code>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">尚未提交披露。</div>
                )}

                <div className="space-y-2">
                  <Textarea
                    placeholder="请输入披露内容（例如：曾代理/任职/亲属关系/业务往来/其他可能影响独立性事项）"
                    value={disclosureText}
                    onChange={(e) => setDisclosureText(e.target.value)}
                    rows={6}
                    disabled={!canOperate || disclosureBusy}
                  />
                  <Input
                    placeholder="signatureRef（可选：签名/时间戳引用）"
                    value={disclosureSignatureRef}
                    onChange={(e) => setDisclosureSignatureRef(e.target.value)}
                    disabled={!canOperate || disclosureBusy}
                  />
                  <Textarea
                    placeholder={'attachments（可选，JSON）：例如 {"documentIds":["..."]}'}
                    value={disclosureAttachments}
                    onChange={(e) => setDisclosureAttachments(e.target.value)}
                    rows={3}
                    disabled={!canOperate || disclosureBusy}
                  />
                  <div className="flex items-center gap-2">
                    <Button onClick={() => void handleSubmitDisclosure()} disabled={!canOperate || disclosureBusy}>
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      提交披露
                    </Button>
                    {!canOperate ? (
                      <span className="text-xs text-muted-foreground">请切换到仲裁员/调解员视角后操作</span>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-700" />
                  响应邀请
                </CardTitle>
                <CardDescription>接受/拒绝/申请延期（接受前系统会校验披露是否已提交）</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">理由（可选）</div>
                    <Input value={responseReason} onChange={(e) => setResponseReason(e.target.value)} disabled={!canOperate || respondBusy} />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">延期截止（仅延期时需要）</div>
                    <Input
                      type="datetime-local"
                      value={extendExpiresAtLocal}
                      onChange={(e) => setExtendExpiresAtLocal(e.target.value)}
                      disabled={!canOperate || respondBusy}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => void handleRespond('ACCEPT')}
                    disabled={!canOperate || respondBusy}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    接受
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => void handleRespond('REJECT')}
                    disabled={!canOperate || respondBusy}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    拒绝
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void handleRespond('REQUEST_MORE_TIME')}
                    disabled={!canOperate || respondBusy}
                  >
                    <Clock className="w-4 h-4 mr-1" />
                    申请延期
                  </Button>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="text-sm font-medium">历史响应</div>
                  {detail.responses.length === 0 ? (
                    <div className="text-sm text-muted-foreground">暂无</div>
                  ) : (
                    <div className="space-y-2">
                      {detail.responses.map((r) => (
                        <div key={r.id} className="p-3 border rounded-lg text-sm">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{r.action}</div>
                            <div className="text-xs text-muted-foreground">{formatIso(r.respondedAt)}</div>
                          </div>
                          {r.reason ? <div className="text-muted-foreground whitespace-pre-wrap mt-1">{r.reason}</div> : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="card">
              <CardHeader>
                <CardTitle>邀请概览</CardTitle>
                <CardDescription>邀请人与被邀请人信息</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">邀请状态</span>
                  {statusBadge(detail.invitation.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">发出时间</span>
                  <span>{formatIso(detail.invitation.sentAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">响应时间</span>
                  <span>{formatIso(detail.invitation.respondedAt)}</span>
                </div>
                <Separator />
                <div>
                  <div className="text-muted-foreground">被邀请人</div>
                  <div className="font-medium">{detail.invitation.invitedUser.displayName}</div>
                  <div className="text-xs text-muted-foreground">{detail.invitation.invitedUser.email}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">邀请人</div>
                  <div className="font-medium">{detail.invitation.invitedByUser.displayName}</div>
                  <div className="text-xs text-muted-foreground">{detail.invitation.invitedByUser.email}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="card">
              <CardHeader>
                <CardTitle>当事方合意</CardTitle>
                <CardDescription>双方合意满足后，管理员可使任命生效</CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                {detail.consent ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">状态</span>
                      <Badge variant="secondary">{detail.consent.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">申请人</span>
                      <span>{detail.consent.applicantDecision}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">被申请人</span>
                      <span>{detail.consent.respondentDecision}</span>
                    </div>
                    <Separator />
                    <div className="text-xs text-muted-foreground">
                      提示：当事方合意提交接口为 <code>/api/cases/&lt;caseId&gt;/neutrals/&lt;userId&gt;/consents</code>；
                      管理员生效接口为 <code>/api/cases/&lt;caseId&gt;/neutrals/&lt;userId&gt;/appoint</code>。
                    </div>
                  </>
                ) : (
                  <div className="text-muted-foreground">
                    尚未创建合意记录（通常在被邀请人“接受邀请”后生成）。
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
