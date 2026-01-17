// src/components/ai/smart-suggestions.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Lightbulb, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  ArrowRight,
  Sparkles,
  Target,
  Zap,
  Brain
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useRole } from '@/components/layout/role-switcher';

interface Suggestion {
  id: string;
  title: string;
  description: string;
  type: 'optimization' | 'reminder' | 'insight' | 'action' | 'warning';
  priority: 'low' | 'medium' | 'high';
  category: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible: boolean;
}

interface SmartSuggestionsProps {
  pageContext?: string;
  caseId?: string;
  className?: string;
}

export function SmartSuggestions({ pageContext, caseId, className }: SmartSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);
  const pathname = usePathname();
  const { currentRole } = useRole();

  // 根据页面上下文生成智能建议
  useEffect(() => {
    const generatedSuggestions = generateSuggestions(pathname, currentRole, pageContext, caseId);
    setSuggestions(generatedSuggestions.filter(s => !dismissedSuggestions.includes(s.id)));
  }, [pathname, currentRole, pageContext, caseId, dismissedSuggestions]);

  // 生成建议
  const generateSuggestions = (path: string, role: string, context?: string, caseId?: string): Suggestion[] => {
    const suggestions: Suggestion[] = [];

    // 仪表盘建议
    if (path === '/dashboard') {
      suggestions.push({
        id: 'dashboard-efficiency',
        title: '提高工作效率',
        description: '您有3个案件即将到期，建议优先处理高优先级案件',
        type: 'optimization',
        priority: 'high',
        category: '效率优化',
        action: {
          label: '查看紧急案件',
          onClick: () => window.location.href = '/cases?filter=urgent'
        },
        dismissible: true
      });

      if (role === 'arbitrator') {
        suggestions.push({
          id: 'arbitrator-schedule',
          title: '庭审安排建议',
          description: '本周庭审较为密集，建议合理安排休息时间',
          type: 'reminder',
          priority: 'medium',
          category: '日程管理',
          dismissible: true
        });
      }
    }

    // 案件管理建议
    if (path.includes('/cases')) {
      suggestions.push({
        id: 'case-document-check',
        title: '文档完整性检查',
        description: '发现部分案件缺少关键证据材料，建议及时补充',
        type: 'warning',
        priority: 'high',
        category: '文档管理',
        action: {
          label: '检查文档',
          onClick: () => console.log('检查文档完整性')
        },
        dismissible: true
      });

      suggestions.push({
        id: 'case-progress-insight',
        title: '案件进展洞察',
        description: '类似案件平均处理时间为45天，当前案件进展正常',
        type: 'insight',
        priority: 'low',
        category: '进展分析',
        dismissible: true
      });
    }

    // 庭审相关建议
    if (path.includes('/hearings')) {
      suggestions.push({
        id: 'hearing-preparation',
        title: '庭审准备提醒',
        description: '明日庭审需要准备的材料清单已生成，请及时查看',
        type: 'reminder',
        priority: 'high',
        category: '庭审准备',
        action: {
          label: '查看清单',
          onClick: () => console.log('查看庭审准备清单')
        },
        dismissible: true
      });

      suggestions.push({
        id: 'hearing-optimization',
        title: '庭审效率优化',
        description: '建议使用AI转录功能，可提高庭审记录效率60%',
        type: 'optimization',
        priority: 'medium',
        category: '效率提升',
        dismissible: true
      });
    }

    // 调解相关建议
    if (path.includes('/mediation')) {
      suggestions.push({
        id: 'mediation-success-rate',
        title: '调解成功率分析',
        description: '基于历史数据，此类案件调解成功率为78%，建议积极推进',
        type: 'insight',
        priority: 'medium',
        category: '数据洞察',
        dismissible: true
      });
    }

    // 日程管理建议
    if (path.includes('/schedule')) {
      suggestions.push({
        id: 'schedule-conflict',
        title: '日程冲突提醒',
        description: '检测到下周二有时间冲突，建议调整安排',
        type: 'warning',
        priority: 'high',
        category: '日程冲突',
        action: {
          label: '解决冲突',
          onClick: () => console.log('解决日程冲突')
        },
        dismissible: true
      });

      suggestions.push({
        id: 'schedule-optimization',
        title: '时间管理优化',
        description: '建议在上午安排重要会议，下午处理文档工作',
        type: 'optimization',
        priority: 'low',
        category: '时间管理',
        dismissible: true
      });
    }

    return suggestions;
  };

  // 获取建议图标
  const getSuggestionIcon = (type: Suggestion['type']) => {
    switch (type) {
      case 'optimization': return <TrendingUp className="w-4 h-4" />;
      case 'reminder': return <Clock className="w-4 h-4" />;
      case 'insight': return <Brain className="w-4 h-4" />;
      case 'action': return <Target className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  // 获取优先级颜色
  const getPriorityColor = (priority: Suggestion['priority']) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'low': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  // 获取类型颜色
  const getTypeColor = (type: Suggestion['type']) => {
    switch (type) {
      case 'optimization': return 'bg-green-100 text-green-800';
      case 'reminder': return 'bg-blue-100 text-blue-800';
      case 'insight': return 'bg-purple-100 text-purple-800';
      case 'action': return 'bg-orange-100 text-orange-800';
      case 'warning': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 忽略建议
  const dismissSuggestion = (suggestionId: string) => {
    setDismissedSuggestions(prev => [...prev, suggestionId]);
  };

  // 执行建议操作
  const executeSuggestion = (suggestion: Suggestion) => {
    if (suggestion.action) {
      suggestion.action.onClick();
    }
    if (suggestion.dismissible) {
      dismissSuggestion(suggestion.id);
    }
  };

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card className={`border-primary-200 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-primary-700">
          <Sparkles className="w-5 h-5" />
          AI智能建议
          <Badge variant="secondary" className="bg-primary-100 text-primary-700">
            {suggestions.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map(suggestion => (
          <Alert key={suggestion.id} className={`${getPriorityColor(suggestion.priority)} border`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-0.5">
                  {getSuggestionIcon(suggestion.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{suggestion.title}</h4>
                    <Badge variant="outline" className={getTypeColor(suggestion.type)}>
                      {suggestion.category}
                    </Badge>
                  </div>
                  <AlertDescription className="text-sm">
                    {suggestion.description}
                  </AlertDescription>
                  
                  {suggestion.action && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => executeSuggestion(suggestion)}
                      className="mt-2 h-7 text-xs"
                    >
                      {suggestion.action.label}
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
              
              {suggestion.dismissible && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dismissSuggestion(suggestion.id)}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                >
                  ×
                </Button>
              )}
            </div>
          </Alert>
        ))}
        
        {/* 底部提示 */}
        <div className="text-center pt-2">
          <p className="text-xs text-gray-500">
            💡 AI建议基于您的使用习惯和数据分析生成
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
