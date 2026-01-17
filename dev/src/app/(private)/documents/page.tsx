// dev/src/app/(private)/documents/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DocumentEditModal } from '@/components/document/document-edit-modal';
import { Progress } from '@/components/ui/progress';
import {
  Search,
  Filter,
  Upload,
  Download,
  FileText,
  File,
  Image,
  Video,
  Archive,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Share,
  Star,
  Clock,
  User,
  FolderOpen,
  CheckCircle,
  AlertCircle,
  Activity
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { EmptyState } from '@/components/ui/error-boundary';

// 模拟文档数据
const mockDocuments = [
  {
    id: '1',
    name: '仲裁申请书.pdf',
    type: 'pdf',
    size: '2.3 MB',
    caseId: 'CASE-2024-001',
    caseTitle: '合同纠纷案',
    category: '申请材料',
    uploadedBy: '张律师',
    uploadedAt: '2024-01-15T10:30:00Z',
    lastModified: '2024-01-15T10:30:00Z',
    status: '已审核',
    isStarred: true,
    tags: ['重要', '申请书']
  },
  {
    id: '2',
    name: '证据材料合集.zip',
    type: 'zip',
    size: '15.7 MB',
    caseId: 'CASE-2024-001',
    caseTitle: '合同纠纷案',
    category: '证据材料',
    uploadedBy: '李秘书',
    uploadedAt: '2024-01-16T14:20:00Z',
    lastModified: '2024-01-16T14:20:00Z',
    status: '待审核',
    isStarred: false,
    tags: ['证据', '合同']
  },
  {
    id: '3',
    name: '答辩书.docx',
    type: 'docx',
    size: '1.2 MB',
    caseId: 'CASE-2024-002',
    caseTitle: '劳动争议案',
    category: '答辩材料',
    uploadedBy: '王律师',
    uploadedAt: '2024-01-20T09:15:00Z',
    lastModified: '2024-01-22T16:45:00Z',
    status: '已审核',
    isStarred: false,
    tags: ['答辩', '劳动']
  },
  {
    id: '4',
    name: '庭审记录.pdf',
    type: 'pdf',
    size: '3.8 MB',
    caseId: 'CASE-2024-001',
    caseTitle: '合同纠纷案',
    category: '庭审材料',
    uploadedBy: '系统自动',
    uploadedAt: '2024-01-25T15:30:00Z',
    lastModified: '2024-01-25T15:30:00Z',
    status: '已审核',
    isStarred: true,
    tags: ['庭审', '记录']
  },
  {
    id: '5',
    name: '财务报表.xlsx',
    type: 'xlsx',
    size: '856 KB',
    caseId: 'CASE-2024-003',
    caseTitle: '投资争议案',
    category: '财务材料',
    uploadedBy: '陈会计',
    uploadedAt: '2024-01-28T11:20:00Z',
    lastModified: '2024-01-28T11:20:00Z',
    status: '待审核',
    isStarred: false,
    tags: ['财务', '报表']
  }
];

type DocumentItem = (typeof mockDocuments)[number];

type UploadQueueItem = {
  id: string;
  name: string;
  size: string;
  progress: number;
  status: 'queued' | 'uploading' | 'done';
};

export default function DocumentsPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const searchParams = useSearchParams(); // 注意：Hooks 顶部声明，避免在 JSX 中调用
  const router = useRouter();

  // State 定义
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const [documents, setDocuments] = useState<DocumentItem[]>(() => [...mockDocuments]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [editingDocument, setEditingDocument] = useState<DocumentItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // URL -> state 初始化
  useEffect(()=>{
    const q = searchParams.get('q') || '';
    const c = searchParams.get('category') || 'all';
    const s = searchParams.get('status') || 'all';
    const t = searchParams.get('tab') || 'all';
    const ds = searchParams.get('dateStart') || '';
    const de = searchParams.get('dateEnd') || '';

    setSearchTerm(q);
    setCategoryFilter(c);
    setStatusFilter(s);
    setActiveTab(t);
    setDateStart(ds);
    setDateEnd(de);
  },[searchParams]);

  // state -> URL 同步
  useEffect(()=>{
    const params = new URLSearchParams();
    searchTerm && params.set('q', searchTerm);
    categoryFilter!=='all' && params.set('category', categoryFilter);
    statusFilter!=='all' && params.set('status', statusFilter);
    activeTab!=='all' && params.set('tab', activeTab);
    dateStart && params.set('dateStart', dateStart);
    dateEnd && params.set('dateEnd', dateEnd);
    router.replace(`/documents${params.toString()?`?${params}`:''}`);
  },[searchTerm,categoryFilter,statusFilter,activeTab,dateStart,dateEnd,router]);

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.caseTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    const matchesTab = activeTab === 'all' ||
                      (activeTab === 'starred' && doc.isStarred) ||
                      (activeTab === 'recent' && new Date(doc.uploadedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const matchesDate = (!dateStart || new Date(doc.uploadedAt) >= new Date(dateStart)) && (!dateEnd || new Date(doc.uploadedAt) <= new Date(dateEnd));

    return matchesSearch && matchesCategory && matchesStatus && matchesTab && matchesDate;
  });

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="h-8 w-8 text-red-500" />;
      case 'docx': case 'doc': return <FileText className="h-8 w-8 text-blue-500" />;
      case 'xlsx': case 'xls': return <File className="h-8 w-8 text-green-500" />;
      case 'zip': case 'rar': return <Archive className="h-8 w-8 text-purple-500" />;
      case 'jpg': case 'png': case 'gif': return <Image className="h-8 w-8 text-pink-500" />;
      case 'mp4': case 'avi': return <Video className="h-8 w-8 text-orange-500" />;
      default: return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '已审核': return 'bg-green-100 text-green-800';
      case '待审核': return 'bg-yellow-100 text-yellow-800';
      case '已拒绝': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-8 space-y-8 animate-fade-in">
      {/* 页面头部 */}
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">文档管理</h1>
          <p className="text-lg text-gray-600">管理和组织所有案件相关文档</p>
        </div>

        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary btn-ripple hover-lift shadow-brand px-6 py-3 text-base">
              <Upload className="h-5 w-5 mr-3" />
              上传文档
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <Upload className="h-4 w-4 text-white" />
                </div>
                上传文档
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                选择要上传的文档文件，支持多种格式，自动关联到相关案件
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* 文件选择区域 */}
              <div className="border-2 border-dashed border-orange-200 bg-orange-50/30 rounded-lg p-8 text-center hover:border-orange-400 hover:bg-orange-50/50 transition-all duration-300 group">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
                  <Upload className="h-8 w-8 text-white" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-medium text-gray-900">拖拽文件到此处或点击选择</p>
                  <p className="text-sm text-gray-600">支持 PDF、DOC、DOCX、XLS、XLSX、JPG、PNG 等格式</p>
                  <p className="text-xs text-gray-500">单个文件最大 50MB，最多同时上传 10 个文件</p>
                </div>
                <Input
                  type="file"
                  multiple
                  className="hidden"
                  id="file-upload"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip,.rar"
                  onChange={(e)=>{
                    const files = Array.from(e.target.files||[]);
                    if(files.length===0) return;
                    const items = files.map((f,i)=>({
                      id: `${Date.now()}-${i}`,
                      name: f.name,
                      size: (f.size / 1024 / 1024).toFixed(2) + ' MB',
                      progress: 0,
                      status: 'queued' as const
                    }));
                    setUploadQueue(prev=>[...prev, ...items]);
                    // 模拟上传进度
                    items.forEach((item,idx)=>{
                      const interval = setInterval(()=>{
                    setUploadQueue(prev=>prev.map(q=> q.id===item.id ? { ...q, status:'uploading', progress: Math.min(100, (q.progress||0)+10) } : q));
                  }, 200);
                  setTimeout(()=>{
                    clearInterval(interval);
                    setUploadQueue(prev=>prev.map(q=> q.id===item.id ? { ...q, status:'done', progress: 100 } : q));
                    setDocuments(prev=>[
                      { id: item.id, name: item.name, type: 'pdf', size: '—', caseId: '—', caseTitle: '未关联案件', category: '其他', uploadedBy: '我', uploadedAt: new Date().toISOString(), lastModified: new Date().toISOString(), status: '待审核', isStarred: false, tags: [] },
                      ...prev,
                    ]);
                  }, 2200 + idx*200);
                });
              }} />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Button type="button" className="mt-4 bg-orange-500 hover:bg-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                    <Upload className="h-4 w-4 mr-2" />
                    选择文件
                  </Button>
                </label>
              </div>

              {/* 上传队列 */}
              {uploadQueue.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-orange-500" />
                    上传进度
                  </h4>
                  {uploadQueue.map(item => (
                    <div key={item.id} className="p-4 rounded-lg border border-orange-200 bg-orange-50/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                            <FileText className="h-4 w-4 text-orange-500" />
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-900 truncate">{item.name}</span>
                            <div className="text-xs text-gray-600">{item.size}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {item.status === 'done' ? (
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                              <CheckCircle className="h-4 w-4 text-white" />
                            </div>
                          ) : item.status === 'uploading' ? (
                            <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                              <Clock className="h-4 w-4 text-white animate-spin" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center">
                              <Clock className="h-4 w-4 text-white" />
                            </div>
                          )}
                          <span className="text-xs font-medium text-gray-700 capitalize">
                            {item.status === 'queued' ? '等待中' :
                             item.status === 'uploading' ? '上传中' : '完成'}
                          </span>
                        </div>
                      </div>
                      <Progress value={item.progress} className="h-2" />
                    </div>
                  ))}
                </div>
              )}

              {/* 上传说明 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 mb-1">上传须知</p>
                    <ul className="text-blue-700 space-y-1">
                      <li>• 请确保文档内容真实有效，上传后将进入审核流程</li>
                      <li>• 敏感信息请做适当处理，保护个人隐私</li>
                      <li>• 文档将自动关联到相关案件，便于管理和查阅</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {uploadQueue.length > 0 && `已选择 ${uploadQueue.length} 个文件`}
              </div>
              <div className="flex space-x-3">
                <Button variant="outline" onClick={() => { setUploadQueue([]); setIsUploadOpen(false); }}>
                  取消
                </Button>
                {uploadQueue.length > 0 && uploadQueue.every(item => item.status === 'done') && (
                  <Button onClick={() => { setUploadQueue([]); setIsUploadOpen(false); }}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    完成上传
                  </Button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-slide-up" style={{animationDelay: '0.2s'}}>
        <Card className="card hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总文档数</CardTitle>
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{documents.length}</div>
            <p className="text-sm text-gray-600 mt-1">
              +3 本周新增
            </p>
          </CardContent>
        </Card>

        <Card className="card hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待审核</CardTitle>
            <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {documents.filter(d => d.status === '待审核').length}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              需要处理
            </p>
          </CardContent>
        </Card>

        <Card className="card hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已收藏</CardTitle>
            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <Star className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {documents.filter(d => d.isStarred).length}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              重要文档
            </p>
          </CardContent>
        </Card>

        <Card className="card hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">存储空间</CardTitle>
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <FolderOpen className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">23.8 MB</div>
            <p className="text-sm text-gray-600 mt-1">
              已使用
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 文档列表 */}
      <Card className="card animate-slide-up" style={{animationDelay: '0.4s'}}>
        <CardHeader>
          <CardTitle className="text-2xl text-gray-900">文档库</CardTitle>
          <CardDescription className="text-base text-gray-600">查看和管理所有案件文档</CardDescription>
        </CardHeader>
        <CardContent>
          {/* 搜索和筛选 */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索文档名称或案件..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="文档类别" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类别</SelectItem>
                <SelectItem value="申请材料">申请材料</SelectItem>
                <SelectItem value="证据材料">证据材料</SelectItem>
                <SelectItem value="答辩材料">答辩材料</SelectItem>
                <SelectItem value="庭审材料">庭审材料</SelectItem>
                <SelectItem value="财务材料">财务材料</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="已审核">已审核</SelectItem>
                <SelectItem value="待审核">待审核</SelectItem>
                <SelectItem value="已拒绝">已拒绝</SelectItem>
              </SelectContent>
            </Select>

            {/* 更多筛选 Dialog */}
            <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
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
                    <label className="text-sm text-muted-foreground">上传时间 起</label>
                    <Input type="date" value={dateStart} onChange={(e)=>setDateStart(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">上传时间 止</label>
                    <Input type="date" value={dateEnd} onChange={(e)=>setDateEnd(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={()=>{ setDateStart(''); setDateEnd(''); }}>重置</Button>
                  <Button onClick={()=>setIsFilterOpen(false)}>应用</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* 标签页 */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">全部文档</TabsTrigger>
              <TabsTrigger value="recent">最近上传</TabsTrigger>
              <TabsTrigger value="starred">已收藏</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              {/* 文档网格 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {documents.filter(doc => {
                  const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) || doc.caseTitle.toLowerCase().includes(searchTerm.toLowerCase());
                  const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
                  const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
                  const matchesTab = activeTab === 'all' || (activeTab === 'starred' && doc.isStarred) || (activeTab === 'recent' && new Date(doc.uploadedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
                  const matchesDate = (!dateStart || new Date(doc.uploadedAt) >= new Date(dateStart)) && (!dateEnd || new Date(doc.uploadedAt) <= new Date(dateEnd));
                  return matchesSearch && matchesCategory && matchesStatus && matchesTab && matchesDate;
                }).map((doc, index) => (
                  <Card
                    key={doc.id}
                    className="card hover-lift group transition-all duration-300 animate-fade-in"
                    style={{animationDelay: `${index * 0.1}s`}}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {getFileIcon(doc.type)}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm truncate">{doc.name}</h3>
                            <p className="text-xs text-gray-500">{doc.size}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {doc.isStarred && <Star className="h-4 w-4 text-orange-500 fill-current" />}
                          <Button variant="ghost" size="sm" onClick={() => {
                            setDocuments(prev => prev.map(d => d.id===doc.id ? { ...d, isStarred: !d.isStarred } : d));
                          }}>
                            <Star className={`h-4 w-4 ${doc.isStarred ? 'text-orange-500 fill-current' : ''}`} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => {
                            if(confirm('确认删除该文档？')) setDocuments(prev => prev.filter(d => d.id!==doc.id));
                          }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">{doc.category}</Badge>
                          <Badge className={`text-xs ${getStatusColor(doc.status)}`}>
                            {doc.status}
                          </Badge>
                        </div>

                        <div className="text-xs text-gray-500">
                          <p className="truncate">案件: {doc.caseTitle}</p>
                          <p>上传者: {doc.uploadedBy}</p>
                          <p>时间: {formatDate(doc.uploadedAt)}</p>
                        </div>

                        {doc.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {doc.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-3 border-t">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/documents/${doc.id}`)}
                            title="查看详情"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // 模拟下载
                              const link = document.createElement('a');
                              link.href = '#';
                              link.download = doc.name;
                              link.click();
                              alert(`正在下载 ${doc.name}`);
                            }}
                            title="下载文档"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/documents/${doc.id}`);
                              alert('分享链接已复制到剪贴板');
                            }}
                            title="分享文档"
                          >
                            <Share className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingDocument(doc);
                            setShowEditModal(true);
                          }}
                          title="编辑文档信息"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredDocuments.length === 0 && (
                <EmptyState
                  title="没有找到文档"
                  description="尝试调整搜索条件或筛选器"
                  action={{ label: '上传新文档', onClick: ()=>setIsFilterOpen(true) }}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 文档编辑模态框 */}
      <DocumentEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingDocument(null);
        }}
        document={editingDocument}
        onSave={(updatedDocument) => {
          if (!updatedDocument.id) {
            alert('文档缺少ID，无法保存');
            return;
          }

          setDocuments((prev) =>
            prev.map((doc) =>
              doc.id === updatedDocument.id
                ? {
                    ...doc,
                    name: updatedDocument.name ?? doc.name,
                    category: updatedDocument.category ?? doc.category,
                    tags: Array.isArray(updatedDocument.tags) ? updatedDocument.tags : doc.tags,
                    lastModified: updatedDocument.updatedAt ?? doc.lastModified,
                  }
                : doc
            )
          );
          alert('文档信息已更新');
        }}
      />
    </div>
  );
}
