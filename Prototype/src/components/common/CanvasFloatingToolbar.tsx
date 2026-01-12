/**
 * 画布浮动工具栏组件
 * 
 * 功能：
 * - 在画布空白区域双击时显示
 * - 提供创建评论、聊天贴、节点的快捷按钮
 * - 使用@floating-ui/react实现智能定位
 * - 符合drawnix设计风格
 */

import React, { useEffect, useRef } from 'react';
import { useFloating, offset, flip, shift } from '@floating-ui/react';
import { MessageSquare, FileText, Plus, X } from 'lucide-react';

export interface CanvasFloatingToolbarProps {
  /** 是否显示工具栏 */
  visible: boolean;
  /** 工具栏位置（屏幕坐标） */
  position: { x: number; y: number } | null;
  /** 画布坐标（用于创建元素） */
  canvasPosition: { x: number; y: number } | null;
  /** 创建评论回调 */
  onCreateComment: (position: { x: number; y: number }) => void;
  /** 创建聊天贴回调 */
  onCreateChatNote: (position: { x: number; y: number }) => void;
  /** 显示节点选择器回调 */
  onShowNodeSelector: (position: { x: number; y: number }) => void;
  /** 创建思维导图回调 */
  onCreateMindMap?: (position: { x: number; y: number }) => void;
  /** 创建流程图回调 */
  onCreateFlowchart?: (position: { x: number; y: number }) => void;
  /** 创建手绘回调 */
  onCreateFreehand?: (position: { x: number; y: number }) => void;
  /** 关闭工具栏回调 */
  onClose: () => void;
}

/**
 * 画布浮动工具栏组件
 */
export const CanvasFloatingToolbar = React.memo<CanvasFloatingToolbarProps>(({
  visible,
  position,
  canvasPosition,
  onCreateComment,
  onCreateChatNote,
  onShowNodeSelector,
  onCreateMindMap,
  onCreateFlowchart,
  onCreateFreehand,
  onClose,
}) => {
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  const { refs, floatingStyles } = useFloating({
    placement: 'bottom-start',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
  });

  // 设置虚拟参考元素（鼠标点击位置）
  useEffect(() => {
    if (position) {
      refs.setPositionReference({
        getBoundingClientRect() {
          return {
            width: 0,
            height: 0,
            x: position.x,
            y: position.y,
            top: position.y,
            left: position.x,
            right: position.x,
            bottom: position.y,
          };
        },
      });
    }
  }, [position, refs]);

  // ESC键关闭工具栏
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);

  // 点击外部关闭工具栏
  useEffect(() => {
    if (!visible) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // 延迟添加监听器，避免立即触发
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [visible, onClose]);

  if (!visible || !position || !canvasPosition) {
    return null;
  }

  return (
    <div
      ref={(node) => {
        toolbarRef.current = node;
        refs.setFloating(node);
      }}
      style={{
        ...floatingStyles,
        zIndex: 1000,
      }}
      className="canvas-floating-toolbar bg-white rounded-lg shadow-lg border border-gray-200 p-1"
    >
      <div className="flex items-center gap-1">
        {/* 创建评论按钮 */}
        <button
          onClick={() => {
            onCreateComment(canvasPosition);
            onClose();
          }}
          className="flex items-center gap-2 px-3 py-2 hover:bg-orange-50 rounded transition-colors group"
          title="创建评论 (Ctrl+Shift+C)"
        >
          <MessageSquare className="w-4 h-4 text-gray-600 group-hover:text-orange-600" />
          <span className="text-sm text-gray-700 group-hover:text-orange-700">评论</span>
        </button>

        {/* 分隔线 */}
        <div className="w-px h-6 bg-gray-200" />

        {/* 创建聊天贴按钮 */}
        <button
          onClick={() => {
            onCreateChatNote(canvasPosition);
            onClose();
          }}
          className="flex items-center gap-2 px-3 py-2 hover:bg-orange-50 rounded transition-colors group"
          title="创建聊天贴 (Ctrl+Shift+N)"
        >
          <FileText className="w-4 h-4 text-gray-600 group-hover:text-orange-600" />
          <span className="text-sm text-gray-700 group-hover:text-orange-700">聊天贴</span>
        </button>

        {/* 分隔线 */}
        <div className="w-px h-6 bg-gray-200" />

        {/* 创建节点按钮 */}
        <button
          onClick={() => {
            onShowNodeSelector(canvasPosition);
            onClose();
          }}
          className="flex items-center gap-2 px-3 py-2 hover:bg-orange-50 rounded transition-colors group"
          title="创建节点 (Ctrl+Shift+A)"
        >
          <Plus className="w-4 h-4 text-gray-600 group-hover:text-orange-600" />
          <span className="text-sm text-gray-700 group-hover:text-orange-700">节点</span>
        </button>

        {/* 分隔线 */}
        <div className="w-px h-6 bg-gray-200" />

        {/* {{ AURA: Add - Drawnix工具按钮 }} */}
        {onCreateMindMap && (
          <button
            onClick={() => {
              onCreateMindMap(canvasPosition);
              onClose();
            }}
            className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 rounded transition-colors group"
            title="创建思维导图"
          >
            <span className="text-sm text-gray-700 group-hover:text-blue-700">思维导图</span>
          </button>
        )}

        {onCreateFlowchart && (
          <button
            onClick={() => {
              onCreateFlowchart(canvasPosition);
              onClose();
            }}
            className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 rounded transition-colors group"
            title="创建流程图"
          >
            <span className="text-sm text-gray-700 group-hover:text-blue-700">流程图</span>
          </button>
        )}

        {onCreateFreehand && (
          <button
            onClick={() => {
              onCreateFreehand(canvasPosition);
              onClose();
            }}
            className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 rounded transition-colors group"
            title="自由绘图"
          >
            <span className="text-sm text-gray-700 group-hover:text-blue-700">绘图</span>
          </button>
        )}

        {/* 分隔线 */}
        <div className="w-px h-6 bg-gray-200" />

        {/* 分隔线 */}
        <div className="w-px h-6 bg-gray-200" />

        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="p-2 hover:bg-red-50 rounded transition-colors group"
          title="关闭 (ESC)"
        >
          <X className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
        </button>
      </div>

      {/* 提示文本 */}
      <div className="mt-1 px-2 py-1 text-xs text-gray-400 border-t border-gray-100">
        提示：按 ESC 关闭
      </div>
    </div>
  );
});

CanvasFloatingToolbar.displayName = 'CanvasFloatingToolbar';

