// src/app/(private)/mediation/management/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Eye,
  MessageSquare,
  FileText,
  Users
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

// 模拟调解案件数据
const mockMediationCases = [
  {
    id: 'med-001',
    title: '合同纠纷调解',
    applicant: '张三',
    respondent: '李四公司',
    mediator: '王调解员',
    status: 'ongoing',
    priority: 'high',
    amount: '50万元',
    createdAt: '2024-01-15',
    scheduledAt: '2024-01-20 14:00',
    progress: 60
  },
  {
    id: 'med-002',
    title: '投资争议调解',
    applicant: '赵五',
    respondent: '钱六',
    mediator: '李调解员',
    status: 'completed',
    priority: 'normal',
    amount: '100万元',
    createdAt: '2024-01-10',
    scheduledAt: '2024-01-18 10:00',
    progress: 100
  },
  {
    id: 'med-003',
    title: '劳动争议调解',
    applicant: '孙七',
    respondent: '周八公司',
    mediator: '未分配',
    status: 'pending',
    priority: 'low',
    amount: '5万元',
    createdAt: '2024-01-18',
    scheduledAt: '',
    progress: 0
  }
];

export default function MediationManagementPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'ongoing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待处理';
      case 'ongoing': return '进行中';
      case 'completed': return '已完成';
      case 'cancelled': return '已取消';
      default: return '未知';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'ongoing': return <AlertCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredCases = mockMediationCases.filter(case_ => {
    const matchesSearch = case_.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         case_.applicant.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         case_.respondent.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || case_.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || case_.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const stats = {
    total: mockMediationCases.length,
    pending: mockMediationCases.filter(c => c.status === 'pending').length,
    ongoing: mockMediationCases.filter(c => c.status === 'ongoing').length,
    completed: mockMediationCases.filter(c => c.status === 'completed').length
  };

  return (
    <div className="container mx-auto p-8 space-y-8 animate-fade-in">
      {/* 页面头部 */}
      <div className="animate-slide-up">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">调解管理</h1>
        <p className="text-lg text-gray-600">管理和跟踪所有调解案件</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-slide-up" style={{animationDelay: '0.1s'}}>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">总案件数</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">待处理</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">进行中</p>
                <p className="text-2xl font-bold text-blue-600">{stats.ongoing}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">已完成</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex flex-col lg:flex-row gap-4 animate-slide-up" style={{animationDelay: '0.2s'}}>
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="搜索案件标题、当事人..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-muted-foreground">状态：</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="pending">待处理</SelectItem>
                <SelectItem value="ongoing">进行中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="cancelled">已取消</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">优先级：</span>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="high">高</SelectItem>
                <SelectItem value="normal">普通</SelectItem>
                <SelectItem value="low">低</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 案件列表 */}
      <div className="space-y-4 animate-slide-up" style={{animationDelay: '0.3s'}}>
        {filteredCases.map((case_, index) => (
          <Card key={case_.id} className="card hover-lift">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{case_.title}</h3>
                    <Badge className={`${getStatusColor(case_.status)} border-0`}>
                      {getStatusIcon(case_.status)}
                      <span className="ml-1">{getStatusText(case_.status)}</span>
                    </Badge>
                    <Badge className={`${getPriorityColor(case_.priority)} border-0`}>
                      {case_.priority === 'high' ? '高优先级' : case_.priority === 'normal' ? '普通' : '低优先级'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>申请人：{case_.applicant}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>被申请人：{case_.respondent}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      <span>调解员：{case_.mediator}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                    <div>争议金额：{case_.amount}</div>
                    <div>创建时间：{formatDate(case_.createdAt)}</div>
                    <div>预定时间：{case_.scheduledAt || '待安排'}</div>
                  </div>

                  {case_.status === 'ongoing' && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>调解进度</span>
                        <span>{case_.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${case_.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/mediation/${case_.id}`)}
                    title="查看详情"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => alert('评论功能开发中...')}
                    title="添加评论"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/mediation/${case_.id}/manage`)}
                    title="管理调解"
                  >
                    管理
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCases.length === 0 && (
        <Card className="animate-slide-up" style={{animationDelay: '0.3s'}}>
          <CardContent className="p-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">暂无调解案件</h3>
            <p className="text-muted-foreground">当前没有符合筛选条件的调解案件</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
