/**
 * 响应式工具栏组件
 * 
 * 根据屏幕尺寸自动调整工具栏布局
 */

import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

export interface ResponsiveToolbarProps {
  // 工具栏项目
  items: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    priority?: 'high' | 'medium' | 'low'; // 优先级，决定在小屏幕上是否显示
  }>;
  // 工具栏位置
  position?: 'top' | 'bottom' | 'left' | 'right';
  // 自定义类名
  className?: string;
}

/**
 * 响应式工具栏组件
 */
export const ResponsiveToolbar: React.FC<ResponsiveToolbarProps> = ({
  items,
  position = 'top',
  className = '',
}) => {
  const { isMobile, isTablet } = useResponsiveLayout();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 根据屏幕尺寸和优先级过滤显示的项目
  const getVisibleItems = () => {
    if (isMobile) {
      // 移动端：只显示高优先级项目
      return items.filter(item => item.priority === 'high' || !item.priority);
    } else if (isTablet) {
      // 平板：显示高和中优先级项目
      return items.filter(item => item.priority !== 'low');
    } else {
      // 桌面：显示所有项目
      return items;
    }
  };

  // 获取隐藏在菜单中的项目
  const getHiddenItems = () => {
    const visibleIds = new Set(getVisibleItems().map(item => item.id));
    return items.filter(item => !visibleIds.has(item.id));
  };

  const visibleItems = getVisibleItems();
  const hiddenItems = getHiddenItems();

  // 根据位置确定布局方向
  const isHorizontal = position === 'top' || position === 'bottom';
  const flexDirection = isHorizontal ? 'flex-row' : 'flex-col';

  // 位置样式
  const positionStyles = {
    top: 'top-0 left-0 right-0',
    bottom: 'bottom-0 left-0 right-0',
    left: 'top-0 left-0 bottom-0',
    right: 'top-0 right-0 bottom-0',
  };

  return (
    <div
      className={`
        fixed ${positionStyles[position]} z-40
        bg-white dark:bg-gray-800 shadow-lg
        ${isHorizontal ? 'h-16' : 'w-16'}
        ${className}
      `}
    >
      <div className={`flex ${flexDirection} items-center justify-between h-full p-2 gap-2`}>
        {/* 可见的工具栏项目 */}
        <div className={`flex ${flexDirection} items-center gap-2 flex-1`}>
          {visibleItems.map(item => (
            <button
              key={item.id}
              onClick={item.onClick}
              className="
                flex items-center justify-center gap-2
                px-3 py-2 rounded-lg
                bg-gray-100 dark:bg-gray-700
                hover:bg-gray-200 dark:hover:bg-gray-600
                transition-colors
                text-sm font-medium
              "
              title={item.label}
            >
              {item.icon}
              {!isMobile && <span>{item.label}</span>}
            </button>
          ))}
        </div>

        {/* 更多菜单按钮（当有隐藏项目时显示） */}
        {hiddenItems.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="
                flex items-center justify-center
                w-10 h-10 rounded-lg
                bg-gray-100 dark:bg-gray-700
                hover:bg-gray-200 dark:hover:bg-gray-600
                transition-colors
              "
              title="更多"
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* 下拉菜单 */}
            {isMenuOpen && (
              <>
                {/* 遮罩层 */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsMenuOpen(false)}
                />

                {/* 菜单内容 */}
                <div
                  className={`
                    absolute z-50
                    ${position === 'top' ? 'top-full mt-2' : ''}
                    ${position === 'bottom' ? 'bottom-full mb-2' : ''}
                    ${position === 'left' ? 'left-full ml-2' : ''}
                    ${position === 'right' ? 'right-full mr-2' : ''}
                    ${isHorizontal ? 'right-0' : 'top-0'}
                    min-w-[200px]
                    bg-white dark:bg-gray-800
                    rounded-lg shadow-xl
                    border border-gray-200 dark:border-gray-700
                    overflow-hidden
                  `}
                >
                  {hiddenItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        item.onClick();
                        setIsMenuOpen(false);
                      }}
                      className="
                        w-full flex items-center gap-3
                        px-4 py-3
                        hover:bg-gray-100 dark:hover:bg-gray-700
                        transition-colors
                        text-left
                      "
                    >
                      {item.icon}
                      <span className="text-sm font-medium">{item.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

