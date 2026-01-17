// src/app/(private)/documents/templates/page.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Filter, 
  FileText, 
  Plus,
  Edit,
  Trash2,
  Copy,
  Download,
  Upload,
  Eye,
  Settings,
  Archive,
  Star,
  Clock
} from 'lucide-react';

// 模拟模板数据
const mockTemplates = [
  {
    id: 'template-1',
    name: '仲裁申请书模板',
    category: '申请文件',
    description: '标准的仲裁申请书模板，包含所有必要字段',
    version: 'v2.1',
    lastModified: '2024-02-15',
    author: '系统管理员',
    usage: 156,
    status: 'active',
    type: 'system',
    fields: ['申请人信息', '被申请人信息', '仲裁请求', '事实与理由']
  },
  {
    id: 'template-2',
    name: '答辩书模板',
    category: '答辩文件',
    description: '被申请人答辩书标准模板',
    version: 'v1.8',
    lastModified: '2024-02-10',
    author: '张法官',
    usage: 89,
    status: 'active',
    type: 'custom',
    fields: ['被申请人信息', '答辩意见', '反驳理由', '反请求']
  },
  {
    id: 'template-3',
    name: '证据清单模板',
    category: '证据材料',
    description: '证据材料整理和提交清单模板',
    version: 'v1.5',
    lastModified: '2024-02-08',
    author: '李秘书',
    usage: 234,
    status: 'active',
    type: 'system',
    fields: ['证据编号', '证据名称', '证据来源', '证明目的']
  },
  {
    id: 'template-4',
    name: '调解协议书模板',
    category: '调解文件',
    description: '调解成功后签署的协议书模板',
    version: 'v2.0',
    lastModified: '2024-02-05',
    author: '王调解员',
    usage: 67,
    status: 'draft',
    type: 'custom',
    fields: ['当事人信息', '争议概述', '调解结果', '履行方式']
  },
  {
    id: 'template-5',
    name: '裁决书模板',
    category: '裁决文件',
    description: '仲裁庭裁决书标准模板',
    version: 'v3.2',
    lastModified: '2024-02-12',
    author: '系统管理员',
    usage: 45,
    status: 'active',
    type: 'system',
    fields: ['案件基本情况', '当事人主张', '争议焦点', '本庭认为', '裁决结果']
  }
];

export default function DocumentTemplatesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('all');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '启用中';
      case 'draft': return '草稿';
      case 'archived': return '已归档';
      default: return '未知';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'system': return 'bg-blue-100 text-blue-800';
      case 'custom': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'system': return '系统模板';
      case 'custom': return '自定义';
      default: return '未知';
    }
  };

  const filteredTemplates = mockTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesTab = activeTab === 'all' || template.status === activeTab;
    return matchesSearch && matchesCategory && matchesTab;
  });

  const categories = ['all', ...Array.from(new Set(mockTemplates.map(t => t.category)))];

  return (
    <div className="container mx-auto p-8 space-y-8 animate-fade-in">
      {/* 页面头部 */}
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">文书模板管理</h1>
          <p className="text-lg text-gray-600">管理和维护法律文书模板库</p>
        </div>
        <Button size="lg" className="btn-primary btn-ripple hover-lift shadow-brand">
          <Plus className="h-5 w-5 mr-2" />
          新建模板
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-slide-up" style={{animationDelay: '0.1s'}}>
        <Card className="card hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">总模板数</p>
                <p className="text-3xl font-bold text-blue-600">{mockTemplates.length}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">启用中</p>
                <p className="text-3xl font-bold text-green-600">
                  {mockTemplates.filter(t => t.status === 'active').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <Star className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">总使用次数</p>
                <p className="text-3xl font-bold text-orange-600">
                  {mockTemplates.reduce((sum, t) => sum + t.usage, 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Copy className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">自定义模板</p>
                <p className="text-3xl font-bold text-purple-600">
                  {mockTemplates.filter(t => t.type === 'custom').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Settings className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和筛选 */}
      <Card className="animate-slide-up" style={{animationDelay: '0.2s'}}>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索模板名称或描述..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">全部分类</option>
                {categories.slice(1).map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <Button variant="outline" className="hover-lift">
                <Filter className="h-4 w-4 mr-2" />
                高级筛选
              </Button>
              <Button variant="outline" className="hover-lift">
                <Upload className="h-4 w-4 mr-2" />
                导入模板
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 模板列表标签页 */}
      <Card className="animate-slide-up" style={{animationDelay: '0.3s'}}>
        <CardHeader>
          <CardTitle className="text-xl">模板库</CardTitle>
          <CardDescription>
            管理所有文书模板
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="active">启用中</TabsTrigger>
              <TabsTrigger value="draft">草稿</TabsTrigger>
              <TabsTrigger value="archived">已归档</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              <div className="space-y-4">
                {filteredTemplates.map((template, index) => (
                  <div
                    key={template.id}
                    className="p-6 border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 animate-fade-in"
                    style={{animationDelay: `${0.4 + index * 0.1}s`}}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                          <FileText className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                            <Badge className={getStatusColor(template.status)}>
                              {getStatusText(template.status)}
                            </Badge>
                            <Badge className={getTypeColor(template.type)}>
                              {getTypeText(template.type)}
                            </Badge>
                          </div>
                          <p className="text-gray-600 mb-3">{template.description}</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500">
                            <div>
                              <span className="font-medium">版本：</span>
                              {template.version}
                            </div>
                            <div>
                              <span className="font-medium">使用次数：</span>
                              {template.usage}
                            </div>
                            <div>
                              <span className="font-medium">作者：</span>
                              {template.author}
                            </div>
                            <div>
                              <span className="font-medium">更新时间：</span>
                              {template.lastModified}
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="text-sm text-gray-500 mr-2">包含字段：</span>
                            <div className="inline-flex flex-wrap gap-1">
                              {template.fields.slice(0, 3).map((field, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {field}
                                </Badge>
                              ))}
                              {template.fields.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{template.fields.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" className="hover-lift">
                          <Eye className="h-4 w-4 mr-1" />
                          预览
                        </Button>
                        <Button variant="outline" size="sm" className="hover-lift">
                          <Copy className="h-4 w-4 mr-1" />
                          复制
                        </Button>
                        <Button variant="outline" size="sm" className="hover-lift">
                          <Edit className="h-4 w-4 mr-1" />
                          编辑
                        </Button>
                        <Button variant="outline" size="sm" className="hover-lift">
                          <Download className="h-4 w-4 mr-1" />
                          导出
                        </Button>
                        {template.type === 'custom' && (
                          <Button variant="outline" size="sm" className="hover-lift text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 空状态 */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-16 animate-fade-in">
          <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">未找到匹配的模板</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            尝试调整搜索条件或创建新模板
          </p>
          <Button className="btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            创建新模板
          </Button>
        </div>
      )}
    </div>
  );
}
