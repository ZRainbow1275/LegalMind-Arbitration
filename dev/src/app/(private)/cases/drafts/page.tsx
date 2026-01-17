// src/app/(private)/cases/drafts/page.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useDraftsStore } from '@/store/drafts';
import {
  FileText,
  Search,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Clock,
  MoreHorizontal,
  Copy,
  Download,
  Eye
} from 'lucide-react';
import Link from 'next/link';

export default function DraftsPage() {
  const { drafts, deleteDraft } = useDraftsStore();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDrafts = drafts.filter(draft =>
    draft.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    draft.caseType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    draft.applicant.toLowerCase().includes(searchTerm.toLowerCase()) ||
    draft.respondent.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleDeleteDraft = (id: string) => {
    if (confirm('确定要删除这个草稿吗？')) {
      deleteDraft(id);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '待提交': return 'bg-green-100 text-green-800';
      case '待完善': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">草稿箱</h1>
          <p className="text-gray-600 mt-1">管理您保存的仲裁申请草稿</p>
        </div>
        <Link href="/cases/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            新建仲裁
          </Button>
        </Link>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总草稿数</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{drafts.length}</div>
            <p className="text-xs text-muted-foreground">
              个保存的草稿
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待完善</CardTitle>
            <Edit className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {drafts.filter(d => d.status === '待完善').length}
            </div>
            <p className="text-xs text-muted-foreground">
              需要继续完善
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待提交</CardTitle>
            <Clock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {drafts.filter(d => d.status === '待提交').length}
            </div>
            <p className="text-xs text-muted-foreground">
              可以提交申请
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均进度</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {drafts.length > 0 ? Math.round(drafts.reduce((sum, d) => sum + d.progress, 0) / drafts.length) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              完成度
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardHeader>
          <CardTitle>草稿列表</CardTitle>
          <CardDescription>查看和管理您的申请草稿</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索草稿..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* 草稿列表 */}
          <div className="space-y-4">
            {filteredDrafts.map((draft) => (
              <div key={draft.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{draft.title}</h3>
                      <Badge className={getStatusColor(draft.status)}>
                        {draft.status}
                      </Badge>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">
                      {draft.caseType} • 申请人：{draft.applicant} • 被申请人：{draft.respondent}
                    </p>
                    
                    {/* 进度条 */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                        <span>完成进度</span>
                        <span>{draft.progress}%</span>
                      </div>
                      <Progress value={draft.progress} className="h-2" />
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>争议金额：¥{draft.amount}</span>
                      <span>最后修改：{formatDate(draft.lastModified)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/cases/new?draftId=${draft.id}`}>
                        <Edit className="h-4 w-4 mr-2" />
                        继续编辑
                      </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => alert('复制草稿功能开发中')}>
                          <Copy className="h-4 w-4 mr-2" />
                          复制草稿
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => alert('导出草稿功能开发中')}>
                          <Download className="h-4 w-4 mr-2" />
                          导出草稿
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteDraft(draft.id)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          删除草稿
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredDrafts.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? '未找到匹配的草稿' : '暂无草稿'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm ? '尝试使用其他关键词搜索' : '开始创建您的第一个仲裁申请'}
              </p>
              <Link href="/cases/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  新建申请
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
