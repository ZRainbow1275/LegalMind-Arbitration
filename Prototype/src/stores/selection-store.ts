/**
 * 选中指示系统状态管理
 * 使用Zustand管理协作者选中状态
 */

import { create } from 'zustand';
import type { UserSelection, UpdateSelectionParams } from '../types/selection';

/**
 * 选中Store接口
 */
interface SelectionStore {
  // 状态
  selections: Map<string, UserSelection>;
  
  // Actions
  updateSelection: (params: UpdateSelectionParams) => void;
  removeSelection: (userId: string) => void;
  
  // Getters
  getAllSelections: () => UserSelection[];
  getSelection: (userId: string) => UserSelection | undefined;
  getNodeSelectors: (nodeId: string) => UserSelection[]; // 获取选中某个节点的所有用户
}

/**
 * 创建选中Store
 */
export const useSelectionStore = create<SelectionStore>((set, get) => ({
  // 初始状态
  selections: new Map(),
  
  // 更新选中状态
  updateSelection: (params: UpdateSelectionParams) => {
    set((state) => {
      const newSelections = new Map(state.selections);
      const existingSelection = newSelections.get(params.userId);
      
      if (existingSelection) {
        // 更新现有选中状态
        newSelections.set(params.userId, {
          ...existingSelection,
          selectedNodeIds: params.selectedNodeIds,
          lastUpdate: new Date(),
        });
      } else {
        // 创建新选中状态（这种情况不应该发生，因为选中状态应该在用户加入时创建）
        console.warn('[SelectionStore] Creating selection for unknown user:', params.userId);
        newSelections.set(params.userId, {
          userId: params.userId,
          userName: `用户${params.userId.slice(0, 4)}`,
          userColor: '#FF6B35', // 默认颜色
          selectedNodeIds: params.selectedNodeIds,
          lastUpdate: new Date(),
        });
      }
      
      return { selections: newSelections };
    });
  },
  
  // 移除选中状态
  removeSelection: (userId: string) => {
    set((state) => {
      const newSelections = new Map(state.selections);
      newSelections.delete(userId);
      console.log('[SelectionStore] Removed selection:', userId);
      return { selections: newSelections };
    });
  },
  
  // 获取所有选中状态
  getAllSelections: () => {
    return Array.from(get().selections.values());
  },
  
  // 获取特定选中状态
  getSelection: (userId: string) => {
    return get().selections.get(userId);
  },
  
  // 获取选中某个节点的所有用户
  getNodeSelectors: (nodeId: string) => {
    const allSelections = get().getAllSelections();
    return allSelections.filter((selection) =>
      selection.selectedNodeIds.includes(nodeId)
    );
  },
}));

