// src/hooks/useSessionTimeout.ts
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store';

interface UseSessionTimeoutOptions {
  timeoutMinutes?: number; // 超时时间（分钟）
  warningMinutes?: number; // 警告提前时间（分钟）
  onWarning?: () => void; // 警告回调
  onTimeout?: () => void; // 超时回调
}

export function useSessionTimeout({
  timeoutMinutes = 30, // 默认30分钟超时
  warningMinutes = 5,  // 默认5分钟前警告
  onWarning,
  onTimeout
}: UseSessionTimeoutOptions = {}) {
  const router = useRouter();
  const { isAuthenticated, logout } = useUserStore();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // 重置计时器
  const resetTimer = useCallback(() => {
    if (!isAuthenticated) return;

    lastActivityRef.current = Date.now();

    // 清除现有计时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
    }

    // 设置警告计时器
    const warningTime = (timeoutMinutes - warningMinutes) * 60 * 1000;
    warningRef.current = setTimeout(() => {
      if (onWarning) {
        onWarning();
      } else {
        // 默认警告提示 - 应该使用自定义对话框替代
        console.warn('会话即将过期，建议实现自定义警告对话框');
        // TODO: 实现自定义会话警告对话框
        resetTimer(); // 临时自动续期
      }
    }, warningTime);

    // 设置超时计时器
    const timeoutTime = timeoutMinutes * 60 * 1000;
    timeoutRef.current = setTimeout(() => {
      handleTimeout();
    }, timeoutTime);
  }, [isAuthenticated, timeoutMinutes, warningMinutes, onWarning]);

  // 处理超时
  const handleTimeout = useCallback(() => {
    if (onTimeout) {
      onTimeout();
    } else {
      // 默认超时处理 - 应该使用自定义通知替代
      console.warn('登录会话已过期');
      // TODO: 实现自定义超时通知
      logout();
      router.push('/login');
    }
  }, [logout, router, onTimeout]);

  // 监听用户活动
  const handleActivity = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (!isAuthenticated) {
      // 清除计时器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningRef.current) {
        clearTimeout(warningRef.current);
      }
      return;
    }

    // 初始化计时器
    resetTimer();

    // 监听用户活动事件
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // 清理函数
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningRef.current) {
        clearTimeout(warningRef.current);
      }
    };
  }, [isAuthenticated, resetTimer, handleActivity]);

  return {
    resetTimer,
    lastActivity: lastActivityRef.current,
    isActive: isAuthenticated
  };
}
