// src/app/(private)/hearings/[id]/page.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Video, 
  Users,
  MapPin,
  Play,
  Settings,
  FileText,
  Mic,
  Camera,
  Monitor,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  Download,
  Share2
} from 'lucide-react';
import Link from 'next/link';

// 模拟庭审详细数据
const mockHearingDetail = {
  id: 'hearing-001',
  caseNumber: 'ARB-2024-001',
  title: '软件开发合同争议案庭审',
  type: '正式庭审',
  date: '2024-02-20',
  time: '09:00',
  duration: '2小时',
  status: 'scheduled',
  mode: 'online',
  location: '在线庭审室A',
  
  // 参与人员
  participants: [
    {
      id: 'p1',
      name: '张某',
      role: '申请人',
      type: 'party',
      status: 'confirmed',
      avatar: '/avatars/zhang.jpg',
      contact: '138****1234'
    },
    {
      id: 'p2',
      name: '李律师',
      role: '申请人代理',
      type: 'lawyer',
      status: 'confirmed',
      avatar: '/avatars/li.jpg',
      contact: '139****5678'
    },
    {
      id: 'p3',
      name: '王某',
      role: '被申请人',
      type: 'party',
      status: 'confirmed',
      avatar: '/avatars/wang.jpg',
      contact: '137****9012'
    },
    {
      id: 'p4',
      name: '赵律师',
      role: '被申请人代理',
      type: 'lawyer',
      status: 'pending',
      avatar: '/avatars/zhao.jpg',
      contact: '136****3456'
    }
  ],
  
  // 仲裁员
  arbitrators: [
    {
      id: 'a1',
      name: '张法官',
      role: '首席仲裁员',
      status: 'confirmed',
      avatar: '/avatars/judge-zhang.jpg'
    },
    {
      id: 'a2',
      name: '李教授',
      role: '仲裁员',
      status: 'confirmed',
      avatar: '/avatars/prof-li.jpg'
    },
    {
      id: 'a3',
      name: '王律师',
      role: '仲裁员',
      status: 'confirmed',
      avatar: '/avatars/arb-wang.jpg'
    }
  ],
  
  // 庭审议程
  agenda: [
    {
      id: 'ag1',
      title: '开庭陈述',
      description: '仲裁庭宣布开庭，核实当事人身份',
      duration: '15分钟',
      status: 'pending'
    },
    {
      id: 'ag2',
      title: '申请人陈述',
      description: '申请人陈述仲裁请求和事实理由',
      duration: '30分钟',
      status: 'pending'
    },
    {
      id: 'ag3',
      title: '被申请人答辩',
      description: '被申请人进行答辩',
      duration: '30分钟',
      status: 'pending'
    },
    {
      id: 'ag4',
      title: '举证质证',
      description: '双方当事人举证质证',
      duration: '30分钟',
      status: 'pending'
    },
    {
      id: 'ag5',
      title: '法庭辩论',
      description: '双方进行法庭辩论',
      duration: '20分钟',
      status: 'pending'
    },
    {
      id: 'ag6',
      title: '最后陈述',
      description: '双方最后陈述',
      duration: '10分钟',
      status: 'pending'
    },
    {
      id: 'ag7',
      title: '庭审结束',
      description: '宣布庭审结束',
      duration: '5分钟',
      status: 'pending'
    }
  ],
  
  // 技术要求
  techRequirements: {
    platform: 'LegalMind 在线庭审系统',
    bandwidth: '至少 2Mbps',
    devices: ['电脑', '摄像头', '麦克风', '耳机'],
    browsers: ['Chrome 90+', 'Firefox 88+', 'Safari 14+'],
    testTime: '庭审前30分钟开放设备测试'
  },
  
  // 庭审材料
  materials: [
    {
      id: 'm1',
      name: '庭审通知书',
      type: 'notice',
      status: 'sent',
      date: '2024-02-15'
    },
    {
      id: 'm2',
      name: '证据清单',
      type: 'evidence',
      status: 'submitted',
      date: '2024-02-18'
    },
    {
      id: 'm3',
      name: '庭审须知',
      type: 'instruction',
      status: 'available',
      date: '2024-02-19'
    }
  ]
};

export default function HearingDetailPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const hearing = mockHearingDetail;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return '已安排';
      case 'in-progress': return '进行中';
      case 'completed': return '已完成';
      case 'cancelled': return '已取消';
      default: return '未知';
    }
  };

  const getParticipantStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'declined': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getParticipantStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return '已确认';
      case 'pending': return '待确认';
      case 'declined': return '已拒绝';
      default: return '未知';
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-6xl animate-fade-in">
      {/* 页面头部 */}
      <div className="flex items-center justify-between mb-8 animate-slide-up">
        <div className="flex items-center space-x-4">
          <Link href="/hearings">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回庭审管理
            </Button>
          </Link>
        </div>
      </div>

      {/* 庭审基本信息卡片 */}
      <Card className="mb-8 animate-slide-up" style={{animationDelay: '0.1s'}}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <Video className="h-8 w-8 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">{hearing.title}</h1>
                  <Badge className={getStatusColor(hearing.status)}>
                    {getStatusText(hearing.status)}
                  </Badge>
                </div>
                <p className="text-gray-600 mb-4">{hearing.caseNumber} - {hearing.type}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{hearing.date}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>{hearing.time}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span>{hearing.location}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>预计 {hearing.duration}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {hearing.status === 'scheduled' && (
                <>
                  <Button variant="outline" size="lg" className="hover-lift">
                    <Settings className="h-5 w-5 mr-2" />
                    设备测试
                  </Button>
                  <Link href={`/hearings/${mockHearingDetail.id}/live`}>
                    <Button size="lg" className="btn-primary btn-ripple hover-lift shadow-brand">
                      <Play className="h-5 w-5 mr-2" />
                      进入庭审
                    </Button>
                  </Link>
                </>
              )}
              {hearing.status === 'in-progress' && (
                <Link href={`/hearings/${mockHearingDetail.id}/live`}>
                  <Button size="lg" className="btn-primary btn-ripple hover-lift shadow-brand">
                    <Video className="h-5 w-5 mr-2" />
                    重新加入
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 详细信息标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-slide-up" style={{animationDelay: '0.2s'}}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="participants">参与人员</TabsTrigger>
          <TabsTrigger value="agenda">庭审议程</TabsTrigger>
          <TabsTrigger value="tech">技术要求</TabsTrigger>
          <TabsTrigger value="materials">庭审材料</TabsTrigger>
        </TabsList>

        {/* 概览标签页 */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <span>参与统计</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">当事人</span>
                    <span className="font-semibold">{hearing.participants.filter(p => p.type === 'party').length} 人</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">代理律师</span>
                    <span className="font-semibold">{hearing.participants.filter(p => p.type === 'lawyer').length} 人</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">仲裁员</span>
                    <span className="font-semibold">{hearing.arbitrators.length} 人</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">确认参与</span>
                    <span className="font-semibold text-green-600">
                      {hearing.participants.filter(p => p.status === 'confirmed').length + hearing.arbitrators.length} 人
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  <span>时间安排</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">庭审日期</label>
                    <p className="text-lg font-semibold text-gray-900">{hearing.date}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">开始时间</label>
                    <p className="text-lg font-semibold text-gray-900">{hearing.time}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">预计时长</label>
                    <p className="text-lg font-semibold text-gray-900">{hearing.duration}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">设备测试</label>
                    <p className="text-sm text-gray-600">{hearing.techRequirements.testTime}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 参与人员标签页 */}
        <TabsContent value="participants" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <span>当事人及代理</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {hearing.participants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {participant.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{participant.name}</h4>
                          <p className="text-sm text-gray-600">{participant.role}</p>
                          <p className="text-xs text-gray-500">{participant.contact}</p>
                        </div>
                      </div>
                      <Badge className={getParticipantStatusColor(participant.status)}>
                        {getParticipantStatusText(participant.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-purple-500" />
                  <span>仲裁庭</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {hearing.arbitrators.map((arbitrator) => (
                    <div key={arbitrator.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {arbitrator.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{arbitrator.name}</h4>
                          <p className="text-sm text-gray-600">{arbitrator.role}</p>
                        </div>
                      </div>
                      <Badge className={getParticipantStatusColor(arbitrator.status)}>
                        {getParticipantStatusText(arbitrator.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 庭审议程标签页 */}
        <TabsContent value="agenda" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-green-500" />
                <span>庭审议程</span>
              </CardTitle>
              <CardDescription>
                详细的庭审流程安排
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {hearing.agenda.map((item, index) => (
                  <div key={item.id} className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                        {index + 1}
                      </div>
                      {index < hearing.agenda.length - 1 && (
                        <div className="w-px h-8 bg-gray-200 mt-2"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{item.title}</h4>
                        <span className="text-sm text-gray-500">{item.duration}</span>
                      </div>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 技术要求标签页 */}
        <TabsContent value="tech" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Monitor className="h-5 w-5 text-red-500" />
                <span>技术要求</span>
              </CardTitle>
              <CardDescription>
                参与在线庭审的技术要求和设备检查
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">系统要求</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Monitor className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{hearing.techRequirements.platform}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">网络带宽：{hearing.techRequirements.bandwidth}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">设备要求</h4>
                    <div className="space-y-1">
                      {hearing.techRequirements.devices.map((device, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-gray-600">{device}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">浏览器支持</h4>
                    <div className="space-y-1">
                      {hearing.techRequirements.browsers.map((browser, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-gray-600">{browser}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">设备测试</h4>
                    <p className="text-sm text-blue-700 mb-3">{hearing.techRequirements.testTime}</p>
                    <Button size="sm" className="btn-primary">
                      <Camera className="h-4 w-4 mr-2" />
                      开始设备测试
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 庭审材料标签页 */}
        <TabsContent value="materials" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-orange-500" />
                <span>庭审材料</span>
              </CardTitle>
              <CardDescription>
                庭审相关的文档和材料
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {hearing.materials.map((material) => (
                  <div key={material.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-8 w-8 text-blue-500" />
                      <div>
                        <h4 className="font-medium text-gray-900">{material.name}</h4>
                        <p className="text-sm text-gray-600">发布时间：{material.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={
                        material.status === 'sent' ? 'bg-green-100 text-green-800' :
                        material.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {material.status === 'sent' ? '已发送' :
                         material.status === 'submitted' ? '已提交' : '可下载'}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        下载
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
