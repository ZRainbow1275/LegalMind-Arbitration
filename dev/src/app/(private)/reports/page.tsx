// dev/src/app/(private)/reports/page.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  PieChart,
  LineChart,
  Download,
  Filter,
  Calendar,
  Users,
  FileText,
  Clock,
  DollarSign,
  Target,
  Activity,
  Zap,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

// 模拟数据
const mockData = {
  overview: {
    totalCases: 156,
    activeCases: 42,
    completedCases: 98,
    averageResolutionTime: 45,
    totalRevenue: 2850000,
    successRate: 94.2
  },
  casesByMonth: [
    { month: '1月', cases: 12, completed: 8, revenue: 180000 },
    { month: '2月', cases: 15, completed: 12, revenue: 220000 },
    { month: '3月', cases: 18, completed: 14, revenue: 280000 },
    { month: '4月', cases: 22, completed: 18, revenue: 350000 },
    { month: '5月', cases: 25, completed: 20, revenue: 420000 },
    { month: '6月', cases: 28, completed: 22, revenue: 480000 }
  ],
  casesByType: [
    { type: '合同纠纷', count: 45, percentage: 28.8 },
    { type: '劳动争议', count: 32, percentage: 20.5 },
    { type: '投资争议', count: 28, percentage: 17.9 },
    { type: '知识产权', count: 24, percentage: 15.4 },
    { type: '建设工程', count: 18, percentage: 11.5 },
    { type: '其他', count: 9, percentage: 5.8 }
  ],
  arbitratorPerformance: [
    { name: '张明华', cases: 24, avgTime: 38, successRate: 96.2 },
    { name: '李晓红', cases: 18, avgTime: 42, successRate: 94.8 },
    { name: '王建国', cases: 22, avgTime: 35, successRate: 97.1 },
    { name: '陈雅琴', cases: 16, avgTime: 48, successRate: 92.5 },
    { name: '刘德华', cases: 14, avgTime: 52, successRate: 91.3 }
  ],
  timeAnalysis: [
    { stage: '立案审查', avgDays: 3, target: 5 },
    { stage: '仲裁庭组成', avgDays: 7, target: 10 },
    { stage: '证据交换', avgDays: 15, target: 20 },
    { stage: '开庭审理', avgDays: 12, target: 15 },
    { stage: '裁决制作', avgDays: 8, target: 10 }
  ]
};

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('6months');
  const [selectedMetric, setSelectedMetric] = useState('cases');

  const getChangeIndicator = (current: number, previous: number) => {
    const change = ((current - previous) / previous * 100).toFixed(1);
    const isPositive = current > previous;
    return {
      value: `${isPositive ? '+' : ''}${change}%`,
      color: isPositive ? 'text-green-600' : 'text-red-600',
      icon: isPositive ? TrendingUp : TrendingDown
    };
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-orange-500" />
            数据分析报告
          </h1>
          <p className="text-gray-600 mt-1">
            全面的仲裁业务数据分析和可视化展示
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">近1个月</SelectItem>
              <SelectItem value="3months">近3个月</SelectItem>
              <SelectItem value="6months">近6个月</SelectItem>
              <SelectItem value="1year">近1年</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            导出报告
          </Button>
        </div>
      </div>

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">总案件数</p>
                <p className="text-3xl font-bold text-gray-900">{mockData.overview.totalCases}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  <span className="text-sm text-green-600">+12.5% vs 上期</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">进行中</p>
              <p className="text-2xl font-bold text-blue-600">{mockData.overview.activeCases}</p>
              <Badge className="mt-2 bg-blue-100 text-blue-800">活跃</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">已完成</p>
              <p className="text-2xl font-bold text-green-600">{mockData.overview.completedCases}</p>
              <Badge className="mt-2 bg-green-100 text-green-800">完成</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">平均用时</p>
              <p className="text-2xl font-bold text-orange-600">{mockData.overview.averageResolutionTime}</p>
              <p className="text-xs text-gray-500 mt-1">天</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">成功率</p>
              <p className="text-2xl font-bold text-purple-600">{mockData.overview.successRate}%</p>
              <Badge className="mt-2 bg-purple-100 text-purple-800">优秀</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 详细分析标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">总览</TabsTrigger>
          <TabsTrigger value="trends">趋势分析</TabsTrigger>
          <TabsTrigger value="types">案件类型</TabsTrigger>
          <TabsTrigger value="performance">效率分析</TabsTrigger>
          <TabsTrigger value="arbitrators">仲裁员</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 月度趋势图 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-blue-500" />
                  月度案件趋势
                </CardTitle>
                <CardDescription>过去6个月的案件数量变化</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockData.casesByMonth.map((item, index) => (
                    <div key={item.month} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 text-sm font-medium">{item.month}</div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(item.cases / 30) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{item.cases}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-600">
                          ¥{(item.revenue / 10000).toFixed(1)}万
                        </div>
                        <div className="text-xs text-gray-500">收入</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 收入分析 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  收入分析
                </CardTitle>
                <CardDescription>仲裁费收入统计</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      ¥{(mockData.overview.totalRevenue / 10000).toFixed(0)}万
                    </div>
                    <div className="text-sm text-gray-600">总收入</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-lg font-bold text-green-700">¥18.3万</div>
                      <div className="text-xs text-green-600">月均收入</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-700">¥1.83万</div>
                      <div className="text-xs text-blue-600">案均收入</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>仲裁费</span>
                      <span className="font-medium">85%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }} />
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span>管理费</span>
                      <span className="font-medium">15%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '15%' }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                  增长趋势分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <div className="font-medium">案件数量增长</div>
                      <div className="text-sm text-gray-600">相比去年同期</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">+24.5%</div>
                      <TrendingUp className="h-4 w-4 text-green-600 ml-auto" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <div className="font-medium">收入增长</div>
                      <div className="text-sm text-gray-600">相比去年同期</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">+31.2%</div>
                      <TrendingUp className="h-4 w-4 text-blue-600 ml-auto" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div>
                      <div className="font-medium">效率提升</div>
                      <div className="text-sm text-gray-600">平均处理时间</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-orange-600">-15.3%</div>
                      <TrendingDown className="h-4 w-4 text-orange-600 ml-auto" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-purple-500" />
                  关键指标对比
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: '案件受理率', current: 98.5, target: 95, unit: '%' },
                    { label: '按时结案率', current: 94.2, target: 90, unit: '%' },
                    { label: '当事人满意度', current: 96.8, target: 95, unit: '%' },
                    { label: '平均处理时间', current: 45, target: 60, unit: '天' }
                  ].map((metric, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{metric.label}</span>
                        <span className="font-medium">
                          {metric.current}{metric.unit} / {metric.target}{metric.unit}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            metric.current >= metric.target ? 'bg-green-500' : 'bg-orange-500'
                          }`}
                          style={{ 
                            width: `${Math.min((metric.current / metric.target) * 100, 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="types" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-indigo-500" />
                  案件类型分布
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockData.casesByType.map((type, index) => (
                    <div key={type.type} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ 
                            backgroundColor: `hsl(${index * 60}, 70%, 50%)` 
                          }}
                        />
                        <span className="text-sm font-medium">{type.type}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full"
                            style={{ 
                              width: `${type.percentage}%`,
                              backgroundColor: `hsl(${index * 60}, 70%, 50%)`
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">
                          {type.count}
                        </span>
                        <span className="text-xs text-gray-500 w-12 text-right">
                          {type.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-red-500" />
                  热点分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                    <div className="font-medium text-red-900">合同纠纷</div>
                    <div className="text-sm text-red-700">占比最高，需重点关注</div>
                    <div className="text-xs text-red-600 mt-1">
                      主要涉及：违约责任、履行义务、损失赔偿
                    </div>
                  </div>

                  <div className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                    <div className="font-medium text-yellow-900">劳动争议</div>
                    <div className="text-sm text-yellow-700">增长趋势明显</div>
                    <div className="text-xs text-yellow-600 mt-1">
                      主要涉及：工资支付、解除合同、工伤赔偿
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                    <div className="font-medium text-blue-900">投资争议</div>
                    <div className="text-sm text-blue-700">金额较大，影响重大</div>
                    <div className="text-xs text-blue-600 mt-1">
                      主要涉及：股权转让、投资回报、合伙纠纷
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-green-500" />
                流程效率分析
              </CardTitle>
              <CardDescription>各阶段平均用时与目标对比</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockData.timeAnalysis.map((stage, index) => (
                  <div key={stage.stage} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{stage.stage}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">
                          {stage.avgDays}天 / {stage.target}天
                        </span>
                        {stage.avgDays <= stage.target ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            stage.avgDays <= stage.target ? 'bg-green-500' : 'bg-orange-500'
                          }`}
                          style={{ width: `${Math.min((stage.avgDays / stage.target) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-12">
                        {((stage.avgDays / stage.target) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="arbitrators" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-500" />
                仲裁员绩效排行
              </CardTitle>
              <CardDescription>基于案件数量、处理时间和成功率的综合评估</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockData.arbitratorPerformance.map((arbitrator, index) => (
                  <div key={arbitrator.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{arbitrator.name}</div>
                        <div className="text-sm text-gray-600">
                          {arbitrator.cases}个案件 • 平均{arbitrator.avgTime}天
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">{arbitrator.successRate}%</div>
                      <div className="text-xs text-gray-500">成功率</div>
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
