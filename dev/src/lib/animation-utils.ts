// dev/src/lib/animation-utils.ts
// 统一的动画工具类和配置

import React from 'react';

/**
 * 动画持续时间配置
 */
export const ANIMATION_DURATION = {
  fast: 150,
  normal: 200,
  slow: 300,
  slower: 500,
} as const;

/**
 * 动画缓动函数配置
 */
export const ANIMATION_EASING = {
  smooth: 'cubic-bezier(0.16, 1, 0.3, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

/**
 * 统一的动画类名
 */
export const ANIMATION_CLASSES = {
  // 基础动画
  fadeIn: 'animate-fade-in',
  slideUp: 'animate-slide-up',
  slideDown: 'animate-slide-down',
  slideLeft: 'animate-slide-left',
  slideRight: 'animate-slide-right',
  scaleIn: 'animate-scale-in',
  scaleOut: 'animate-scale-out',
  bounceIn: 'animate-bounce-in',
  
  // 悬停效果
  hoverLift: 'hover-lift',
  hoverScale: 'hover-scale',
  hoverGlow: 'hover-glow',
  hoverBrightness: 'hover-brightness',
  
  // 过渡效果
  transitionSmooth: 'transition-smooth',
  transitionFast: 'transition-fast',
  transitionSlow: 'transition-slow',
  
  // 交互效果
  ripple: 'btn-ripple',
  navAnimate: 'nav-item-animate',
  inputAnimate: 'input-animate',
  
  // 布局动画
  cardAnimate: 'card-animate',
  skeleton: 'skeleton',
} as const;

/**
 * 动画延迟工具函数
 */
export const createAnimationDelay = (index: number, baseDelay = 100): string => {
  return `${index * baseDelay}ms`;
};

/**
 * 创建交错动画样式
 */
export const createStaggeredAnimation = (
  index: number,
  animationClass: string,
  baseDelay = 100
): { className: string; style: React.CSSProperties } => {
  return {
    className: animationClass,
    style: {
      animationDelay: createAnimationDelay(index, baseDelay),
    },
  };
};

/**
 * 响应式动画配置
 */
export const RESPONSIVE_ANIMATION = {
  // 在移动设备上减少动画
  mobile: {
    duration: ANIMATION_DURATION.fast,
    easing: ANIMATION_EASING.standard,
  },
  // 在桌面设备上使用完整动画
  desktop: {
    duration: ANIMATION_DURATION.normal,
    easing: ANIMATION_EASING.smooth,
  },
} as const;

/**
 * 检查用户是否偏好减少动画
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * 获取适合的动画配置
 */
export const getAnimationConfig = (isMobile = false) => {
  if (prefersReducedMotion()) {
    return {
      duration: 0,
      easing: 'linear',
      className: '',
    };
  }
  
  return isMobile ? RESPONSIVE_ANIMATION.mobile : RESPONSIVE_ANIMATION.desktop;
};

/**
 * 动画组合工具
 */
export const combineAnimations = (...classes: string[]): string => {
  return classes.filter(Boolean).join(' ');
};

/**
 * 常用动画组合
 */
export const ANIMATION_COMBINATIONS = {
  cardEntry: combineAnimations(
    ANIMATION_CLASSES.fadeIn,
    ANIMATION_CLASSES.slideUp,
    ANIMATION_CLASSES.hoverLift
  ),
  buttonInteractive: combineAnimations(
    ANIMATION_CLASSES.transitionSmooth,
    ANIMATION_CLASSES.hoverScale,
    ANIMATION_CLASSES.ripple
  ),
  navItem: combineAnimations(
    ANIMATION_CLASSES.transitionSmooth,
    ANIMATION_CLASSES.navAnimate,
    ANIMATION_CLASSES.hoverLift
  ),
  inputField: combineAnimations(
    ANIMATION_CLASSES.transitionSmooth,
    ANIMATION_CLASSES.inputAnimate
  ),
} as const;

/**
 * 动画事件监听器
 */
export const addAnimationEndListener = (
  element: HTMLElement,
  callback: () => void
): (() => void) => {
  const handleAnimationEnd = () => {
    callback();
    element.removeEventListener('animationend', handleAnimationEnd);
  };
  
  element.addEventListener('animationend', handleAnimationEnd);
  
  // 返回清理函数
  return () => {
    element.removeEventListener('animationend', handleAnimationEnd);
  };
};

/**
 * 过渡事件监听器
 */
export const addTransitionEndListener = (
  element: HTMLElement,
  callback: () => void
): (() => void) => {
  const handleTransitionEnd = () => {
    callback();
    element.removeEventListener('transitionend', handleTransitionEnd);
  };
  
  element.addEventListener('transitionend', handleTransitionEnd);
  
  // 返回清理函数
  return () => {
    element.removeEventListener('transitionend', handleTransitionEnd);
  };
};

/**
 * React Hook for animations
 */
export const useAnimation = (
  animationClass: string,
  delay = 0
): [string, boolean] => {
  const [isVisible, setIsVisible] = React.useState(false);
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [delay]);
  
  return [isVisible ? animationClass : '', isVisible];
};
