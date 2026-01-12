/**
 * 移动端节点面板组件
 * 
 * 针对移动端优化的节点创建和编辑面板
 */

import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import type { LegalNode } from '../../types/shared';
type LegalNodeType = LegalNode['type'];

export interface MobileNodePanelProps {
  // 是否显示
  visible: boolean;
  // 关闭回调
  onClose: () => void;
  // 节点类型配置
  nodeTypes: Array<{
    type: LegalNodeType;
    label: string;
    icon: React.ComponentType<any>;
    color: string;
  }>;
  // 创建节点回调
  onCreateNode: (type: LegalNodeType) => void;
}

/**
 * 移动端节点面板组件
 */
export const MobileNodePanel: React.FC<MobileNodePanelProps> = ({
  visible,
  onClose,
  nodeTypes,
  onCreateNode,
}) => {
  const { isMobile, height } = useResponsiveLayout();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!visible) return null;

  // 面板高度：移动端占屏幕的60%，展开时占90%
  const panelHeight = isMobile
    ? isExpanded
      ? height * 0.9
      : height * 0.6
    : 400;

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* 面板内容 */}
      <div
        className="
          fixed bottom-0 left-0 right-0 z-50
          bg-white dark:bg-gray-800
          rounded-t-3xl shadow-2xl
          animate-slide-up
        "
        style={{ height: `${panelHeight}px` }}
      >
        {/* 拖动指示器 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            创建法律节点
          </h3>
          <div className="flex items-center gap-2">
            {/* 展开/收起按钮 */}
            {isMobile && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="
                  p-2 rounded-lg
                  hover:bg-gray-100 dark:hover:bg-gray-700
                  transition-colors
                "
                title={isExpanded ? '收起' : '展开'}
              >
                {isExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
              </button>
            )}
            {/* 关闭按钮 */}
            <button
              onClick={onClose}
              className="
                p-2 rounded-lg
                hover:bg-gray-100 dark:hover:bg-gray-700
                transition-colors
              "
              title="关闭"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 节点类型网格 */}
        <div className="overflow-y-auto p-4" style={{ height: `${panelHeight - 120}px` }}>
          <div className="grid grid-cols-2 gap-3">
            {nodeTypes.map(({ type, label, icon: Icon, color }) => (
              <button
                key={type}
                onClick={() => {
                  onCreateNode(type);
                  onClose();
                }}
                className={`
                  flex flex-col items-center justify-center
                  p-6 rounded-xl
                  ${color} bg-opacity-10
                  border-2 border-transparent
                  hover:border-current
                  active:scale-95
                  transition-all
                  min-h-[120px]
                `}
              >
                <div className={`${color} p-3 rounded-full mb-3`}>
                  <Icon size={isMobile ? 24 : 28} className="text-white" />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white text-center">
                  {label}
                </span>
              </button>
            ))}
          </div>

          {/* 使用提示 */}
          {isMobile && (
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                💡 提示：点击节点类型即可在画布中创建新节点
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

