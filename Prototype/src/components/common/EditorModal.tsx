/**
 * 统一的编辑器模态框组件
 *
 * 为所有节点编辑器提供统一的容器和样式
 * 符合需求5：节点详情窗口大小统一（固定宽度600px，高度400-600px）
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { X } from 'lucide-react';

export interface EditorModalProps {
  // 是否显示
  isOpen: boolean;
  // 标题
  title: string;
  // 副标题（如节点ID）
  subtitle?: string;
  // 图标
  icon?: React.ReactNode;
  // 图标背景色
  iconBgColor?: string;
  // 关闭回调
  onClose: () => void;
  // 内容
  children: React.ReactNode;
  // 底部操作栏
  footer?: React.ReactNode;
}

/**
 * 统一的编辑器模态框组件
 *
 * {{ AURA: Fix - 修改设计规范以满足用户需求 }}
 * 设计规范：
 * - 固定宽度：800px（用户反馈：宽度可以长一点）
 * - 固定高度：600px（用户反馈：高度不要变化）
 * - 标题栏：固定高度60px
 * - 内容区：flex-1，overflow-y-auto
 * - 操作栏：固定高度80px
 */
export const EditorModal: React.FC<EditorModalProps> = ({
  isOpen,
  title,
  subtitle,
  icon,
  iconBgColor = 'bg-orange-500',
  onClose,
  children,
  footer,
}) => {
  // {{ AURA: Modify - 简化拖拽逻辑，移除拖拽功能以避免窗口位置混乱 }}
  // 拖拽功能暂时移除，因为会与AllModalsRenderer的定位逻辑冲突
  // 用户可以通过关闭窗口重新打开来调整位置

  if (!isOpen) return null;

  return (
    // {{ AURA: Modify - 改为absolute定位，由外层容器控制位置，支持多窗口堆叠 }}
    <Card
      className="flex flex-col overflow-hidden shadow-2xl border-2 border-orange-200 bg-white"
      style={{
        width: '800px',
        height: '600px',
      }}
    >
      {/* 标题栏 - 固定高度 */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 flex-shrink-0">
        <div className="flex items-center space-x-3">
          {icon && (
            <div className={`w-10 h-10 ${iconBgColor} rounded-lg flex items-center justify-center`}>
              {icon}
            </div>
          )}
          <div>
            <CardTitle className="text-xl">{title}</CardTitle>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>

      {/* 内容区 - 可滚动 */}
      <CardContent className="flex-1 overflow-y-auto px-6">
        {children}
      </CardContent>

      {/* 操作栏 - 固定高度 */}
      {footer && (
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50">
          {footer}
        </div>
      )}
    </Card>
  );
};

EditorModal.displayName = 'EditorModal';

