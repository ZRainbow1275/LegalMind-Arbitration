/**
 * 状态栏组件
 *
 * 显示工作台的实时状态信息，包括节点数量、选中状态、缩放级别、性能指标等
 */

import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

export interface StatusBarItem {
  /** 项目标识 */
  id: string;
  /** 显示标签 */
  label: string;
  /** 显示值 */
  value: string | number;
  /** 指示器颜色 */
  color: 'blue' | 'orange' | 'purple' | 'green' | 'red' | 'gray';
  /** 是否显示 */
  visible?: boolean;
  /** 工具提示内容 */
  tooltip?: string | React.ReactNode;
  /** 点击回调 */
  onClick?: () => void;
}

export interface StatusBarProps {
  /** 状态项列表 */
  items: StatusBarItem[];
  /** 位置 */
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  /** 是否显示 */
  visible?: boolean;
  /** 自定义类名 */
  className?: string;
}

const colorClasses = {
  blue: 'bg-blue-500',
  orange: 'bg-orange-500',
  purple: 'bg-purple-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
  gray: 'bg-gray-500',
};

const textColorClasses = {
  blue: 'text-blue-600',
  orange: 'text-orange-600',
  purple: 'text-purple-600',
  green: 'text-green-600',
  red: 'text-red-600',
  gray: 'text-gray-600',
};

const positionClasses = {
  'bottom-left': 'bottom-2 left-2',
  'bottom-right': 'bottom-2 right-2',
  'top-left': 'top-2 left-2',
  'top-right': 'top-2 right-2',
};

/**
 * 状态栏组件
 */
export const StatusBar = React.memo<StatusBarProps>(({
  items,
  position = 'bottom-right',
  visible = true,
  className = '',
}) => {
  if (!visible) return null;

  const visibleItems = items.filter(item => item.visible !== false);

  if (visibleItems.length === 0) return null;

  return (
    <TooltipProvider>
      <div className={`absolute ${positionClasses[position]} z-50 ${className}`}>
        <div className="bg-white/95 backdrop-blur-xl rounded-lg border border-orange-200 shadow-lg px-3 py-1.5">
          <div className="flex items-center gap-4 text-xs">
            {visibleItems.map((item) => {
              const itemContent = (
                <div
                  key={item.id}
                  className={`flex items-center gap-1.5 ${item.onClick ? 'cursor-pointer hover:opacity-70 transition-opacity' : ''}`}
                  onClick={item.onClick}
                >
                  <div className={`w-1.5 h-1.5 ${colorClasses[item.color]} rounded-full`} />
                  <span className="text-gray-600">{item.label}:</span>
                  <span className={`font-semibold ${textColorClasses[item.color]}`}>
                    {item.value}
                  </span>
                </div>
              );

              // 如果有工具提示，包装在Tooltip中
              if (item.tooltip) {
                return (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>
                      {itemContent}
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      {item.tooltip}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return itemContent;
            })}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
});

StatusBar.displayName = 'StatusBar';

