/**
 * AutoSaveIndicator - 自动保存状态指示器
 * 
 * 功能：
 * - 显示保存状态（保存中、已保存、有未保存更改）
 * - 显示最后保存时间
 * - 支持手动保存
 * - 显示保存错误
 * 
 * 基于2025年React最佳实践
 */

import React from 'react';
import { Save, Check, AlertCircle, Loader2, Clock } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

// ==================== 类型定义 ====================

export interface AutoSaveIndicatorProps {
  /** 是否正在保存 */
  isSaving: boolean;
  /** 最后保存时间 */
  lastSaved: Date | null;
  /** 是否有未保存的更改 */
  hasUnsavedChanges: boolean;
  /** 错误信息 */
  error: Error | null;
  /** 手动保存回调 */
  onSaveNow?: () => void;
  /** 显示位置 */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** 是否显示详细信息 */
  showDetails?: boolean;
}

// ==================== 工具函数 ====================

/**
 * 格式化时间差
 */
function formatTimeDiff(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}天前`;
  if (hours > 0) return `${hours}小时前`;
  if (minutes > 0) return `${minutes}分钟前`;
  if (seconds > 0) return `${seconds}秒前`;
  return '刚刚';
}

// ==================== 组件 ====================

export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({
  isSaving,
  lastSaved,
  hasUnsavedChanges,
  error,
  onSaveNow,
  position = 'bottom-right',
  showDetails = true,
}) => {
  // 位置样式
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  // 状态图标和文本
  const getStatusIcon = () => {
    if (error) {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
    if (isSaving) {
      return <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />;
    }
    if (hasUnsavedChanges) {
      return <Save className="w-4 h-4 text-yellow-500" />;
    }
    return <Check className="w-4 h-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (error) return '保存失败';
    if (isSaving) return '保存中...';
    if (hasUnsavedChanges) return '有未保存更改';
    return '已保存';
  };

  const getStatusColor = () => {
    if (error) return 'bg-red-50 border-red-200 text-red-700';
    if (isSaving) return 'bg-orange-50 border-orange-200 text-orange-700';
    if (hasUnsavedChanges) return 'bg-yellow-50 border-yellow-200 text-yellow-700';
    return 'bg-green-50 border-green-200 text-green-700';
  };

  // 工具提示内容
  const tooltipContent = (
    <div className="space-y-1 text-xs">
      <div className="font-semibold">{getStatusText()}</div>
      {lastSaved && (
        <div className="flex items-center gap-1 text-gray-600">
          <Clock className="w-3 h-3" />
          最后保存：{formatTimeDiff(lastSaved)}
        </div>
      )}
      {error && (
        <div className="text-red-600 mt-1">
          错误：{error.message}
        </div>
      )}
      {onSaveNow && !isSaving && (
        <div className="text-gray-500 mt-1">
          点击手动保存
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`fixed ${positionClasses[position]} z-40 flex items-center gap-2 px-3 py-2 rounded-lg border shadow-sm transition-all ${getStatusColor()}`}
          >
            {/* 状态图标 */}
            {getStatusIcon()}

            {/* 状态文本（可选） */}
            {showDetails && (
              <span className="text-sm font-medium">
                {getStatusText()}
              </span>
            )}

            {/* 手动保存按钮 */}
            {onSaveNow && !isSaving && hasUnsavedChanges && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onSaveNow}
                className="h-6 px-2 text-xs hover:bg-white/50"
              >
                立即保存
              </Button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="left">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// ==================== 简化版组件 ====================

/**
 * 简化版自动保存指示器（仅图标）
 */
export const AutoSaveIconIndicator: React.FC<Omit<AutoSaveIndicatorProps, 'showDetails'>> = (props) => {
  return <AutoSaveIndicator {...props} showDetails={false} />;
};

// ==================== 默认导出 ====================

export default AutoSaveIndicator;

