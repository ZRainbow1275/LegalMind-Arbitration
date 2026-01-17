// dev/src/app/(private)/schedule/[id]/page.tsx
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  Phone,
  Mail,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Edit,
  Trash2,
  Share2,
  Download,
  MessageSquare,
  Bell,
  Settings
} from 'lucide-react';

// 模拟日程详情数据
const eventDetails = {
  'event-1': {
    id: 'event-1',
    title: '合同纠纷案首次开庭',
    type: '开庭',
    caseId: 'CASE-2024-001',
    caseTitle: '合同纠纷案',
    date: '2024-02-15',
    startTime: '09:00',
    endTime: '11:00',
    location: '仲裁庭A',
    description: '案件首次开庭审理，双方当事人及代理人需准时到场。请提前30分钟到达，进行身份验证和设备调试。',
    status: '已确认',
    priority: '高',
    meetingType: 'offline',
    organizer: {
      name: '张仲裁员',
      title: '首席仲裁员',
      phone: '+86 138-0000-0001',
      email: 'zhang.arbitrator@example.com'
    },
    participants: [
      { name: '张律师', role: '申请人代理', phone: '+86 138-0000-0002', email: 'zhang.lawyer@example.com' },
      { name: '李律师', role: '被申请人代理', phone: '+86 138-0000-0003', email: 'li.lawyer@example.com' },
      { name: '王仲裁员', role: '仲裁员', phone: '+86 138-0000-0004', email: 'wang.arbitrator@example.com' }
    ],
    agenda: [
      { time: '09:00-09:15', item: '开庭准备', description: '身份确认、设备调试' },
      { time: '09:15-09:30', item: '开庭宣布', description: '宣布开庭、介绍仲裁庭组成' },
      { time: '09:30-10:30', item: '当事人陈述', description: '申请人和被申请人分别陈述' },
      { time: '10:30-10:45', item: '休庭', description: '中场休息' },
      { time: '10:45-11:00', item: '庭审总结', description: '总结争议焦点、安排下次庭审' }
    ],
    documents: [
      { name: '开庭通知书.pdf', type: '通知文件', uploadDate: '2024-02-10' },
      { name: '庭审议程.pdf', type: '议程文件', uploadDate: '2024-02-12' },
      { name: '参会须知.pdf', type: '指导文件', uploadDate: '2024-02-13' }
    ],
    reminders: [
      { time: '1天前', message: '请确认参会人员和设备准备情况' },
      { time: '2小时前', message: '请提前到达会议地点' },
      { time: '30分钟前', message: '开庭即将开始，请做好最后准备' }
    ],
    notes: [
      {
        id: 'note-1',
        author: '张仲裁员',
        content: '请各方当事人提前准备好相关证据材料，确保庭审顺利进行。',
        timestamp: '2024-02-14 15:30'
      }
    ]
  }
};

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  
  const eventId = params.id as string;
  const event = eventDetails[eventId as keyof typeof eventDetails];

  if (!event) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">日程不存在</h2>
        <Button onClick={() => router.back()}>返回</Button>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case '已确认': return CheckCircle;
      case '待确认': return Clock;
      case '已取消': return XCircle;
      default: return AlertTriangle;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '已确认': return 'bg-green-100 text-green-800';
      case '待确认': return 'bg-yellow-100 text-yellow-800';
      case '已取消': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case '开庭': return 'bg-red-100 text-red-800';
      case '调解': return 'bg-blue-100 text-blue-800';
      case '证据交换': return 'bg-green-100 text-green-800';
      case '咨询': return 'bg-purple-100 text-purple-800';
      case '会议': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case '高': return 'text-red-600';
      case '中': return 'text-yellow-600';
      case '低': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const StatusIcon = getStatusIcon(event.status);

  return (
    <div className="space-y-6">
      {/* 返回按钮 */}
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        返回日程管理
      </Button>

      {/* 日程基本信息 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
                <div className="flex items-center gap-4 mt-2">
                  <Badge className={getTypeColor(event.type)}>
                    {event.type}
                  </Badge>
                  <Badge className={getStatusColor(event.status)}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {event.status}
                  </Badge>
                  <span className={`text-sm font-medium ${getPriorityColor(event.priority)}`}>
                    {event.priority}优先级
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>{event.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>{event.startTime}-{event.endTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  {event.meetingType === 'online' ? (
                    <Video className="h-4 w-4 text-gray-500" />
                  ) : (
                    <MapPin className="h-4 w-4 text-gray-500" />
                  )}
                  <span>{event.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span>{event.participants.length} 人参与</span>
                </div>
              </div>

              <p className="text-gray-700 max-w-2xl">{event.description}</p>
            </div>

            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                编辑
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                分享
              </Button>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                {event.meetingType === 'online' ? (
                  <>
                    <Video className="h-4 w-4 mr-2" />
                    加入会议
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 mr-2" />
                    查看位置
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 详细信息标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="participants">参与人员</TabsTrigger>
          <TabsTrigger value="agenda">议程安排</TabsTrigger>
          <TabsTrigger value="documents">相关文档</TabsTrigger>
          <TabsTrigger value="settings">设置</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>组织者信息</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-600">姓名：</span>
                    <span className="font-medium">{event.organizer.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">职务：</span>
                    <span className="font-medium">{event.organizer.title}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span>{event.organizer.phone}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span>{event.organizer.email}</span>
                  </div>
                </div>
                <div className="mt-4 flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Phone className="h-4 w-4 mr-2" />
                    拨打电话
                  </Button>
                  <Button variant="outline" size="sm">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    发送消息
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>提醒设置</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {event.reminders.map((reminder, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Bell className="h-4 w-4 text-orange-500" />
                      <div>
                        <div className="font-medium text-sm">{reminder.time}</div>
                        <div className="text-sm text-gray-600">{reminder.message}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 备注 */}
          {event.notes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>备注信息</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {event.notes.map(note => (
                    <div key={note.id} className="border-l-4 border-orange-500 pl-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{note.author}</span>
                        <span className="text-sm text-gray-500">{note.timestamp}</span>
                      </div>
                      <p className="text-gray-700">{note.content}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="participants" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {event.participants.map((participant, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h3 className="font-medium">{participant.name}</h3>
                      <p className="text-sm text-gray-600">{participant.role}</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center space-x-2">
                          <Phone className="h-3 w-3 text-gray-400" />
                          <span>{participant.phone}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Mail className="h-3 w-3 text-gray-400" />
                          <span>{participant.email}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Button variant="outline" size="sm">
                        <Phone className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <MessageSquare className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="agenda" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>议程安排</CardTitle>
              <CardDescription>详细的活动流程和时间安排</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {event.agenda.map((item, index) => (
                  <div key={index} className="flex items-start space-x-4 p-4 border rounded-lg">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                        {index + 1}
                      </div>
                      {index < event.agenda.length - 1 && (
                        <div className="w-px h-8 bg-gray-200 mt-2"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{item.item}</h4>
                        <Badge variant="outline">{item.time}</Badge>
                      </div>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>相关文档</CardTitle>
              <CardDescription>与此次活动相关的所有文档</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {event.documents.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-gray-500" />
                      <div>
                        <div className="font-medium">{doc.name}</div>
                        <div className="text-sm text-gray-500">{doc.type} • {doc.uploadDate}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>日程设置</CardTitle>
              <CardDescription>管理此日程的各项设置</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">提醒通知</h4>
                  <p className="text-sm text-gray-600">接收此日程的提醒通知</p>
                </div>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  设置
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">日历同步</h4>
                  <p className="text-sm text-gray-600">同步到外部日历应用</p>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  导出
                </Button>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                <div>
                  <h4 className="font-medium text-red-900">删除日程</h4>
                  <p className="text-sm text-red-600">永久删除此日程，此操作不可撤销</p>
                </div>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  删除
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
