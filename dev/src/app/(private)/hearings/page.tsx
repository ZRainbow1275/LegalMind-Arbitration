// src/app/(private)/hearings/page.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Clock, 
  Video, 
  Users,
  MapPin,
  Play,
  Settings,
  Plus,
  Eye,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

// 模拟庭审数据
const mockHearings = [
  {
    id: 'hearing-001',
    caseNumber: 'ARB-2024-001',
    title: '软件开发合同争议案庭审',
    type: '正式庭审',
    date: '2024-02-20',
    time: '09:00',
    duration: '2小时',
    status: 'scheduled',
    mode: 'online',
    participants: ['张某', '李某', '王律师', '赵律师'],
    arbitrators: ['张法官', '李教授'],
    location: '在线庭审室A',
    agenda: ['开庭陈述', '举证质证', '法庭辩论', '最后陈述']
  },
  {
    id: 'hearing-002',
    caseNumber: 'ARB-2024-002',
    title: '投资争议案庭前会议',
    type: '庭前会议',
    date: '2024-02-18',
    time: '14:00',
    duration: '1小时',
    status: 'in-progress',
    mode: 'hybrid',
    participants: ['某投资公司', '某创业公司'],
    arbitrators: ['王仲裁员'],
    location: '会议室B + 在线',
    agenda: ['争议焦点确认', '证据交换', '庭审安排']
  },
  {
    id: 'hearing-003',
    caseNumber: 'ARB-2024-003',
    title: '劳动争议案庭审',
    type: '正式庭审',
    date: '2024-02-15',
    time: '10:00',
    duration: '3小时',
    status: 'completed',
    mode: 'offline',
    participants: ['员工A', '某公司HR'],
    arbitrators: ['李法官', '张教授', '王律师'],
    location: '仲裁庭第一庭审室',
    agenda: ['开庭陈述', '举证质证', '法庭辩论', '合议', '宣布结果']
  }
];

export default function HearingsPage() {
  const [activeTab, setActiveTab] = useState('upcoming');

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

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'online': return 'bg-green-100 text-green-800';
      case 'offline': return 'bg-blue-100 text-blue-800';
      case 'hybrid': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getModeText = (mode: string) => {
    switch (mode) {
      case 'online': return '在线庭审';
      case 'offline': return '现场庭审';
      case 'hybrid': return '混合庭审';
      default: return '未知';
    }
  };

  const filteredHearings = mockHearings.filter(hearing => {
    switch (activeTab) {
      case 'upcoming': return hearing.status === 'scheduled';
      case 'ongoing': return hearing.status === 'in-progress';
      case 'completed': return hearing.status === 'completed';
      default: return true;
    }
  });

  return (
    <div className="container mx-auto p-8 space-y-8 animate-fade-in">
      {/* 页面头部 */}
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">庭审管理</h1>
          <p className="text-lg text-gray-600">管理和参与仲裁庭审活动</p>
        </div>
        <Button size="lg" className="btn-primary btn-ripple hover-lift shadow-brand">
          <Plus className="h-5 w-5 mr-2" />
          安排庭审
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-slide-up" style={{animationDelay: '0.1s'}}>
        <Card className="card hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">总庭审数</p>
                <p className="text-3xl font-bold text-blue-600">{mockHearings.length}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">即将开始</p>
                <p className="text-3xl font-bold text-orange-600">
                  {mockHearings.filter(h => h.status === 'scheduled').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">进行中</p>
                <p className="text-3xl font-bold text-green-600">
                  {mockHearings.filter(h => h.status === 'in-progress').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <Video className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">已完成</p>
                <p className="text-3xl font-bold text-purple-600">
                  {mockHearings.filter(h => h.status === 'completed').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 庭审列表 */}
      <Card className="animate-slide-up" style={{animationDelay: '0.2s'}}>
        <CardHeader>
          <CardTitle className="text-xl">庭审安排</CardTitle>
          <CardDescription>
            查看和管理所有庭审活动
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="upcoming">即将开始</TabsTrigger>
              <TabsTrigger value="ongoing">进行中</TabsTrigger>
              <TabsTrigger value="completed">已完成</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              <div className="space-y-6">
                {filteredHearings.map((hearing, index) => (
                  <Card 
                    key={hearing.id} 
                    className="hover-lift animate-fade-in"
                    style={{animationDelay: `${0.3 + index * 0.1}s`}}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{hearing.title}</h3>
                            <Badge className={getStatusColor(hearing.status)}>
                              {getStatusText(hearing.status)}
                            </Badge>
                            <Badge className={getModeColor(hearing.mode)}>
                              {getModeText(hearing.mode)}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{hearing.caseNumber} - {hearing.type}</p>
                          <div className="flex items-center space-x-6 text-sm text-gray-600">
                            <span className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {hearing.date}
                            </span>
                            <span className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {hearing.time}
                            </span>
                            <span className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              {hearing.location}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {hearing.status === 'in-progress' && (
                            <Button size="sm" className="btn-primary btn-ripple">
                              <Play className="h-4 w-4 mr-2" />
                              进入庭审
                            </Button>
                          )}
                          {hearing.status === 'scheduled' && (
                            <Button variant="outline" size="sm" className="hover-lift">
                              <Video className="h-4 w-4 mr-2" />
                              测试设备
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="hover-lift">
                            <Eye className="h-4 w-4 mr-2" />
                            查看详情
                          </Button>
                          <Button variant="outline" size="sm" className="hover-lift">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">参与人员</h4>
                          <div className="space-y-1">
                            {hearing.participants.map((participant) => (
                              <div key={participant} className="flex items-center space-x-2">
                                <Users className="h-3 w-3 text-gray-400" />
                                <span className="text-sm text-gray-600">{participant}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">仲裁员</h4>
                          <div className="space-y-1">
                            {hearing.arbitrators.map((arbitrator) => (
                              <div key={arbitrator} className="flex items-center space-x-2">
                                <Users className="h-3 w-3 text-blue-500" />
                                <span className="text-sm text-gray-600">{arbitrator}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">庭审议程</h4>
                          <div className="space-y-1">
                            {hearing.agenda.map((item, idx) => (
                              <div key={idx} className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                <span className="text-sm text-gray-600">{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 空状态 */}
      {filteredHearings.length === 0 && (
        <div className="text-center py-16 animate-fade-in">
          <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <Calendar className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">暂无庭审安排</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            当前没有符合条件的庭审活动
          </p>
          <Button className="btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            安排新庭审
          </Button>
        </div>
      )}
    </div>
  );
}
