// dev/src/app/(private)/insights/page.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  FileText,
  BarChart3,
  Search,
  Filter,
  ArrowRight,
  Calendar,
  Target,
  Lightbulb,
  Zap
} from 'lucide-react';

// 扩展的洞察数据
const allInsights = [
  {
    id: 'insight-1',
    type: 'efficiency',
    title: '案件处理效率提升',
    description: '您的案件平均处理时间比上月缩短了15%，表现优秀！',
    impact: 'high',
    category: 'performance',
    date: '2024-11-15',
    metrics: {
      improvement: '+15%',
      baseline: '45天',
      current: '38天'
    },
    action: {
      label: '查看详细分析',
      href: '/analytics/efficiency'
    },
    tags: ['效率', '时间管理']
  },
  {
    id: 'insight-2',
    type: 'cost',
    title: '成本控制建议',
    description: '通过优化仲裁员选择策略，预计可节省20%的仲裁费用',
    impact: 'medium',
    category: 'financial',
    date: '2024-11-14',
    metrics: {
      potential_savings: '¥12,000',
      current_cost: '¥60,000',
      optimized_cost: '¥48,000'
    },
    action: {
      label: '查看优化方案',
      href: '/arbitrators/optimization'
    },
    tags: ['成本', '优化']
  },
  {
    id: 'insight-3',
    type: 'risk',
    title: '风险预警',
    description: '检测到3个案件可能面临延期风险，建议及时跟进',
    impact: 'high',
    category: 'risk',
    date: '2024-11-13',
    metrics: {
      at_risk_cases: 3,
      total_cases: 15,
      risk_percentage: '20%'
    },
    action: {
      label: '查看风险案件',
      href: '/cases?filter=at-risk'
    },
    tags: ['风险', '预警']
  },
  {
    id: 'insight-4',
    type: 'opportunity',
    title: '调解成功率分析',
    description: '您的调解成功率达到85%，建议在合适案件中优先尝试调解',
    impact: 'medium',
    category: 'strategy',
    date: '2024-11-12',
    metrics: {
      success_rate: '85%',
      mediation_cases: 12,
      successful_mediations: 10
    },
    action: {
      label: '查看调解策略',
      href: '/mediation/strategy'
    },
    tags: ['调解', '成功率']
  },
  {
    id: 'insight-5',
    type: 'trend',
    title: '行业趋势洞察',
    description: '合同纠纷案件数量呈上升趋势，建议加强合同审查服务',
    impact: 'low',
    category: 'market',
    date: '2024-11-11',
    metrics: {
      trend: '+25%',
      period: '近3个月',
      case_type: '合同纠纷'
    },
    action: {
      label: '查看市场分析',
      href: '/analytics/market-trends'
    },
    tags: ['趋势', '市场']
  }
];

const getInsightIcon = (type: string) => {
  switch (type) {
    case 'efficiency': return TrendingUp;
    case 'cost': return Target;
    case 'risk': return AlertTriangle;
    case 'opportunity': return Lightbulb;
    case 'trend': return BarChart3;
    default: return Zap;
  }
};

const getInsightColor = (impact: string) => {
  switch (impact) {
    case 'high': return 'bg-red-50 text-red-700 border-red-200';
    case 'medium': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'low': return 'bg-blue-50 text-blue-700 border-blue-200';
    default: return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

const getImpactText = (impact: string) => {
  switch (impact) {
    case 'high': return '高影响';
    case 'medium': return '中等影响';
    case 'low': return '低影响';
    default: return '未知';
  }
};

export default function InsightsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [impactFilter, setImpactFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');

  const filteredInsights = allInsights.filter(insight => {
    const matchesSearch = insight.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         insight.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || insight.category === categoryFilter;
    const matchesImpact = impactFilter === 'all' || insight.impact === impactFilter;
    const matchesTab = activeTab === 'all' || insight.type === activeTab;
    
    return matchesSearch && matchesCategory && matchesImpact && matchesTab;
  });

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">智能洞察</h1>
          <p className="text-gray-600 mt-1">
            基于您的案件数据和行为模式的个性化建议和分析
          </p>
        </div>
        <Badge className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2">
          <Zap className="h-4 w-4 mr-2" />
          AI 驱动
        </Badge>
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索洞察内容..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                <SelectItem value="performance">性能分析</SelectItem>
                <SelectItem value="financial">财务分析</SelectItem>
                <SelectItem value="risk">风险管理</SelectItem>
                <SelectItem value="strategy">策略建议</SelectItem>
                <SelectItem value="market">市场趋势</SelectItem>
              </SelectContent>
            </Select>

            <Select value={impactFilter} onValueChange={setImpactFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="影响度" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部影响</SelectItem>
                <SelectItem value="high">高影响</SelectItem>
                <SelectItem value="medium">中等影响</SelectItem>
                <SelectItem value="low">低影响</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="efficiency">效率</TabsTrigger>
              <TabsTrigger value="cost">成本</TabsTrigger>
              <TabsTrigger value="risk">风险</TabsTrigger>
              <TabsTrigger value="opportunity">机会</TabsTrigger>
              <TabsTrigger value="trend">趋势</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* 洞察列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredInsights.map((insight, index) => {
          const Icon = getInsightIcon(insight.type);
          const impactColorClass = getInsightColor(insight.impact);
          
          return (
            <Card key={insight.id} className="card hover-lift group transition-all duration-300">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg group-hover:text-orange-600 transition-colors">
                        {insight.title}
                      </CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className={impactColorClass}>
                          {getImpactText(insight.impact)}
                        </Badge>
                        <span className="text-sm text-gray-500">{insight.date}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-gray-600 mb-4">{insight.description}</p>
                
                {/* 指标展示 */}
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {Object.entries(insight.metrics).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-gray-500 capitalize">{key.replace('_', ' ')}:</span>
                        <span className="font-medium ml-2">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 标签 */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {insight.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  {insight.action && (
                    <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700">
                      {insight.action.label}
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredInsights.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无匹配的洞察</h3>
            <p className="text-gray-500">尝试调整搜索条件或筛选器</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
