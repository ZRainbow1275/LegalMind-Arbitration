// src/components/dashboard/action-center-card.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  Bell,
  Calendar,
  FileText,
  ArrowRight,
  Zap,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { mockActionItems } from '@/lib/mock-data';
import { getTimeRemaining } from '@/lib/utils';
import type { ActionItem } from '@/types';
import { useDashboardStore } from '@/store';
import { useRole } from '@/components/layout/role-switcher';
import { useUserStore } from '@/store';

const getActionIcon = (type: ActionItem['type']) => {
  switch (type) {
    case 'deadline':
      return AlertTriangle;
    case 'task':
      return CheckCircle;
    case 'notification':
      return Bell;
    case 'reminder':
      return Clock;
    default:
      return FileText;
  }
};

const getActionColor = (type: ActionItem['type'], priority: ActionItem['priority']) => {
  if (type === 'deadline' && priority === 'high') {
    return 'text-error-500 bg-error-50';
  }
  if (priority === 'high') {
    return 'text-error-500 bg-error-50';
  }
  if (priority === 'medium') {
    return 'text-warning-500 bg-warning-50';
  }
  return 'text-info-500 bg-info-50';
};

const getPriorityBadge = (priority: ActionItem['priority']) => {
  switch (priority) {
    case 'high':
      return <Badge variant="destructive" className="text-xs">紧急</Badge>;
    case 'medium':
      return <Badge variant="secondary" className="text-xs bg-warning-100 text-warning-700">重要</Badge>;
    case 'low':
      return <Badge variant="outline" className="text-xs">一般</Badge>;
  }
};

export function ActionCenterCard() {
  const router = useRouter();
  const { actionItems: rawStoreActionItems } = useDashboardStore();

  // 安全地获取角色，如果在RoleProvider外部则使用默认值
  let currentRole: string = 'applicant';
  try {
    const roleContext = useRole();
    currentRole = roleContext.currentRole;
  } catch (error) {
    console.warn('ActionCenterCard: useRole called outside RoleProvider, using default role');
  }

  const { profile } = useUserStore();

  // 处理待办项点击跳转
  const handleActionItemClick = (item: ActionItem) => {
    if (item.id === 'verify-identity') {
      router.push('/profile');
      return;
    }

    if (item.id === 'arbitrator-training') {
      router.push('/training');
      return;
    }

    if (item.type === 'notification') {
      router.push('/notifications');
      return;
    }

    if (item.caseId) {
      router.push(`/cases/${item.caseId}`);
      return;
    }

    if (item.id.includes('hearing')) {
      router.push('/hearings');
      return;
    }

    if (item.id.includes('document')) {
      router.push('/documents');
      return;
    }

    router.push('/cases');
  };

  // 确保 storeActionItems 是数组
  const storeActionItems = Array.isArray(rawStoreActionItems) ? rawStoreActionItems : [];

  // 合并store中的数据和mock数据，优先使用store数据
  const allActionItems = storeActionItems.length > 0 ? storeActionItems : mockActionItems;

  // 根据角色和用户状态过滤行动项
  const actionItems = allActionItems.filter(item => {
    if (item.completed) return false;

      // 如果是实名认证相关的任务，检查用户是否已认证
      const isVerified = profile?.verificationStatus === 'verified' || Boolean(profile?.verifiedAt);
      if (item.id === 'verify-identity' && isVerified) {
        return false;
      }

    // 如果是仲裁员培训，只对仲裁员显示
    if (item.id === 'arbitrator-training' && currentRole !== 'arbitrator') {
      return false;
    }

    return true;
  });

  const urgentItems = actionItems.filter(item => item.priority === 'high');
  const totalItems = actionItems.length;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <CardTitle className="text-lg">AI 待办中心</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-primary-50 text-primary-700">
            {totalItems} 项任务
          </Badge>
        </div>

        {urgentItems.length > 0 && (
          <div className="flex items-center space-x-2 text-sm text-error-600 bg-error-50 px-3 py-2 rounded-lg">
            <AlertTriangle className="w-4 h-4" />
            <span>您有 {urgentItems.length} 个紧急任务需要处理</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {actionItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-success-500" />
            <p className="text-sm">太棒了！您暂时没有待办任务</p>
            <p className="text-xs mt-1">保持这个状态，继续高效工作</p>
          </div>
        ) : (
          <>
            {actionItems.slice(0, 4).map((item) => {
              const Icon = getActionIcon(item.type);
              const colorClass = getActionColor(item.type, item.priority);
              const timeRemaining = item.deadline ? getTimeRemaining(item.deadline) : null;


              const onClick = () => {
                handleActionItemClick(item);
              };

              return (
                <div
                  key={item.id}
                  onClick={onClick}
                  className="group flex items-start space-x-3 p-3 rounded-lg border border-border hover:border-primary-200 hover:bg-primary-50/50 transition-all duration-200 cursor-pointer"
                >
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-sm font-medium text-foreground group-hover:text-primary-700 transition-colors">
                            {item.title}
                          </h4>
                          {getPriorityBadge(item.priority)}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>

                        {/* Deadline */}
                        {timeRemaining && (
                          <div className="flex items-center space-x-1 mt-2">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className={`text-xs ${
                              item.priority === 'high' ? 'text-error-600 font-medium' : 'text-muted-foreground'
                            }`}>
                              剩余时间: {timeRemaining}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Arrow */}
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary-500 transition-colors" />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Show More Button */}
            {actionItems.length > 4 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/tasks')}
                className="w-full mt-3 text-primary-600 hover:text-primary-700 hover:bg-primary-50 transition-all duration-200 hover:scale-[1.02]"
              >
                查看全部 {totalItems} 项任务
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
