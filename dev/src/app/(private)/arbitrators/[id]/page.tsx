// src/app/(private)/arbitrators/[id]/page.tsx
'use client';

import { useMemo, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Star,
  MapPin,
  Briefcase,
  GraduationCap,
  Award,
  Calendar,
  Users,
  FileText,
  MessageSquare,
  Phone,
  Mail,
  Globe,
  CheckCircle,
  TrendingUp,
  BarChart3,
  Crown,
  Trash2
} from 'lucide-react';
import Link from 'next/link';
import { useTribunalStore } from '@/store/tribunal';
import { MessageDialog } from '@/components/arbitrator/message-dialog';
import { AppointmentDialog } from '@/components/arbitrator/appointment-dialog';

// 模拟仲裁员详细数据
const mockArbitratorDetail = {
  id: 'arb-001',
  name: '张法官',
  title: '资深仲裁员',
  avatar: '/avatars/zhang.jpg',
  status: 'available',
  rating: 4.9,
  totalCases: 156,
  successRate: 95,
  experience: '15年',

  // 基本信息
  basicInfo: {
    education: '清华大学法学院 法学博士',
    location: '北京',
    languages: ['中文', '英文', '日文'],
    phone: '+86 138-0000-1234',
    email: 'zhang.arbitrator@example.com',
    website: 'www.zhang-arbitrator.com'
  },

  // 专业领域
  specialties: [
    { name: '合同纠纷', cases: 68, rating: 4.9 },
    { name: '投资争议', cases: 45, rating: 4.8 },
    { name: '知识产权', cases: 32, rating: 5.0 },
    { name: '国际贸易', cases: 11, rating: 4.7 }
  ],

  // 职业背景
  background: {
    currentPosition: '北京仲裁委员会 首席仲裁员',
    previousPositions: [
      '最高人民法院 审判员 (2015-2020)',
      '北京市高级人民法院 副庭长 (2010-2015)',
      '清华大学法学院 副教授 (2008-2010)'
    ],
    certifications: [
      '中国仲裁员资格证书',
      '国际商事仲裁院(ICC)仲裁员',
      '香港国际仲裁中心仲裁员',
      '新加坡国际仲裁中心仲裁员'
    ]
  },

  // 近期案件
  recentCases: [
    {
      id: 'ARB-2024-001',
      title: '软件开发合同争议',
      type: '合同纠纷',
      amount: 1500000,
      status: '审理中',
      startDate: '2024-01-15'
    },
    {
      id: 'ARB-2023-088',
      title: '投资协议争议',
      type: '投资争议',
      amount: 5000000,
      status: '已结案',
      startDate: '2023-11-20',
      endDate: '2024-01-10'
    },
    {
      id: 'ARB-2023-076',
      title: '专利侵权纠纷',
      type: '知识产权',
      amount: 800000,
      status: '已结案',
      startDate: '2023-10-05',
      endDate: '2023-12-15'
    }
  ],

  // 客户评价
  reviews: [
    {
      id: 'review-1',
      author: '某科技公司法务总监',
      rating: 5,
      content: '张法官在处理我们的软件开发合同纠纷时表现出了极高的专业水准，对技术细节的理解令人印象深刻。',
      date: '2024-01-20',
      caseType: '合同纠纷'
    },
    {
      id: 'review-2',
      author: '某投资基金合伙人',
      rating: 5,
      content: '在复杂的投资争议案件中，张法官展现了深厚的法律功底和丰富的实务经验，最终达成了各方都满意的结果。',
      date: '2024-01-15',
      caseType: '投资争议'
    },
    {
      id: 'review-3',
      author: '某律师事务所合伙人',
      rating: 4,
      content: '专业、公正、高效，是我们合作过的最优秀的仲裁员之一。',
      date: '2023-12-20',
      caseType: '知识产权'
    }
  ]
};

export default function ArbitratorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseId = searchParams.get('caseId') || undefined;
  const arbitrator = mockArbitratorDetail;
  const { get, addArbitrator, removeArbitrator, setPresiding } = useTribunalStore();
  const tribunal = caseId ? (get(caseId) || { caseId, arbitrators: [], status: 'forming' as const }) : undefined;
  const isSelected = !!(caseId && tribunal?.arbitrators.includes(arbitrator.id));

  const [activeTab, setActiveTab] = useState('overview');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'busy': return 'bg-yellow-100 text-yellow-800';
      case 'unavailable': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return '可选';
      case 'busy': return '忙碌';
      case 'unavailable': return '不可用';
      default: return '未知';
    }
  };

  const getCaseStatusColor = (status: string) => {
    switch (status) {
      case '审理中': return 'bg-blue-100 text-blue-800';
      case '已结案': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-6xl animate-fade-in">
      {/* 页面头部 */}
      <div className="flex items-center justify-between mb-8 animate-slide-up">
        <div className="flex items-center space-x-4">
          <Link href="/arbitrators">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回仲裁员库
            </Button>
          </Link>
        </div>
      </div>

      {/* 仲裁员基本信息卡片 */}
      <Card className="mb-8 animate-slide-up" style={{animationDelay: '0.1s'}}>
        <CardContent className="p-8">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-6">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-2xl">
                  {arbitrator.name.charAt(0)}
                </span>
              </div>
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{arbitrator.name}</h1>
                  <Badge className={getStatusColor(arbitrator.status)}>
                    {getStatusText(arbitrator.status)}
                  </Badge>
                </div>
                <p className="text-lg text-gray-600 mb-4">{arbitrator.title}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 mb-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="text-2xl font-bold text-gray-900">{arbitrator.rating}</span>
                    </div>
                    <p className="text-sm text-gray-600">评分</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 mb-1">{arbitrator.totalCases}</div>
                    <p className="text-sm text-gray-600">总案件数</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 mb-1">{arbitrator.successRate}%</div>
                    <p className="text-sm text-gray-600">成功率</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 mb-1">{arbitrator.experience}</div>
                    <p className="text-sm text-gray-600">从业经验</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <MessageDialog
                arbitratorName={arbitrator.name}
                arbitratorId={arbitrator.id}
                onSend={(message) => {
                  console.log('发送消息:', message);
                  // 这里可以集成实际的消息发送逻辑
                }}
                trigger={
                  <Button variant="outline" size="lg" className="hover-lift">
                    <MessageSquare className="h-5 w-5 mr-2" />
                    发送消息
                  </Button>
                }
              />
              {caseId && (
                isSelected ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">已加入当前案件</Badge>
                    <Button size="lg" variant="outline" onClick={()=>{ removeArbitrator(caseId, arbitrator.id); router.push(`/cases/${caseId}?tab=tribunal`); }}>
                      <Trash2 className="h-5 w-5 mr-2"/>移除
                    </Button>
                    <Button size="lg" onClick={()=>{ setPresiding(caseId, arbitrator.id); router.push(`/cases/${caseId}?tab=tribunal`); }}>
                      <Crown className="h-5 w-5 mr-2"/>设为首席
                    </Button>
                  </div>
                ) : (
                  <Button size="lg" className="btn-primary btn-ripple hover-lift shadow-brand" onClick={()=>{ addArbitrator(caseId, arbitrator.id); router.push(`/cases/${caseId}?tab=tribunal`); }}>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    加入本案件仲裁庭
                  </Button>
                )
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 详细信息标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-slide-up" style={{animationDelay: '0.2s'}}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="background">背景</TabsTrigger>
          <TabsTrigger value="cases">案件经验</TabsTrigger>
          <TabsTrigger value="reviews">客户评价</TabsTrigger>
          <TabsTrigger value="contact">联系方式</TabsTrigger>
        </TabsList>

        {/* 概览标签页 */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="h-5 w-5 text-orange-500" />
                  <span>专业领域</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {arbitrator.specialties.map((specialty, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">{specialty.name}</h4>
                        <p className="text-sm text-gray-600">{specialty.cases} 个案件</p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="font-medium">{specialty.rating}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  <span>业绩统计</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">案件完成率</span>
                    <span className="font-semibold text-green-600">{arbitrator.successRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full"
                      style={{ width: `${arbitrator.successRate}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">平均处理时间</span>
                    <span className="font-semibold">3.2个月</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">客户满意度</span>
                    <span className="font-semibold text-orange-600">98%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 背景标签页 */}
        <TabsContent value="background" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <GraduationCap className="h-5 w-5 text-purple-500" />
                  <span>教育背景</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-gray-700">{arbitrator.basicInfo.education}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {arbitrator.basicInfo.location}
                    </span>
                    <span className="flex items-center">
                      <Globe className="h-4 w-4 mr-1" />
                      {arbitrator.basicInfo.languages.join(', ')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Briefcase className="h-5 w-5 text-green-500" />
                  <span>职业经历</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-gray-900">当前职位</h4>
                    <p className="text-sm text-gray-600">{arbitrator.background.currentPosition}</p>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">历任职位</h4>
                    <div className="space-y-1">
                      {arbitrator.background.previousPositions.map((position, index) => (
                        <p key={index} className="text-sm text-gray-600">• {position}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="h-5 w-5 text-yellow-500" />
                <span>专业资质</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {arbitrator.background.certifications.map((cert, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-yellow-600" />
                    <span className="text-gray-700">{cert}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 案件经验标签页 */}
        <TabsContent value="cases" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <span>近期案件</span>
              </CardTitle>
              <CardDescription>
                最近处理的仲裁案件
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {arbitrator.recentCases.map((caseItem, index) => (
                  <div key={caseItem.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">{caseItem.title}</h4>
                        <p className="text-sm text-gray-600">{caseItem.id} - {caseItem.type}</p>
                      </div>
                      <Badge className={getCaseStatusColor(caseItem.status)}>
                        {caseItem.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">争议金额：</span>
                        <span className="font-medium">¥{caseItem.amount.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">开始时间：</span>
                        <span className="font-medium">{caseItem.startDate}</span>
                      </div>
                      {caseItem.endDate && (
                        <div>
                          <span className="text-gray-500">结案时间：</span>
                          <span className="font-medium">{caseItem.endDate}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 客户评价标签页 */}
        <TabsContent value="reviews" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <span>客户评价</span>
              </CardTitle>
              <CardDescription>
                来自客户的真实反馈
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {arbitrator.reviews.map((review) => (
                  <div key={review.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${i < review.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                          <Badge variant="outline">{review.caseType}</Badge>
                        </div>
                        <p className="text-sm text-gray-600">{review.author}</p>
                      </div>
                      <span className="text-sm text-gray-500">{review.date}</span>
                    </div>
                    <p className="text-gray-700">{review.content}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 联系方式标签页 */}
        <TabsContent value="contact" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-green-500" />
                <span>联系信息</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">电话</p>
                      <p className="font-medium">{arbitrator.basicInfo.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">邮箱</p>
                      <p className="font-medium">{arbitrator.basicInfo.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Globe className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">个人网站</p>
                      <p className="font-medium text-blue-600">{arbitrator.basicInfo.website}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <MessageDialog
                    arbitratorName={arbitrator.name}
                    arbitratorId={arbitrator.id}
                    onSend={(message) => {
                      console.log('发送消息:', message);
                      // 这里可以集成实际的消息发送逻辑
                    }}
                    trigger={
                      <Button className="w-full btn-primary">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        发送消息
                      </Button>
                    }
                  />

                  <AppointmentDialog
                    arbitratorName={arbitrator.name}
                    arbitratorId={arbitrator.id}
                    onBook={(appointment) => {
                      console.log('预约咨询:', appointment);
                      // 这里可以集成实际的预约逻辑
                    }}
                    trigger={
                      <Button variant="outline" className="w-full">
                        <Calendar className="h-4 w-4 mr-2" />
                        预约咨询
                      </Button>
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
