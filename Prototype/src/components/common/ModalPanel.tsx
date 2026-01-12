/**
 * 通用模态面板组件
 * 
 * 用于显示各种模态对话框和面板，提供统一的样式和交互
 * 支持自定义大小、标题、内容和关闭行为
 */

import React from 'react';
import { Button } from '../ui/button';
import { X } from 'lucide-react';

export interface ModalPanelProps {
  /** 是否显示面板 */
  isOpen: boolean;
  /** 面板标题 */
  title: string;
  /** 面板内容 */
  children: React.ReactNode;
  /** 关闭回调 */
  onClose: () => void;
  /** 面板大小 */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** 是否显示遮罩层 */
  showOverlay?: boolean;
  /** 是否可以点击遮罩层关闭 */
  closeOnOverlayClick?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 头部额外内容 */
  headerExtra?: React.ReactNode;
  /** 是否显示关闭按钮 */
  showCloseButton?: boolean;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-7xl',
  full: 'max-w-[95vw]',
};

/**
 * 通用模态面板组件
 */
export const ModalPanel = React.memo<ModalPanelProps>(({
  isOpen,
  title,
  children,
  onClose,
  size = 'xl',
  showOverlay = true,
  closeOnOverlayClick = true,
  className = '',
  headerExtra,
  showCloseButton = true,
}) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    // {{ AURA: Modify - 添加animate-fade-in动画，避免从别处飞来的效果 }}
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in ${showOverlay ? 'bg-black/50' : ''
        }`}
      onClick={handleOverlayClick}
    >
      <div
        className={`bg-white rounded-lg shadow-xl ${sizeClasses[size]} w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 fade-in duration-200 ${className}`}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-white">
          <h2 className="text-lg font-bold text-gray-800">{title}</h2>
          <div className="flex items-center gap-2">
            {headerExtra}
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="overflow-y-auto max-h-[calc(90vh-4rem)]">
          {children}
        </div>
      </div>
    </div>
  );
});

ModalPanel.displayName = 'ModalPanel';

