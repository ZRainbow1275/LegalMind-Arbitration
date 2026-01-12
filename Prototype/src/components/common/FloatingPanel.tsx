/**
 * 浮动面板组件
 * 
 * 功能：
 * - 可拖拽移动
 * - 可折叠
 * - 可调整大小
 * - 保存位置和大小
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Minimize2, Maximize2, GripVertical } from 'lucide-react';
import { Button } from '../ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export interface FloatingPanelProps {
  /** 面板标题 */
  title: string;
  /** 默认位置 */
  defaultPosition?: { x: number; y: number };
  /** 默认大小 */
  defaultSize?: { width: number; height: number };
  /** 最小大小 */
  minSize?: { width: number; height: number };
  /** 最大大小 */
  maxSize?: { width: number; height: number };
  /** 是否可拖拽 */
  draggable?: boolean;
  /** 是否可调整大小 */
  resizable?: boolean;
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
  /** 关闭回调 */
  onClose?: () => void;
}

/**
 * 浮动面板组件
 */
export const FloatingPanel = React.memo<FloatingPanelProps>(({
  title,
  defaultPosition = { x: window.innerWidth - 420, y: 80 },
  defaultSize = { width: 400, height: 600 },
  minSize = { width: 300, height: 400 },
  maxSize = { width: 800, height: window.innerHeight - 100 },
  draggable = true,
  resizable = true,
  collapsible = true,
  defaultCollapsed = false,
  children,
  className = '',
  storageKey,
  onClose,
}) => {
  // 从localStorage恢复状态
  const getInitialState = useCallback(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const state = JSON.parse(saved);
          return {
            position: state.position || defaultPosition,
            size: state.size || defaultSize,
            collapsed: state.collapsed ?? defaultCollapsed,
          };
        }
      } catch (e) {
        console.error('Failed to load floating panel state:', e);
      }
    }
    return {
      position: defaultPosition,
      size: defaultSize,
      collapsed: defaultCollapsed,
    };
  }, [storageKey, defaultPosition, defaultSize, defaultCollapsed]);

  const initialState = getInitialState();
  const [position, setPosition] = useState(initialState.position);
  const [size, setSize] = useState(initialState.size);
  const [isCollapsed, setIsCollapsed] = useState(initialState.collapsed);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // 保存状态到localStorage
  useEffect(() => {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify({
          position,
          size,
          collapsed: isCollapsed,
        }));
      } catch (e) {
        console.error('Failed to save floating panel state:', e);
      }
    }
  }, [position, size, isCollapsed, storageKey]);

  // 处理拖拽开始
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (!draggable) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  }, [draggable, position]);

  // 处理拖拽中
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = Math.max(0, Math.min(window.innerWidth - size.width, e.clientX - dragStartRef.current.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - dragStartRef.current.y));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, size.width]);

  // 处理调整大小开始
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (!resizable) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    };
  }, [resizable, size]);

  // 处理调整大小中
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStartRef.current.x;
      const deltaY = e.clientY - resizeStartRef.current.y;

      const newWidth = Math.max(
        minSize.width,
        Math.min(maxSize.width, resizeStartRef.current.width + deltaX)
      );
      const newHeight = Math.max(
        minSize.height,
        Math.min(maxSize.height, resizeStartRef.current.height + deltaY)
      );

      setSize({ width: newWidth, height: newHeight });
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
  }, [isResizing, minSize, maxSize]);

  // 切换折叠状态
  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev: boolean) => !prev);
  }, []);

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ duration: 0.2 }}
      className={`fixed bg-white/80 backdrop-blur-xl shadow-2xl rounded-xl border border-white/20 z-40 flex flex-col ${className}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: isCollapsed ? 'auto' : `${size.width}px`,
        height: isCollapsed ? 'auto' : `${size.height}px`,
        transition: isDragging || isResizing ? 'none' : 'width 0.3s ease, height 0.3s ease', // 移除位置的transition，避免拖拽延迟
      }}
    >
      {/* 标题栏 */}
      <div
        className={`flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-50/50 to-white/50 border-b border-gray-100 rounded-t-xl ${draggable ? 'cursor-move' : ''}`}
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-2">
          {draggable && <GripVertical className="w-4 h-4 text-gray-400" />}
          <h3 className="text-sm font-bold text-gray-800">{title}</h3>
        </div>
        <div className="flex items-center gap-1">
          {collapsible && (
            <Button
              variant="ghost"
              size="sm"
              className="w-6 h-6 p-0 hover:bg-orange-100 rounded-full"
              onClick={toggleCollapse}
              title={isCollapsed ? '展开' : '折叠'}
            >
              {isCollapsed ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              className="w-6 h-6 p-0 hover:bg-red-100 rounded-full"
              onClick={onClose}
              title="关闭"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* 面板内容 */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex-1 overflow-y-auto overflow-x-hidden p-4"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 调整大小手柄 */}
      {!isCollapsed && resizable && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize hover:bg-orange-500/50 transition-colors rounded-br-xl"
          onMouseDown={handleResizeStart}
        >
          <div className="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2 border-gray-400" />
        </div>
      )}

      {/* 拖拽/调整大小时的遮罩 */}
      {(isDragging || isResizing) && (
        <div className="fixed inset-0 z-[9999] cursor-move" />
      )}
    </motion.div>
  );
});

FloatingPanel.displayName = 'FloatingPanel';

