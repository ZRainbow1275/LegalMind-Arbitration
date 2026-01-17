// src/hooks/useHearingAccess.ts
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRole } from '@/components/layout/role-switcher';
import { useUserStore } from '@/store';

interface HearingAccessConfig {
  hearingId: string;
  caseId: string;
  hearingCode?: string; // 庭审码
  requiresVerification?: boolean;
  allowedRoles?: string[];
  startTime?: string;
  endTime?: string;
}

interface AccessCheckResult {
  hasAccess: boolean;
  reason?: string;
  requiresCode?: boolean;
  canEnterWaiting?: boolean;
  canEnterLive?: boolean;
  timeUntilStart?: number; // 距离开始时间的分钟数
}

export function useHearingAccess(config: HearingAccessConfig) {
  // 安全地获取角色，如果在RoleProvider外部则使用默认值
  let currentRole: string = 'applicant';
  try {
    const roleContext = useRole();
    currentRole = roleContext.currentRole;
  } catch (error) {
    // 如果在RoleProvider外部，使用默认角色
    console.warn('useHearingAccess: useRole called outside RoleProvider, using default role');
  }

  const { currentUser, profile } = useUserStore();
  const [accessResult, setAccessResult] = useState<AccessCheckResult>({
    hasAccess: false,
    canEnterWaiting: false,
    canEnterLive: false
  });
  const [enteredCode, setEnteredCode] = useState('');
  const [isCodeVerified, setIsCodeVerified] = useState(false);

  // 稳定化config对象，避免无限循环
  const stableConfig = useMemo(() => ({
    hearingId: config.hearingId,
    caseId: config.caseId,
    hearingCode: config.hearingCode,
    requiresVerification: config.requiresVerification,
    allowedRoles: config.allowedRoles ? [...config.allowedRoles] : undefined,
    startTime: config.startTime,
    endTime: config.endTime
  }), [config.hearingId, config.caseId, config.hearingCode, config.requiresVerification, config.allowedRoles?.join(','), config.startTime, config.endTime]);

  // 检查用户是否有庭审权限
  const checkAccess = useCallback(() => {
    const result: AccessCheckResult = {
      hasAccess: false,
      canEnterWaiting: false,
      canEnterLive: false
    };

    // 1. 检查用户是否已登录
    if (!currentUser) {
      result.reason = '请先登录';
      setAccessResult(result);
      return result;
    }

    // 2. 检查实名认证
    if (stableConfig.requiresVerification && profile?.verificationStatus !== 'verified') {
      result.reason = '请先完成实名认证';
      setAccessResult(result);
      return result;
    }

    // 3. 检查角色权限
    if (stableConfig.allowedRoles && !stableConfig.allowedRoles.includes(currentRole)) {
      result.reason = '您没有参与此庭审的权限';
      setAccessResult(result);
      return result;
    }

    // 4. 检查案件权限（模拟检查用户是否是案件当事人或仲裁员）
    const hasParticipantAccess = checkParticipantAccess(stableConfig.caseId, currentUser.email, currentRole);
    if (!hasParticipantAccess) {
      result.reason = '您不是此案件的参与者';
      setAccessResult(result);
      return result;
    }

    // 5. 检查庭审码（如果需要）
    if (stableConfig.hearingCode && !isCodeVerified) {
      result.requiresCode = true;
      result.reason = '请输入庭审码';
      setAccessResult(result);
      return result;
    }

    // 6. 检查时间权限
    const timeCheck = checkTimeAccess(stableConfig.startTime, stableConfig.endTime);
    result.timeUntilStart = timeCheck.timeUntilStart;

    // 基础权限检查通过
    result.hasAccess = true;

    // 7. 确定可以进入的阶段
    if (timeCheck.canEnterWaiting) {
      result.canEnterWaiting = true;
    }

    if (timeCheck.canEnterLive) {
      result.canEnterLive = true;
    }

    setAccessResult(result);
    return result;
  }, [currentUser, profile, currentRole, stableConfig, isCodeVerified]);

  // 检查参与者权限
  const checkParticipantAccess = (caseId: string, userEmail: string, role: string): boolean => {
    // 仲裁员总是有权限
    if (role === 'arbitrator') {
      return true;
    }

    // 模拟检查：检查用户是否是案件的申请人或被申请人
    // 在实际应用中，这里会查询数据库
    const mockCaseParticipants = {
      'case-001': ['user@example.com', 'respondent@example.com'],
      'case-002': ['applicant2@example.com', 'respondent2@example.com']
    };

    const participants = mockCaseParticipants[caseId as keyof typeof mockCaseParticipants] || [];
    return participants.includes(userEmail);
  };

  // 检查时间权限
  const checkTimeAccess = (startTime?: string, endTime?: string) => {
    const now = new Date();
    const result = {
      canEnterWaiting: false,
      canEnterLive: false,
      timeUntilStart: 0
    };

    if (!startTime) {
      // 如果没有设置开始时间，默认允许进入
      result.canEnterWaiting = true;
      result.canEnterLive = true;
      return result;
    }

    // 解析开始时间（简化处理，实际应用中需要更完整的时间处理）
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDateTime = new Date();
    startDateTime.setHours(hours, minutes, 0, 0);

    const timeDiff = startDateTime.getTime() - now.getTime();
    const minutesUntilStart = Math.floor(timeDiff / (1000 * 60));

    result.timeUntilStart = minutesUntilStart;

    // 开庭前15分钟可以进入等候室
    if (minutesUntilStart <= 15 && minutesUntilStart > 0) {
      result.canEnterWaiting = true;
    }

    // 开庭时间到了可以进入直播间
    if (minutesUntilStart <= 0) {
      result.canEnterWaiting = true;
      result.canEnterLive = true;
    }

    // 如果是仲裁员，可以提前30分钟进入
    if (currentRole === 'arbitrator' && minutesUntilStart <= 30) {
      result.canEnterWaiting = true;
      if (minutesUntilStart <= 5) {
        result.canEnterLive = true;
      }
    }

    return result;
  };

  // 验证庭审码
  const verifyHearingCode = useCallback((code: string): boolean => {
    // 模拟庭审码验证
    const validCodes = {
      'hearing-001': '123456',
      'hearing-002': '789012'
    };

    const validCode = validCodes[stableConfig.hearingId as keyof typeof validCodes];
    const isValid = code === validCode;

    if (isValid) {
      setIsCodeVerified(true);
      setEnteredCode(code);
    }

    return isValid;
  }, [stableConfig.hearingId]);

  // 重置访问状态
  const resetAccess = useCallback(() => {
    setIsCodeVerified(false);
    setEnteredCode('');
    setAccessResult({
      hasAccess: false,
      canEnterWaiting: false,
      canEnterLive: false
    });
  }, []);

  // 初始检查和定时更新 - 暂时禁用自动检查避免无限循环
  useEffect(() => {
    // 延迟执行，避免初始渲染时的循环
    const timer = setTimeout(() => {
      checkAccess();
    }, 100);

    return () => clearTimeout(timer);
  }, []); // 空依赖数组，只在组件挂载时执行一次

  return {
    accessResult,
    verifyHearingCode,
    resetAccess,
    enteredCode,
    isCodeVerified,
    checkAccess
  };
}
