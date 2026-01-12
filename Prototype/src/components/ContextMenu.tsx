/**
 * 圆形快捷菜单组件
 * 右键节点时显示，提供编辑、删除、复制、连接等快捷操作
 */

import React, { useEffect, useState } from 'react';
import {
  Edit,
  Trash2,
  Copy,
  Link,
  Eye,
  Lock,
  Unlock,
  Star,
  Zap,
} from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  nodeId: string;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onConnect: () => void;
  onToggleVisibility?: () => void;
  onToggleLock?: () => void;
  onToggleFavorite?: () => void;
  onClose: () => void;
  isVisible?: boolean;
  isLocked?: boolean;
  isFavorite?: boolean;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  // nodeId,
  onEdit,
  onDelete,
  onDuplicate,
  onConnect,
  onToggleVisibility,
  onToggleLock,
  onToggleFavorite,
  onClose,
  isVisible = true,
  isLocked = false,
  isFavorite = false,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // 启动动画
    setIsAnimating(true);

    // 点击外部关闭菜单
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.context-menu')) {
        onClose();
      }
    };

    // ESC键关闭菜单
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // 菜单项配置（圆形排列）
  const menuItems = [
    {
      icon: Edit,
      label: '编辑',
      onClick: () => {
        onEdit();
        onClose();
      },
      color: 'text-blue-600',
      bgColor: 'hover:bg-blue-50',
      angle: 0, // 右侧
    },
    {
      icon: Link,
      label: '连接',
      onClick: () => {
        onConnect();
        onClose();
      },
      color: 'text-purple-600',
      bgColor: 'hover:bg-purple-50',
      angle: 45, // 右下
    },
    {
      icon: Zap,
      label: '智能连接',
      onClick: () => {
        // 触发智能连接逻辑（需要在父组件处理）
        onConnect(); // 暂时复用连接，实际应该有专门的回调
        onClose();
      },
      color: 'text-yellow-600',
      bgColor: 'hover:bg-yellow-50',
      angle: 67.5, // 插入在连接和复制之间
    },
    {
      icon: Copy,
      label: '复制',
      onClick: () => {
        onDuplicate();
        onClose();
      },
      color: 'text-green-600',
      bgColor: 'hover:bg-green-50',
      angle: 90, // 下方
    },
    {
      icon: Trash2,
      label: '删除',
      onClick: () => {
        onDelete();
        onClose();
      },
      color: 'text-red-600',
      bgColor: 'hover:bg-red-50',
      angle: 135, // 左下
    },
    {
      icon: isLocked ? Unlock : Lock,
      label: isLocked ? '解锁' : '锁定',
      onClick: () => {
        onToggleLock?.();
        onClose();
      },
      color: 'text-orange-600',
      bgColor: 'hover:bg-orange-50',
      angle: 180, // 左侧
    },
    {
      icon: Star,
      label: isFavorite ? '取消收藏' : '收藏',
      onClick: () => {
        onToggleFavorite?.();
        onClose();
      },
      color: isFavorite ? 'text-yellow-600' : 'text-gray-600',
      bgColor: 'hover:bg-yellow-50',
      angle: 225, // 左上
    },
    {
      icon: Eye,
      label: isVisible ? '隐藏' : '显示',
      onClick: () => {
        onToggleVisibility?.();
        onClose();
      },
      color: 'text-gray-600',
      bgColor: 'hover:bg-gray-50',
      angle: 270, // 上方
    },
  ];

  // 计算菜单项位置（圆形排列）
  const radius = 80; // 圆形半径
  const getItemPosition = (angle: number) => {
    const radian = (angle * Math.PI) / 180;
    return {
      x: Math.cos(radian) * radius,
      y: Math.sin(radian) * radius,
    };
  };

  return (
    <div
      className="context-menu fixed z-[100] pointer-events-none"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* 中心圆 */}
      <div
        className={`absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 
          w-16 h-16 rounded-full bg-white border-4 border-orange-400 shadow-2xl
          flex items-center justify-center pointer-events-auto
          transition-all duration-300 ${isAnimating ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
          }`}
        style={{
          boxShadow: '0 0 30px rgba(255, 107, 53, 0.3), 0 10px 40px rgba(0, 0, 0, 0.2)',
        }}
      >
        <div className="text-xs font-bold text-orange-600">菜单</div>
      </div>

      {/* 菜单项（圆形排列） */}
      {menuItems.map((item, index) => {
        const pos = getItemPosition(item.angle);
        const Icon = item.icon;

        return (
          <div
            key={index}
            className={`absolute left-1/2 top-1/2 pointer-events-auto
              transition-all duration-300 ${isAnimating ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
              }`}
            style={{
              transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
              transitionDelay: `${index * 30}ms`,
            }}
          >
            <button
              onClick={item.onClick}
              className={`w-12 h-12 rounded-full bg-white border-2 border-gray-200
                flex items-center justify-center shadow-lg
                ${item.bgColor} ${item.color}
                hover:scale-110 hover:border-orange-300
                transition-all duration-200 group relative`}
              title={item.label}
            >
              <Icon className="w-5 h-5" />

              {/* 标签（悬停显示） */}
              <div className="absolute top-full mt-2 opacity-0 group-hover:opacity-100
                transition-opacity duration-200 pointer-events-none">
                <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  {item.label}
                </div>
              </div>
            </button>
          </div>
        );
      })}

      {/* 连接线（从中心到菜单项） */}
      <svg
        className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        width={radius * 2 + 100}
        height={radius * 2 + 100}
        style={{
          overflow: 'visible',
        }}
      >
        {menuItems.map((item, index) => {
          const pos = getItemPosition(item.angle);
          const centerX = (radius * 2 + 100) / 2;
          const centerY = (radius * 2 + 100) / 2;

          return (
            <line
              key={index}
              x1={centerX}
              y1={centerY}
              x2={centerX + pos.x}
              y2={centerY + pos.y}
              stroke="rgba(255, 107, 53, 0.2)"
              strokeWidth="2"
              strokeDasharray="4,4"
              className={`transition-all duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'
                }`}
              style={{
                transitionDelay: `${index * 30}ms`,
              }}
            />
          );
        })}
      </svg>
    </div>
  );
};

