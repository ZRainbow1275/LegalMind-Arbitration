/**
 * 响应式画布容器组件
 * 
 * 根据屏幕尺寸自动调整画布布局和交互方式
 */

import React, { useRef, useEffect } from 'react';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { useTouchGestures } from '../../hooks/useTouchGestures';

export interface ResponsiveCanvasContainerProps {
  // 子元素
  children: React.ReactNode;
  // 缩放级别
  zoom: number;
  // 缩放回调
  onZoomChange?: (zoom: number) => void;
  // 视口位置
  viewport: { x: number; y: number };
  // 视口变化回调
  onViewportChange?: (viewport: { x: number; y: number }) => void;
  // 自定义类名
  className?: string;
}

/**
 * 响应式画布容器组件
 */
export const ResponsiveCanvasContainer: React.FC<ResponsiveCanvasContainerProps> = ({
  children,
  zoom,
  onZoomChange,
  viewport,
  onViewportChange,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isMobile, isTablet, isTouchDevice } = useResponsiveLayout();

  // 触摸手势处理
  useTouchGestures(containerRef, {
    // 双指缩放
    onPinch: (scale) => {
      if (onZoomChange) {
        const newZoom = Math.max(0.1, Math.min(5, zoom * scale));
        onZoomChange(newZoom);
      }
    },

    // 单指滑动（平移画布）
    onSwipe: (direction, distance) => {
      if (onViewportChange) {
        const moveAmount = distance * 0.5; // 调整移动速度
        let newX = viewport.x;
        let newY = viewport.y;

        switch (direction) {
          case 'left':
            newX -= moveAmount;
            break;
          case 'right':
            newX += moveAmount;
            break;
          case 'up':
            newY -= moveAmount;
            break;
          case 'down':
            newY += moveAmount;
            break;
        }

        onViewportChange({ x: newX, y: newY });
      }
    },

    // 双击（重置视图）
    onDoubleTap: () => {
      if (onZoomChange && onViewportChange) {
        onZoomChange(1);
        onViewportChange({ x: 0, y: 0 });
      }
    },
  });

  // 移动端优化：禁用默认的触摸行为
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isTouchDevice) return;

    const preventDefaultTouch = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        // 多指触摸时阻止默认行为（防止页面缩放）
        e.preventDefault();
      }
    };

    container.addEventListener('touchstart', preventDefaultTouch, { passive: false });
    container.addEventListener('touchmove', preventDefaultTouch, { passive: false });

    return () => {
      container.removeEventListener('touchstart', preventDefaultTouch);
      container.removeEventListener('touchmove', preventDefaultTouch);
    };
  }, [isTouchDevice]);

  // 根据设备类型调整容器样式
  const getContainerStyles = () => {
    const baseStyles = 'relative w-full h-full overflow-hidden';

    if (isMobile) {
      return `${baseStyles} touch-none select-none`;
    } else if (isTablet) {
      return `${baseStyles} touch-none`;
    } else {
      return baseStyles;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`${getContainerStyles()} ${className}`}
      style={{
        // 移动端优化：使用硬件加速
        transform: isTouchDevice ? 'translateZ(0)' : undefined,
        WebkitTransform: isTouchDevice ? 'translateZ(0)' : undefined,
        // 禁用用户选择（移动端）
        userSelect: isMobile ? 'none' : undefined,
        WebkitUserSelect: isMobile ? 'none' : undefined,
        // 禁用触摸高亮（移动端）
        WebkitTapHighlightColor: isMobile ? 'transparent' : undefined,
      }}
    >
      {children}

      {/* 移动端提示 */}
      {isMobile && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-black/70 text-white px-4 py-2 rounded-full text-xs">
            双指缩放 · 单指拖动 · 双击重置
          </div>
        </div>
      )}
    </div>
  );
};

