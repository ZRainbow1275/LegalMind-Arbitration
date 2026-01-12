/**
 * 响应式布局Hook
 * 
 * 管理不同屏幕尺寸下的布局适配
 */

import { useState, useEffect, useCallback } from 'react';

// 断点定义（与Tailwind CSS保持一致）
export const BREAKPOINTS = {
  sm: 640,   // 小屏幕（手机横屏）
  md: 768,   // 中等屏幕（平板竖屏）
  lg: 1024,  // 大屏幕（平板横屏/小笔记本）
  xl: 1280,  // 超大屏幕（桌面）
  '2xl': 1536, // 2K屏幕
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

export interface ResponsiveLayoutState {
  // 当前屏幕宽度
  width: number;
  // 当前屏幕高度
  height: number;
  // 是否为移动设备
  isMobile: boolean;
  // 是否为平板设备
  isTablet: boolean;
  // 是否为桌面设备
  isDesktop: boolean;
  // 当前断点
  breakpoint: Breakpoint;
  // 是否为触摸设备
  isTouchDevice: boolean;
  // 是否为横屏
  isLandscape: boolean;
}

/**
 * 检测是否为触摸设备
 */
const isTouchDevice = (): boolean => {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore
    navigator.msMaxTouchPoints > 0
  );
};

/**
 * 获取当前断点
 */
const getCurrentBreakpoint = (width: number): Breakpoint => {
  if (width >= BREAKPOINTS['2xl']) return '2xl';
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'sm';
};

/**
 * 响应式布局Hook
 */
export const useResponsiveLayout = (): ResponsiveLayoutState => {
  const [state, setState] = useState<ResponsiveLayoutState>(() => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const height = typeof window !== 'undefined' ? window.innerHeight : 768;
    const breakpoint = getCurrentBreakpoint(width);
    const isLandscape = width > height;

    return {
      width,
      height,
      isMobile: width < BREAKPOINTS.md,
      isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
      isDesktop: width >= BREAKPOINTS.lg,
      breakpoint,
      isTouchDevice: isTouchDevice(),
      isLandscape,
    };
  });

  const handleResize = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const breakpoint = getCurrentBreakpoint(width);
    const isLandscape = width > height;

    setState({
      width,
      height,
      isMobile: width < BREAKPOINTS.md,
      isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
      isDesktop: width >= BREAKPOINTS.lg,
      breakpoint,
      isTouchDevice: isTouchDevice(),
      isLandscape,
    });
  }, []);

  useEffect(() => {
    // 初始化时立即执行一次
    handleResize();

    // 添加resize监听器
    window.addEventListener('resize', handleResize);
    
    // 添加orientationchange监听器（移动设备）
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [handleResize]);

  return state;
};

/**
 * 响应式值Hook
 * 根据当前断点返回不同的值
 */
export const useResponsiveValue = <T,>(values: {
  base: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  '2xl'?: T;
}): T => {
  const { breakpoint } = useResponsiveLayout();

  if (breakpoint === '2xl' && values['2xl'] !== undefined) return values['2xl'];
  if (breakpoint === 'xl' && values.xl !== undefined) return values.xl;
  if (breakpoint === 'lg' && values.lg !== undefined) return values.lg;
  if (breakpoint === 'md' && values.md !== undefined) return values.md;
  if (breakpoint === 'sm' && values.sm !== undefined) return values.sm;
  
  return values.base;
};

