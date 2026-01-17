// src/app/(private)/mediation/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  MessageSquare,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  Plus,
  Eye,
  Settings,
  Handshake,
  AlertTriangle,
  UserCheck,
  ChevronDown,
  Filter,
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/error-boundary';
import { useSearchParams, useRouter } from 'next/navigation';
import { DossierSystem } from '@/components/mediation/dossier-system';
import { useModuleSync, dataSyncManager } from '@/lib/data-sync';

type MediationStatus = 'in-progress' | 'scheduled' | 'successful' | 'failed' | 'completed';
type MediationType = 'voluntary' | 'court-ordered';

type MediationItem = {
  id: string;
  caseId: string;
  caseNumber: string;
  title: string;
  status: MediationStatus;
  mediator: string;
  parties: string[];
  startDate: string;
  scheduledDate: string;
  duration: string;
  type: MediationType;
  progress: number;
  sessions: number;
  totalSessions: number;
  lastActivity?: Date;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isMediationItem = (value: unknown): value is MediationItem => {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.caseId === 'string' &&
    typeof value.caseNumber === 'string' &&
    typeof value.title === 'string'
  );
};

// 模拟调解数据
const mockMediations: MediationItem[] = [
  {
    id: 'med-001',
    caseId: 'case-001',
    caseNumber: 'ARB-2024-001',
    title: '软件开发合同争议调解',
    status: 'in-progress',
    mediator: '调解员张某',
    parties: ['某科技公司', '某制造企业'],
    startDate: '2024-02-15',
    scheduledDate: '2024-02-20',
    duration: '2小时',
    type: 'voluntary',
    progress: 60,
    sessions: 2,
    totalSessions: 3
  },
  {
    id: 'med-002',
    caseId: 'case-002',
    caseNumber: 'ARB-2024-002',
    title: '投资争议调解',
    status: 'scheduled',
    mediator: '调解员李某',
    parties: ['某投资基金', '某创业公司'],
    startDate: '2024-02-18',
    scheduledDate: '2024-02-22',
    duration: '3小时',
    type: 'court-ordered',
    progress: 0,
    sessions: 0,
    totalSessions: 4
  },
  {
    id: 'med-003',
    caseId: 'case-003',
    caseNumber: 'ARB-2024-003',
    title: '劳动争议调解',
    status: 'successful',
    mediator: '调解员王某',
    parties: ['员工A', '某公司'],
    startDate: '2024-02-10',
    scheduledDate: '2024-02-14',
    duration: '1.5小时',
    type: 'voluntary',
    progress: 100,
    sessions: 2,
    totalSessions: 2
  },
  {
    id: 'med-004',
    caseId: 'case-004',
    caseNumber: 'ARB-2024-004',
    title: '合同纠纷调解',
    status: 'failed',
    mediator: '调解员赵某',
    parties: ['甲方公司', '乙方公司'],
    startDate: '2024-02-08',
    scheduledDate: '2024-02-12',
    duration: '4小时',
    type: 'voluntary',
    progress: 80,
    sessions: 3,
    totalSessions: 3
  }
];

export default function MediationPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [userRole, setUserRole] = useState<'applicant' | 'respondent' | 'mediator'>('applicant');
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mediations, setMediations] = useState([...mockMediations]);
  const moduleSync = useModuleSync('mediation-module');

  // 数据同步初始化
  useEffect(() => {
    // 注册模块
    moduleSync.register();

    // 订阅数据同步事件
    const unsubscribe = moduleSync.subscribeToEvents((event) => {
      console.log('Mediation module received sync event:', event);

        switch (event.type) {
          case 'mediation_created':
            if (event.source !== 'mediation-module' && isMediationItem(event.data)) {
              const mediation = event.data;
              setMediations((prev) => [mediation, ...prev]);
            }
            break;

          case 'mediation_updated':
            if (event.source !== 'mediation-module' && isMediationItem(event.data)) {
              const mediation = event.data;
              setMediations((prev) =>
                prev.map((m) => (m.id === mediation.id ? mediation : m))
              );
            }
            break;

        case 'case_updated':
          // 当关联案件更新时，同步更新调解信息
          if (event.caseId) {
            setMediations(prev => prev.map(m =>
              m.caseId === event.caseId
                ? { ...m, lastActivity: new Date() }
                : m
            ));
          }
          break;

        case 'document_signed':
          // 当调解协议签署时，更新调解状态
          if (
            event.mediationId &&
            isRecord(event.data) &&
            event.data.type === 'mediation_agreement'
          ) {
            const now = new Date();
            setMediations((prevMediations) => {
              const completed = prevMediations.find((m) => m.id === event.mediationId);
              if (completed) {
                dataSyncManager.publishMediationEvent(
                  'completed',
                  { ...completed, status: 'completed', lastActivity: now },
                  'mediation-module'
                );
              }

              return prevMediations.map((m) =>
                m.id === event.mediationId
                  ? { ...m, status: 'completed', lastActivity: now }
                  : m
              );
            });
          }
          break;
      }
    });

    return () => {
      unsubscribe();
      moduleSync.unregister();
    };
  }, [moduleSync, setMediations]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 5;

  useEffect(()=>{
    setQ(searchParams.get('q')||'');
    setStatus(searchParams.get('status')||'all');
    setType(searchParams.get('type')||'all');
    setActiveTab(searchParams.get('tab')||'all');
    setDateStart(searchParams.get('dateStart')||'');
    setDateEnd(searchParams.get('dateEnd')||'');
    const pg = parseInt(searchParams.get('page')||'1',10);
    setPage(isNaN(pg)||pg<1?1:pg);
  },[searchParams]);

  useEffect(()=>{
    const params = new URLSearchParams();
    q && params.set('q', q);
    status!=='all' && params.set('status', status);
    type!=='all' && params.set('type', type);
    activeTab!=='all' && params.set('tab', activeTab);
    dateStart && params.set('dateStart', dateStart);
    dateEnd && params.set('dateEnd', dateEnd);
    page>1 && params.set('page', String(page));
    router.replace(`/mediation${params.toString()?`?${params}`:''}`);
  },[q,status,type,activeTab,dateStart,dateEnd,page,router]);

  const filtered = useMemo(()=>{
    return mediations.filter(m=>{
      const matchesTab = activeTab==='all' ||
        (activeTab==='scheduled' && m.status==='scheduled') ||
        (activeTab==='ongoing' && m.status==='in-progress') ||
        (activeTab==='completed' && (m.status==='successful' || m.status==='failed'));
      const matchesQ = !q || m.title.toLowerCase().includes(q.toLowerCase()) || m.caseNumber.toLowerCase().includes(q.toLowerCase());
      const matchesStatus = status==='all' || m.status===status;
      const matchesType = type==='all' || m.type===type;
      const dsOk = !dateStart || new Date(m.startDate) >= new Date(dateStart);
      const deOk = !dateEnd || new Date(m.startDate) <= new Date(dateEnd);
      return matchesTab && matchesQ && matchesStatus && matchesType && dsOk && deOk;
    })
  },[mediations, activeTab, q, status, type, dateStart, dateEnd]);

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const pageItems = filtered.slice((page-1)*pageSize, page*pageSize);

  useEffect(()=>{ setPage(1); }, [q,status,type,activeTab,dateStart,dateEnd]);


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'successful': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return '已安排';
      case 'in-progress': return '进行中';
      case 'successful': return '调解成功';
      case 'failed': return '调解失败';
      default: return '未知';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return Clock;
      case 'in-progress': return MessageSquare;
      case 'successful': return CheckCircle;
      case 'failed': return XCircle;
      default: return AlertTriangle;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'voluntary':
        return 'bg-green-100 text-green-800';
      case 'court-ordered':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'voluntary': return '自愿调解';
      case 'court-ordered': return '法院委托';
      default: return '未知';
    }
  };

  const filteredMediations = mockMediations.filter(mediation => {
    switch (activeTab) {
      case 'scheduled': return mediation.status === 'scheduled';
      case 'ongoing': return mediation.status === 'in-progress';
      case 'completed': return mediation.status === 'successful' || mediation.status === 'failed';
      default: return true;
    }
  });

  return (
    <div className="container mx-auto p-8 space-y-8 animate-fade-in">
      {/* 页面头部 */}
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">调解管理</h1>
          <p className="text-lg text-gray-600">管理和参与争议调解程序</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* 身份切换 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center space-x-2">
                <UserCheck className="h-4 w-4" />
                <span>
                  {userRole === 'applicant' ? '申请人' :
                   userRole === 'respondent' ? '被申请人' : '调解员'}
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setUserRole('applicant')}>
                <Users className="h-4 w-4 mr-2" />
                申请人视角
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setUserRole('respondent')}>
                <Users className="h-4 w-4 mr-2" />
                被申请人视角
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setUserRole('mediator')}>
                <Handshake className="h-4 w-4 mr-2" />
                调解员视角
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button size="lg" className="btn-primary btn-ripple hover-lift shadow-brand" asChild>
            <Link href="/mediation/apply">
              <Plus className="h-5 w-5 mr-2" />
              申请调解
            </Link>
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-slide-up" style={{animationDelay: '0.1s'}}>
        <Card className="card hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">总调解数</p>
                <p className="text-3xl font-bold text-blue-600">{mediations.length}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">进行中</p>
            {/* 顶部搜索与筛选 */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1">
                <Input placeholder="搜索标题或案件编号..." value={q} onChange={(e)=>{ setPage(1); setQ(e.target.value); }} />
              </div>
              <Select value={status} onValueChange={(v)=>{ setPage(1); setStatus(v); }}>
                <SelectTrigger className="w-32"><SelectValue placeholder="状态"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="scheduled">已安排</SelectItem>
                  <SelectItem value="in-progress">进行中</SelectItem>
                  <SelectItem value="successful">成功</SelectItem>
                  <SelectItem value="failed">失败</SelectItem>
                </SelectContent>
              </Select>
              <Select value={type} onValueChange={(v)=>{ setPage(1); setType(v); }}>
                <SelectTrigger className="w-32"><SelectValue placeholder="类型"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="voluntary">自愿调解</SelectItem>
                  <SelectItem value="court-ordered">法院委托</SelectItem>
                </SelectContent>
              </Select>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm"><Calendar className="h-4 w-4 mr-2"/>更多筛选</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>时间区间</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">开始日期 起</label>
                      <Input type="date" value={dateStart} onChange={(e)=>setDateStart(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">开始日期 止</label>
                      <Input type="date" value={dateEnd} onChange={(e)=>setDateEnd(e.target.value)} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={()=>{ setDateStart(''); setDateEnd(''); }}>重置</Button>
                    <Button>应用</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

                <p className="text-3xl font-bold text-yellow-600">
                  {mediations.filter(m => m.status === 'in-progress').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">成功调解</p>
                <p className="text-3xl font-bold text-green-600">
                  {mediations.filter(m => m.status === 'successful').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <Handshake className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">成功率</p>
                <p className="text-3xl font-bold text-purple-600">75%</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 调解列表 */}
      <Card className="animate-slide-up" style={{animationDelay: '0.2s'}}>
        <CardHeader>
          <CardTitle className="text-xl">调解案件</CardTitle>
          <CardDescription>
            查看和管理所有调解程序
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="scheduled">已安排</TabsTrigger>
              <TabsTrigger value="ongoing">进行中</TabsTrigger>
              <TabsTrigger value="completed">已完成</TabsTrigger>
              <TabsTrigger value="dossier">卷宗管理</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              <div className="space-y-6">
                {pageItems.map((mediation, index) => {
                  const StatusIcon = getStatusIcon(mediation.status);

                  return (
                    <Card
                      key={mediation.id}
                      className="hover-lift animate-fade-in"
                      style={{animationDelay: `${0.3 + index * 0.1}s`}}
                    >

                {/* 分页器 */}
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-muted-foreground">第 {page} 页</div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>上一页</Button>
                    <Button variant="outline" size="sm" onClick={()=>setPage(p=>p+1)}>下一页</Button>
                  </div>
                </div>

                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{mediation.title}</h3>
                              <Badge className={getStatusColor(mediation.status)}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {getStatusText(mediation.status)}
                              </Badge>
                              <Badge className={getTypeColor(mediation.type)}>
                                {getTypeText(mediation.type)}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{mediation.caseNumber}</p>
                            <div className="flex items-center space-x-6 text-sm text-gray-600">
                              <span className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                {mediation.scheduledDate}
                              </span>
                              <span className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                {mediation.duration}
                              </span>
                              <span className="flex items-center">
                                <Users className="h-4 w-4 mr-1" />
                                {mediation.mediator}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {mediation.status === 'in-progress' && (
                              <Button size="sm" className="btn-primary btn-ripple" onClick={()=>router.push('/hearing/online')}>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                进入调解
                              </Button>
                            )}
                            <Button variant="outline" size="sm" className="hover-lift" onClick={()=>router.push(`/mediation/${mediation.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              查看详情
                            </Button>
                            <Button variant="outline" size="sm" className="hover-lift" onClick={()=>router.push(`/mediation/${mediation.id}?tab=settings`)}>
                              <Settings className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">参与方</h4>
                            <div className="space-y-1">
                              {mediation.parties.map((party) => (
                                <div key={party} className="flex items-center space-x-2">
                                  <Users className="h-3 w-3 text-gray-400" />
                                  <span className="text-sm text-gray-600">{party}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">调解进度</h4>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">完成度</span>
                                <span className="font-medium">{mediation.progress}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${mediation.progress}%` }}
                                ></div>
                              </div>
                              <div className="text-xs text-gray-500">
                                第 {mediation.sessions} / {mediation.totalSessions} 次会议
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">时间安排</h4>
                            <div className="space-y-1 text-sm text-gray-600">
                              <div>开始时间：{mediation.startDate}</div>
                              <div>预计时长：{mediation.duration}</div>
                              <div>下次会议：{mediation.scheduledDate}</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* 卷宗管理标签页 */}
            <TabsContent value="dossier" className="mt-6">
              <DossierSystem
                mediationId="current-mediation"
                onDocumentUpdate={(documentId, status) => {
                  console.log('文档状态更新:', documentId, status);
                }}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 空状态 */}
      {filtered.length === 0 && (
        <EmptyState
          title="暂无调解案件"
          description="当前没有符合条件的调解程序"
          action={{ label: '申请调解', onClick: ()=>document.querySelector('button:has(svg.h-5.w-5.mr-2)')?.dispatchEvent(new MouseEvent('click',{bubbles:true})) }}
        />
      )}
      {/* 保留按键容错 */}
      {false && (
        <Button className="btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          申请新调解
        </Button>
      )}
    </div>
  );
}
