// src/components/dashboard/smart-insights.tsx
'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  Calendar,
  FileText,
  Users,
  Target,
  ArrowRight,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react';
import { useCasesStore, useDashboardStore } from '@/store';
import { useRole } from '@/components/layout/role-switcher';

interface SmartInsight {
  id: string;
  type: 'urgent' | 'opportunity' | 'achievement' | 'reminder';
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
  priority: 'high' | 'medium' | 'low';
  category: 'case' | 'schedule' | 'document' | 'general';
}

// 模拟智能洞察数据
const mockInsights: SmartInsight[] = [
  {
    id: 'insight-1',
    type: 'urgent',
    title: '案件 ARB-2024-001 需要您的关注',
    description: '庭审将在明天上午9:00开始，请确保已准备好相关材料',
    action: {
      label: '查看案件',
      href: '/cases/ARB-2024-001'
    },
    priority: 'high',
    category: 'case'
  },
  {
    id: 'insight-2',
    type: 'opportunity',
    title: '建议安排调解会议',
    description: '基于案件类型和争议金额，调解可能是更高效的解决方案',
    action: {
      label: '安排调解',
      href: '/mediation/schedule'
    },
    priority: 'medium',
    category: 'case'
  },
  {
    id: 'insight-3',
    type: 'achievement',
    title: '本月案件处理效率提升 25%',
    description: '相比上月，您的案件平均处理时间缩短了 5 天',
    priority: 'low',
    category: 'general'
  },
  {
    id: 'insight-4',
    type: 'reminder',
    title: '3 份文书待您审核',
    description: '有新的仲裁文书需要您的确认和签署',
    action: {
      label: '查看文书',
      href: '/documents/pending'
    },
    priority: 'medium',
    category: 'document'
  }
];

const getInsightIcon = (type: SmartInsight['type']) => {
  switch (type) {
    case 'urgent': return AlertTriangle;
    case 'opportunity': return Lightbulb;
    case 'achievement': return CheckCircle;
    case 'reminder': return Clock;
    default: return FileText;
  }
};

const getInsightColor = (type: SmartInsight['type']) => {
  switch (type) {
    case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
    case 'opportunity': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'achievement': return 'text-green-600 bg-green-50 border-green-200';
    case 'reminder': return 'text-orange-600 bg-orange-50 border-orange-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

const getPriorityBadge = (priority: SmartInsight['priority']) => {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'low': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export function SmartInsights() {
  return (
    <Card className="card hover-lift">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <span>智能洞察</span>
            </CardTitle>
            <CardDescription>
              基于您的案件数据和行为模式的个性化建议
            </CardDescription>
          </div>
          <Badge className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            AI 驱动
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {mockInsights.map((insight, index) => {
          const Icon = getInsightIcon(insight.type);
          const colorClass = getInsightColor(insight.type);
          
          return (
            <div
              key={insight.id}
              className={`p-4 rounded-lg border transition-all duration-300 hover:shadow-md animate-fade-in ${colorClass}`}
              style={{animationDelay: `${index * 0.1}s`}}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold">{insight.title}</h4>
                    <Badge className={getPriorityBadge(insight.priority)}>
                      {insight.priority === 'high' ? '高' : insight.priority === 'medium' ? '中' : '低'}
                    </Badge>
                  </div>
                  <p className="text-sm opacity-90 mb-3">
                    {insight.description}
                  </p>
                  {insight.action && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      asChild
                      className="hover-lift p-0 h-auto text-current hover:text-current"
                    >
                      <Link href={insight.action.href} className="flex items-center space-x-1">
                        <span>{insight.action.label}</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {/* 查看更多洞察 */}
        <div className="pt-4 border-t border-gray-200">
          <Button variant="outline" className="w-full hover-lift" asChild>
            <Link href="/insights">
              查看所有洞察
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// 快速统计组件
export function QuickStats() {
  const { cases } = useCasesStore();
  const { actionItems: rawActionItems } = useDashboardStore();

  // 安全地获取角色，如果在RoleProvider外部则使用默认值
  let currentRole: string = 'applicant';
  try {
    const roleContext = useRole();
    currentRole = roleContext.currentRole;
  } catch (error) {
    console.warn('QuickStats: useRole called outside RoleProvider, using default role');
  }

  // 确保 actionItems 是数组
  const actionItems = Array.isArray(rawActionItems) ? rawActionItems : [];

  // 计算实际统计数据
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // 本周新案件
  const thisWeekCases = cases.filter(case_ =>
    new Date(case_.createdAt) >= oneWeekAgo
  ).length;

  // 待处理任务
  const pendingTasks = actionItems.filter(item => !item.completed).length;

  // 即将到期的任务（3天内）
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const upcomingDeadlines = actionItems.filter((item) => {
    if (item.completed) return false;

    const deadlineValue = (item as { deadline?: unknown }).deadline;
    if (!deadlineValue) return false;

    const deadlineDate = deadlineValue instanceof Date
      ? deadlineValue
      : typeof deadlineValue === 'string' || typeof deadlineValue === 'number'
        ? new Date(deadlineValue)
        : null;

    if (!deadlineDate || Number.isNaN(deadlineDate.getTime())) return false;

    return deadlineDate.getTime() <= threeDaysFromNow.getTime();
  }).length;

  // 根据角色显示不同的第四个统计项
  type StatTrend = 'up' | 'down' | 'stable';
  type StatCard = {
    label: string;
    value: string;
    change: string;
    trend: StatTrend;
    icon: LucideIcon;
  };

  const fourthStat: StatCard = currentRole === 'arbitrator'
    ? {
        label: '活跃案件',
        value: cases.filter(case_ =>
          case_.status === 'hearing_in_progress' || case_.status === 'hearing_scheduled'
        ).length.toString(),
        change: '+1',
        trend: 'up',
        icon: Target
      }
    : {
        label: '我的案件',
        value: cases.length.toString(),
        change: thisWeekCases > 0 ? `+${thisWeekCases}` : '0',
        trend: thisWeekCases > 0 ? 'up' : 'stable',
        icon: FileText
      };

  const stats: StatCard[] = [
    {
      label: '本周新案件',
      value: thisWeekCases.toString(),
      change: thisWeekCases > 0 ? `+${thisWeekCases}` : '0',
      trend: thisWeekCases > 0 ? 'up' : 'stable',
      icon: FileText
    },
    {
      label: '待处理任务',
      value: pendingTasks.toString(),
      change: pendingTasks > 5 ? '+' + (pendingTasks - 5) : '0',        
      trend: pendingTasks > 5 ? 'up' : 'stable',
      icon: Clock
    },
    {
      label: '即将到期',
      value: upcomingDeadlines.toString(),
      change: upcomingDeadlines > 0 ? `+${upcomingDeadlines}` : '0',    
      trend: upcomingDeadlines > 0 ? 'up' : 'stable',
      icon: Calendar
    },
    fourthStat
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card 
          key={stat.label} 
          className="card hover-lift animate-scale-in"
          style={{animationDelay: `${index * 0.1}s`}}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <div className="flex items-center space-x-1 mt-1">
                  <span className={`text-xs ${
                    stat.trend === 'up' ? 'text-green-600' : 
                    stat.trend === 'down' ? 'text-red-600' : 
                    'text-gray-600'
                  }`}>
                    {stat.change}
                  </span>
                  <span className="text-xs text-gray-500">vs 上周</span>
                </div>
              </div>
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <stat.icon className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
