// src/app/(private)/arbitrator/dashboard/page.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Gavel,
  AlertTriangle,
  FileText,
  Users,
  Calendar,
  BarChart3,
  Eye,
  TrendingUp,
  Activity
} from 'lucide-react';
import Link from 'next/link';

const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z
    .object({
      message: z.string(),
    })
    .optional(),
});

const invitationsResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    invitations: z.array(
      z.object({
        id: z.string(),
        caseId: z.string(),
        caseNumber: z.string(),
        caseType: z.string(),
        disputeAmount: z.string().nullable(),
        applicantName: z.string(),
        respondentName: z.string().nullable(),
        neutralType: z.string(),
        status: z.string(),
        sentAt: z.string().nullable(),
        expiresAt: z.string().nullable(),
        hasDisclosure: z.boolean(),
      })
    ),
  }),
  message: z.string().optional(),
});

type ApiInvitation = z.infer<typeof invitationsResponseSchema>['data']['invitations'][number];

function formatDateShort(iso: string | null): string {
  if (!iso) return '-';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString();
}

function formatCurrency(amount: string | null): string {
  if (!amount) return '-';
  const value = Number(amount);
  if (!Number.isFinite(value)) return amount;
  return `¥${value.toLocaleString()}`;
}

// 模拟在办案件数据
const mockActiveCases = [
  {
    id: 'case-001',
    caseNumber: 'ARB-2024-010',
    caseType: '劳动争议',
    currentStage: '庭审进行',
    nextAction: '制作庭审笔录',
    hasNewMaterials: true,
    deadline: '2024-02-18',
    applicant: '张某',
    respondent: '某公司'
  },
  {
    id: 'case-002',
    caseNumber: 'ARB-2024-008',
    caseType: '知识产权',
    currentStage: '证据审查',
    nextAction: '安排庭前会议',
    hasNewMaterials: false,
    deadline: '2024-02-22',
    applicant: '某设计公司',
    respondent: '某制造商'
  },
  {
    id: 'case-003',
    caseNumber: 'ARB-2024-005',
    caseType: '合同纠纷',
    currentStage: '裁决书制作',
    nextAction: '完成裁决书草稿',
    hasNewMaterials: false,
    deadline: '2024-02-25',
    applicant: '某贸易公司',
    respondent: '某供应商'
  }
];

// 模拟庭审安排数据
const mockUpcomingHearings = [
  {
    id: 'hearing-001',
    caseNumber: 'ARB-2024-010',
    date: '2024-02-16',
    time: '09:00',
    type: '正式庭审',
    participants: ['张某', '某公司', '代理律师']
  },
  {
    id: 'hearing-002',
    caseNumber: 'ARB-2024-008',
    date: '2024-02-17',
    time: '14:00',
    type: '庭前会议',
    participants: ['某设计公司', '某制造商']
  }
];

export default function ArbitratorDashboard() {
  const [invitations, setInvitations] = useState<ApiInvitation[]>([]);
  const [invitationLoading, setInvitationLoading] = useState(true);
  const [invitationError, setInvitationError] = useState<string | null>(null);

  const fetchInvitations = useCallback(async (): Promise<void> => {
    setInvitationLoading(true);
    setInvitationError(null);
    try {
      const res = await fetch('/api/neutrals/invitations?status=SENT', { credentials: 'include' });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const parsedError = errorResponseSchema.safeParse(json);
        setInvitations([]);
        setInvitationError(parsedError.success ? parsedError.data.error?.message ?? '获取失败' : '获取失败');
        return;
      }

      const parsed = invitationsResponseSchema.safeParse(json);
      if (!parsed.success) {
        setInvitations([]);
        setInvitationError('邀请数据格式不正确');
        return;
      }

      setInvitations(parsed.data.data.invitations);
    } catch (e) {
      setInvitations([]);
      setInvitationError(e instanceof Error ? e.message : '获取失败');
    } finally {
      setInvitationLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchInvitations();
  }, [fetchInvitations]);

  const pendingInvitations = useMemo(() => invitations, [invitations]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const computePriority = (expiresAt: string | null): 'high' | 'medium' | 'low' => {
    if (!expiresAt) return 'medium';
    const dt = new Date(expiresAt);
    if (Number.isNaN(dt.getTime())) return 'medium';
    const diffMs = dt.getTime() - Date.now();
    if (diffMs <= 0) return 'high';
    const diffDays = diffMs / (24 * 3600 * 1000);
    if (diffDays <= 1) return 'high';
    if (diffDays <= 3) return 'medium';
    return 'low';
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case '庭审进行': return 'bg-blue-100 text-blue-800';
      case '证据审查': return 'bg-orange-100 text-orange-800';
      case '裁决书制作': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-8 space-y-8 animate-fade-in">
      {/* 页面头部 */}
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">仲裁员工作台</h1>
          <p className="text-lg text-gray-600">专业的案件管理驾驶舱</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2">
            <Gavel className="w-4 h-4 mr-2" />
            仲裁员
          </Badge>
        </div>
      </div>

      {/* 关键指标 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-slide-up" style={{animationDelay: '0.2s'}}>
        <Card className="card hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">案件邀请</CardTitle>
            <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{pendingInvitations.length}</div>
            <p className="text-sm text-gray-600 mt-1">待决策邀请</p>
          </CardContent>
        </Card>

        <Card className="card hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">在办案件</CardTitle>
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Activity className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{mockActiveCases.length}</div>
            <p className="text-sm text-gray-600 mt-1">进行中案件</p>
          </CardContent>
        </Card>

        <Card className="card hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">近期庭审</CardTitle>
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <Calendar className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{mockUpcomingHearings.length}</div>
            <p className="text-sm text-gray-600 mt-1">本周安排</p>
          </CardContent>
        </Card>

        <Card className="card hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">效率评分</CardTitle>
            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">9.2</div>
            <p className="text-sm text-gray-600 mt-1">本月评分</p>
          </CardContent>
        </Card>
      </div>

      {/* 主要内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左侧：案件邀请 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 案件邀请卡片 */}
          <Card className="card animate-slide-up" style={{animationDelay: '0.3s'}}>
            <CardHeader>
              <CardTitle className="text-xl text-gray-900 flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span>案件邀请</span>
                <Badge className="bg-red-500 text-white">{pendingInvitations.length}</Badge>
              </CardTitle>
              <CardDescription>
                新的案件邀请需要您的决策
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {invitationLoading ? (
                <div className="text-sm text-muted-foreground">加载邀请中…</div>
              ) : invitationError ? (
                <div className="p-4 border border-red-200 rounded-lg bg-red-50 text-sm text-red-700 flex items-center justify-between">
                  <span>{invitationError}</span>
                  <Button variant="outline" size="sm" onClick={() => void fetchInvitations()}>
                    重试
                  </Button>
                </div>
              ) : pendingInvitations.length === 0 ? (
                <div className="text-sm text-muted-foreground">暂无待处理邀请</div>
              ) : (
                pendingInvitations.map((invitation, index) => {
                  const priority = computePriority(invitation.expiresAt);

                  return (
                    <div
                      key={invitation.id}
                      className="p-4 border border-gray-200 rounded-lg hover:border-orange-200 hover:bg-orange-50 transition-all duration-200 cursor-pointer animate-fade-in"
                      style={{animationDelay: `${0.4 + index * 0.1}s`}}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{invitation.caseNumber}</h4>
                          <p className="text-sm text-gray-600">{invitation.caseType}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getPriorityColor(priority)}>
                            {priority === 'high' ? '高优先级' : priority === 'medium' ? '中优先级' : '低优先级'}
                          </Badge>
                          <Badge className={invitation.hasDisclosure ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {invitation.hasDisclosure ? '已披露' : '未披露'}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-gray-500">申请人：</span>
                          <span className="text-gray-900">{invitation.applicantName}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">被申请人：</span>
                          <span className="text-gray-900">{invitation.respondentName ?? '-'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">争议金额：</span>
                          <span className="text-gray-900 font-medium">{formatCurrency(invitation.disputeAmount)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">决策截止：</span>
                          <span className="text-red-600 font-medium">{formatDateShort(invitation.expiresAt)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <Link href={`/arbitrator/invitations/${invitation.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            查看详情并决策
                          </Button>
                        </Link>
                        <Badge variant="secondary">{invitation.neutralType}</Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* 在办案件面板 */}
          <Card className="card animate-slide-up" style={{animationDelay: '0.5s'}}>
            <CardHeader>
              <CardTitle className="text-xl text-gray-900">我的在办案件</CardTitle>
              <CardDescription>
                当前正在审理的案件列表
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockActiveCases.map((caseItem, index) => (
                  <div
                    key={caseItem.id}
                    className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 cursor-pointer animate-fade-in"
                    style={{animationDelay: `${0.6 + index * 0.1}s`}}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-semibold text-gray-900">{caseItem.caseNumber}</h4>
                        <Badge className={getStageColor(caseItem.currentStage)}>
                          {caseItem.currentStage}
                        </Badge>
                        {caseItem.hasNewMaterials && (
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">{caseItem.deadline}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{caseItem.caseType}</p>
                    <p className="text-sm font-medium text-orange-600">下一步：{caseItem.nextAction}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：庭审安排和快捷操作 */}
        <div className="space-y-6">
          {/* 近期庭审安排 */}
          <Card className="card animate-slide-up" style={{animationDelay: '0.4s'}}>
            <CardHeader>
              <CardTitle className="text-lg text-gray-900 flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-green-500" />
                <span>近期庭审</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockUpcomingHearings.map((hearing, index) => (
                <div
                  key={hearing.id}
                  className="p-3 bg-green-50 border border-green-200 rounded-lg animate-fade-in"
                  style={{animationDelay: `${0.5 + index * 0.1}s`}}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{hearing.caseNumber}</span>
                    <Badge variant="outline">{hearing.type}</Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>{hearing.date} {hearing.time}</p>
                    <p className="mt-1">参与方：{hearing.participants.join(', ')}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 快捷操作 */}
          <Card className="card animate-slide-up" style={{animationDelay: '0.6s'}}>
            <CardHeader>
              <CardTitle className="text-lg text-gray-900">快捷操作</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <FileText className="h-4 w-4 mr-3" />
                制作裁决书
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Calendar className="h-4 w-4 mr-3" />
                安排庭审
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <BarChart3 className="h-4 w-4 mr-3" />
                查看统计
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Users className="h-4 w-4 mr-3" />
                仲裁庭管理
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
