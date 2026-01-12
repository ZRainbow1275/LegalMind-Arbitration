/**
 * 可调整大小的面板组件
 * 
 * 功能：
 * - 可折叠
 * - 可拖拽调整宽度
 * - 支持左右两侧
 * - 保存用户偏好
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';

export interface ResizablePanelProps {
  /** 面板位置 */
  side: 'left' | 'right';
  /** 默认宽度 */
  defaultWidth?: number;
  /** 最小宽度 */
  minWidth?: number;
  /** 最大宽度 */
  maxWidth?: number;
  /** 是否可折叠 */
  collapsible?: boolean;
  /** 默认是否折叠 */
  defaultCollapsed?: boolean;
  /** 面板内容 */
  children: React.ReactNode;
  /** 自定义类名 */
  className?: string;
  /** 存储键（用于保存用户偏好） */
  storageKey?: string;
}

/**
 * 可调整大小的面板组件
 */
export const ResizablePanel = React.memo<ResizablePanelProps>(({
  side,
  defaultWidth = 280,
  minWidth = 80,
  maxWidth = 400,
  collapsible = true,
  defaultCollapsed = false,
  children,
  className = '',
  storageKey,
}) => {
  // 从localStorage恢复状态
  const getInitialState = useCallback((): { width: number; collapsed: boolean } => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const { width, collapsed } = JSON.parse(saved);
          return { width: width || defaultWidth, collapsed: collapsed ?? defaultCollapsed };
        }
      } catch (e) {
        console.error('Failed to load panel state:', e);
      }
    }
    return { width: defaultWidth, collapsed: defaultCollapsed };
  }, [storageKey, defaultWidth, defaultCollapsed]);

  const initialState = getInitialState();
  const [width, setWidth] = useState(initialState.width);
  const [isCollapsed, setIsCollapsed] = useState(initialState.collapsed);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // 保存状态到localStorage
  useEffect(() => {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ width, collapsed: isCollapsed }));
      } catch (e) {
        console.error('Failed to save panel state:', e);
      }
    }
  }, [width, isCollapsed, storageKey]);

  // 处理拖拽开始
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  }, [width]);

  // 处理拖拽中
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = side === 'left'
        ? e.clientX - startXRef.current
        : startXRef.current - e.clientX;

      const newWidth = Math.max(
        minWidth,
        Math.min(maxWidth, startWidthRef.current + delta)
      );

      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, side, minWidth, maxWidth]);

  // 切换折叠状态
  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  const sideClasses = side === 'left' ? 'left-0' : 'right-0';
  const resizeHandleClasses = side === 'left'
    ? 'right-0 -mr-1 cursor-ew-resize'
    : 'left-0 -ml-1 cursor-ew-resize';
  const collapseButtonClasses = side === 'left'
    ? 'right-2'
    : 'left-2';

  return (
    <div
      ref={panelRef}
      className={`fixed top-0 ${sideClasses} h-full bg-white/98 backdrop-blur-md shadow-2xl z-30 flex flex-col transition-all duration-300 ${className}`}
      style={{
        width: isCollapsed ? '0px' : `${width}px`,
        opacity: isCollapsed ? 0 : 1,
        pointerEvents: isCollapsed ? 'none' : 'auto',
      }}
    >
      {/* 调整大小手柄 */}
      {!isCollapsed && (
        <div
          className={`absolute top-0 ${resizeHandleClasses} w-2 h-full hover:bg-orange-500/50 transition-colors z-50 group`}
          onMouseDown={handleMouseDown}
        >
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-gray-300 group-hover:bg-orange-500 transition-colors" />
        </div>
      )}

      {/* 折叠按钮 */}
      {collapsible && (
        <Button
          variant="ghost"
          size="sm"
          className={`absolute ${collapseButtonClasses} top-2 z-50 w-6 h-6 p-0 rounded-full bg-white shadow-md hover:bg-orange-50 hover:shadow-lg transition-all duration-200`}
          onClick={toggleCollapse}
          title={isCollapsed ? '展开面板' : '折叠面板'}
        >
          {side === 'left' ? (
            isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />
          ) : (
            isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
          )}
        </Button>
      )}

      {/* 面板内容 */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </div>
      )}

      {/* 拖拽时的遮罩 */}
      {isResizing && (
        <div className="fixed inset-0 z-[9999] cursor-ew-resize" />
      )}
    </div>
  );
});

ResizablePanel.displayName = 'ResizablePanel';

