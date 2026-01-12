/**
 * 节点类型选择器组件
 * 
 * 功能：
 * - 显示6种法律节点类型供用户选择
 * - 使用@floating-ui/react实现智能定位
 * - 符合LegalMind橙色主题设计
 */

import React, { useEffect, useRef } from 'react';
import { useFloating, offset, flip, shift } from '@floating-ui/react';
import { Scale, Users, FileText, Calendar, Brain, Gavel, X } from 'lucide-react';

export interface NodeType {
  type: 'legal-case' | 'legal-person' | 'legal-document' | 'legal-timeline' | 'legal-ai' | 'legal-hearing';
  label: string;
  icon: React.ReactNode;
  description: string;
  gradient: string;
}

export interface NodeTypeSelectorProps {
  /** 是否显示选择器 */
  visible: boolean;
  /** 选择器位置（屏幕坐标） */
  position: { x: number; y: number } | null;
  /** 画布坐标（用于创建节点） */
  canvasPosition: { x: number; y: number } | null;
  /** 选择节点类型回调 */
  onSelect: (type: string, position: { x: number; y: number }) => void;
  /** 关闭选择器回调 */
  onClose: () => void;
}

/**
 * 节点类型选择器组件
 */
export const NodeTypeSelector = React.memo<NodeTypeSelectorProps>(({
  visible,
  position,
  canvasPosition,
  onSelect,
  onClose,
}) => {
  const selectorRef = useRef<HTMLDivElement | null>(null);

  const { refs, floatingStyles } = useFloating({
    placement: 'bottom-start',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
  });

  // 节点类型配置
  const nodeTypes: NodeType[] = [
    {
      type: 'legal-case',
      label: '案件信息',
      icon: <Scale className="w-5 h-5" />,
      description: '记录案件基本信息和状态',
      gradient: 'from-orange-400 to-orange-600',
    },
    {
      type: 'legal-person',
      label: '人物关系',
      icon: <Users className="w-5 h-5" />,
      description: '管理案件相关人员关系',
      gradient: 'from-blue-400 to-blue-600',
    },
    {
      type: 'legal-document',
      label: '文档管理',
      icon: <FileText className="w-5 h-5" />,
      description: '组织和管理法律文档',
      gradient: 'from-green-400 to-green-600',
    },
    {
      type: 'legal-timeline',
      label: '时间轴',
      icon: <Calendar className="w-5 h-5" />,
      description: '追踪案件时间线和关键事件',
      gradient: 'from-purple-400 to-purple-600',
    },
    {
      type: 'legal-ai',
      label: 'AI助手',
      icon: <Brain className="w-5 h-5" />,
      description: '智能分析和建议',
      gradient: 'from-pink-400 to-pink-600',
    },
    {
      type: 'legal-hearing',
      label: '庭审记录',
      icon: <Gavel className="w-5 h-5" />,
      description: '记录庭审过程和决议',
      gradient: 'from-red-400 to-red-600',
    },
  ];

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

  // ESC键关闭选择器
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

  // 点击外部关闭选择器
  useEffect(() => {
    if (!visible) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
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
        selectorRef.current = node;
        refs.setFloating(node);
      }}
      style={{
        ...floatingStyles,
        zIndex: 1001, // 比FloatingToolbar高一层
      }}
      className="node-type-selector bg-white rounded-lg shadow-xl border border-gray-200 p-3"
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
        <h3 className="text-sm font-bold text-gray-800">选择节点类型</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-red-50 rounded transition-colors group"
          title="关闭 (ESC)"
        >
          <X className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
        </button>
      </div>

      {/* 节点类型网格 */}
      <div className="grid grid-cols-2 gap-2" style={{ width: '360px' }}>
        {nodeTypes.map(({ type, label, icon, description, gradient }) => (
          <button
            key={type}
            onClick={() => {
              onSelect(type, canvasPosition);
              onClose();
            }}
            className="flex flex-col items-start gap-2 p-3 hover:bg-orange-50 rounded-lg border border-gray-200 hover:border-orange-300 transition-all group"
          >
            {/* 图标 */}
            <div className={`p-2 rounded-lg bg-gradient-to-br ${gradient} text-white`}>
              {icon}
            </div>

            {/* 标签和描述 */}
            <div className="text-left">
              <div className="text-sm font-semibold text-gray-800 group-hover:text-orange-700">
                {label}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {description}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* 提示文本 */}
      <div className="mt-3 pt-2 border-t border-gray-100 text-xs text-gray-400 text-center">
        提示：按 ESC 关闭 | 点击选择节点类型
      </div>
    </div>
  );
});

NodeTypeSelector.displayName = 'NodeTypeSelector';

