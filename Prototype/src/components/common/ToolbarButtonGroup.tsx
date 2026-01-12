/**
 * 工具栏按钮组组件
 * 
 * 功能：
 * - 提供一组相关的工具栏按钮
 * - 支持图标按钮和下拉菜单
 * - 统一的样式和交互
 * - 支持禁用状态
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';

// ==================== 类型定义 ====================

export interface ToolbarButton {
  /**
   * 按钮图标
   */
  icon: LucideIcon;

  /**
   * 按钮标题（tooltip）
   */
  title: string;

  /**
   * 点击回调
   */
  onClick: () => void;

  /**
   * 是否禁用
   */
  disabled?: boolean;

  /**
   * 快捷键提示
   */
  shortcut?: string;

  /**
   * 自定义类名
   */
  className?: string;
}

export interface ToolbarButtonGroupProps {
  /**
   * 按钮列表
   */
  buttons: ToolbarButton[];

  /**
   * 是否显示分隔符
   */
  showSeparator?: boolean;

  /**
   * 分组标签
   */
  label?: string;

  /**
   * 自定义类名
   */
  className?: string;
}

// ==================== 组件实现 ====================

/**
 * 工具栏按钮组组件
 */
export const ToolbarButtonGroup = React.memo<ToolbarButtonGroupProps>(({
  buttons,
  showSeparator = true,
  label,
  className = '',
}) => {
  return (
    <>
      {/* 按钮组 */}
      <div className={`flex items-center gap-1 ${className}`}>
        {label && (
          <span className="text-xs text-gray-500 font-medium mr-1">{label}</span>
        )}
        {buttons.map((button, index) => {
          const Icon = button.icon;
          const fullTitle = button.shortcut
            ? `${button.title} (${button.shortcut})`
            : button.title;

          return (
            <Button
              key={index}
              variant="ghost"
              size="icon"
              onClick={button.onClick}
              disabled={button.disabled}
              className={`h-8 w-8 hover:bg-orange-50 hover:text-orange-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                button.className || ''
              }`}
              title={fullTitle}
            >
              <Icon className="w-4 h-4" />
            </Button>
          );
        })}
      </div>

      {/* 分隔符 */}
      {showSeparator && (
        <Separator orientation="vertical" className="h-6 bg-orange-200" />
      )}
    </>
  );
});

ToolbarButtonGroup.displayName = 'ToolbarButtonGroup';

// ==================== 导出 ====================

export default ToolbarButtonGroup;

