// src/app/(private)/arbitrator/cases/[id]/page.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Gavel, 
  FileText, 
  Users, 
  MessageSquare,
  Send,
  Clock,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Download,
  Eye,
  Plus,
  Settings
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CaseProgress } from '@/components/ui/progress-stepper';
import { formatDate } from '@/lib/utils';

// 模拟案件数据
const mockCaseData = {
  id: 'case-001',
  caseNumber: 'ARB-2024-010',
  title: '软件开发合同争议案',
  caseType: '合同纠纷',
  status: 'hearing_in_progress',
  disputeAmount: 1500000,
  applicantId: '某科技公司',
  respondentId: '某制造企业',
  description: '双方就软件开发合同履行产生争议',
  createdAt: '2024-01-15',
  deadline: '2024-03-15',
  currentStage: '庭审进行'
};

// 模拟程序指令数据
const mockProceduralOrders = [
  {
    id: 'order-001',
    type: '补充证据',
    content: '请申请人在2024-02-20前补充提交与软件验收相关的邮件往来记录',
    target: '申请人',
    issuedDate: '2024-02-15',
    deadline: '2024-02-20',
    status: '待执行'
  },
  {
    id: 'order-002',
    type: '延期开庭',
    content: '鉴于被申请人代理律师因故无法出席，庭审时间延期至2024-02-25 14:00',
    target: '双方',
    issuedDate: '2024-02-10',
    deadline: null,
    status: '已执行'
  }
];

// 模拟仲裁庭合议记录
const mockCaucusMessages = [
  {
    id: 'msg-001',
    author: '首席仲裁员',
    content: '关于软件验收标准的争议，建议重点审查双方签署的技术规格书',
    timestamp: '2024-02-15 10:30',
    type: 'discussion'
  },
  {
    id: 'msg-002',
    author: '仲裁员A',
    content: '同意，另外需要关注申请人是否按约定提供了必要的技术支持',
    timestamp: '2024-02-15 10:35',
    type: 'discussion'
  },
  {
    id: 'msg-003',
    author: '仲裁员B',
    content: '建议在下次庭审中要求双方技术负责人出庭说明具体技术问题',
    timestamp: '2024-02-15 10:40',
    type: 'suggestion'
  }
];

export default function ArbitratorCaseDetailPage() {
  const params = useParams<{ id: string }>();
  const caseId = Array.isArray(params?.id) ? params.id[0] : params?.id ?? '';
  const [activeTab, setActiveTab] = useState('overview');
  const [newOrderType, setNewOrderType] = useState('');
  const [newOrderContent, setNewOrderContent] = useState('');
  const [newOrderTarget, setNewOrderTarget] = useState('');
  const [newCaucusMessage, setNewCaucusMessage] = useState('');

  const caseData = mockCaseData;

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

  const handleIssueOrder = () => {
    if (!newOrderType || !newOrderContent || !newOrderTarget) return;
    
    alert('程序指令已发布！');
    setNewOrderType('');
    setNewOrderContent('');
    setNewOrderTarget('');
  };

  const handleSendCaucusMessage = () => {
    if (!newCaucusMessage.trim()) return;
    
    alert('合议消息已发送！');
    setNewCaucusMessage('');
  };

  return (
    <div className="container mx-auto p-8 max-w-6xl animate-fade-in">
      {/* 页面头部 */}
      <div className="flex items-center justify-between mb-8 animate-slide-up">
        <div className="flex items-center space-x-4">
          <Link href="/arbitrator/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回工作台
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{caseData.title}</h1>
              <Badge className="bg-blue-100 text-blue-800">
                庭审中
              </Badge>
            </div>
            <p className="text-gray-600">{caseData.caseNumber} - {caseData.caseType}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Link href={`/arbitrator/cases/${caseId}/award-editor`}>
            <Button size="lg" className="btn-primary btn-ripple hover-lift shadow-brand px-6 py-3">
              <FileText className="h-5 w-5 mr-3" />
              制作裁决书
            </Button>
          </Link>
          <Button variant="outline" size="lg" className="hover-lift px-6 py-3">
            <Settings className="h-5 w-5 mr-2" />
            案件设置
          </Button>
        </div>
      </div>

      {/* 案件进度 */}
      <Card className="mb-8 animate-slide-up" style={{animationDelay: '0.1s'}}>
        <CardContent className="p-6">
          <CaseProgress 
            currentStage={getCurrentStage(caseData.status)}
            className="w-full"
          />
        </CardContent>
      </Card>

      {/* 主要内容标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-slide-up" style={{animationDelay: '0.2s'}}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">案件概览</TabsTrigger>
          <TabsTrigger value="orders">程序指令</TabsTrigger>
          <TabsTrigger value="caucus">仲裁庭合议</TabsTrigger>
          <TabsTrigger value="documents">案件材料</TabsTrigger>
        </TabsList>

        {/* 案件概览 */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">基本信息</CardTitle>
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
                <div>
                  <label className="text-sm font-medium text-gray-500">案件描述</label>
                  <p className="text-sm text-gray-900 mt-1">{caseData.description}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">关键日期</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">立案日期</span>
                  </div>
                  <span className="text-sm text-gray-600">{formatDate(caseData.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <span className="text-sm">审理期限</span>
                  </div>
                  <span className="text-sm text-gray-600">{caseData.deadline}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-sm">下次庭审</span>
                  </div>
                  <span className="text-sm text-red-600">2024-02-25 14:00</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 程序指令 */}
        <TabsContent value="orders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <FileText className="h-5 w-5 text-orange-500" />
                <span>发布新指令</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">指令类型</label>
                  <Select value={newOrderType} onValueChange={setNewOrderType}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择指令类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="补充证据">补充证据</SelectItem>
                      <SelectItem value="延期开庭">延期开庭</SelectItem>
                      <SelectItem value="提交答辩">提交答辩</SelectItem>
                      <SelectItem value="其他">其他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">发送对象</label>
                  <Select value={newOrderTarget} onValueChange={setNewOrderTarget}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择发送对象" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="申请人">申请人</SelectItem>
                      <SelectItem value="被申请人">被申请人</SelectItem>
                      <SelectItem value="双方">双方</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">指令内容</label>
                <Textarea
                  placeholder="请输入具体的程序指令内容..."
                  value={newOrderContent}
                  onChange={(e) => setNewOrderContent(e.target.value)}
                  className="min-h-24"
                />
              </div>
              <Button onClick={handleIssueOrder} className="btn-primary">
                <Send className="h-4 w-4 mr-2" />
                发布指令
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">指令历史</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockProceduralOrders.map((order) => (
                  <div key={order.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline">{order.type}</Badge>
                        <Badge className={order.status === '已执行' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                          {order.status}
                        </Badge>
                      </div>
                      <span className="text-sm text-gray-500">{order.issuedDate}</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{order.content}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>发送对象：{order.target}</span>
                      {order.deadline && <span>截止时间：{order.deadline}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 仲裁庭合议 */}
        <TabsContent value="caucus" className="space-y-6">
          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
            <CardHeader>
              <CardTitle className="text-lg text-purple-800 flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>仲裁庭内部合议</span>
              </CardTitle>
              <CardDescription className="text-purple-700">
                此区域仅限仲裁庭成员查看，所有讨论内容严格保密
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {mockCaucusMessages.map((message) => (
                  <div key={message.id} className="p-3 bg-white rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-purple-900">{message.author}</span>
                      <span className="text-xs text-purple-600">{message.timestamp}</span>
                    </div>
                    <p className="text-sm text-gray-700">{message.content}</p>
                  </div>
                ))}
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <Textarea
                  placeholder="输入合议内容..."
                  value={newCaucusMessage}
                  onChange={(e) => setNewCaucusMessage(e.target.value)}
                  className="min-h-20"
                />
                <Button onClick={handleSendCaucusMessage} className="btn-primary">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  发送消息
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 案件材料 */}
        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">案件材料</CardTitle>
              <CardDescription>
                查看和管理案件相关的所有材料
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">仲裁申请书</h4>
                    <Badge className="bg-green-100 text-green-800">已提交</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">申请人提交的正式仲裁申请</p>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    查看
                  </Button>
                </div>
                
                <div className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">答辩书</h4>
                    <Badge className="bg-green-100 text-green-800">已提交</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">被申请人的答辩意见</p>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    查看
                  </Button>
                </div>
                
                <div className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">证据材料</h4>
                    <Badge className="bg-blue-100 text-blue-800">15份</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">双方提交的证据文件</p>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    查看全部
                  </Button>
                </div>
                
                <div className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">庭审笔录</h4>
                    <Badge className="bg-orange-100 text-orange-800">进行中</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">庭审过程记录</p>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    查看
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
