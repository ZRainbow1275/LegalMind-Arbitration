// dev/src/components/mediation/dossier-system.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  FileText,
  FolderOpen,
  Download,
  Upload,
  Eye,
  Printer,
  Stamp,
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  Archive,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Lock,
  Unlock,
  FileCheck,
  FileX,
  Calendar,
  User,
  Building
} from 'lucide-react';

interface DossierDocument {
  id: string;
  name: string;
  type: 'application' | 'evidence' | 'agreement' | 'decision' | 'notice' | 'other';
  category: 'pre-mediation' | 'mediation' | 'judicial-confirmation';
  format: 'electronic' | 'physical' | 'both';
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  size: number;
  pages?: number;
  author: string;
  reviewer?: string;
  digitalSignature?: {
    signed: boolean;
    signedBy: string;
    signedAt: Date;
    certificateId: string;
  };
  physicalLocation?: string;
  notes?: string;
}

interface ElectronicSeal {
  id: string;
  name: string;
  type: 'institutional' | 'personal' | 'judicial';
  owner: string;
  validFrom: Date;
  validTo: Date;
  certificateId: string;
  status: 'active' | 'expired' | 'revoked';
  usageCount: number;
  maxUsage?: number;
}

interface DossierSystemProps {
  mediationId: string;
  onDocumentUpdate?: (documentId: string, status: string) => void;
  className?: string;
}

const mockDocuments: DossierDocument[] = [
  {
    id: 'doc-001',
    name: '调解申请书',
    type: 'application',
    category: 'pre-mediation',
    format: 'both',
    status: 'approved',
    createdAt: new Date('2024-02-10T09:00:00'),
    updatedAt: new Date('2024-02-10T09:30:00'),
    size: 1024000,
    pages: 3,
    author: '申请人',
    reviewer: '调解员',
    digitalSignature: {
      signed: true,
      signedBy: '申请人',
      signedAt: new Date('2024-02-10T09:15:00'),
      certificateId: 'CERT-001'
    },
    physicalLocation: '档案室A-001'
  },
  {
    id: 'doc-002',
    name: '调解协议书',
    type: 'agreement',
    category: 'mediation',
    format: 'electronic',
    status: 'approved',
    createdAt: new Date('2024-02-14T14:00:00'),
    updatedAt: new Date('2024-02-14T16:00:00'),
    size: 2048000,
    pages: 5,
    author: '调解员',
    digitalSignature: {
      signed: true,
      signedBy: '双方当事人',
      signedAt: new Date('2024-02-14T15:30:00'),
      certificateId: 'CERT-002'
    }
  }
];

const mockSeals: ElectronicSeal[] = [
  {
    id: 'seal-001',
    name: '调解中心公章',
    type: 'institutional',
    owner: '北京仲裁调解中心',
    validFrom: new Date('2024-01-01'),
    validTo: new Date('2024-12-31'),
    certificateId: 'INST-CERT-001',
    status: 'active',
    usageCount: 156,
    maxUsage: 1000
  },
  {
    id: 'seal-002',
    name: '调解员个人印章',
    type: 'personal',
    owner: '张调解员',
    validFrom: new Date('2024-01-01'),
    validTo: new Date('2024-12-31'),
    certificateId: 'PERS-CERT-001',
    status: 'active',
    usageCount: 45,
    maxUsage: 500
  }
];

export function DossierSystem({ 
  mediationId, 
  onDocumentUpdate,
  className 
}: DossierSystemProps) {
  const [activeTab, setActiveTab] = useState<'electronic' | 'physical' | 'seals'>('electronic');
  const [documents, setDocuments] = useState<DossierDocument[]>(mockDocuments);
  const [seals, setSeals] = useState<ElectronicSeal[]>(mockSeals);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showSealDialog, setShowSealDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DossierDocument | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [newDocument, setNewDocument] = useState({
    name: '',
    type: 'other' as DossierDocument['type'],
    category: 'pre-mediation' as DossierDocument['category'],
    format: 'electronic' as DossierDocument['format'],
    notes: ''
  });

  const getTypeLabel = (type: DossierDocument['type']) => {
    const labels = {
      application: '申请书',
      evidence: '证据材料',
      agreement: '协议书',
      decision: '决定书',
      notice: '通知书',
      other: '其他'
    };
    return labels[type];
  };

  const getCategoryLabel = (category: DossierDocument['category']) => {
    const labels = {
      'pre-mediation': '调解前',
      'mediation': '调解中',
      'judicial-confirmation': '司法确认'
    };
    return labels[category];
  };

  const getStatusColor = (status: DossierDocument['status']) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      archived: 'bg-purple-100 text-purple-800'
    };
    return colors[status];
  };

  const getStatusLabel = (status: DossierDocument['status']) => {
    const labels = {
      draft: '草稿',
      submitted: '已提交',
      approved: '已批准',
      rejected: '已拒绝',
      archived: '已归档'
    };
    return labels[status];
  };

  const getSealTypeColor = (type: ElectronicSeal['type']) => {
    const colors = {
      institutional: 'bg-blue-100 text-blue-800',
      personal: 'bg-green-100 text-green-800',
      judicial: 'bg-purple-100 text-purple-800'
    };
    return colors[type];
  };

  const getSealStatusColor = (status: ElectronicSeal['status']) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      revoked: 'bg-gray-100 text-gray-800'
    };
    return colors[status];
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || doc.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.author.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCategory && matchesStatus && matchesSearch;
  });

  const handleUploadDocument = () => {
    if (!newDocument.name) return;

    const document: DossierDocument = {
      id: `doc-${Date.now()}`,
      name: newDocument.name,
      type: newDocument.type,
      category: newDocument.category,
      format: newDocument.format,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      size: Math.floor(Math.random() * 5000000) + 100000,
      pages: Math.floor(Math.random() * 10) + 1,
      author: '当前用户',
      notes: newDocument.notes
    };

    setDocuments(prev => [document, ...prev]);
    setShowUploadDialog(false);
    setNewDocument({
      name: '',
      type: 'other',
      category: 'pre-mediation',
      format: 'electronic',
      notes: ''
    });
  };

  const handleDocumentAction = (documentId: string, action: 'approve' | 'reject' | 'archive') => {
    setDocuments(prev => prev.map(doc => 
      doc.id === documentId 
        ? { ...doc, status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'archived', updatedAt: new Date() }
        : doc
    ));
    onDocumentUpdate?.(documentId, action);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCompletionRate = () => {
    const totalDocs = documents.length;
    const approvedDocs = documents.filter(doc => doc.status === 'approved').length;
    return totalDocs > 0 ? (approvedDocs / totalDocs) * 100 : 0;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FolderOpen className="h-6 w-6" />
            调解卷宗系统
          </h2>
          <p className="text-gray-600 mt-1">管理调解过程中的电子卷宗、纸质卷宗和电子印章</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowSealDialog(true)}>
            <Stamp className="h-4 w-4 mr-2" />
            印章管理
          </Button>
          <Button onClick={() => setShowUploadDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            <Upload className="h-4 w-4 mr-2" />
            上传文档
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">总文档数</p>
                <p className="text-2xl font-bold">{documents.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">已批准</p>
                <p className="text-2xl font-bold text-green-600">
                  {documents.filter(doc => doc.status === 'approved').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">电子签名</p>
                <p className="text-2xl font-bold text-purple-600">
                  {documents.filter(doc => doc.digitalSignature?.signed).length}
                </p>
              </div>
              <Shield className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">完成率</p>
                <p className="text-2xl font-bold text-orange-600">{Math.round(getCompletionRate())}%</p>
              </div>
              <Archive className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主要内容 */}
      <Card>
        <CardHeader>
          <CardTitle>卷宗管理</CardTitle>
        </CardHeader>
        <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'electronic' | 'physical' | 'seals')}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="electronic">电子卷宗</TabsTrigger>
              <TabsTrigger value="physical">纸质卷宗</TabsTrigger>
              <TabsTrigger value="seals">电子印章</TabsTrigger>
            </TabsList>

            {/* 电子卷宗标签页 */}
            <TabsContent value="electronic" className="space-y-4">
              {/* 筛选和搜索 */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="搜索文档..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
                
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="分类" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部分类</SelectItem>
                    <SelectItem value="pre-mediation">调解前</SelectItem>
                    <SelectItem value="mediation">调解中</SelectItem>
                    <SelectItem value="judicial-confirmation">司法确认</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="draft">草稿</SelectItem>
                    <SelectItem value="submitted">已提交</SelectItem>
                    <SelectItem value="approved">已批准</SelectItem>
                    <SelectItem value="rejected">已拒绝</SelectItem>
                    <SelectItem value="archived">已归档</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 文档列表 */}
              <div className="space-y-3">
                {filteredDocuments.map((document) => (
                  <Card key={document.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{document.name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {getTypeLabel(document.type)}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {getCategoryLabel(document.category)}
                            </Badge>
                            <Badge className={getStatusColor(document.status)}>
                              {getStatusLabel(document.status)}
                            </Badge>
                            {document.digitalSignature?.signed && (
                              <Badge className="bg-purple-100 text-purple-800">
                                <Shield className="h-3 w-3 mr-1" />
                                已签名
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              作者：{document.author}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              创建：{document.createdAt.toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              大小：{formatFileSize(document.size)}
                            </div>
                            {document.pages && (
                              <div className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                页数：{document.pages}页
                              </div>
                            )}
                          </div>
                          
                          {document.notes && (
                            <p className="text-sm text-gray-600 mt-2">{document.notes}</p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <Button variant="outline" size="sm" onClick={() => setSelectedDocument(document)}>
                            <Eye className="h-3 w-3 mr-1" />
                            查看
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="h-3 w-3 mr-1" />
                            下载
                          </Button>
                          {document.status === 'submitted' && (
                            <>
                              <Button 
                                size="sm" 
                                onClick={() => handleDocumentAction(document.id, 'approve')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                批准
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleDocumentAction(document.id, 'reject')}
                              >
                                <FileX className="h-3 w-3 mr-1" />
                                拒绝
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* 纸质卷宗标签页 */}
            <TabsContent value="physical" className="space-y-4">
              <div className="text-center py-12 text-gray-500">
                <Archive className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">纸质卷宗管理</h3>
                <p className="mb-4">管理实体文档的存储位置和状态</p>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  登记纸质文档
                </Button>
              </div>
            </TabsContent>

            {/* 电子印章标签页 */}
            <TabsContent value="seals" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {seals.map((seal) => (
                  <Card key={seal.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{seal.name}</h4>
                          <p className="text-sm text-gray-600">{seal.owner}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getSealTypeColor(seal.type)}>
                            {seal.type === 'institutional' ? '机构' : 
                             seal.type === 'personal' ? '个人' : '司法'}
                          </Badge>
                          <Badge className={getSealStatusColor(seal.status)}>
                            {seal.status === 'active' ? '有效' :
                             seal.status === 'expired' ? '过期' : '已撤销'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        <div>证书ID：{seal.certificateId}</div>
                        <div>有效期：{seal.validFrom.toLocaleDateString()} - {seal.validTo.toLocaleDateString()}</div>
                        <div>使用次数：{seal.usageCount}{seal.maxUsage && `/${seal.maxUsage}`}</div>
                        
                        {seal.maxUsage && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs mb-1">
                              <span>使用进度</span>
                              <span>{Math.round((seal.usageCount / seal.maxUsage) * 100)}%</span>
                            </div>
                            <Progress value={(seal.usageCount / seal.maxUsage) * 100} className="h-2" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" size="sm">
                          <Eye className="h-3 w-3 mr-1" />
                          查看
                        </Button>
                        <Button variant="outline" size="sm" disabled={seal.status !== 'active'}>
                          <Stamp className="h-3 w-3 mr-1" />
                          使用
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 上传文档对话框 */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>上传文档</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="doc-name">文档名称</Label>
              <Input
                id="doc-name"
                value={newDocument.name}
                onChange={(e) => setNewDocument(prev => ({ ...prev, name: e.target.value }))}
                placeholder="请输入文档名称"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="doc-type">文档类型</Label>
                <Select
                  value={newDocument.type}
                  onValueChange={(value: DossierDocument['type']) =>
                    setNewDocument(prev => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="application">申请书</SelectItem>
                    <SelectItem value="evidence">证据材料</SelectItem>
                    <SelectItem value="agreement">协议书</SelectItem>
                    <SelectItem value="decision">决定书</SelectItem>
                    <SelectItem value="notice">通知书</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="doc-category">文档分类</Label>
                <Select
                  value={newDocument.category}
                  onValueChange={(value: DossierDocument['category']) =>
                    setNewDocument(prev => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pre-mediation">调解前</SelectItem>
                    <SelectItem value="mediation">调解中</SelectItem>
                    <SelectItem value="judicial-confirmation">司法确认</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="doc-format">存储格式</Label>
              <Select
                value={newDocument.format}
                onValueChange={(value: DossierDocument['format']) =>
                  setNewDocument(prev => ({ ...prev, format: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="electronic">仅电子版</SelectItem>
                  <SelectItem value="physical">仅纸质版</SelectItem>
                  <SelectItem value="both">电子+纸质</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="doc-notes">备注说明</Label>
              <Textarea
                id="doc-notes"
                value={newDocument.notes}
                onChange={(e) => setNewDocument(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="请输入备注说明（可选）"
                rows={3}
              />
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <div className="text-sm text-gray-600">
                点击上传或拖拽文件到此处
              </div>
              <div className="text-xs text-gray-500 mt-1">
                支持 PDF、Word、图片等格式，最大 50MB
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                取消
              </Button>
              <Button onClick={handleUploadDocument}>
                <Upload className="h-4 w-4 mr-2" />
                上传文档
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 文档详情对话框 */}
      {selectedDocument && (
        <Dialog open={!!selectedDocument} onOpenChange={() => setSelectedDocument(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedDocument.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">文档类型：</span>
                  {getTypeLabel(selectedDocument.type)}
                </div>
                <div>
                  <span className="font-medium">分类：</span>
                  {getCategoryLabel(selectedDocument.category)}
                </div>
                <div>
                  <span className="font-medium">格式：</span>
                  {selectedDocument.format === 'electronic' ? '电子版' :
                   selectedDocument.format === 'physical' ? '纸质版' : '电子+纸质'}
                </div>
                <div>
                  <span className="font-medium">状态：</span>
                  <Badge className={getStatusColor(selectedDocument.status)}>
                    {getStatusLabel(selectedDocument.status)}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">作者：</span>
                  {selectedDocument.author}
                </div>
                <div>
                  <span className="font-medium">大小：</span>
                  {formatFileSize(selectedDocument.size)}
                </div>
                <div>
                  <span className="font-medium">创建时间：</span>
                  {selectedDocument.createdAt.toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">更新时间：</span>
                  {selectedDocument.updatedAt.toLocaleString()}
                </div>
              </div>

              {selectedDocument.digitalSignature && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <h4 className="font-medium text-purple-800 mb-2">数字签名信息</h4>
                  <div className="text-sm space-y-1">
                    <div>签名人：{selectedDocument.digitalSignature.signedBy}</div>
                    <div>签名时间：{selectedDocument.digitalSignature.signedAt.toLocaleString()}</div>
                    <div>证书ID：{selectedDocument.digitalSignature.certificateId}</div>
                  </div>
                </div>
              )}

              {selectedDocument.physicalLocation && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-2">纸质文档位置</h4>
                  <div className="text-sm">
                    存储位置：{selectedDocument.physicalLocation}
                  </div>
                </div>
              )}

              {selectedDocument.notes && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-medium text-yellow-800 mb-2">备注说明</h4>
                  <div className="text-sm">{selectedDocument.notes}</div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedDocument(null)}>
                  关闭
                </Button>
                <Button>
                  <Download className="h-4 w-4 mr-2" />
                  下载
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
