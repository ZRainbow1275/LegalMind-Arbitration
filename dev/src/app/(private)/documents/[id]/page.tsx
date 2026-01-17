// src/app/(private)/documents/[id]/page.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  Download, 
  Eye, 
  Share2,
  FileText,
  Calendar,
  User,
  CheckCircle,
  Clock,
  AlertTriangle,
  Edit,
  Trash2,
  MessageSquare,
  History,
  Lock,
  Unlock
} from 'lucide-react';
import Link from 'next/link';

// 模拟文档详细数据
const mockDocumentDetail = {
  id: 'doc-001',
  name: '仲裁申请书.pdf',
  type: 'application',
  caseNumber: 'ARB-2024-001',
  status: 'approved',
  uploadDate: '2024-02-10',
  uploader: '张某',
  size: '2.5MB',
  category: '申请文件',
  description: '针对软件开发合同争议的正式仲裁申请书',
  
  // 文档信息
  metadata: {
    pages: 15,
    format: 'PDF',
    version: '1.2',
    language: '中文',
    encryption: false,
    lastModified: '2024-02-10 14:30:00'
  },
  
  // 审核信息
  approval: {
    reviewer: '仲裁秘书李某',
    reviewDate: '2024-02-11',
    status: 'approved',
    comments: '文档格式规范，内容完整，符合仲裁申请要求。'
  },
  
  // 版本历史
  versions: [
    {
      version: '1.2',
      date: '2024-02-10 14:30',
      uploader: '张某',
      changes: '修正了争议金额计算错误',
      status: 'current'
    },
    {
      version: '1.1',
      date: '2024-02-10 10:15',
      uploader: '张某',
      changes: '补充了证据清单',
      status: 'archived'
    },
    {
      version: '1.0',
      date: '2024-02-09 16:45',
      uploader: '张某',
      changes: '初始版本',
      status: 'archived'
    }
  ],
  
  // 相关人员
  relatedPersons: [
    { name: '张某', role: '申请人', permission: 'owner' },
    { name: '李律师', role: '申请人代理', permission: 'edit' },
    { name: '王某', role: '被申请人', permission: 'view' },
    { name: '赵律师', role: '被申请人代理', permission: 'view' },
    { name: '仲裁庭', role: '仲裁员', permission: 'view' }
  ]
};

export default function DocumentDetailPage() {
  const [activeTab, setActiveTab] = useState('preview');
  const document = mockDocumentDetail;

  // 备注功能状态管理
  const [newNote, setNewNote] = useState('');
  const [notes, setNotes] = useState([
    {
      id: 'note-1',
      content: '这是一个重要的合同文档，需要重点关注第三条款的内容。',
      author: '张律师',
      createdAt: '2024-01-15T10:30:00',
      updatedAt: '2024-01-15T10:30:00'
    },
    {
      id: 'note-2',
      content: '文档格式符合要求，内容完整，建议通过审核。',
      author: '李秘书',
      createdAt: '2024-01-16T14:20:00',
      updatedAt: '2024-01-16T14:20:00'
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return '已批准';
      case 'pending': return '待审核';
      case 'rejected': return '已拒绝';
      default: return '未知';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return CheckCircle;
      case 'pending': return Clock;
      case 'rejected': return AlertTriangle;
      default: return FileText;
    }
  };

  // 添加备注处理函数
  const handleAddNote = () => {
    if (newNote.trim()) {
      const note = {
        id: `note-${Date.now()}`,
        content: newNote.trim(),
        author: '当前用户', // 实际应用中应该从用户状态获取
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setNotes(prev => [note, ...prev]);
      setNewNote('');

      // 这里可以添加API调用来保存备注到后端
      console.log('添加备注:', note);
    }
  };

  // 删除备注处理函数
  const handleDeleteNote = (noteId: string) => {
    if (confirm('确定要删除这条备注吗？')) {
      setNotes(prev => prev.filter(note => note.id !== noteId));

      // 这里可以添加API调用来删除后端的备注
      console.log('删除备注:', noteId);
    }
  };

  const getPermissionColor = (permission: string) => {
    switch (permission) {
      case 'owner': return 'bg-purple-100 text-purple-800';
      case 'edit': return 'bg-blue-100 text-blue-800';
      case 'view': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPermissionText = (permission: string) => {
    switch (permission) {
      case 'owner': return '所有者';
      case 'edit': return '编辑';
      case 'view': return '查看';
      default: return '未知';
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-6xl animate-fade-in">
      {/* 页面头部 */}
      <div className="flex items-center justify-between mb-8 animate-slide-up">
        <div className="flex items-center space-x-4">
          <Link href="/documents">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回文档库
            </Button>
          </Link>
        </div>
      </div>

      {/* 文档基本信息卡片 */}
      <Card className="mb-8 animate-slide-up" style={{animationDelay: '0.1s'}}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">{document.name}</h1>
                  <Badge className={getStatusColor(document.status)}>
                    {getStatusText(document.status)}
                  </Badge>
                </div>
                <p className="text-gray-600 mb-4">{document.description}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">案件编号：</span>
                    <span className="font-medium">{document.caseNumber}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">文件大小：</span>
                    <span className="font-medium">{document.size}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">上传时间：</span>
                    <span className="font-medium">{document.uploadDate}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">上传人：</span>
                    <span className="font-medium">{document.uploader}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="lg" className="hover-lift">
                <Share2 className="h-5 w-5 mr-2" />
                分享
              </Button>
              <Button variant="outline" size="lg" className="hover-lift">
                <Download className="h-5 w-5 mr-2" />
                下载
              </Button>
              <Button size="lg" className="btn-primary btn-ripple hover-lift shadow-brand" onClick={() => alert('在线编辑功能已启动，正在加载编辑器...')}>
                <Edit className="h-5 w-5 mr-2" />
                在线编辑
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 详细信息标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-slide-up" style={{animationDelay: '0.2s'}}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="preview">预览</TabsTrigger>
          <TabsTrigger value="info">详细信息</TabsTrigger>
          <TabsTrigger value="versions">版本历史</TabsTrigger>
          <TabsTrigger value="permissions">权限管理</TabsTrigger>
          <TabsTrigger value="comments">备注</TabsTrigger>
        </TabsList>

        {/* 预览标签页 */}
        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5 text-blue-500" />
                <span>文档预览</span>
              </CardTitle>
              <CardDescription>
                在线预览文档内容
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border border-gray-200 rounded-lg p-8 bg-gray-50 min-h-96 flex items-center justify-center">
                <div className="text-center">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">文档预览</h3>
                  <p className="text-gray-600 mb-4">
                    {document.name} - {document.metadata.pages} 页
                  </p>
                  <div className="space-y-2">
                    <Button className="btn-primary" onClick={() => alert('在线浏览功能已启动，正在加载文档内容...')}>
                      <Eye className="h-4 w-4 mr-2" />
                      打开浏览
                    </Button>
                    <p className="text-xs text-gray-500">
                      支持 PDF、Word、图片等格式的在线浏览
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 详细信息标签页 */}
        <TabsContent value="info" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-green-500" />
                  <span>文档属性</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">页数</label>
                    <p className="text-sm text-gray-900">{document.metadata.pages}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">格式</label>
                    <p className="text-sm text-gray-900">{document.metadata.format}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">版本</label>
                    <p className="text-sm text-gray-900">{document.metadata.version}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">语言</label>
                    <p className="text-sm text-gray-900">{document.metadata.language}</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <label className="text-sm font-medium text-gray-500">最后修改</label>
                  <p className="text-sm text-gray-900">{document.metadata.lastModified}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {document.metadata.encryption ? (
                    <>
                      <Lock className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-600">已加密</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600">未加密</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-orange-500" />
                  <span>审核信息</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">审核人</label>
                  <p className="text-sm text-gray-900">{document.approval.reviewer}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">审核时间</label>
                  <p className="text-sm text-gray-900">{document.approval.reviewDate}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">审核状态</label>
                  <Badge className={getStatusColor(document.approval.status)}>
                    {getStatusText(document.approval.status)}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">审核意见</label>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {document.approval.comments}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 版本历史标签页 */}
        <TabsContent value="versions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <History className="h-5 w-5 text-purple-500" />
                <span>版本历史</span>
              </CardTitle>
              <CardDescription>
                查看文档的所有版本变更记录
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {document.versions.map((version, index) => (
                  <div key={version.version} className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${
                        version.status === 'current' ? 'bg-green-500' : 'bg-gray-300'
                      }`}></div>
                      {index < document.versions.length - 1 && (
                        <div className="w-px h-12 bg-gray-200 mt-2"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">版本 {version.version}</h4>
                          {version.status === 'current' && (
                            <Badge className="bg-green-100 text-green-800">当前版本</Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            查看
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4 mr-1" />
                            下载
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{version.changes}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          {version.uploader}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {version.date}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 权限管理标签页 */}
        <TabsContent value="permissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lock className="h-5 w-5 text-red-500" />
                <span>权限管理</span>
              </CardTitle>
              <CardDescription>
                管理文档的访问权限
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {document.relatedPersons.map((person, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {person.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{person.name}</h4>
                        <p className="text-sm text-gray-600">{person.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getPermissionColor(person.permission)}>
                        {getPermissionText(person.permission)}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 备注标签页 */}
        <TabsContent value="comments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-blue-500" />
                <span>文档备注</span>
              </CardTitle>
              <CardDescription>
                添加和管理文档备注信息
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 添加备注 */}
              <div className="space-y-2">
                <Label htmlFor="new-note">添加备注</Label>
                <Textarea
                  id="new-note"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="输入备注内容..."
                  rows={3}
                />
                <Button
                  className="btn-primary"
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  添加备注
                </Button>
              </div>

              <Separator />

              {/* 备注列表 */}
              <div className="space-y-3">
                <h4 className="font-medium">历史备注</h4>
                <div className="space-y-3">
                  {notes.length > 0 ? (
                    notes.map((note) => (
                      <div key={note.id} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm">{note.content}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                              <span>{note.author}</span>
                              <span>•</span>
                              <span>{new Date(note.createdAt).toLocaleString('zh-CN')}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteNote(note.id)}
                            title="删除备注"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>暂无备注，点击上方按钮添加第一条备注</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
