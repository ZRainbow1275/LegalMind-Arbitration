// dev/src/app/(private)/mediation/[id]/manage/page.tsx
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  ArrowLeft,
  Settings,
  Users,
  Calendar,
  FileText,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Send,
  Plus,
  Edit,
  Trash2,
  Save,
  Video,
  Phone,
  X,
  Eye,
  Download
} from 'lucide-react';

type ParticipantStatus = 'active' | 'inactive' | 'suspended';
type MediationParticipant = {
  id: string;
  name: string;
  role: string;
  type: string;
  email: string;
  phone: string;
  status: ParticipantStatus;
  permissions: string[];
  joinedAt: string;
};

const isParticipantStatus = (value: string): value is ParticipantStatus => {
  return value === 'active' || value === 'inactive' || value === 'suspended';
};

export default function MediationManagePage() {
  const params = useParams();
  const router = useRouter();
  const mediationId = params.id as string;
  
  const [activeTab, setActiveTab] = useState('settings');
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [showAddParticipantDialog, setShowAddParticipantDialog] = useState(false);
  const [showEditParticipantDialog, setShowEditParticipantDialog] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<MediationParticipant | null>(null);

  // 调解设置状态
  const [mediationSettings, setMediationSettings] = useState({
    status: 'in-progress',
    priority: 'normal',
    timeLimit: '120',
    sessionType: 'online',
    autoRecord: true,
    allowPrivateSession: true,
    requireConsent: true
  });

  // 会议安排状态
  const [scheduleData, setScheduleData] = useState({
    date: '',
    time: '',
    duration: '120',
    type: 'online',
    agenda: '',
    participants: []
  });

  // 通知设置状态
  const [notificationData, setNotificationData] = useState({
    type: 'session-reminder',
    recipients: 'all',
    message: '',
    sendTime: 'immediate'
  });

  // 参与者管理状态
  const [participants, setParticipants] = useState<MediationParticipant[]>([
    {
      id: 'participant-1',
      name: '张某',
      role: '申请人',
      type: 'party',
      email: 'zhang@example.com',
      phone: '138****1234',
      status: 'active',
      permissions: ['view', 'participate'],
      joinedAt: '2024-01-15T10:00:00'
    },
    {
      id: 'participant-2',
      name: '李律师',
      role: '申请人代理',
      type: 'lawyer',
      email: 'li@law.com',
      phone: '139****5678',
      status: 'active',
      permissions: ['view', 'participate', 'represent'],
      joinedAt: '2024-01-15T10:05:00'
    },
    {
      id: 'participant-3',
      name: '王某',
      role: '被申请人',
      type: 'party',
      email: 'wang@example.com',
      phone: '137****9012',
      status: 'active',
      permissions: ['view', 'participate'],
      joinedAt: '2024-01-16T09:30:00'
    }
  ]);

  const [newParticipant, setNewParticipant] = useState<Omit<MediationParticipant, 'id' | 'status' | 'joinedAt'>>({
    name: '',
    role: '',
    type: 'party',
    email: '',
    phone: '',
    permissions: ['view', 'participate']
  });

  const handleSaveSettings = () => {
    alert('调解设置已保存');
  };

  const handleScheduleSession = () => {
    if (!scheduleData.date || !scheduleData.time) {
      alert('请填写完整的会议时间信息');
      return;
    }

    // 创建会议记录
    const newSession = {
      id: `session-${Date.now()}`,
      date: scheduleData.date,
      time: scheduleData.time,
      duration: parseInt(scheduleData.duration),
      type: scheduleData.type,
      agenda: scheduleData.agenda,
      status: 'scheduled',
      createdAt: new Date().toISOString()
    };

    // 这里应该调用API保存会议安排
    console.log('安排会议:', newSession);

    // 重置表单
    setScheduleData({
      date: '',
      time: '',
      duration: '120',
      type: 'online',
      agenda: '',
      participants: []
    });

    alert(`调解会议已安排：${scheduleData.date} ${scheduleData.time}`);
    setShowScheduleDialog(false);
  };

  const handleSendNotification = () => {
    if (!notificationData.message.trim()) {
      alert('请输入通知内容');
      return;
    }

    // 创建通知记录
    const notification = {
      id: `notification-${Date.now()}`,
      type: notificationData.type,
      recipients: notificationData.recipients,
      message: notificationData.message,
      sendTime: notificationData.sendTime,
      sentAt: new Date().toISOString(),
      status: 'sent'
    };

    // 这里应该调用API发送通知
    console.log('发送通知:', notification);

    // 重置表单
    setNotificationData({
      type: 'session-reminder',
      recipients: 'all',
      message: '',
      sendTime: 'immediate'
    });

    alert('通知已发送给相关参与者');
    setShowNotificationDialog(false);
  };

  const handleStatusChange = (newStatus: string) => {
    setMediationSettings(prev => ({ ...prev, status: newStatus }));
    alert(`调解状态已更改为: ${newStatus}`);
  };

  // 参与者管理处理函数
  const handleAddParticipant = () => {
    if (!newParticipant.name.trim() || !newParticipant.email.trim()) {
      alert('请填写参与者姓名和邮箱');
      return;
    }

    const participant: MediationParticipant = {
      id: `participant-${Date.now()}`,
      ...newParticipant,
      status: 'active',
      joinedAt: new Date().toISOString()
    };

    setParticipants(prev => [...prev, participant]);

    // 重置表单
    setNewParticipant({
      name: '',
      role: '',
      type: 'party',
      email: '',
      phone: '',
      permissions: ['view', 'participate']
    });

    alert(`参与者 ${participant.name} 已添加`);
    setShowAddParticipantDialog(false);
  };

  const handleEditParticipant = (participant: MediationParticipant) => {
    setSelectedParticipant(participant);
    setShowEditParticipantDialog(true);
  };

  const handleUpdateParticipant = () => {
    if (!selectedParticipant) return;

    setParticipants(prev => prev.map(p =>
      p.id === selectedParticipant.id ? selectedParticipant : p
    ));

    alert(`参与者 ${selectedParticipant.name} 信息已更新`);
    setShowEditParticipantDialog(false);
    setSelectedParticipant(null);
  };

  const handleRemoveParticipant = (participantId: string) => {
    const participant = participants.find(p => p.id === participantId);
    if (participant && confirm(`确定要移除参与者 ${participant.name} 吗？`)) {
      setParticipants(prev => prev.filter(p => p.id !== participantId));
      alert(`参与者 ${participant.name} 已移除`);
    }
  };

  return (
    <div className="container mx-auto p-8 space-y-8 animate-fade-in">
      {/* 页面头部 */}
      <div className="flex items-center justify-between animate-slide-up">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">调解管理</h1>
            <p className="text-gray-600 mt-1">调解案件 ID: {mediationId}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setShowScheduleDialog(true)}>
            <Calendar className="h-4 w-4 mr-2" />
            安排会议
          </Button>
          <Button variant="outline" onClick={() => setShowNotificationDialog(true)}>
            <Send className="h-4 w-4 mr-2" />
            发送通知
          </Button>
        </div>
      </div>

      {/* 快速操作卡片 */}
      <Card className="animate-slide-up" style={{animationDelay: '0.1s'}}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-500" />
            快速操作
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => handleStatusChange('in-progress')}
            >
              <CheckCircle className="h-6 w-6 text-green-500" />
              <span className="text-sm">开始调解</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => handleStatusChange('paused')}
            >
              <Clock className="h-6 w-6 text-yellow-500" />
              <span className="text-sm">暂停调解</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => handleStatusChange('completed')}
            >
              <CheckCircle className="h-6 w-6 text-blue-500" />
              <span className="text-sm">完成调解</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => handleStatusChange('cancelled')}
            >
              <XCircle className="h-6 w-6 text-red-500" />
              <span className="text-sm">取消调解</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 主要管理区域 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-slide-up" style={{animationDelay: '0.2s'}}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="settings">调解设置</TabsTrigger>
          <TabsTrigger value="participants">参与者管理</TabsTrigger>
          <TabsTrigger value="sessions">会议管理</TabsTrigger>
          <TabsTrigger value="documents">文档管理</TabsTrigger>
        </TabsList>

        {/* 调解设置标签页 */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>基本设置</CardTitle>
              <CardDescription>配置调解的基本参数和规则</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">调解状态</Label>
                  <Select value={mediationSettings.status} onValueChange={(value) => setMediationSettings(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">待开始</SelectItem>
                      <SelectItem value="in-progress">进行中</SelectItem>
                      <SelectItem value="paused">已暂停</SelectItem>
                      <SelectItem value="completed">已完成</SelectItem>
                      <SelectItem value="cancelled">已取消</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">优先级</Label>
                  <Select value={mediationSettings.priority} onValueChange={(value) => setMediationSettings(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">低</SelectItem>
                      <SelectItem value="normal">普通</SelectItem>
                      <SelectItem value="high">高</SelectItem>
                      <SelectItem value="urgent">紧急</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeLimit">时间限制（分钟）</Label>
                  <Input 
                    id="timeLimit"
                    type="number"
                    value={mediationSettings.timeLimit}
                    onChange={(e) => setMediationSettings(prev => ({ ...prev, timeLimit: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessionType">会议类型</Label>
                  <Select value={mediationSettings.sessionType} onValueChange={(value) => setMediationSettings(prev => ({ ...prev, sessionType: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">在线会议</SelectItem>
                      <SelectItem value="offline">线下会议</SelectItem>
                      <SelectItem value="hybrid">混合模式</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">高级选项</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>自动录制</Label>
                      <p className="text-sm text-gray-500">自动录制调解过程</p>
                    </div>
                    <Button 
                      variant={mediationSettings.autoRecord ? "default" : "outline"}
                      size="sm"
                      onClick={() => setMediationSettings(prev => ({ ...prev, autoRecord: !prev.autoRecord }))}
                    >
                      {mediationSettings.autoRecord ? '已启用' : '已禁用'}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>允许私下会谈</Label>
                      <p className="text-sm text-gray-500">允许调解员与单方进行私下沟通</p>
                    </div>
                    <Button 
                      variant={mediationSettings.allowPrivateSession ? "default" : "outline"}
                      size="sm"
                      onClick={() => setMediationSettings(prev => ({ ...prev, allowPrivateSession: !prev.allowPrivateSession }))}
                    >
                      {mediationSettings.allowPrivateSession ? '已启用' : '已禁用'}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>需要同意确认</Label>
                      <p className="text-sm text-gray-500">重要决定需要双方明确同意</p>
                    </div>
                    <Button 
                      variant={mediationSettings.requireConsent ? "default" : "outline"}
                      size="sm"
                      onClick={() => setMediationSettings(prev => ({ ...prev, requireConsent: !prev.requireConsent }))}
                    >
                      {mediationSettings.requireConsent ? '已启用' : '已禁用'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveSettings}>
                  <Save className="h-4 w-4 mr-2" />
                  保存设置
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 参与者管理标签页 */}
        <TabsContent value="participants" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                参与者管理
              </CardTitle>
              <CardDescription>管理调解参与者的权限和状态</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">当前参与者</h4>
                  <Button size="sm" onClick={() => setShowAddParticipantDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    添加参与者
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {participants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          participant.type === 'party' ? 'bg-blue-100' :
                          participant.type === 'lawyer' ? 'bg-purple-100' :
                          'bg-green-100'
                        }`}>
                          <Users className={`h-4 w-4 ${
                            participant.type === 'party' ? 'text-blue-600' :
                            participant.type === 'lawyer' ? 'text-purple-600' :
                            'text-green-600'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium">{participant.name}</p>
                          <p className="text-sm text-gray-500">
                            {participant.role} • {participant.status === 'active' ? '在线' : '离线'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={participant.status === 'active' ? 'secondary' : 'outline'}>
                          {participant.status === 'active' ? '活跃' : '离线'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditParticipant(participant)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveParticipant(participant.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 会议管理标签页 */}
        <TabsContent value="sessions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                会议管理
              </CardTitle>
              <CardDescription>管理调解会议的安排和记录</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">已安排的会议</h4>
                  <Button size="sm" onClick={() => setShowScheduleDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    安排新会议
                  </Button>
                </div>

                <div className="space-y-3">
                  {/* 示例会议记录 */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h5 className="font-medium">第一次调解会议</h5>
                          <Badge variant="secondary">已完成</Badge>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>时间：2024-01-15 14:00 - 16:00</p>
                          <p>类型：在线会议</p>
                          <p>参与者：3人</p>
                          <p>议程：初步了解争议焦点，确定调解方向</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h5 className="font-medium">第二次调解会议</h5>
                          <Badge>进行中</Badge>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>时间：2024-01-20 10:00 - 12:00</p>
                          <p>类型：在线会议</p>
                          <p>参与者：3人</p>
                          <p>议程：深入讨论解决方案，寻求共识</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Video className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h5 className="font-medium">第三次调解会议</h5>
                          <Badge variant="outline">已安排</Badge>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>时间：2024-01-25 15:00 - 17:00</p>
                          <p>类型：在线会议</p>
                          <p>参与者：3人</p>
                          <p>议程：最终协商和协议签署</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Calendar className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 文档管理标签页 */}
        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                文档管理
              </CardTitle>
              <CardDescription>管理调解相关的文档和材料</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">调解文档</h4>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    上传文档
                  </Button>
                </div>

                <div className="space-y-3">
                  {/* 示例文档 */}
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <FileText className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">调解申请书.pdf</p>
                        <p className="text-sm text-gray-500">上传时间：2024-01-10 • 大小：2.5MB</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <FileText className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">第一次会议记录.docx</p>
                        <p className="text-sm text-gray-500">上传时间：2024-01-15 • 大小：1.2MB</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <FileText className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">调解协议草案.pdf</p>
                        <p className="text-sm text-gray-500">上传时间：2024-01-20 • 大小：800KB</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 安排会议对话框 */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>安排调解会议</DialogTitle>
            <DialogDescription>
              设置下次调解会议的时间和详情
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="schedule-date">日期</Label>
                <Input 
                  id="schedule-date"
                  type="date"
                  value={scheduleData.date}
                  onChange={(e) => setScheduleData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="schedule-time">时间</Label>
                <Input 
                  id="schedule-time"
                  type="time"
                  value={scheduleData.time}
                  onChange={(e) => setScheduleData(prev => ({ ...prev, time: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule-agenda">会议议程</Label>
              <Textarea 
                id="schedule-agenda"
                placeholder="请输入会议议程..."
                value={scheduleData.agenda}
                onChange={(e) => setScheduleData(prev => ({ ...prev, agenda: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
              取消
            </Button>
            <Button onClick={handleScheduleSession}>
              确认安排
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 发送通知对话框 */}
      <Dialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>发送通知</DialogTitle>
            <DialogDescription>
              向参与者发送调解相关通知
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notification-type">通知类型</Label>
              <Select value={notificationData.type} onValueChange={(value) => setNotificationData(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="session-reminder">会议提醒</SelectItem>
                  <SelectItem value="status-update">状态更新</SelectItem>
                  <SelectItem value="document-request">文档请求</SelectItem>
                  <SelectItem value="general">一般通知</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notification-message">通知内容</Label>
              <Textarea 
                id="notification-message"
                placeholder="请输入通知内容..."
                value={notificationData.message}
                onChange={(e) => setNotificationData(prev => ({ ...prev, message: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotificationDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSendNotification}>
              发送通知
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加参与者对话框 */}
      <Dialog open={showAddParticipantDialog} onOpenChange={setShowAddParticipantDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>添加参与者</DialogTitle>
            <DialogDescription>
              添加新的调解参与者
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="participant-name">姓名</Label>
              <Input
                id="participant-name"
                value={newParticipant.name}
                onChange={(e) => setNewParticipant(prev => ({ ...prev, name: e.target.value }))}
                placeholder="输入参与者姓名"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="participant-role">角色</Label>
              <Input
                id="participant-role"
                value={newParticipant.role}
                onChange={(e) => setNewParticipant(prev => ({ ...prev, role: e.target.value }))}
                placeholder="如：申请人、被申请人、代理律师"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="participant-type">类型</Label>
              <Select
                value={newParticipant.type}
                onValueChange={(value) => setNewParticipant(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="party">当事人</SelectItem>
                  <SelectItem value="lawyer">律师</SelectItem>
                  <SelectItem value="mediator">调解员</SelectItem>
                  <SelectItem value="observer">观察员</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="participant-email">邮箱</Label>
              <Input
                id="participant-email"
                type="email"
                value={newParticipant.email}
                onChange={(e) => setNewParticipant(prev => ({ ...prev, email: e.target.value }))}
                placeholder="输入邮箱地址"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="participant-phone">电话</Label>
              <Input
                id="participant-phone"
                value={newParticipant.phone}
                onChange={(e) => setNewParticipant(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="输入电话号码"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddParticipantDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAddParticipant}>
              添加参与者
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑参与者对话框 */}
      <Dialog open={showEditParticipantDialog} onOpenChange={setShowEditParticipantDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑参与者</DialogTitle>
            <DialogDescription>
              修改参与者信息和权限
            </DialogDescription>
          </DialogHeader>
          {selectedParticipant && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-participant-name">姓名</Label>
                    <Input
                      id="edit-participant-name"
                      value={selectedParticipant.name}
                      onChange={(e) => setSelectedParticipant(prev => prev ? ({ ...prev, name: e.target.value }) : prev)}
                    />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-participant-role">角色</Label>
                    <Input
                      id="edit-participant-role"
                      value={selectedParticipant.role}
                      onChange={(e) => setSelectedParticipant(prev => prev ? ({ ...prev, role: e.target.value }) : prev)}
                    />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-participant-status">状态</Label>
                    <Select
                      value={selectedParticipant.status}
                      onValueChange={(value) => setSelectedParticipant(prev => {
                        if (!prev) return prev;
                        if (!isParticipantStatus(value)) return prev;
                        return { ...prev, status: value };
                      })}
                    >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">活跃</SelectItem>
                    <SelectItem value="inactive">非活跃</SelectItem>
                    <SelectItem value="suspended">暂停</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-participant-email">邮箱</Label>
                    <Input
                      id="edit-participant-email"
                      type="email"
                      value={selectedParticipant.email}
                      onChange={(e) => setSelectedParticipant(prev => prev ? ({ ...prev, email: e.target.value }) : prev)}
                    />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-participant-phone">电话</Label>
                    <Input
                      id="edit-participant-phone"
                      value={selectedParticipant.phone}
                      onChange={(e) => setSelectedParticipant(prev => prev ? ({ ...prev, phone: e.target.value }) : prev)}
                    />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditParticipantDialog(false)}>
              取消
            </Button>
            <Button onClick={handleUpdateParticipant}>
              保存更改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
