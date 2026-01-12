/**
 * 右键菜单组件
 * 
 * 提供画布和节点的右键菜单功能
 * 参考Figma、飞书画板、Flowith的交互设计
 */

import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { ContextMenuItem } from '../../utils/contextMenuUtils';

export interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
  visible: boolean;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  items,
  onClose,
  visible
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  // {{ AURA: Fix - 修复点击外部关闭菜单的逻辑 }}
  // 点击外部关闭菜单
  useEffect(() => {
    if (!visible) return;

    // 延迟添加事件监听器，避免菜单刚打开就被关闭
    const timer = setTimeout(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          onClose();
        }
      };

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      // 使用click事件代替mousedown，更可靠
      document.addEventListener('click', handleClickOutside, true);
      document.addEventListener('keydown', handleEscape);

      // 清理函数
      return () => {
        document.removeEventListener('click', handleClickOutside, true);
        document.removeEventListener('keydown', handleEscape);
      };
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [visible, onClose]);

  // 调整菜单位置，防止超出屏幕
  useEffect(() => {
    if (!visible || !menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    // 如果菜单超出右边界，向左调整
    if (rect.right > viewportWidth) {
      adjustedX = viewportWidth - rect.width - 10;
    }

    // 如果菜单超出底部边界，向上调整
    if (rect.bottom > viewportHeight) {
      adjustedY = viewportHeight - rect.height - 10;
    }

    menu.style.left = `${adjustedX}px`;
    menu.style.top = `${adjustedY}px`;
  }, [visible, x, y]);

  if (!visible) return null;

  const renderMenuItem = (item: ContextMenuItem, index: number) => {
    if (item.divider) {
      return <div key={`divider-${index}`} className="h-px bg-gray-200 my-1" />;
    }

    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isHovered = hoveredItemId === item.id;

    return (
      <div
        key={item.id}
        className="relative"
        onMouseOver={() => hasSubmenu && setHoveredItemId(item.id)}
        onMouseOut={() => hasSubmenu && setHoveredItemId(null)}
      >
        <button
          onClick={() => {
            if (!item.disabled && !hasSubmenu) {
              item.onClick();
              onClose();
            }
          }}
          disabled={item.disabled}
          className={`
            w-full flex items-center gap-3 px-4 py-2.5 text-sm
            ${item.disabled
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 hover:bg-orange-50 hover:text-orange-600 cursor-pointer'
            }
            transition-colors duration-150
          `}
        >
          {item.icon && (
            <span className="w-4 h-4 flex-shrink-0">
              {item.icon}
            </span>
          )}
          <span className="flex-1 text-left">{item.label}</span>
          {hasSubmenu && (
            <ChevronRight className="w-4 h-4 flex-shrink-0" />
          )}
        </button>

        {/* 子菜单 */}
        {hasSubmenu && isHovered && (
          <div
            className="absolute left-full top-0 ml-1 bg-white rounded-lg shadow-2xl border border-gray-200 py-2 min-w-[200px] z-[10000]"
            style={{
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1)',
            }}
          >
            {item.submenu!.map((subItem) => (
              <button
                key={subItem.id}
                onClick={() => {
                  if (!subItem.disabled) {
                    subItem.onClick();
                    onClose();
                  }
                }}
                disabled={subItem.disabled}
                className={`
                  w-full flex items-center gap-3 px-4 py-2.5 text-sm
                  ${subItem.disabled
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-orange-50 hover:text-orange-600 cursor-pointer'
                  }
                  transition-colors duration-150
                `}
              >
                {subItem.icon && (
                  <span className="w-4 h-4 flex-shrink-0">
                    {subItem.icon}
                  </span>
                )}
                <span className="flex-1 text-left">{subItem.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-white rounded-lg shadow-2xl border border-gray-200 py-2 min-w-[200px] max-w-[300px]"
      style={{
        left: x,
        top: y,
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1)',
      }}
    >
      {items.map((item, index) => renderMenuItem(item, index))}
    </div>
  );
};

/**
 * 画布右键菜单项（智能推荐版本）
 *
 * {{ AURA: Modify - 集成智能推荐引擎，提供上下文相关的节点推荐 }}
 */


