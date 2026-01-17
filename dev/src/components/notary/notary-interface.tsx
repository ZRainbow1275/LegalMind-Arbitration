// dev/src/components/notary/notary-interface.tsx
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
import {
  FileText,
  Stamp,
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  Upload,
  Download,
  Eye,
  Send,
  Building,
  User,
  Calendar,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Printer
} from 'lucide-react';

interface NotaryRequest {
  id: string;
  type: 'agreement' | 'signature' | 'document' | 'identity' | 'evidence';
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requestDate: Date;
  completionDate?: Date;
  caseId?: string;
  documents: string[];
  fee: number;
  notaryOffice: string;
  notaryOfficer?: string;
  notes?: string;
}

interface NotaryOffice {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  businessHours: string;
  services: string[];
  rating: number;
  distance: number;
  available: boolean;
}

interface NotaryInterfaceProps {
  caseId?: string;
  documentId?: string;
  onNotaryComplete?: (notaryId: string) => void;
  className?: string;
}

const mockNotaryOffices: NotaryOffice[] = [
  {
    id: 'notary-001',
    name: '北京市第一公证处',
    address: '北京市朝阳区建国门外大街1号',
    phone: '010-12345678',
    email: 'service@bj1notary.gov.cn',
    businessHours: '周一至周五 9:00-17:00',
    services: ['合同公证', '签名公证', '文件公证', '身份认证', '证据保全'],
    rating: 4.8,
    distance: 2.5,
    available: true
  },
  {
    id: 'notary-002',
    name: '北京市海淀公证处',
    address: '北京市海淀区中关村大街59号',
    phone: '010-87654321',
    email: 'info@hdnotary.gov.cn',
    businessHours: '周一至周六 8:30-17:30',
    services: ['调解协议公证', '仲裁协议公证', '电子签名认证', '远程公证'],
    rating: 4.6,
    distance: 5.2,
    available: true
  }
];

const mockNotaryRequests: NotaryRequest[] = [
  {
    id: 'req-001',
    type: 'agreement',
    title: '调解协议公证',
    description: '对案件CASE-2024-001的调解协议进行公证',
    status: 'processing',
    priority: 'high',
    requestDate: new Date('2024-02-14T10:00:00'),
    caseId: 'CASE-2024-001',
    documents: ['调解协议书.pdf', '当事人身份证明.pdf'],
    fee: 200,
    notaryOffice: '北京市第一公证处',
    notaryOfficer: '张公证员'
  }
];

export function NotaryInterface({ 
  caseId, 
  documentId, 
  onNotaryComplete,
  className 
}: NotaryInterfaceProps) {
  const [activeTab, setActiveTab] = useState<'request' | 'offices' | 'history'>('request');
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState<NotaryOffice | null>(null);
  const [requests, setRequests] = useState<NotaryRequest[]>(mockNotaryRequests);

  const [newRequest, setNewRequest] = useState({
    type: 'agreement' as NotaryRequest['type'],
    title: '',
    description: '',
    priority: 'medium' as NotaryRequest['priority'],
    documents: [] as string[],
    notaryOffice: ''
  });

  const getTypeLabel = (type: NotaryRequest['type']) => {
    const labels = {
      agreement: '协议公证',
      signature: '签名公证',
      document: '文件公证',
      identity: '身份认证',
      evidence: '证据保全'
    };
    return labels[type];
  };

  const getTypeColor = (type: NotaryRequest['type']) => {
    const colors = {
      agreement: 'bg-blue-100 text-blue-800',
      signature: 'bg-green-100 text-green-800',
      document: 'bg-orange-100 text-orange-800',
      identity: 'bg-purple-100 text-purple-800',
      evidence: 'bg-red-100 text-red-800'
    };
    return colors[type];
  };

  const getStatusColor = (status: NotaryRequest['status']) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status];
  };

  const getStatusLabel = (status: NotaryRequest['status']) => {
    const labels = {
      pending: '待处理',
      processing: '处理中',
      completed: '已完成',
      rejected: '已拒绝'
    };
    return labels[status];
  };

  const getPriorityColor = (priority: NotaryRequest['priority']) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority];
  };

  const handleSubmitRequest = () => {
    if (!newRequest.title || !newRequest.notaryOffice) return;

    const request: NotaryRequest = {
      id: `req-${Date.now()}`,
      type: newRequest.type,
      title: newRequest.title,
      description: newRequest.description,
      status: 'pending',
      priority: newRequest.priority,
      requestDate: new Date(),
      caseId,
      documents: newRequest.documents,
      fee: 200, // 根据类型计算费用
      notaryOffice: newRequest.notaryOffice
    };

    setRequests(prev => [request, ...prev]);
    setShowRequestDialog(false);
    setNewRequest({
      type: 'agreement',
      title: '',
      description: '',
      priority: 'medium',
      documents: [],
      notaryOffice: ''
    });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building className="h-6 w-6" />
            公证处对接
          </h2>
          <p className="text-gray-600 mt-1">申请公证服务，增强法律文件效力</p>
        </div>
        <Button onClick={() => setShowRequestDialog(true)} className="bg-blue-600 hover:bg-blue-700">
          <FileText className="h-4 w-4 mr-2" />
          申请公证
        </Button>
      </div>

      {/* 主要内容 */}
      <Card>
        <CardHeader>
          <CardTitle>公证服务管理</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'request' | 'offices' | 'history')}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="request">公证申请</TabsTrigger>
              <TabsTrigger value="offices">公证处</TabsTrigger>
              <TabsTrigger value="history">历史记录</TabsTrigger>
            </TabsList>

            {/* 公证申请标签页 */}
            <TabsContent value="request" className="space-y-4">
              {requests.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">暂无公证申请</h3>
                  <p className="text-gray-500 mb-4">您还没有提交任何公证申请</p>
                  <Button onClick={() => setShowRequestDialog(true)}>
                    <FileText className="h-4 w-4 mr-2" />
                    申请公证
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map((request) => (
                    <Card key={request.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{request.title}</h4>
                              <Badge className={getTypeColor(request.type)}>
                                {getTypeLabel(request.type)}
                              </Badge>
                              <Badge className={getStatusColor(request.status)}>
                                {getStatusLabel(request.status)}
                              </Badge>
                              <Badge variant="outline" className={getPriorityColor(request.priority)}>
                                {request.priority === 'urgent' ? '紧急' :
                                 request.priority === 'high' ? '高' :
                                 request.priority === 'medium' ? '中' : '低'}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{request.description}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Building className="h-3 w-3" />
                                {request.notaryOffice}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {request.requestDate.toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <CreditCard className="h-3 w-3" />
                                ¥{request.fee}
                              </span>
                              {request.notaryOfficer && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {request.notaryOfficer}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button variant="outline" size="sm">
                              <Eye className="h-3 w-3 mr-1" />
                              查看
                            </Button>
                            {request.status === 'completed' && (
                              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                <Download className="h-3 w-3 mr-1" />
                                下载公证书
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* 公证处标签页 */}
            <TabsContent value="offices" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockNotaryOffices.map((office) => (
                  <Card key={office.id} className={`cursor-pointer hover:shadow-md transition-shadow ${
                    selectedOffice?.id === office.id ? 'ring-2 ring-blue-500' : ''
                  }`} onClick={() => setSelectedOffice(office)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{office.name}</h4>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-yellow-500">★</span>
                            <span className="text-sm text-gray-600">{office.rating}</span>
                            <span className="text-sm text-gray-500">• {office.distance}km</span>
                          </div>
                        </div>
                        <Badge className={office.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {office.available ? '营业中' : '休息中'}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          {office.address}
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          {office.phone}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          {office.businessHours}
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="text-xs text-gray-500 mb-1">服务项目</div>
                        <div className="flex flex-wrap gap-1">
                          {office.services.slice(0, 3).map((service) => (
                            <Badge key={service} variant="outline" className="text-xs">
                              {service}
                            </Badge>
                          ))}
                          {office.services.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{office.services.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* 历史记录标签页 */}
            <TabsContent value="history" className="space-y-4">
              <div className="text-center py-12 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4" />
                <p>历史公证记录功能正在开发中...</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 申请公证对话框 */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>申请公证服务</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">公证类型</Label>
                <Select
                  value={newRequest.type}
                  onValueChange={(value: NotaryRequest['type']) =>
                    setNewRequest(prev => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agreement">协议公证</SelectItem>
                    <SelectItem value="signature">签名公证</SelectItem>
                    <SelectItem value="document">文件公证</SelectItem>
                    <SelectItem value="identity">身份认证</SelectItem>
                    <SelectItem value="evidence">证据保全</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="priority">优先级</Label>
                <Select
                  value={newRequest.priority}
                  onValueChange={(value: NotaryRequest['priority']) =>
                    setNewRequest(prev => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">低</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="urgent">紧急</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="title">申请标题</Label>
              <Input
                id="title"
                value={newRequest.title}
                onChange={(e) => setNewRequest(prev => ({ ...prev, title: e.target.value }))}
                placeholder="请输入公证申请标题"
              />
            </div>

            <div>
              <Label htmlFor="description">申请说明</Label>
              <Textarea
                id="description"
                value={newRequest.description}
                onChange={(e) => setNewRequest(prev => ({ ...prev, description: e.target.value }))}
                placeholder="请详细说明公证需求和相关情况"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="office">选择公证处</Label>
              <Select
                value={newRequest.notaryOffice}
                onValueChange={(value) =>
                  setNewRequest(prev => ({ ...prev, notaryOffice: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择公证处" />
                </SelectTrigger>
                <SelectContent>
                  {mockNotaryOffices.map((office) => (
                    <SelectItem key={office.id} value={office.name}>
                      {office.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>相关文件</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <div className="text-sm text-gray-600">
                  点击上传或拖拽文件到此处
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  支持 PDF、Word、图片等格式
                </div>
              </div>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                公证申请提交后，公证处将在1-3个工作日内联系您确认具体事宜。请确保提供的联系方式准确有效。
              </AlertDescription>
            </Alert>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
                取消
              </Button>
              <Button onClick={handleSubmitRequest}>
                <Send className="h-4 w-4 mr-2" />
                提交申请
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
