/**
 * 实时光标系统状态管理
 * 使用Zustand管理协作者光标状态
 */

import { create } from 'zustand';
import type { UserCursor, UpdateCursorParams } from '../types/cursor';

/**
 * 光标Store接口
 */
interface CursorStore {
  // 状态
  cursors: Map<string, UserCursor>;

  // Actions
  updateCursor: (params: UpdateCursorParams) => void;
  removeCursor: (userId: string) => void;
  clearInactiveCursors: () => void; // 清除超过5秒未更新的光标

  // Getters
  getAllCursors: () => UserCursor[];
  getCursor: (userId: string) => UserCursor | undefined;
}

/**
 * 光标不活跃超时时间（毫秒）
 */
const CURSOR_INACTIVE_TIMEOUT = 5000; // 5秒

/**
 * 创建光标Store
 */
export const useCursorStore = create<CursorStore>((set, get) => ({
  // 初始状态
  cursors: new Map(),

  // 更新光标位置
  updateCursor: (params: UpdateCursorParams) => {
    set((state) => {
      const newCursors = new Map(state.cursors);
      const existingCursor = newCursors.get(params.userId);

      if (existingCursor) {
        // 更新现有光标
        newCursors.set(params.userId, {
          ...existingCursor,
          position: params.position,
          lastUpdate: new Date(),
          // 如果提供了用户信息，也更新它
          ...(params.userName ? { userName: params.userName } : {}),
          ...(params.userColor ? { userColor: params.userColor } : {}),
        });
      } else {
        // 创建新光标
        newCursors.set(params.userId, {
          userId: params.userId,
          userName: params.userName || `用户${params.userId.slice(0, 4)}`,
          userColor: params.userColor || '#FF6B35', // 默认颜色
          position: params.position,
          lastUpdate: new Date(),
        });
      }

      return { cursors: newCursors };
    });
  },

  // 移除光标
  removeCursor: (userId: string) => {
    set((state) => {
      const newCursors = new Map(state.cursors);
      newCursors.delete(userId);
      console.log('[CursorStore] Removed cursor:', userId);
      return { cursors: newCursors };
    });
  },

  // 清除不活跃的光标
  clearInactiveCursors: () => {
    set((state) => {
      const now = new Date().getTime();
      const newCursors = new Map(state.cursors);
      let removedCount = 0;

      for (const [userId, cursor] of newCursors.entries()) {
        const lastUpdateTime = new Date(cursor.lastUpdate).getTime();
        if (now - lastUpdateTime > CURSOR_INACTIVE_TIMEOUT) {
          newCursors.delete(userId);
          removedCount++;
        }
      }

      if (removedCount > 0) {
        console.log('[CursorStore] Cleared inactive cursors:', removedCount);
      }

      return { cursors: newCursors };
    });
  },

  // 获取所有光标
  getAllCursors: () => {
    return Array.from(get().cursors.values());
  },

  // 获取特定光标
  getCursor: (userId: string) => {
    return get().cursors.get(userId);
  },
}));

// 启动定时清理任务（每5秒清理一次不活跃的光标）
if (typeof window !== 'undefined') {
  setInterval(() => {
    useCursorStore.getState().clearInactiveCursors();
  }, CURSOR_INACTIVE_TIMEOUT);
}

