/**
 * 侧边栏面板组件
 * 
 * 用于显示侧边栏内容，支持左右两侧、可折叠、可调整大小
 */

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface SidePanelProps {
  /** 是否显示面板 */
  isOpen: boolean;
  /** 面板标题 */
  title: string;
  /** 面板内容 */
  children: React.ReactNode;
  /** 关闭回调 */
  onClose: () => void;
  /** 面板位置 */
  side?: 'left' | 'right';
  /** 默认宽度 */
  defaultWidth?: number;
  /** 最小宽度 */
  minWidth?: number;
  /** 最大宽度 */
  maxWidth?: number;
  /** 是否可调整大小 */
  resizable?: boolean;
  /** 是否可折叠 */
  collapsible?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 头部额外内容 */
  headerExtra?: React.ReactNode;
}

/**
 * 侧边栏面板组件
 */
export const SidePanel = React.memo<SidePanelProps>(({
  isOpen,
  title,
  children,
  onClose,
  side = 'right',
  defaultWidth = 400,
  minWidth = 300,
  maxWidth = 800,
  resizable = true,
  collapsible = true,
  className = '',
  headerExtra,
}) => {
  const [width, setWidth] = useState(defaultWidth);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // 处理拖拽调整大小
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!resizable) return;
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!panelRef.current) return;

      if (!panelRef.current) return;

      let newWidth: number;

      if (side === 'right') {
        newWidth = window.innerWidth - e.clientX;
      } else {
        newWidth = e.clientX;
      }

      // 限制宽度范围
      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
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

  if (!isOpen) return null;

  const sideClasses = side === 'right' ? 'right-0' : 'left-0';
  const resizeHandleClasses = side === 'right' ? 'left-0 cursor-ew-resize' : 'right-0 cursor-ew-resize';

  return (
    <div
      ref={panelRef}
      className={`fixed top-0 ${sideClasses} h-full bg-white shadow-2xl z-40 flex flex-col ${className}`}
      style={{
        width: isCollapsed ? '48px' : `${width}px`,
        transition: isResizing ? 'none' : 'width 0.3s ease',
      }}
    >
      {/* 调整大小手柄 */}
      {resizable && !isCollapsed && (
        <div
          className={`absolute top-0 ${resizeHandleClasses} w-1 h-full hover:bg-orange-500 transition-colors`}
          onMouseDown={handleMouseDown}
        />
      )}

      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-white">
        {!isCollapsed && (
          <>
            <h2 className="text-lg font-bold text-gray-800">{title}</h2>
            <div className="flex items-center gap-2">
              {headerExtra}
              {collapsible && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCollapsed(true)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {side === 'right' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
        {isCollapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(false)}
            className="text-gray-500 hover:text-gray-700 mx-auto"
          >
            {side === 'right' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
        )}
      </div>

      {/* 内容区域 */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      )}
    </div>
  );
});

SidePanel.displayName = 'SidePanel';

