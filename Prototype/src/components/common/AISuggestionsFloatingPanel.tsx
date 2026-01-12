/**
 * AI建议浮动面板组件
 * 
 * 功能：
 * - 显示AI智能建议
 * - 支持置信度显示
 * - 支持拖拽和调整大小
 * - 支持折叠
 * - 自动保存位置和大小
 */

import React from 'react';
import { Sparkles } from 'lucide-react';
import { FloatingPanel } from './FloatingPanel';

// ==================== 类型定义 ====================

export interface AISuggestion {
  /**
   * 建议文本
   */
  text: string;

  /**
   * 置信度（0-1）
   */
  confidence?: number;

  /**
   * 建议类型
   */
  type?: 'node' | 'connection' | 'layout' | 'analysis' | 'general';

  /**
   * 优先级
   */
  priority?: 'high' | 'medium' | 'low';

  /**
   * 建议ID
   */
  id?: string;

  /**
   * 点击回调
   */
  onClick?: () => void;
}

export interface AISuggestionsFloatingPanelProps {
  /**
   * AI建议列表
   */
  suggestions: AISuggestion[];

  /**
   * 是否显示
   */
  visible?: boolean;

  /**
   * 关闭回调
   */
  onClose?: () => void;

  /**
   * 默认位置
   */
  defaultPosition?: { x: number; y: number };

  /**
   * 默认大小
   */
  defaultSize?: { width: number; height: number };

  /**
   * 是否可拖拽
   */
  draggable?: boolean;

  /**
   * 是否可调整大小
   */
  resizable?: boolean;

  /**
   * 是否可折叠
   */
  collapsible?: boolean;

  /**
   * 默认是否折叠
   */
  defaultCollapsed?: boolean;

  /**
   * 存储键
   */
  storageKey?: string;
}

// ==================== 辅助函数 ====================

/**
 * 获取建议类型的图标颜色
 */
function getSuggestionColor(type?: string): string {
  switch (type) {
    case 'node':
      return 'text-blue-500';
    case 'connection':
      return 'text-green-500';
    case 'layout':
      return 'text-purple-500';
    case 'analysis':
      return 'text-orange-500';
    default:
      return 'text-orange-500';
  }
}

/**
 * 获取建议优先级的背景色
 */
function getSuggestionBackground(priority?: string): string {
  switch (priority) {
    case 'high':
      return 'from-red-50 to-white border-red-200';
    case 'medium':
      return 'from-orange-50 to-white border-orange-200';
    case 'low':
      return 'from-gray-50 to-white border-gray-200';
    default:
      return 'from-orange-50 to-white border-orange-200';
  }
}

/**
 * 获取置信度进度条颜色
 */
function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) {
    return 'from-green-400 to-green-600';
  } else if (confidence >= 0.6) {
    return 'from-orange-400 to-orange-600';
  } else {
    return 'from-red-400 to-red-600';
  }
}

// ==================== 组件实现 ====================

/**
 * AI建议浮动面板组件
 */
import { motion, AnimatePresence } from 'framer-motion';

// ... (imports remain the same)

// ==================== 组件实现 ====================

/**
 * AI建议浮动面板组件
 */
export const AISuggestionsFloatingPanel = React.memo<AISuggestionsFloatingPanelProps>(({
  suggestions,
  visible = true,
  onClose,
  defaultPosition = { x: window.innerWidth - 420, y: 80 },
  defaultSize = { width: 400, height: 600 },
  draggable = true,
  resizable = true,
  collapsible = true,
  defaultCollapsed = true,
  storageKey = 'workspace-ai-panel',
}) => {
  return (
    <AnimatePresence>
      {visible && suggestions.length > 0 && (
        <FloatingPanel
          title="AI 智能建议"
          defaultPosition={defaultPosition}
          defaultSize={defaultSize}
          minSize={{ width: 300, height: 400 }}
          maxSize={{ width: 600, height: 800 }}
          draggable={draggable}
          resizable={resizable}
          collapsible={collapsible}
          defaultCollapsed={defaultCollapsed}
          storageKey={storageKey}
          onClose={onClose}
        >
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {suggestions.map((suggestion, index) => {
                const iconColor = getSuggestionColor(suggestion.type);
                const background = getSuggestionBackground(suggestion.priority);
                const confidenceColor = suggestion.confidence
                  ? getConfidenceColor(suggestion.confidence)
                  : 'from-orange-400 to-orange-600';

                return (
                  <motion.div
                    key={suggestion.id || index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-3 bg-gradient-to-r ${background} rounded-lg border hover:shadow-md transition-all duration-200 ${suggestion.onClick ? 'cursor-pointer' : ''
                      }`}
                    onClick={suggestion.onClick}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-start gap-2">
                      <Sparkles className={`w-4 h-4 ${iconColor} mt-0.5 flex-shrink-0`} />
                      <div className="flex-1">
                        <p className="text-sm text-gray-700">{suggestion.text}</p>

                        {/* 置信度进度条 */}
                        {suggestion.confidence !== undefined && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <motion.div
                                className={`h-full bg-gradient-to-r ${confidenceColor} rounded-full`}
                                initial={{ width: 0 }}
                                animate={{ width: `${suggestion.confidence * 100}%` }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 font-medium">
                              {Math.round(suggestion.confidence * 100)}%
                            </span>
                          </div>
                        )}

                        {/* 优先级标签 */}
                        {suggestion.priority && (
                          <div className="mt-2">
                            <span
                              className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${suggestion.priority === 'high'
                                ? 'bg-red-100 text-red-700'
                                : suggestion.priority === 'medium'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-gray-100 text-gray-700'
                                }`}
                            >
                              {suggestion.priority === 'high'
                                ? '高优先级'
                                : suggestion.priority === 'medium'
                                  ? '中优先级'
                                  : '低优先级'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </FloatingPanel>
      )}
    </AnimatePresence>
  );
});

AISuggestionsFloatingPanel.displayName = 'AISuggestionsFloatingPanel';

// ==================== 导出 ====================

export default AISuggestionsFloatingPanel;

