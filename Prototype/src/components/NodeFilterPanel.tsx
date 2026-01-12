/**
 * 节点过滤面板
 * 
 * 功能：
 * - 侧边栏过滤面板
 * - 按节点类型、状态、时间、标签过滤
 * - 多条件组合过滤
 * - 过滤条件持久化
 * 
 * @author AI Agent
 * @date 2025-11-07
 */

import React, { useEffect, useState } from 'react';
import { X, Filter, RotateCcw, Calendar, Tag, CheckCircle2 } from 'lucide-react';
import { useFilterStore, type LegalNodeType, type NodeStatus } from '../stores/filterStore';
import type { LegalNode } from './workspace/types';

interface NodeFilterPanelProps {
  /** 是否显示 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 所有节点 */
  nodes: LegalNode[];
  /** 过滤结果回调 */
  onFilterChange: (filteredNodes: LegalNode[]) => void;
}

/** 节点类型标签映射 */
const typeLabels: Record<LegalNodeType, string> = {
  'legal-case': '案件信息',
  'legal-person': '当事人',
  'legal-document': '文档证据',
  'legal-hearing': '庭审安排',
  'legal-mediation': '调解记录',
  'legal-timeline': '时间轴',
};

/** 节点状态标签映射 */
const statusLabels: Record<NodeStatus, string> = {
  'pending': '待处理',
  'in-progress': '进行中',
  'completed': '已完成',
  'error': '错误',
};

/** 时间范围选项 */
const timeRangeOptions = [
  { value: 'today' as const, label: '今天' },
  { value: 'week' as const, label: '本周' },
  { value: 'month' as const, label: '本月' },
  { value: 'custom' as const, label: '自定义' },
];

/**
 * 节点过滤面板组件
 */
export const NodeFilterPanel: React.FC<NodeFilterPanelProps> = ({
  isOpen,
  onClose,
  nodes,
  onFilterChange,
}) => {
  const {
    selectedTypes,
    selectedStatuses,
    timeRange,
    customTimeRange,
    selectedTags,
    filterCount,
    isActive,
    toggleType,
    toggleStatus,
    setTimeRange,
    setCustomTimeRange,
    toggleTag,
    applyFilters,
    resetFilters,
    getFilterSummary,
  } = useFilterStore();

  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // 从所有节点中提取唯一标签
  const allTags = React.useMemo(() => {
    const tagSet = new Set<string>();
    nodes.forEach(node => {
      const tags = node.data?.tags;
      if (tags && Array.isArray(tags)) {
        tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }, [nodes]);

  // 应用过滤并通知父组件
  useEffect(() => {
    const filtered = applyFilters(nodes);
    onFilterChange(filtered);
  }, [selectedTypes, selectedStatuses, timeRange, customTimeRange, selectedTags, nodes, applyFilters, onFilterChange]);

  // 处理自定义时间范围变化
  const handleCustomTimeRangeChange = () => {
    if (customStartDate && customEndDate) {
      setCustomTimeRange({
        start: new Date(customStartDate),
        end: new Date(customEndDate),
      });
    } else {
      setCustomTimeRange(null);
    }
  };

  // 处理重置
  const handleReset = () => {
    resetFilters();
    setCustomStartDate('');
    setCustomEndDate('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* 遮罩层 */}
      <div
        className="flex-1 bg-black/20"
        onClick={onClose}
      />

      {/* 侧边栏 */}
      <div className="w-80 bg-white shadow-2xl overflow-y-auto animate-slideIn" data-tutorial="filter-panel">
        {/* 头部 */}
        <div className="sticky top-0 bg-white border-b z-10">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-semibold">节点过滤</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded"
              title="关闭 (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 过滤摘要 */}
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {isActive ? getFilterSummary() : '无过滤条件'}
              </span>
              <span className="font-medium text-orange-600">
                {filterCount} / {nodes.length} 个节点
              </span>
            </div>
          </div>
        </div>

        {/* 过滤条件 */}
        <div className="p-4 space-y-6">
          {/* 节点类型过滤 */}
          <div data-testid="type-filter-section">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              节点类型
            </h3>
            <div className="space-y-2">
              {(Object.keys(typeLabels) as LegalNodeType[]).map(type => (
                <label
                  key={type}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(type)}
                    onChange={() => toggleType(type)}
                    className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                    data-testid={`type-checkbox-${type}`}
                  />
                  <span className="text-sm">{typeLabels[type]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 节点状态过滤 */}
          <div data-testid="status-filter-section">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              节点状态
            </h3>
            <div className="space-y-2">
              {(Object.keys(statusLabels) as NodeStatus[]).map(status => (
                <label
                  key={status}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedStatuses.includes(status)}
                    onChange={() => toggleStatus(status)}
                    className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                    data-testid={`status-checkbox-${status}`}
                  />
                  <span className="text-sm">{statusLabels[status]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 创建时间过滤 */}
          <div data-testid="time-filter-section">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              创建时间
            </h3>
            <div className="space-y-2">
              {timeRangeOptions.map(option => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="radio"
                    name="timeRange"
                    checked={timeRange === option.value}
                    onChange={() => setTimeRange(option.value)}
                    className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                    data-testid={`time-radio-${option.value}`}
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}

              {/* 自定义时间范围 */}
              {timeRange === 'custom' && (
                <div className="ml-6 mt-2 space-y-2" data-testid="custom-time-range">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">开始日期</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => {
                        setCustomStartDate(e.target.value);
                        if (e.target.value && customEndDate) {
                          handleCustomTimeRangeChange();
                        }
                      }}
                      className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-orange-500"
                      data-testid="custom-start-date"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">结束日期</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => {
                        setCustomEndDate(e.target.value);
                        if (customStartDate && e.target.value) {
                          handleCustomTimeRangeChange();
                        }
                      }}
                      className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-orange-500"
                      data-testid="custom-end-date"
                    />
                  </div>
                </div>
              )}

              {/* 清除时间过滤 */}
              {timeRange && (
                <button
                  onClick={() => {
                    setTimeRange(null);
                    setCustomStartDate('');
                    setCustomEndDate('');
                  }}
                  className="ml-6 text-xs text-orange-600 hover:text-orange-700"
                  data-testid="clear-time-filter"
                >
                  清除时间过滤
                </button>
              )}
            </div>
          </div>

          {/* 标签过滤 */}
          {allTags.length > 0 && (
            <div data-testid="tag-filter-section">
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                标签
              </h3>
              <div className="space-y-2">
                {allTags.map(tag => (
                  <label
                    key={tag}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(tag)}
                      onChange={() => toggleTag(tag)}
                      className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                      data-testid={`tag-checkbox-${tag}`}
                    />
                    <span className="text-sm">{tag}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 底部操作按钮 */}
        <div className="sticky bottom-0 bg-white border-t p-4">
          <button
            onClick={handleReset}
            disabled={!isActive}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="reset-filters-button"
          >
            <RotateCcw className="w-4 h-4" />
            重置所有过滤条件
          </button>
        </div>
      </div>
    </div>
  );
};

