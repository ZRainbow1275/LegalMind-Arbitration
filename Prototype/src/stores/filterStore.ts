/**
 * 节点过滤状态管理
 * 
 * 功能：
 * - 管理过滤条件（类型、状态、时间、标签）
 * - 应用过滤逻辑
 * - 持久化过滤条件到localStorage
 * 
 * @author AI Agent
 * @date 2025-11-07
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LegalNode } from '../components/workspace/types';

/** 节点类型 */
export type LegalNodeType =
  | 'legal-case'
  | 'legal-person'
  | 'legal-document'
  | 'legal-hearing'
  | 'legal-mediation'
  | 'legal-timeline';

/** 节点状态 */
export type NodeStatus = 'pending' | 'in-progress' | 'completed' | 'error';

/** 时间范围类型 */
export type TimeRangeType = 'today' | 'week' | 'month' | 'custom' | null;

/** 自定义时间范围 */
export interface CustomTimeRange {
  start: Date;
  end: Date;
}

/** 过滤条件 */
export interface FilterConditions {
  selectedTypes: LegalNodeType[];
  selectedStatuses: NodeStatus[];
  timeRange: TimeRangeType;
  customTimeRange: CustomTimeRange | null;
  selectedTags: string[];
}

/** 过滤状态 */
export interface FilterState extends FilterConditions {
  // 过滤结果
  filteredNodes: LegalNode[];
  filterCount: number;
  isActive: boolean; // 是否有激活的过滤条件

  // 操作方法
  setSelectedTypes: (types: LegalNodeType[]) => void;
  toggleType: (type: LegalNodeType) => void;
  setSelectedStatuses: (statuses: NodeStatus[]) => void;
  toggleStatus: (status: NodeStatus) => void;
  setTimeRange: (range: TimeRangeType) => void;
  setCustomTimeRange: (range: CustomTimeRange | null) => void;
  setSelectedTags: (tags: string[]) => void;
  toggleTag: (tag: string) => void;
  applyFilters: (nodes: LegalNode[]) => LegalNode[];
  resetFilters: () => void;
  getFilterSummary: () => string;
}

/** 初始过滤条件 */
const initialFilterConditions: FilterConditions = {
  selectedTypes: [],
  selectedStatuses: [],
  timeRange: null,
  customTimeRange: null,
  selectedTags: [],
};

/**
 * 应用过滤逻辑
 */
function applyFilterLogic(
  nodes: LegalNode[],
  filters: FilterConditions
): LegalNode[] {
  let filtered = [...nodes];

  // 1. 按类型过滤
  if (filters.selectedTypes.length > 0) {
    filtered = filtered.filter(node =>
      filters.selectedTypes.includes(node.type as LegalNodeType)
    );
  }

  // 2. 按状态过滤
  if (filters.selectedStatuses.length > 0) {
    filtered = filtered.filter(node => {
      const status = node.data?.status;
      return status && filters.selectedStatuses.includes(status as NodeStatus);
    });
  }

  // 3. 按时间过滤
  if (filters.timeRange) {
    const now = new Date();
    let startDate: Date;

    switch (filters.timeRange) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'custom':
        if (filters.customTimeRange) {
          filtered = filtered.filter(node => {
            const createdAt = new Date(node.metadata?.createdAt || node.data?.createdAt || 0);
            return createdAt >= filters.customTimeRange!.start &&
              createdAt <= filters.customTimeRange!.end;
          });
        }
        return filtered;
      default:
        return filtered;
    }

    filtered = filtered.filter(node => {
      const createdAt = new Date(node.metadata?.createdAt || node.data?.createdAt || 0);
      return createdAt >= startDate;
    });
  }

  // 4. 按标签过滤
  if (filters.selectedTags.length > 0) {
    filtered = filtered.filter(node => {
      const tags = node.data?.tags;
      if (!tags || !Array.isArray(tags)) {
        return false;
      }
      return filters.selectedTags.some(tag => tags.includes(tag));
    });
  }

  return filtered;
}

/**
 * 检查是否有激活的过滤条件
 */
function hasActiveFilters(filters: FilterConditions): boolean {
  return (
    filters.selectedTypes.length > 0 ||
    filters.selectedStatuses.length > 0 ||
    filters.timeRange !== null ||
    filters.selectedTags.length > 0
  );
}

/**
 * 生成过滤摘要
 */
function generateFilterSummary(filters: FilterConditions): string {
  const parts: string[] = [];

  if (filters.selectedTypes.length > 0) {
    parts.push(`${filters.selectedTypes.length}种类型`);
  }

  if (filters.selectedStatuses.length > 0) {
    parts.push(`${filters.selectedStatuses.length}种状态`);
  }

  if (filters.timeRange) {
    const timeLabels = {
      today: '今天',
      week: '本周',
      month: '本月',
      custom: '自定义时间',
    };
    parts.push(timeLabels[filters.timeRange]);
  }

  if (filters.selectedTags.length > 0) {
    parts.push(`${filters.selectedTags.length}个标签`);
  }

  return parts.length > 0 ? parts.join(' · ') : '无过滤条件';
}

/**
 * 创建过滤状态store
 */
export const useFilterStore = create<FilterState>()(
  persist(
    (set, get) => ({
      // 初始状态
      ...initialFilterConditions,
      filteredNodes: [],
      filterCount: 0,
      isActive: hasActiveFilters(initialFilterConditions), // {{ AURA: Modify - 计算初始isActive状态 }}

      // 设置选中的类型
      setSelectedTypes: (types) => {
        set({ selectedTypes: types });
        const isActive = hasActiveFilters({ ...get(), selectedTypes: types });
        set({ isActive });
      },

      // 切换类型选择
      toggleType: (type) => {
        const current = get().selectedTypes;
        const newTypes = current.includes(type)
          ? current.filter(t => t !== type)
          : [...current, type];
        get().setSelectedTypes(newTypes);
      },

      // 设置选中的状态
      setSelectedStatuses: (statuses) => {
        set({ selectedStatuses: statuses });
        const isActive = hasActiveFilters({ ...get(), selectedStatuses: statuses });
        set({ isActive });
      },

      // 切换状态选择
      toggleStatus: (status) => {
        const current = get().selectedStatuses;
        const newStatuses = current.includes(status)
          ? current.filter(s => s !== status)
          : [...current, status];
        get().setSelectedStatuses(newStatuses);
      },

      // 设置时间范围
      setTimeRange: (range) => {
        set({ timeRange: range });
        const isActive = hasActiveFilters({ ...get(), timeRange: range });
        set({ isActive });
      },

      // 设置自定义时间范围
      setCustomTimeRange: (range) => {
        set({ customTimeRange: range });
        if (range) {
          set({ timeRange: 'custom' });
        }
        const isActive = hasActiveFilters({ ...get(), customTimeRange: range });
        set({ isActive });
      },

      // 设置选中的标签
      setSelectedTags: (tags) => {
        set({ selectedTags: tags });
        const isActive = hasActiveFilters({ ...get(), selectedTags: tags });
        set({ isActive });
      },

      // 切换标签选择
      toggleTag: (tag) => {
        const current = get().selectedTags;
        const newTags = current.includes(tag)
          ? current.filter(t => t !== tag)
          : [...current, tag];
        get().setSelectedTags(newTags);
      },

      // 应用过滤
      applyFilters: (nodes) => {
        const state = get();
        const filtered = applyFilterLogic(nodes, {
          selectedTypes: state.selectedTypes,
          selectedStatuses: state.selectedStatuses,
          timeRange: state.timeRange,
          customTimeRange: state.customTimeRange,
          selectedTags: state.selectedTags,
        });

        set({
          filteredNodes: filtered,
          filterCount: filtered.length,
        });

        return filtered;
      },

      // 重置过滤条件
      resetFilters: () => {
        set({
          ...initialFilterConditions,
          filteredNodes: [],
          filterCount: 0,
          isActive: false,
        });
      },

      // 获取过滤摘要
      getFilterSummary: () => {
        const state = get();
        return generateFilterSummary({
          selectedTypes: state.selectedTypes,
          selectedStatuses: state.selectedStatuses,
          timeRange: state.timeRange,
          customTimeRange: state.customTimeRange,
          selectedTags: state.selectedTags,
        });
      },
    }),
    {
      name: 'filter-storage', // localStorage key
      partialize: (state) => ({
        // 只持久化过滤条件，不持久化过滤结果
        selectedTypes: state.selectedTypes,
        selectedStatuses: state.selectedStatuses,
        timeRange: state.timeRange,
        customTimeRange: state.customTimeRange,
        selectedTags: state.selectedTags,
      }),
      // {{ AURA: Add - 恢复后重新计算isActive状态 }}
      onRehydrateStorage: () => (state) => {
        if (state) {
          const isActive = hasActiveFilters({
            selectedTypes: state.selectedTypes,
            selectedStatuses: state.selectedStatuses,
            timeRange: state.timeRange,
            customTimeRange: state.customTimeRange,
            selectedTags: state.selectedTags,
          });
          state.isActive = isActive;
        }
      },
    }
  )
);

