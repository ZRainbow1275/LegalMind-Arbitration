// dev/src/app/(private)/cases/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SimpleProgress } from '@/components/ui/progress-stepper';
import { useSearchParams, useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/error-boundary';
import {
  Search,
  Filter,
  Plus,
  Calendar,
  Clock,
  FileText,
  Users,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  RotateCcw,
  Download
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useCasesStore, useUserStore } from '@/store';
import { useRole } from '@/components/layout/role-switcher';
import { SmartDocumentGenerator } from '@/components/documents/smart-document-generator';
import { useModuleSync, dataSyncManager } from '@/lib/data-sync';
import { useConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useNotificationHelpers } from '@/components/ui/notification';
import { CASE_STATUS_VALUES, type ArbitrationCase } from '@/types';

type SortByOption = 'createdAt' | 'updatedAt' | 'deadline' | 'amount';
type SortDirOption = 'asc' | 'desc';

const isSortByOption = (value: string): value is SortByOption => {
  return value === 'createdAt' || value === 'updatedAt' || value === 'deadline' || value === 'amount';
};

const isSortDirOption = (value: string): value is SortDirOption => {
  return value === 'asc' || value === 'desc';
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const isCaseStatus = (value: unknown): value is ArbitrationCase['status'] => {
  return (
    typeof value === 'string' &&
    (CASE_STATUS_VALUES as readonly string[]).includes(value)
  );
};

const isArbitrationCase = (value: unknown): value is ArbitrationCase => {
  if (!isRecord(value)) return false;

  const createdAt = value.createdAt;
  const updatedAt = value.updatedAt;

  const hasValidDates =
    (createdAt instanceof Date || typeof createdAt === 'string') &&
    (updatedAt instanceof Date || typeof updatedAt === 'string');

  return (
    typeof value.id === 'string' &&
    typeof value.caseNumber === 'string' &&
    typeof value.applicantId === 'string' &&
    typeof value.respondentId === 'string' &&
    typeof value.caseType === 'string' &&
    typeof value.disputeAmount === 'number' &&
    isCaseStatus(value.status) &&
    typeof value.arbitrationAgreement === 'string' &&
    typeof value.applicationForm === 'string' &&
    Array.isArray(value.evidenceList) &&
    typeof value.title === 'string' &&
    typeof value.description === 'string' &&
    hasValidDates
  );
};

const getIdFromEventData = (value: unknown): string | null => {
  if (!isRecord(value)) return null;
  return typeof value.id === 'string' ? value.id : null;
};

export default function CasesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { cases: storeCases, setCases, updateCase, removeCase, duplicateCase } = useCasesStore();
  const { currentUser } = useUserStore();
  const currentUserId = currentUser?.id ?? null;
  const { currentRole } = useRole();
  // 数据同步模块 - 重新实现避免无限循环
  const moduleSync = useModuleSync('cases-module');
  const { showConfirmation, ConfirmationDialog } = useConfirmationDialog();
  const notify = useNotificationHelpers();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'createdAt'|'updatedAt'|'deadline'|'amount'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const [createdStart, setCreatedStart] = useState<string>('');
  const [createdEnd, setCreatedEnd] = useState<string>('');
  const [deadlineStart, setDeadlineStart] = useState<string>('');
  const [deadlineEnd, setDeadlineEnd] = useState<string>('');
  const [amountMin, setAmountMin] = useState<string>('');
  const [amountMax, setAmountMax] = useState<string>('');
  const [showDocumentGenerator, setShowDocumentGenerator] = useState(false);
  const [selectedCaseForDoc, setSelectedCaseForDoc] = useState<ArbitrationCase | null>(null);

  // 案件操作处理函数
  const handleCopyCase = (caseItem: ArbitrationCase) => {
    showConfirmation({
      title: '复制案件',
      message: `确定要复制案件 ${caseItem.caseNumber} 吗？`,
      type: 'info',
      onConfirm: () => {
        const newCase = duplicateCase(caseItem.id);
        if (newCase) {
          notify.success('案件复制成功', `新案件编号：${newCase.caseNumber}`);
          router.push(`/cases/${newCase.id}`);
        }
      }
    });
  };

    const handleExportCase = (caseItem: ArbitrationCase) => {
      // 模拟导出功能
      const exportData = {
        caseNumber: caseItem.caseNumber,
        title: caseItem.title,
        status: caseItem.status,
        disputeAmount: caseItem.disputeAmount,
        createdAt: caseItem.createdAt,
        exportedAt: new Date().toISOString()
      };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `case-${caseItem.caseNumber}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

      alert('案件数据已导出');
    };

    const handleArchiveCase = (caseItem: ArbitrationCase) => {
      showConfirmation({
        title: '归档案件',
        message: `确定要归档案件 ${caseItem.caseNumber} 吗？\n\n归档后案件将移至归档列表，不会在主列表中显示。`,
        type: 'warning',
        onConfirm: () => {
          // 更新案件状态为已归档
          updateCase(caseItem.id, { status: 'terminated' });
          notify.success('案件已归档');
        }
      });
    };

  const handleDeleteCase = (caseItem: ArbitrationCase) => {
    showConfirmation({
      title: '删除案件',
      message: `确定要删除案件 ${caseItem.caseNumber} 吗？\n\n此操作不可撤销，请谨慎操作。`,
      type: 'danger',
      confirmText: '删除',
      onConfirm: () => {
        removeCase(caseItem.id);

        // 发布案件删除事件
        dataSyncManager.publishCaseEvent('deleted', caseItem, 'cases-module');

        notify.success('案件已删除');
      }
    });
  };

  const handleGenerateDocument = (caseItem: ArbitrationCase) => {
    setSelectedCaseForDoc(caseItem);
    setShowDocumentGenerator(true);
    };

  // 数据同步初始化 - 重新实现避免无限循环
  useEffect(() => {
    // 注册模块
    moduleSync.register();

    // 订阅数据同步事件 - 使用回调函数避免依赖storeCases
    const unsubscribe = moduleSync.subscribeToEvents((event) => {
      console.log('Cases module received sync event:', event);

      switch (event.type) {
        case 'case_created':
          // 处理案件创建事件
          if (event.source !== 'cases-module' && isArbitrationCase(event.data)) {
            const caseData = event.data;
            setCases((prevCases) => {
              if (prevCases.some((c) => c.id === caseData.id)) return prevCases;
              return [...prevCases, caseData];
            });
          }
          break;

        case 'case_updated':
          // 处理案件更新事件
          if (event.source !== 'cases-module' && isArbitrationCase(event.data)) {
            const caseData = event.data;
            setCases((prevCases) =>
              prevCases.map((c) => (c.id === caseData.id ? caseData : c))
            );
          }
          break;

        case 'case_deleted':
          // 处理案件删除事件
          if (event.source !== 'cases-module') {
            const id = getIdFromEventData(event.data);
            if (!id) break;
            setCases((prevCases) => prevCases.filter((c) => c.id !== id));
          }
          break;

        case 'mediation_created':
        case 'mediation_updated':
          // 处理调解相关事件，可能需要更新案件状态
          if (event.caseId) {
            setCases((prevCases) =>
              prevCases.map((c) =>
                c.id === event.caseId ? { ...c, lastActivity: new Date() } : c
              )
            );
          }
          break;

        case 'hearing_scheduled':
        case 'hearing_started':
        case 'hearing_completed':
          // 处理庭审相关事件
          if (event.caseId) {
            const nextStatus: ArbitrationCase['status'] | null =
              event.type === 'hearing_completed'
                ? 'completed'
                : event.type === 'hearing_started'
                  ? 'hearing_in_progress'
                  : 'hearing_scheduled';

            setCases((prevCases) =>
              prevCases.map((c) =>
                c.id === event.caseId
                  ? {
                      ...c,
                      lastActivity: new Date(),
                      status: nextStatus ?? c.status,
                    }
                  : c
              )
            );
          }
          break;

        case 'document_uploaded':
        case 'document_signed':
          // 处理文档相关事件
          if (event.caseId) {
            setCases((prevCases) =>
              prevCases.map((c) =>
                c.id === event.caseId ? { ...c, lastActivity: new Date() } : c
              )
            );
          }
          break;
      }
    });

    return () => {
      unsubscribe();
      moduleSync.unregister();
    };
  }, []); // 移除moduleSync和setCases依赖，避免无限循环


  // URL -> state 初始化（仅首次）
  useEffect(() => {
    const q = searchParams.get('q') || '';
    const s = searchParams.get('status') || 'all';
    const t = searchParams.get('type') || 'all';
    setSearchTerm(q);
    setStatusFilter(s);
    setTypeFilter(t);
    setCreatedStart(searchParams.get('createdStart') || '');
    setCreatedEnd(searchParams.get('createdEnd') || '');
    setDeadlineStart(searchParams.get('deadlineStart') || '');
    setDeadlineEnd(searchParams.get('deadlineEnd') || '');
    setAmountMin(searchParams.get('amountMin') || '');
    setAmountMax(searchParams.get('amountMax') || '');
  }, [searchParams]);

  // state -> URL 同步 (临时简化，避免无限循环)
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (typeFilter !== 'all') params.set('type', typeFilter);
    if (createdStart) params.set('createdStart', createdStart);
    if (createdEnd) params.set('createdEnd', createdEnd);
    if (deadlineStart) params.set('deadlineStart', deadlineStart);
    if (deadlineEnd) params.set('deadlineEnd', deadlineEnd);
    if (amountMin) params.set('amountMin', amountMin);
    if (amountMax) params.set('amountMax', amountMax);

    // 使用setTimeout避免在渲染过程中更新状态
    const timeoutId = setTimeout(() => {
      router.replace(`/cases${params.toString()?`?${params}`:''}`);
      setPage(1);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter, typeFilter, createdStart, createdEnd, deadlineStart, deadlineEnd, amountMin, amountMax, router]);


  const roleCases = useMemo(() => {
    if (!currentUserId) return [];

    return storeCases.filter((case_) => {
      switch (currentRole) {
        case 'applicant':
          return case_.applicantId === currentUserId;
        case 'respondent':
          return case_.respondentId === currentUserId;
        case 'lawyer':
          return (
            case_.applicantId === currentUserId || case_.respondentId === currentUserId
          );
        default:
          return true;
      }
    });
  }, [storeCases, currentRole, currentUserId]);

  const getDateMs = (value: Date | string | undefined) => {
    if (!value) return 0;
    const date = value instanceof Date ? value : new Date(value);
    const ms = date.getTime();
    return Number.isFinite(ms) ? ms : 0;
  };

  const sortedCases = useMemo(() => {
    const arr = [...roleCases];
    arr.sort((a, b) => {
      const aVal = sortBy === 'amount' ? a.disputeAmount : getDateMs(a[sortBy]);
      const bVal = sortBy === 'amount' ? b.disputeAmount : getDateMs(b[sortBy]);
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return arr;
  }, [sortBy, sortDir, roleCases]);

  const filteredCases = sortedCases.filter(caseItem => {
    const matchesSearch = caseItem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         caseItem.caseNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || caseItem.status === statusFilter;
    const matchesType = typeFilter === 'all' || caseItem.caseType === typeFilter;
    const includeArchived = statusFilter === 'terminated';
    const isArchived = caseItem.status === 'terminated';
    return matchesSearch && matchesStatus && matchesType && (includeArchived || !isArchived);
  });

  const total = filteredCases.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const pageItems = filteredCases.slice((page-1)*pageSize, page*pageSize);


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

  const getCaseProgress = (status: string) => {
    switch (status) {
      case 'draft': return 10;
      case 'submitted': return 25;
      case 'accepted': return 40;
      case 'tribunal_formation': return 55;
      case 'hearing_scheduled': return 70;
      case 'hearing_in_progress': return 85;
      case 'completed': return 100;
      default: return 0;
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6 overflow-fix">
      {/* 页面头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-responsive row-mobile">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 text-truncate-fix">案件管理</h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">管理和跟踪所有仲裁案件</p>
        </div>
        <Button asChild className="flex-shrink-0">
          <Link href="/cases/new">
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">新建仲裁</span>
            <span className="sm:hidden">新建</span>
          </Link>
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总案件数</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roleCases.length}</div>
            <p className="text-xs text-muted-foreground">
              当前身份可见案件
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">进行中</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {roleCases.filter(c => c.status === 'hearing_in_progress' || c.status === 'hearing_scheduled').length}
            </div>
            <p className="text-xs text-muted-foreground">
              活跃案件
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待处理</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {roleCases.filter(c => c.status === 'submitted' || c.status === 'accepted').length}
            </div>
            <p className="text-xs text-muted-foreground">
              需要关注
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已完成</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {roleCases.filter(c => c.status === 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground">
              本月结案
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardHeader>
          <CardTitle>案件列表</CardTitle>
          <CardDescription>查看和管理所有仲裁案件</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6">
            {/* 第一行：搜索框和主要筛选 */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索案件标题或编号..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 h-9">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="hearing_in_progress">庭审中</SelectItem>
                  <SelectItem value="submitted">已提交</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="draft">草稿</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-32 h-9">
                  <SelectValue placeholder="类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="合同纠纷">合同纠纷</SelectItem>
                  <SelectItem value="劳动争议">劳动争议</SelectItem>
                  <SelectItem value="知识产权">知识产权</SelectItem>
                  <SelectItem value="投资争议">投资争议</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 第二行：高级筛选和重置按钮 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9">
                      <Filter className="h-4 w-4 mr-2" />
                      更多筛选
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>高级筛选</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <label className="text-sm text-muted-foreground">创建时间 起</label>
                        <Input type="date" value={createdStart} onChange={(e)=>setCreatedStart(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">创建时间 止</label>
                        <Input type="date" value={createdEnd} onChange={(e)=>setCreatedEnd(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">截止时间 起</label>
                        <Input type="date" value={deadlineStart} onChange={(e)=>setDeadlineStart(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">截止时间 止</label>
                        <Input type="date" value={deadlineEnd} onChange={(e)=>setDeadlineEnd(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">金额 最小</label>
                        <Input type="number" inputMode="numeric" value={amountMin} onChange={(e)=>setAmountMin(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">金额 最大</label>
                        <Input type="number" inputMode="numeric" value={amountMax} onChange={(e)=>setAmountMax(e.target.value)} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="ghost" onClick={()=>{ setCreatedStart(''); setCreatedEnd(''); setDeadlineStart(''); setDeadlineEnd(''); setAmountMin(''); setAmountMax(''); }}>重置</Button>
                      <Button onClick={()=>setIsFilterOpen(false)}>应用</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* 显示活跃筛选条件 */}
                {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || createdStart || createdEnd || deadlineStart || deadlineEnd || amountMin || amountMax) && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>已应用筛选条件</span>
                    <Badge variant="secondary" className="text-xs">
                      {[
                        searchTerm && '关键词',
                        statusFilter !== 'all' && '状态',
                        typeFilter !== 'all' && '类型',
                        (createdStart || createdEnd) && '创建时间',
                        (deadlineStart || deadlineEnd) && '截止时间',
                        (amountMin || amountMax) && '金额范围'
                      ].filter(Boolean).length} 项
                    </Badge>
                  </div>
                )}
              </div>

              <Button variant="ghost" size="sm" className="h-9" onClick={()=>{
                setSearchTerm('');
                setStatusFilter('all');
                setTypeFilter('all');
                setCreatedStart('');
                setCreatedEnd('');
                setDeadlineStart('');
                setDeadlineEnd('');
                setAmountMin('');
                setAmountMax('');
                setPage(1);
              }}>
                <RotateCcw className="h-4 w-4 mr-2" />
                重置筛选
              </Button>
            </div>
          </div>


          {/* 案件卡片列表 */}
          <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 lg:gap-6 card-grid">
            {pageItems.map((caseItem, index) => (
              <Card
                key={caseItem.id}
                className="card hover-lift group transition-all duration-300 animate-fade-in card-responsive"
                style={{animationDelay: `${index * 0.1}s`}}
              >
                <CardContent className="p-4 md:p-6">
                  {/* 案件头部信息 */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <Link
                        href={`/cases/${caseItem.id}`}
                        className="text-lg font-semibold text-gray-900 hover:text-orange-700 transition-colors group-hover:text-orange-600"
                      >
                        {caseItem.title}
                      </Link>
                      <p className="text-sm text-gray-500 mt-1">{caseItem.caseNumber}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(caseItem.status)}>
                        {getStatusText(caseItem.status)}
                      </Badge>
                    </div>
                  </div>

                  {/* 案件详情 */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">争议类型：</span>
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        {caseItem.caseType}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">争议金额：</span>
                      <span className="font-medium text-gray-900">
                        ¥{caseItem.disputeAmount.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">创建时间：</span>
                      <span className="text-gray-700">{formatDate(caseItem.createdAt)}</span>
                    </div>
                  </div>

                  {/* 进度条 */}
                  <div className="mb-3">
                    <SimpleProgress
                      value={getCaseProgress(caseItem.status)}
                      label="案件进度"
                      size="md"
                    />
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-2 pt-3 mt-auto">
                    <Button variant="outline" size="sm" asChild className="hover-lift flex-1">
                      <Link href={`/cases/${caseItem.id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        查看详情
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" className="hover-lift" asChild title="编辑案件">
                      <Link href={`/cases/${caseItem.id}?edit=true`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover-lift"
                      onClick={() => handleCopyCase(caseItem)}
                      title="复制案件"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 列表底部：排序与分页控制 */}
          {filteredCases.length > 0 && (
            <div className="mt-8 space-y-4">
              {/* 排序控制 */}
              <div className="flex items-center justify-between border-t pt-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">排序方式：</span>
                  <div className="flex items-center gap-2">
                    <Select value={sortBy} onValueChange={(v) => {
                      if (!isSortByOption(v)) return;
                      setPage(1);
                      setSortBy(v);
                    }}>
                      <SelectTrigger className="w-36 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="createdAt">创建时间</SelectItem>
                        <SelectItem value="updatedAt">更新时间</SelectItem>
                        <SelectItem value="deadline">截止时间</SelectItem>
                        <SelectItem value="amount">争议金额</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={sortDir} onValueChange={(v) => {
                      if (!isSortDirOption(v)) return;
                      setPage(1);
                      setSortDir(v);
                    }}>
                      <SelectTrigger className="w-20 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">↓</SelectItem>
                        <SelectItem value="asc">↑</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  显示 {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} 条，共 {total} 条记录
                </div>
              </div>

              {/* 分页控制 */}
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(1)}
                  className="px-3"
                >
                  首页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-3"
                >
                  上一页
                </Button>

                {/* 页码显示 - 临时简化避免Array.from的ref问题 */}
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-600">
                    第 {page} 页，共 {pageCount} 页
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pageCount}
                  onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                  className="px-3"
                >
                  下一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pageCount}
                  onClick={() => setPage(pageCount)}
                  className="px-3"
                >
                  末页
                </Button>
              </div>
            </div>
          )}

          {filteredCases.length === 0 && (
            <EmptyState
              title={searchTerm || statusFilter !== 'all' || typeFilter !== 'all' ? '未找到匹配的案件' : '暂无案件'}
              description={searchTerm || statusFilter !== 'all' || typeFilter !== 'all' ? '尝试调整搜索条件或筛选器，或者创建一个新的案件' : '开始创建您的第一个仲裁案件，体验高效的在线仲裁服务'}
              action={{ label: '新建仲裁申请', href: '/cases/new' }}
            />
          )}
        </CardContent>
      </Card>

      {/* 智能文书生成对话框 */}
      <Dialog open={showDocumentGenerator} onOpenChange={setShowDocumentGenerator}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              智能文书生成 - {selectedCaseForDoc?.caseNumber}
            </DialogTitle>
          </DialogHeader>
          <SmartDocumentGenerator
            caseId={selectedCaseForDoc?.id}
            onDocumentGenerated={(documentId, content) => {
              console.log('文书生成完成:', documentId);
              // 这里可以添加保存文书到案件的逻辑
              setShowDocumentGenerator(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* 确认对话框 */}
      <ConfirmationDialog />
    </div>
  );
}
