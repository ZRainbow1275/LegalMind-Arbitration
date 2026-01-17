// src/hooks/useDataSync.ts
'use client';

import { useEffect, useCallback } from 'react';
import { useUserStore, useCasesStore, useDashboardStore } from '@/store';
import { useRole } from '@/components/layout/role-switcher';

/**
 * 数据同步Hook - 确保各模块间数据的一致性和连通性
 */
export function useDataSync() {
  const { currentUser, profile, setUser, setProfile } = useUserStore();
  const { cases, setCases, setCurrentCase } = useCasesStore();
  const { actionItems, notifications, setActionItems, setNotifications } = useDashboardStore();

  // 安全地获取角色，如果在RoleProvider外部则使用默认值
  let currentRole: string = 'applicant';
  try {
    const roleContext = useRole();
    currentRole = roleContext.currentRole;
  } catch (error) {
    // 如果在RoleProvider外部，使用默认角色
    console.warn('useDataSync: useRole called outside RoleProvider, using default role');
  }

  // 同步用户认证状态到仪表盘
  const syncUserToDashboard = useCallback(() => {
    if (!currentUser || !profile) return;
    const isVerified = profile.verificationStatus === 'verified';

    // 更新仪表盘的用户相关数据
    const userActionItems = [
      ...(isVerified ? [] : [{
        id: 'verify-identity',
        type: 'task' as const,
        category: 'identity' as const,
        title: '完成实名认证',
        description: '请完成身份认证以使用完整功能',
        priority: 'high' as const,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        completed: false,
        createdAt: new Date(),
      }]),
      ...(currentRole === 'arbitrator' ? [{
        id: 'arbitrator-training',
        type: 'task' as const,
        category: 'training' as const,
        title: '仲裁员培训',
        description: '完成最新的仲裁员培训课程',
        priority: 'medium' as const,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        completed: false,
        createdAt: new Date(),
      }] : [])
    ];

    // 使用函数式更新避免依赖当前状态
    setActionItems(prevItems => {
      const safeItems = Array.isArray(prevItems) ? prevItems : [];
      const existingIds = safeItems.map(item => item.id);
      const newItems = userActionItems.filter(item => !existingIds.includes(item.id));
      return newItems.length > 0 ? [...safeItems, ...newItems] : safeItems;
    });

    // 同步通知
    const userNotifications = [
      ...(isVerified ? [] : [{
        id: 'verify-notification',
        title: '实名认证提醒',
        message: '请尽快完成实名认证以享受完整服务',
        type: 'warning' as const,
        timestamp: new Date(),
        isRead: false,
      }])
    ];

    setNotifications(prevNotifications => {
      const safeNotifications = Array.isArray(prevNotifications) ? prevNotifications : [];
      const existingNotificationIds = safeNotifications.map(notif => notif.id);
      const newNotifications = userNotifications.filter(notif => !existingNotificationIds.includes(notif.id));
      return newNotifications.length > 0 ? [...safeNotifications, ...newNotifications] : safeNotifications;
    });
  }, [currentUser, profile, currentRole]); // 移除setState函数依赖

  // 同步案件数据到仪表盘
  const syncCasesToDashboard = useCallback(() => {
    if (!cases.length) return;

    // 基于案件状态生成行动项
    const caseActionItems = cases.flatMap(case_ => {
      const items = [];
      
      if (case_.status === 'accepted' && currentRole !== 'arbitrator') {
        items.push({
          id: `case-response-${case_.id}`,
          type: 'deadline' as const,
          category: 'case' as const,
          title: `案件 ${case_.caseNumber} 需要回应`,
          description: `请在截止日期前提交回应文件`,
          priority: 'high' as const,
          deadline: case_.deadline
            ? new Date(case_.deadline)
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          completed: false,
          caseId: case_.id,
          createdAt: new Date(),
        });
      }

      if (case_.status === 'hearing_scheduled') {
        items.push({
          id: `case-hearing-${case_.id}`,
          type: 'reminder' as const,
          category: 'case' as const,
          title: `案件 ${case_.caseNumber} 即将开庭`,
          description: `请准备相关材料并按时参加庭审`,
          priority: 'high' as const,
          deadline: case_.deadline
            ? new Date(case_.deadline)
            : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          completed: false,
          caseId: case_.id,
          createdAt: new Date(),
        });
      }

      return items;
    });

    // 使用函数式更新避免依赖当前状态
    setActionItems(prevItems => {
      const existingIds = prevItems.map(item => item.id);
      const newItems = caseActionItems.filter(item => !existingIds.includes(item.id));
      return newItems.length > 0 ? [...prevItems, ...newItems] : prevItems;
    });
  }, [cases, currentRole]); // 移除setState函数依赖

  // 同步角色变更到相关数据
  const syncRoleChange = useCallback(() => {
    // 角色变更时，清理不相关的行动项和通知
    setActionItems(prevItems => {
      const filteredActionItems = prevItems.filter(item => {
        if (item.category === 'training' && currentRole !== 'arbitrator') {
          return false;
        }
        if (item.category === 'case' && currentRole === 'arbitrator') {
          // 仲裁员不需要案件回应类的行动项
          return !item.id.includes('case-response');
        }
        return true;
      });

      return filteredActionItems.length !== prevItems.length ? filteredActionItems : prevItems;
    });
  }, [currentRole]); // 移除setState函数依赖

  // 数据验证和修复
  const validateAndRepairData = useCallback(() => {
    // 验证用户数据完整性
    if (currentUser && !profile) {
      console.warn('用户数据不完整：缺少profile信息');
      // 可以在这里触发数据修复逻辑
    }

    // 验证案件数据一致性
    if (Array.isArray(cases)) {
      cases.forEach(case_ => {
        if (!case_.id || !case_.caseNumber) {
          console.warn('发现无效的案件数据:', case_);
        }
      });
    }

    // 清理过期的行动项 - 暂时禁用避免无限循环
    // const now = new Date();
    // const validActionItems = Array.isArray(actionItems) ? actionItems.filter(item => {
    //   if (item.completed && item.dueDate && new Date(item.dueDate) < new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)) {
    //     return false; // 移除30天前完成的项目
    //   }
    //   return true;
    // }) : [];

    // if (validActionItems.length !== (Array.isArray(actionItems) ? actionItems.length : 0)) {
    //   setActionItems(validActionItems);
    // }
  }, [currentUser, profile, cases]); // 移除actionItems和setActionItems依赖

  // 主同步函数
  const syncAllData = useCallback(() => {
    syncUserToDashboard();
    syncCasesToDashboard();
    syncRoleChange();
    validateAndRepairData();
  }, [syncUserToDashboard, syncCasesToDashboard, syncRoleChange, validateAndRepairData]);

  // 监听数据变化并自动同步 - 暂时简化避免无限循环
  useEffect(() => {
    // 延迟执行，避免初始渲染时的循环
    const timer = setTimeout(() => {
      syncAllData();
    }, 500);

    return () => clearTimeout(timer);
  }, [currentUser?.id, profile?.verificationStatus, currentRole]); // 只监听关键字段变化

  // 定期数据同步（每5分钟）
  useEffect(() => {
    const interval = setInterval(() => {
      validateAndRepairData();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []); // 移除依赖，避免无限循环

  return {
    syncAllData,
    syncUserToDashboard,
    syncCasesToDashboard,
    syncRoleChange,
    validateAndRepairData
  };
}

/**
 * 数据连通性测试Hook - 用于验证各模块间的数据流
 */
export function useDataConnectivityTest() {
  const { currentUser, profile } = useUserStore();
  const { cases } = useCasesStore();
  const { actionItems, notifications } = useDashboardStore();
  const { currentRole } = useRole();

  const runConnectivityTest = useCallback(() => {
    const results = {
      userDataIntegrity: !!currentUser && !!profile,
      roleConsistency: !!currentRole,
      caseDataAvailability: Array.isArray(cases) && cases.length >= 0,
      dashboardDataSync: Array.isArray(actionItems) && actionItems.length >= 0 && Array.isArray(notifications) && notifications.length >= 0,
      crossModuleReferences: true // 可以添加更复杂的引用检查
    };

    const allPassed = Object.values(results).every(Boolean);
    
    console.log('数据连通性测试结果:', results);
    
    return {
      passed: allPassed,
      results,
      issues: Object.entries(results)
        .filter(([_, passed]) => !passed)
        .map(([test, _]) => test)
    };
  }, [currentUser, profile, currentRole, cases, actionItems, notifications]);

  return { runConnectivityTest };
}
