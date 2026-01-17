// src/app/(private)/mediation/[id]/page.tsx
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { MediationFlowManager } from '@/components/mediation/mediation-flow-manager';
import { MediationProcess } from '@/components/mediation/mediation-process';
import { MediationAgreement } from '@/components/mediation/mediation-agreement';
import { JudicialConfirmation } from '@/components/mediation/judicial-confirmation';
import { EnforcementApplication } from '@/components/mediation/enforcement-application';
import { CaseRelations } from '@/components/cases/case-relations';
import { useRole } from '@/components/layout/role-switcher';
import {
  ArrowLeft,
  MessageSquare,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  Play,
  Pause,
  FileText,
  Download,
  Share2,
  Settings,
  Handshake,
  AlertTriangle,
  TrendingUp,
  Target,
  User,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import Link from 'next/link';

// 模拟调解详细数据
const mockMediationDetail = {
  id: 'med-001',
  caseNumber: 'ARB-2024-001',
  title: '软件开发合同争议调解',
  status: 'in-progress',
  currentStage: 'negotiation',
  mediator: {
    name: '调解员张某',
    title: '资深调解员',
    experience: '10年',
    successRate: 85
  },
  parties: [
    {
      id: 'party1',
      name: '某科技公司',
      role: '申请人',
      representative: '张总',
      lawyer: '李律师',
      status: 'active'
    },
    {
      id: 'party2',
      name: '某制造企业',
      role: '被申请人',
      representative: '王总',
      lawyer: '赵律师',
      status: 'active'
    }
  ],
  
  // 调解进度
  progress: {
    currentPhase: '协商阶段',
    completedPhases: ['准备阶段', '开场阶段'],
    totalPhases: ['准备阶段', '开场阶段', '协商阶段', '达成协议', '签署协议'],
    percentage: 60
  },
  
  // 时间安排
  schedule: {
    startDate: '2024-02-15',
    nextSession: '2024-02-20 14:00',
    estimatedCompletion: '2024-02-25',
    totalSessions: 3,
    completedSessions: 2
  },
  
  // 争议焦点
  disputePoints: [
    {
      id: 'point1',
      title: '软件交付时间',
      description: '双方对软件交付时间存在分歧',
      status: 'resolved',
      resolution: '同意延期至2024年3月底'
    },
    {
      id: 'point2',
      title: '质量标准',
      description: '软件质量验收标准不明确',
      status: 'discussing',
      resolution: null
    },
    {
      id: 'point3',
      title: '违约责任',
      description: '违约责任承担方式争议',
      status: 'pending',
      resolution: null
    }
  ],
  
  // 调解记录
  sessions: [
    {
      id: 'session1',
      date: '2024-02-15',
      duration: '2小时',
      status: 'completed',
      summary: '双方初步交换意见，确定争议焦点',
      agreements: ['确定调解程序', '交换基本立场']
    },
    {
      id: 'session2',
      date: '2024-02-18',
      duration: '1.5小时',
      status: 'completed',
      summary: '就软件交付时间达成一致',
      agreements: ['延期交付至3月底', '调整付款计划']
    },
    {
      id: 'session3',
      date: '2024-02-20',
      duration: '2小时',
      status: 'scheduled',
      summary: '计划讨论质量标准和违约责任',
      agreements: []
    }
  ],
  
  // 文档材料
  documents: [
    {
      id: 'doc1',
      name: '调解申请书',
      type: 'application',
      uploadDate: '2024-02-14',
      status: 'approved'
    },
    {
      id: 'doc2',
      name: '调解协议草案',
      type: 'agreement',
      uploadDate: '2024-02-18',
      status: 'draft'
    },
    {
      id: 'doc3',
      name: '会议纪要',
      type: 'minutes',
      uploadDate: '2024-02-18',
      status: 'final'
    }
  ]
};

export default function MediationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { currentRole } = useRole();
  const mediationId = params?.id ?? mockMediationDetail.id;
  const [activeTab, setActiveTab] = useState('overview');
  const [mediationCase, setMediationCase] = useState(mockMediationDetail);
  const mediation = mockMediationDetail;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'successful': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'in-progress': return '进行中';
      case 'successful': return '调解成功';
      case 'failed': return '调解失败';
      case 'scheduled': return '已安排';
      default: return '未知';
    }
  };

  const getDisputeStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'discussing': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDisputeStatusText = (status: string) => {
    switch (status) {
      case 'resolved': return '已解决';
      case 'discussing': return '协商中';
      case 'pending': return '待处理';
      default: return '未知';
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-6xl animate-fade-in">
      {/* 页面头部 */}
      <div className="flex items-center justify-between mb-8 animate-slide-up">
        <div className="flex items-center space-x-4">
          <Link href="/mediation">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回调解管理
            </Button>
          </Link>
        </div>
      </div>

      {/* 调解基本信息卡片 */}
      <Card className="mb-8 animate-slide-up" style={{animationDelay: '0.1s'}}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Handshake className="h-8 w-8 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">{mediation.title}</h1>
                  <Badge className={getStatusColor(mediation.status)}>
                    {getStatusText(mediation.status)}
                  </Badge>
                </div>
                <p className="text-gray-600 mb-4">{mediation.caseNumber}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">调解员：</span>
                    <span className="font-medium">{mediation.mediator.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">开始时间：</span>
                    <span className="font-medium">{mediation.schedule.startDate}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">下次会议：</span>
                    <span className="font-medium">{mediation.schedule.nextSession}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">进度：</span>
                    <span className="font-medium">{mediation.progress.percentage}%</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="lg" className="hover-lift">
                <Settings className="h-5 w-5 mr-2" />
                设置
              </Button>
              <Button size="lg" className="btn-primary btn-ripple hover-lift shadow-brand">
                <MessageSquare className="h-5 w-5 mr-2" />
                进入调解
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 进度指示器 */}
      <Card className="mb-8 animate-slide-up" style={{animationDelay: '0.2s'}}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            <span>调解进度</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">当前阶段：{mediation.progress.currentPhase}</span>
              <span className="font-semibold text-orange-600">{mediation.progress.percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${mediation.progress.percentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm">
              {mediation.progress.totalPhases.map((phase, index) => (
                <div key={index} className="text-center">
                  <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${
                    mediation.progress.completedPhases.includes(phase) ? 'bg-green-500' :
                    phase === mediation.progress.currentPhase ? 'bg-orange-500' : 'bg-gray-300'
                  }`}></div>
                  <span className="text-xs text-gray-600">{phase}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 详细信息标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-slide-up" style={{animationDelay: '0.3s'}}>
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="process">流程管理</TabsTrigger>
          <TabsTrigger value="parties">参与方</TabsTrigger>
          <TabsTrigger value="disputes">争议焦点</TabsTrigger>
          <TabsTrigger value="agreement">调解协议</TabsTrigger>
          <TabsTrigger value="relations">关联案件</TabsTrigger>
          <TabsTrigger value="sessions">调解记录</TabsTrigger>
          <TabsTrigger value="documents">相关文档</TabsTrigger>
        </TabsList>

        {/* 概览标签页 */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <span>调解员信息</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">张</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{mediation.mediator.name}</h4>
                    <p className="text-sm text-gray-600">{mediation.mediator.title}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">从业经验：</span>
                    <span className="font-medium">{mediation.mediator.experience}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">成功率：</span>
                    <span className="font-medium text-green-600">{mediation.mediator.successRate}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-green-500" />
                  <span>时间安排</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">开始时间：</span>
                    <span className="font-medium">{mediation.schedule.startDate}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">预计完成：</span>
                    <span className="font-medium">{mediation.schedule.estimatedCompletion}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">已完成会议：</span>
                    <span className="font-medium">{mediation.schedule.completedSessions}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">总计会议：</span>
                    <span className="font-medium">{mediation.schedule.totalSessions}</span>
                  </div>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-1">下次会议</h4>
                  <p className="text-sm text-blue-700">{mediation.schedule.nextSession}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 流程管理标签页 */}
        <TabsContent value="process" className="space-y-6">
          {currentRole === 'arbitrator' ? (
            <MediationProcess
              mediationId={mediationId}
              onStepChange={(stepId) => {
                console.log('调解步骤变更:', stepId);
              }}
              onProcessComplete={() => {
                console.log('调解流程完成');
                setMediationCase(prev => ({ ...prev, status: 'completed' }));
              }}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  调解进度
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">当前状态</span>
                    <Badge variant={
                      mediationCase.status === 'in_progress' ? 'default' :
                      mediationCase.status === 'completed' ? 'default' : 'secondary'
                    }>
                      {mediationCase.status === 'in_progress' ? '调解中' :
                       mediationCase.status === 'completed' ? '已完成' :
                       mediationCase.status === 'failed' ? '调解失败' : '待开始'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">当前阶段</span>
                    <span className="text-sm font-medium">
                      {mediationCase.currentStage === 'preparation' ? '调解准备' :
                       mediationCase.currentStage === 'opening' ? '开场陈述' :
                       mediationCase.currentStage === 'discussion' ? '问题讨论' :
                       mediationCase.currentStage === 'negotiation' ? '协商谈判' :
                       mediationCase.currentStage === 'agreement' ? '达成协议' : '调解结束'}
                    </span>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">
                      调解流程由调解员控制，您可以在此查看当前进度。如有疑问，请联系调解员。
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 参与方标签页 */}
        <TabsContent value="parties" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {mediation.parties.map((party) => (
              <Card key={party.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{party.name}</span>
                    <Badge className="bg-blue-100 text-blue-800">{party.role}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">法定代表人</label>
                    <p className="text-sm text-gray-900">{party.representative}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">代理律师</label>
                    <p className="text-sm text-gray-900">{party.lawyer}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${party.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <span className="text-sm text-gray-600">
                      {party.status === 'active' ? '积极参与' : '消极参与'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 争议焦点标签页 */}
        <TabsContent value="disputes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-red-500" />
                <span>争议焦点</span>
              </CardTitle>
              <CardDescription>
                调解过程中需要解决的主要争议点
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mediation.disputePoints.map((point, index) => (
                  <div key={point.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">{point.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{point.description}</p>
                      </div>
                      <Badge className={getDisputeStatusColor(point.status)}>
                        {getDisputeStatusText(point.status)}
                      </Badge>
                    </div>
                    {point.resolution && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <h5 className="text-sm font-medium text-green-900">解决方案</h5>
                        <p className="text-sm text-green-700 mt-1">{point.resolution}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 调解协议标签页 */}
        <TabsContent value="agreement" className="space-y-6">
          <MediationAgreement
            mediationId={mediationId}
            parties={[
              {
                id: 'party-1',
                name: mediation.parties[0]?.name || '申请人',
                type: 'applicant',
                representative: mediation.parties[0]?.representative,
                signed: false
              },
              {
                id: 'party-2',
                name: mediation.parties[1]?.name || '被申请人',
                type: 'respondent',
                representative: mediation.parties[1]?.representative,
                signed: false
              }
            ]}
            onAgreementSigned={(partyId) => {
              console.log('协议签署:', partyId);
            }}
          />

          <JudicialConfirmation
            mediationId={mediationId}
            agreementId="agreement-001"
            agreementSigned={true} // 这里应该根据实际协议签署状态来设置
            onConfirmationSubmitted={(confirmationId) => {
              console.log('司法确认申请已提交:', confirmationId);
            }}
          />

          <EnforcementApplication
            mediationId={mediationId}
            confirmationId="conf-001"
            judicialConfirmed={true} // 这里应该根据实际司法确认状态来设置
            onApplicationSubmitted={(applicationId) => {
              console.log('强制执行申请已提交:', applicationId);
            }}
          />
        </TabsContent>

        {/* 关联案件标签页 */}
        <TabsContent value="relations" className="space-y-6">
          <CaseRelations
            caseId={mediationId}
            caseType="mediation"
            className="animate-fade-in"
          />
        </TabsContent>

        {/* 调解记录标签页 */}
        <TabsContent value="sessions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-purple-500" />
                <span>调解会议记录</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {mediation.sessions.map((session, index) => (
                  <div key={session.id} className="flex items-start space-x-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${
                        session.status === 'completed' ? 'bg-green-500' :
                        session.status === 'scheduled' ? 'bg-blue-500' : 'bg-gray-300'
                      }`}></div>
                      {index < mediation.sessions.length - 1 && (
                        <div className="w-px h-16 bg-gray-200 mt-2"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-6">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">第 {index + 1} 次调解会议</h4>
                        <div className="flex items-center space-x-2">
                          <Badge className={
                            session.status === 'completed' ? 'bg-green-100 text-green-800' :
                            session.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {session.status === 'completed' ? '已完成' :
                             session.status === 'scheduled' ? '已安排' : '待安排'}
                          </Badge>
                          <span className="text-sm text-gray-500">{session.duration}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {session.date}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-3">{session.summary}</p>
                      {session.agreements.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-900 mb-2">达成共识</h5>
                          <ul className="space-y-1">
                            {session.agreements.map((agreement, idx) => (
                              <li key={idx} className="flex items-center text-sm text-gray-600">
                                <CheckCircle className="h-3 w-3 text-green-500 mr-2" />
                                {agreement}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 相关文档标签页 */}
        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-orange-500" />
                <span>相关文档</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mediation.documents.map((document) => (
                  <div key={document.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-8 w-8 text-blue-500" />
                      <div>
                        <h4 className="font-medium text-gray-900">{document.name}</h4>
                        <p className="text-sm text-gray-600">上传时间：{document.uploadDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={
                        document.status === 'approved' ? 'bg-green-100 text-green-800' :
                        document.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }>
                        {document.status === 'approved' ? '已批准' :
                         document.status === 'draft' ? '草稿' : '最终版'}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        下载
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
