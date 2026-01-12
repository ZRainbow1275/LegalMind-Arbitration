/**
 * 触摸手势Hook
 * 
 * 支持移动端的触摸手势操作
 */

import { useRef, useCallback, useEffect } from 'react';

export interface TouchGestureHandlers {
  // 单指滑动
  onSwipe?: (direction: 'left' | 'right' | 'up' | 'down', distance: number) => void;
  // 双指缩放
  onPinch?: (scale: number, center: { x: number; y: number }) => void;
  // 双指旋转
  onRotate?: (angle: number) => void;
  // 长按
  onLongPress?: (point: { x: number; y: number }) => void;
  // 双击
  onDoubleTap?: (point: { x: number; y: number }) => void;
  // 单击
  onTap?: (point: { x: number; y: number }) => void;
}

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

interface TouchState {
  touches: TouchPoint[];
  startTouches: TouchPoint[];
  lastTapTime: number;
  longPressTimer: NodeJS.Timeout | null;
}

const SWIPE_THRESHOLD = 50; // 滑动阈值（像素）
const LONG_PRESS_DURATION = 500; // 长按时长（毫秒）
const DOUBLE_TAP_DELAY = 300; // 双击间隔（毫秒）

/**
 * 计算两点之间的距离
 */
const getDistance = (p1: TouchPoint, p2: TouchPoint): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * 计算两点之间的角度
 */
const getAngle = (p1: TouchPoint, p2: TouchPoint): number => {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
};

/**
 * 计算两点的中心点
 */
const getCenter = (p1: TouchPoint, p2: TouchPoint): { x: number; y: number } => {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
};

/**
 * 触摸手势Hook
 */
export const useTouchGestures = (
  elementRef: React.RefObject<HTMLElement>,
  handlers: TouchGestureHandlers
) => {
  const stateRef = useRef<TouchState>({
    touches: [],
    startTouches: [],
    lastTapTime: 0,
    longPressTimer: null,
  });

  // 清除长按定时器
  const clearLongPressTimer = useCallback(() => {
    if (stateRef.current.longPressTimer) {
      clearTimeout(stateRef.current.longPressTimer);
      stateRef.current.longPressTimer = null;
    }
  }, []);

  // 处理触摸开始
  const handleTouchStart = useCallback((event: TouchEvent) => {
    const touches = Array.from(event.touches).map(touch => ({
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
    }));

    stateRef.current.touches = touches;
    stateRef.current.startTouches = touches;

    // 单指触摸：启动长按检测
    if (touches.length === 1 && handlers.onLongPress) {
      clearLongPressTimer();
      stateRef.current.longPressTimer = setTimeout(() => {
        handlers.onLongPress!(touches[0]);
      }, LONG_PRESS_DURATION);
    }
  }, [handlers, clearLongPressTimer]);

  // 处理触摸移动
  const handleTouchMove = useCallback((event: TouchEvent) => {
    const touches = Array.from(event.touches).map(touch => ({
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
    }));

    const prevTouches = stateRef.current.touches;
    stateRef.current.touches = touches;

    // 移动时取消长按
    clearLongPressTimer();

    // 双指缩放
    if (touches.length === 2 && prevTouches.length === 2 && handlers.onPinch) {
      const prevDistance = getDistance(prevTouches[0], prevTouches[1]);
      const currentDistance = getDistance(touches[0], touches[1]);
      const scale = currentDistance / prevDistance;
      const center = getCenter(touches[0], touches[1]);
      
      handlers.onPinch(scale, center);
    }

    // 双指旋转
    if (touches.length === 2 && prevTouches.length === 2 && handlers.onRotate) {
      const prevAngle = getAngle(prevTouches[0], prevTouches[1]);
      const currentAngle = getAngle(touches[0], touches[1]);
      const angleDiff = currentAngle - prevAngle;
      
      handlers.onRotate(angleDiff);
    }
  }, [handlers, clearLongPressTimer]);

  // 处理触摸结束
  const handleTouchEnd = useCallback((event: TouchEvent) => {
    clearLongPressTimer();

    const { startTouches, lastTapTime } = stateRef.current;

    // 单指滑动检测
    if (startTouches.length === 1 && event.changedTouches.length === 1 && handlers.onSwipe) {
      const start = startTouches[0];
      const end = {
        x: event.changedTouches[0].clientX,
        y: event.changedTouches[0].clientY,
        timestamp: Date.now(),
      };

      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > SWIPE_THRESHOLD) {
        // 判断滑动方向
        if (Math.abs(dx) > Math.abs(dy)) {
          handlers.onSwipe(dx > 0 ? 'right' : 'left', distance);
        } else {
          handlers.onSwipe(dy > 0 ? 'down' : 'up', distance);
        }
      }
    }

    // 单击/双击检测
    if (startTouches.length === 1 && event.changedTouches.length === 1) {
      const point = {
        x: event.changedTouches[0].clientX,
        y: event.changedTouches[0].clientY,
      };

      const now = Date.now();
      const timeSinceLastTap = now - lastTapTime;

      if (timeSinceLastTap < DOUBLE_TAP_DELAY && handlers.onDoubleTap) {
        // 双击
        handlers.onDoubleTap(point);
        stateRef.current.lastTapTime = 0; // 重置，避免三击被识别为双击
      } else {
        // 单击
        if (handlers.onTap) {
          handlers.onTap(point);
        }
        stateRef.current.lastTapTime = now;
      }
    }

    // 重置状态
    stateRef.current.touches = [];
    stateRef.current.startTouches = [];
  }, [handlers, clearLongPressTimer]);

  // 绑定事件监听器
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      clearLongPressTimer();
    };
  }, [elementRef, handleTouchStart, handleTouchMove, handleTouchEnd, clearLongPressTimer]);
};

