// dev/src/app/(private)/cases/[id]/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CaseProgress } from '@/components/ui/progress-stepper';
import { CaseDetailSidebar } from '@/components/cases/case-detail-sidebar';
import { TribunalSection } from '@/components/cases/tribunal-section';
import { CaseRelations } from '@/components/cases/case-relations';
import { useRole } from '@/components/layout/role-switcher';
import { DocumentViewer } from '@/components/document/document-viewer';
import { DocumentEditor } from '@/components/document/document-editor';
import { DocumentTagManager } from '@/components/document/document-tag-manager';
import { ArbitratorSelectionModal } from '@/components/modals/arbitrator-selection-modal';
import { CaseEditModal } from '@/components/modals/case-edit-modal';
import { Separator } from '@/components/ui/separator';
import { useSyncedTab } from '@/lib/hooks/use-synced-tab';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { useHearingStore } from '@/store/hearing';
import { useCaseProgressAutomation } from '@/lib/hooks/use-case-progress-automation';
import { useConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useNotificationHelpers } from '@/components/ui/notification';
import { useInputDialog } from '@/components/ui/input-dialog';
import {
  Calendar,
  Clock,
  FileText,
  Users,
  AlertCircle,
  MessageSquare,
  Download,
  Upload,
  Edit,
  Play,
  MoreHorizontal,
  Plus,
  User,
  Trash2,
  Eye,
  Tag
} from 'lucide-react';
import { mockCases } from '@/lib/mock-data';
import { formatDate } from '@/lib/utils';

// 用于生成唯一ID的计数器，避免hydration mismatch
let documentIdCounter = 0;
let timelineEventIdCounter = 0;
const generateDocumentId = () => `doc-${++documentIdCounter}`;
const generateTimelineEventId = () => `event-${++timelineEventIdCounter}`;

export default function CaseDetailPage() {
  const params = useParams();
  const caseId = params.id as string;

  // 在实际应用中，这里会从API获取案件详情
  const hearingId = `hearing-${caseId}`;

  const caseData = mockCases.find(c => c.id === caseId) || mockCases[0];

  const { activeTab, setActiveTab } = useSyncedTab(['overview','parties','tribunal','documents','timeline','notes'], 'overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentRole } = useRole();
  const sidebarRole: 'applicant' | 'respondent' | 'arbitrator' =
    currentRole === 'respondent' || currentRole === 'arbitrator' ? currentRole : 'applicant';

  // 案件进展自动化管理
  const { progress, completeTask, addCustomMilestone } = useCaseProgressAutomation(caseId);
  const { showConfirmation, ConfirmationDialog } = useConfirmationDialog();
  const notify = useNotificationHelpers();
  const { showInputDialog, InputDialog } = useInputDialog();

  type CaseDocument = {
    id: string;
    name: string;
    type: string;
    size: string;
    tags: string[];
    notes: string[];
    uploadedAt: string;
    url?: string;
    content?: string;
  };

  // 文档管理状态
  const [documents, setDocuments] = useState<CaseDocument[]>([
    { id: 'doc-1', name: '仲裁申请书.pdf', size: '2.3 MB', uploadedAt: '2024-01-15', type: 'application', tags: ['申请书', '主要文件'], notes: [] },
    { id: 'doc-2', name: '证据材料.pdf', size: '5.1 MB', uploadedAt: '2024-01-16', type: 'evidence', tags: ['证据', '合同'], notes: [] },
    { id: 'doc-3', name: '答辩书.pdf', size: '1.8 MB', uploadedAt: '2024-01-18', type: 'response', tags: ['答辩书'], notes: [] },
      { id: 'doc-4', name: '补充证据.pdf', size: '3.2 MB', uploadedAt: '2024-01-20', type: 'evidence', tags: ['补充证据'], notes: [] }
    ]);

  // 文档管理UI状态
  const [selectedDocument, setSelectedDocument] = useState<CaseDocument | null>(null);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);  
  const [showDocumentEditor, setShowDocumentEditor] = useState(false);  
  const [showTagManager, setShowTagManager] = useState(false);
  const [showArbitratorSelection, setShowArbitratorSelection] = useState(false);
  const [showCaseEditModal, setShowCaseEditModal] = useState(false);    

  // 文档操作处理函数
  const handleUploadDocument = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.doc,.docx,.jpg,.png';
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        Array.from(files).forEach(file => {
          const newDoc: CaseDocument = {
            id: generateDocumentId(),
            name: file.name,
            size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
            uploadedAt: new Date().toISOString().split('T')[0],
            type: 'other',
            tags: ['新上传'],
            notes: []
          };
          setDocuments(prev => [...prev, newDoc]);
        });
        notify.success(`成功上传 ${files.length} 个文件`);
      }
    };
    input.click();
  };

  const handleDownloadDocument = (doc: CaseDocument) => {
    // 模拟下载
    notify.info(`正在下载：${doc.name}`);
  };

  const handleDeleteDocument = (docId: string) => {
    if (confirm('确定要删除这个文档吗？')) {
      setDocuments(prev => prev.filter(doc => doc.id !== docId));
      alert('文档已删除');
    }
  };

  // 查看文档
  const handleViewDocument = (document: CaseDocument) => {
    setSelectedDocument(document);
    setShowDocumentViewer(true);
  };

  // 编辑文档
  const handleEditDocument = (document: CaseDocument) => {
    setSelectedDocument(document);
    setShowDocumentEditor(true);
  };

  // 创建新文档
  const handleCreateDocument = () => {
    setSelectedDocument(null);
    setShowDocumentEditor(true);
  };

  const handleAddToEvidence = (doc: CaseDocument) => {
    useHearingStore.getState().addEvidence(caseId, doc.name, `来自案件文档：${doc.name}`);
    notify.success('已加入庭审展示队列');
  };

  // 案件进展跟踪状态
  const [timeline, setTimeline] = useState([
    {
      id: 'event-1',
      date: '2024-01-15',
      time: '09:00',
      title: '案件提交',
      description: '申请人提交仲裁申请书及相关材料',
      type: 'submit',
      status: 'completed',
      actor: '申请人'
    },
    {
      id: 'event-2',
      date: '2024-01-16',
      time: '14:30',
      title: '材料审核',
      description: '仲裁机构审核申请材料，确认受理',
      type: 'review',
      status: 'completed',
      actor: '仲裁机构'
    },
    {
      id: 'event-3',
      date: '2024-01-20',
      time: '10:00',
      title: '仲裁庭组成',
      description: '确定仲裁员，组成仲裁庭',
      type: 'tribunal',
      status: 'completed',
      actor: '仲裁机构'
    },
    {
      id: 'event-4',
      date: '2024-01-25',
      time: '09:30',
      title: '答辩期限',
      description: '被申请人提交答辩书',
      type: 'defense',
      status: 'completed',
      actor: '被申请人'
    },
    {
      id: 'event-5',
      date: '2024-02-01',
      time: '14:00',
      title: '庭审安排',
      description: '安排庭审时间，通知各方当事人',
      type: 'hearing',
      status: 'in_progress',
      actor: '仲裁庭'
    },
    {
      id: 'event-6',
      date: '2024-02-05',
      time: '10:00',
      title: '庭审举行',
      description: '正式庭审，听取各方陈述和质证',
      type: 'hearing',
      status: 'pending',
      actor: '仲裁庭'
    }
  ]);

  // 添加新的进展事件
  const handleAddTimelineEvent = () => {
    showInputDialog({
      title: '添加进展事件',
      description: '请填写事件的详细信息',
      fields: [
        {
          name: 'title',
          label: '事件标题',
          type: 'text',
          placeholder: '请输入事件标题',
          required: true
        },
        {
          name: 'description',
          label: '事件描述',
          type: 'textarea',
          placeholder: '请输入事件描述',
          required: true
        }
      ],
      onSubmit: (values) => {
        const newEvent = {
          id: generateTimelineEventId(),
          date: new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().slice(0, 5),
          title: values.title,
          description: values.description,
          type: 'custom',
          status: 'completed',
          actor: currentRole === 'arbitrator' ? '仲裁庭' : '当事人'
        };

        setTimeline(prev => [...prev, newEvent]);
        notify.success('进展事件已添加');
      }
    });
  };

  // 完成任务处理函数
  const handleCompleteTask = (taskTitle: string) => {
    completeTask(taskTitle, `用户手动完成任务：${taskTitle}`);
  };

  // 添加自定义里程碑
  const handleAddMilestone = (title: string, description: string, dueDate: string) => {
    addCustomMilestone(title, description, dueDate, 'medium');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'hearing_in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'submitted': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'hearing_scheduled': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'hearing_in_progress': return '庭审中';
      case 'completed': return '已完成';
      case 'submitted': return '已提交';
      case 'draft': return '草稿';
      case 'hearing_scheduled': return '庭审安排';
      case 'tribunal_formation': return '仲裁庭组成';
      case 'award_issued': return '裁决书已出';
      default: return '未知状态';
    }
  };

  const getCurrentStage = (status: string) => {
    switch (status) {
      case 'submitted': return '材料审核';
      case 'accepted': return '仲裁庭组成';
      case 'tribunal_formation': return '仲裁庭组成';
      case 'hearing_scheduled': return '庭审进行';
      case 'hearing_in_progress': return '庭审进行';
      case 'deliberation': return '裁决书制作';
      case 'completed': return '案件结案';
      default: return '申请提交';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 案件头部信息 */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{caseData.title}</h1>
            <Badge className={getStatusColor(caseData.status)}>
              {getStatusText(caseData.status)}
            </Badge>
          </div>
          <p className="text-gray-600">案件编号: {caseData.caseNumber}</p>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              创建时间: {formatDate(caseData.createdAt)}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              更新时间: {formatDate(caseData.updatedAt)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="lg"
            onClick={() => setSidebarOpen(true)}
            className="btn-primary btn-ripple hover-lift shadow-brand px-6 py-3 text-base font-semibold"
          >
            <FileText className="h-5 w-5 mr-3" />
            案件操作与文书
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="hover-lift px-6 py-3"
            onClick={() => setShowCaseEditModal(true)}
          >
            <Edit className="h-5 w-5 mr-2" />
            编辑案件
          </Button>

          {/* 庭审相关按钮 */}
          <Button asChild variant="outline" size="lg" className="hover-lift px-6 py-3">
            <Link href={`/hearings/${hearingId}/waiting`}>
              <Clock className="h-5 w-5 mr-2" />
              进入等候室
            </Link>
          </Button>

          <Button asChild size="lg" className="btn-primary btn-ripple hover-lift shadow-brand px-6 py-3">
            <Link href={`/hearings/${hearingId}/live`}>
              <Play className="h-5 w-5 mr-2" />
              进入庭审
            </Link>
          </Button>

          <Button variant="outline" size="lg" className="hover-lift px-6 py-3">
            <Download className="h-5 w-5 mr-2" />
            导出文档
          </Button>
        </div>
      </div>

      {/* 进度条 */}
      <Card className="card hover-lift animate-slide-up" style={{animationDelay: '0.2s'}}>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl text-gray-900 flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <Clock className="h-4 w-4 text-white" />
            </div>
            <span>案件进度跟踪</span>
          </CardTitle>
          <CardDescription className="text-base">
            实时跟踪案件审理进度，了解每个阶段的完成情况
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <CaseProgress
            currentStage={getCurrentStage(caseData.status)}
            className="w-full"
          />

          {/* 进度统计 */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">3</div>
              <div className="text-sm text-green-700">已完成阶段</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">1</div>
              <div className="text-sm text-orange-700">进行中阶段</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">2</div>
              <div className="text-sm text-gray-700">待处理阶段</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 详情标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="parties">当事人</TabsTrigger>
          <TabsTrigger value="tribunal">仲裁庭</TabsTrigger>
          <TabsTrigger value="documents">文档</TabsTrigger>
          <TabsTrigger value="relations">关联案件</TabsTrigger>
          <TabsTrigger value="timeline">时间线</TabsTrigger>
          <TabsTrigger value="notes">备注</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 基本信息 */}
            <Card>
              <CardHeader>
                <CardTitle>基本信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">案件类型</label>
                    <p className="text-sm text-gray-900">{caseData.caseType}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">争议金额</label>
                    <p className="text-sm text-gray-900">¥{caseData.disputeAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">申请人</label>
                    <p className="text-sm text-gray-900">{caseData.applicantId}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">被申请人</label>
                    <p className="text-sm text-gray-900">{caseData.respondentId}</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <label className="text-sm font-medium text-gray-500">案件描述</label>
                  <p className="text-sm text-gray-900 mt-1">{caseData.description}</p>
                </div>
              </CardContent>
            </Card>

            {/* 关键日期 */}
            <Card>
              <CardHeader>
                <CardTitle>关键日期</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">立案日期</span>
                  </div>
                  <span className="text-sm text-gray-600">{formatDate(caseData.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">下次开庭</span>
                  </div>
                  <span className="text-sm text-gray-600">2024-02-15</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    <span className="text-sm">预计结案</span>
                  </div>
                  <span className="text-sm text-gray-600">{caseData.deadline ? formatDate(caseData.deadline) : '待定'}</span>
                </div>
              </CardContent>
            </Card>
          </div>


        </TabsContent>

        {/* 仲裁庭 */}
        <TabsContent value="tribunal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>仲裁庭组成</CardTitle>
              <CardDescription>选择仲裁员、设置首席仲裁员并确认组庭</CardDescription>
            </CardHeader>
            <CardContent>
              <TribunalSection
                caseId={caseId}
                onOpenArbitratorSelection={() => setShowArbitratorSelection(true)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parties" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 申请人 */}
            <Card>
              <CardHeader>
                <CardTitle>申请人</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Avatar>
                    <AvatarFallback>申</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-medium">张三</h4>
                    <p className="text-sm text-gray-600">个人</p>
                    <p className="text-sm text-gray-500">电话: 138****1234</p>
                    <p className="text-sm text-gray-500">邮箱: zhang@example.com</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <h5 className="font-medium mb-2">代理律师</h5>
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>律</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">李律师</p>
                      <p className="text-xs text-gray-500">北京某律师事务所</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 被申请人 */}
            <Card>
              <CardHeader>
                <CardTitle>被申请人</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Avatar>
                    <AvatarFallback>被</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-medium">某某公司</h4>
                    <p className="text-sm text-gray-600">企业</p>
                    <p className="text-sm text-gray-500">电话: 010-12345678</p>
                    <p className="text-sm text-gray-500">地址: 北京市朝阳区...</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <h5 className="font-medium mb-2">代理律师</h5>
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>律</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">王律师</p>
                      <p className="text-xs text-gray-500">上海某律师事务所</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>案件文档</CardTitle>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowTagManager(true)}>
                  <Tag className="h-4 w-4 mr-2" />
                  标签管理
                </Button>
                <Button size="sm" variant="outline" onClick={handleCreateDocument}>
                  <Edit className="h-4 w-4 mr-2" />
                  新建文档
                </Button>
                <Button size="sm" onClick={handleUploadDocument}>
                  <Upload className="h-4 w-4 mr-2" />
                  上传文档
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-sm text-gray-500">{doc.size} • {doc.uploadedAt}</p>
                        <div className="flex gap-1 mt-1">
                          {doc.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleViewDocument(doc)} title="查看文档">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEditDocument(doc)} title="编辑文档">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDownloadDocument(doc)} title="下载文档">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteDocument(doc.id)} className="text-red-600 hover:text-red-700" title="删除文档">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleAddToEvidence(doc)}>
                        <Plus className="h-4 w-4 mr-1" />
                        加入展示队列
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 关联案件 */}
        <TabsContent value="relations" className="space-y-4">
          <CaseRelations
            caseId={caseId}
            caseType="arbitration"
            className="animate-fade-in"
          />
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>案件时间线</CardTitle>
                <CardDescription>
                  案件处理的完整时间记录
                </CardDescription>
              </div>
              {currentRole === 'arbitrator' && (
                <Button size="sm" onClick={handleAddTimelineEvent}>
                  <Plus className="h-4 w-4 mr-2" />
                  添加事件
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* 显示动态进展时间线 */}
                {progress?.timeline && progress.timeline.length > 0 && (
                  <>
                    <div className="text-sm font-medium text-gray-700 mb-4">系统自动记录</div>
                    {progress.timeline.map((event) => (
                      <div key={event.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${
                            event.status === 'completed' ? 'bg-green-500' :
                            event.status === 'scheduled' ? 'bg-blue-500' :
                            'bg-gray-300'
                          }`} />
                          <div className="w-px h-16 bg-gray-200 mt-2" />
                        </div>
                        <div className="flex-1 pb-8">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">{event.title}</h4>
                            <div className="flex items-center gap-2">
                              <Badge variant={
                                event.status === 'completed' ? 'default' :
                                event.status === 'scheduled' ? 'secondary' :
                                'outline'
                              }>
                                {event.status === 'completed' ? '已完成' :
                                 event.status === 'scheduled' ? '已安排' :
                                 event.status === 'cancelled' ? '已取消' : '待处理'}
                              </Badge>
                              <span className="text-sm text-gray-500">{event.participants?.[0] || '系统'}</span>
                            </div>
                          </div>
                          <p className="text-gray-600 text-sm mb-2">{event.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {event.date}
                            </span>
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {new Date().toTimeString().split(' ')[0].substring(0, 5)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="text-sm font-medium text-gray-700 mb-4 mt-8">手动记录</div>
                  </>
                )}

                {/* 显示手动添加的时间线 */}
                {timeline.map((event) => (
                  <div key={event.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${
                        event.status === 'completed' ? 'bg-green-500' :
                        event.status === 'in_progress' ? 'bg-blue-500' :
                        'bg-gray-300'
                      }`} />
                      {timeline.indexOf(event) < timeline.length - 1 && (
                        <div className="w-px h-16 bg-gray-200 mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-8">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{event.title}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            event.status === 'completed' ? 'default' :
                            event.status === 'in_progress' ? 'secondary' :
                            'outline'
                          }>
                            {event.status === 'completed' ? '已完成' :
                             event.status === 'in_progress' ? '进行中' :
                             '待处理'}
                          </Badge>
                          <span className="text-sm text-gray-500">{event.actor}</span>
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm mb-2">{event.description}</p>
                      <p className="text-xs text-gray-400">{event.date} {event.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>案件备注</CardTitle>
              <Button size="sm">
                <MessageSquare className="h-4 w-4 mr-2" />
                添加备注
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    author: '张律师',
                    date: '2024-01-25 14:30',
                    content: '今日开庭情况良好，双方当事人均到场。被申请人对争议金额提出异议，需要进一步核实相关证据。',
                    avatar: '张'
                  },
                  {
                    author: '李秘书',
                    date: '2024-01-20 09:15',
                    content: '已完成送达程序，被申请人签收仲裁通知书。代理律师联系方式已更新。',
                    avatar: '李'
                  },
                  {
                    author: '王仲裁员',
                    date: '2024-01-15 16:45',
                    content: '案件材料齐全，符合受理条件。建议优先安排调解程序。',
                    avatar: '王'
                  },
                ].map((note, index) => (
                  <div key={index} className="flex gap-3 p-4 border rounded-lg">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{note.avatar}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{note.author}</span>
                        <span className="text-xs text-gray-500">{note.date}</span>
                      </div>
                      <p className="text-sm text-gray-700">{note.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>案件备注</CardTitle>
              <CardDescription>
                记录案件处理过程中的重要信息和备注
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 添加新备注 */}
              <div className="border border-dashed border-gray-300 rounded-lg p-4">
                <div className="space-y-3">
                  <Textarea
                    placeholder="添加新的备注信息..."
                    className="min-h-20"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Users className="h-4 w-4" />
                      <span>仅{currentRole === 'arbitrator' ? '仲裁庭' : '己方'}可见</span>
                    </div>
                    <Button size="sm" className="btn-primary">
                      <Plus className="h-4 w-4 mr-2" />
                      添加备注
                    </Button>
                  </div>
                </div>
              </div>

              {/* 现有备注列表 */}
              <div className="space-y-4">
                {[
                  {
                    id: 'note-1',
                    content: '申请人提供的证据材料需要进一步核实，特别是合同签署时间的真实性。',
                    author: '仲裁员张某',
                    date: '2024-01-25',
                    time: '14:30',
                    type: 'important',
                    visibility: 'tribunal'
                  },
                  {
                    id: 'note-2',
                    content: '被申请人的答辩理由较为充分，建议在庭审中重点关注履行期限的约定。',
                    author: '代理律师李某',
                    date: '2024-01-22',
                    time: '16:45',
                    type: 'normal',
                    visibility: 'party'
                  },
                  {
                    id: 'note-3',
                    content: '双方当事人均同意尝试调解程序，可考虑在正式庭审前安排调解。',
                    author: '仲裁秘书',
                    date: '2024-01-20',
                    time: '11:20',
                    type: 'suggestion',
                    visibility: 'all'
                  }
                ].map((note) => (
                  <div key={note.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Badge className={
                          note.type === 'important' ? 'bg-red-100 text-red-800' :
                          note.type === 'suggestion' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {note.type === 'important' ? '重要' :
                           note.type === 'suggestion' ? '建议' : '普通'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {note.visibility === 'tribunal' ? '仲裁庭可见' :
                           note.visibility === 'party' ? '当事人可见' : '全部可见'}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-gray-700 mb-3">{note.content}</p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          {note.author}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {note.date}
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {note.time}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 案件操作侧边栏 */}
      <CaseDetailSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole={sidebarRole}
        caseId={params.id as string}
      />

      {/* 文档查看器 */}
      {selectedDocument && (
        <DocumentViewer
          document={selectedDocument}
          isOpen={showDocumentViewer}
          onClose={() => {
            setShowDocumentViewer(false);
            setSelectedDocument(null);
          }}
          onUpdate={(updatedDoc) => {
            setDocuments(prev => prev.map(doc =>
              doc.id === updatedDoc.id ? updatedDoc : doc
            ));
          }}
        />
      )}

      {/* 文档编辑器 */}
      <DocumentEditor
        initialDocument={
          selectedDocument
            ? {
                id: selectedDocument.id,
                name: selectedDocument.name,
                content: selectedDocument.content ?? '',
                type: selectedDocument.type,
              }
            : undefined
        }
        isOpen={showDocumentEditor}
        onClose={() => {
          setShowDocumentEditor(false);
          setSelectedDocument(null);
        }}
        onSave={(savedDoc) => {
          const normalized: CaseDocument = selectedDocument
            ? {
                ...selectedDocument,
                name: savedDoc.name,
                type: savedDoc.type,
                content: savedDoc.content,
              }
            : {
                id: savedDoc.id ?? generateDocumentId(),
                name: savedDoc.name,
                type: savedDoc.type,
                size: '—',
                uploadedAt: new Date().toISOString().split('T')[0],
                tags: [],
                notes: [],
                content: savedDoc.content,
              };

          setDocuments((prev) =>
            selectedDocument
              ? prev.map((doc) => (doc.id === selectedDocument.id ? normalized : doc))
              : [...prev, normalized]
          );
        }}
      />

      {/* 标签管理器 */}
      <DocumentTagManager
        tags={[
          { id: 'tag1', name: '合同', color: 'bg-blue-100 text-blue-800', count: 3, createdAt: '2024-01-15' },
          { id: 'tag2', name: '证据', color: 'bg-green-100 text-green-800', count: 5, createdAt: '2024-01-16' },
          { id: 'tag3', name: '重要', color: 'bg-red-100 text-red-800', count: 2, createdAt: '2024-01-17' }
        ]}
        onTagCreate={(tag) => console.log('创建标签:', tag)}
        onTagUpdate={(tagId, updates) => console.log('更新标签:', tagId, updates)}
        onTagDelete={(tagId) => console.log('删除标签:', tagId)}
        onTagFilter={(tagIds) => console.log('筛选标签:', tagIds)}
      />

      {/* 仲裁员选择模态框 */}
      <ArbitratorSelectionModal
        isOpen={showArbitratorSelection}
        onClose={() => setShowArbitratorSelection(false)}
        caseId={caseId}
      />

      {/* 案件编辑模态框 */}
      <CaseEditModal
        isOpen={showCaseEditModal}
        onClose={() => setShowCaseEditModal(false)}
        caseData={caseData}
      />

      {/* 对话框组件 */}
      <ConfirmationDialog />
      <InputDialog />
    </div>
  );
}
