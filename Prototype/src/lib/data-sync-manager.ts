/**
 * 数据同步管理器
 * 
 * 功能：
 * 1. 云端数据同步
 * 2. 冲突检测和解决
 * 3. 离线数据队列
 * 4. 增量同步
 */

import { create } from 'zustand';
import localforage from 'localforage';
import { loadAllData, saveAllData } from './data-version-manager';

// ==================== 数据结构定义 ====================

export interface SyncConfig {
  enabled: boolean;
  endpoint: string; // API端点
  apiKey: string;
  autoSync: boolean; // 自动同步
  syncInterval: number; // 同步间隔（秒）
  conflictResolution: 'local' | 'remote' | 'manual'; // 冲突解决策略
}

export interface SyncStatus {
  lastSyncTime?: string;
  lastSyncSuccess: boolean;
  syncInProgress: boolean;
  pendingChanges: number;
  error?: string;
}

export interface SyncChange {
  id: string;
  timestamp: string;
  type: 'create' | 'update' | 'delete';
  collection: string; // 数据集合名称
  itemId: string;
  data?: any;
  synced: boolean;
}

export interface SyncConflict {
  id: string;
  collection: string;
  itemId: string;
  localData: any;
  remoteData: any;
  timestamp: string;
  resolved: boolean;
  resolution?: 'local' | 'remote' | 'merge';
}

// ==================== 默认配置 ====================

const DEFAULT_CONFIG: SyncConfig = {
  enabled: false,
  endpoint: '',
  apiKey: '',
  autoSync: false,
  syncInterval: 300, // 5分钟
  conflictResolution: 'manual'
};

// ==================== 核心功能 ====================

/**
 * 计算数据哈希（简单版本）
 */
function calculateHash(data: any): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * 检测数据变更
 */
export async function detectChanges(): Promise<SyncChange[]> {
  const changes: SyncChange[] = [];

  try {
    // 获取上次同步的数据哈希
    const lastHashes = await localforage.getItem<Record<string, string>>('sync-last-hashes') || {};

    // 获取当前数据
    const currentData = await loadAllData();

    // 比较每个集合
    for (const [collection, data] of Object.entries(currentData)) {
      const currentHash = calculateHash(data);
      const lastHash = lastHashes[collection];

      if (currentHash !== lastHash) {
        // 数据已变更
        if (Array.isArray(data)) {
          // 数组类型的数据（如证据列表）
          data.forEach((item: any) => {
            if (item.id) {
              changes.push({
                id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString(),
                type: 'update', // 简化处理，都标记为update
                collection,
                itemId: item.id,
                data: item,
                synced: false
              });
            }
          });
        } else {
          // 单个对象
          changes.push({
            id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            type: 'update',
            collection,
            itemId: collection,
            data,
            synced: false
          });
        }
      }
    }
  } catch (error) {
    console.error('检测变更失败:', error);
  }

  return changes;
}

/**
 * 保存变更到队列
 */
export async function queueChanges(changes: SyncChange[]): Promise<void> {
  try {
    const queue = await localforage.getItem<SyncChange[]>('sync-queue') || [];
    queue.push(...changes);
    await localforage.setItem('sync-queue', queue);
  } catch (error) {
    console.error('保存变更队列失败:', error);
  }
}

/**
 * 获取待同步的变更
 */
export async function getPendingChanges(): Promise<SyncChange[]> {
  try {
    const queue = await localforage.getItem<SyncChange[]>('sync-queue') || [];
    return queue.filter(c => !c.synced);
  } catch (error) {
    console.error('获取待同步变更失败:', error);
    return [];
  }
}

/**
 * 标记变更为已同步
 */
export async function markChangesSynced(changeIds: string[]): Promise<void> {
  try {
    const queue = await localforage.getItem<SyncChange[]>('sync-queue') || [];
    const updated = queue.map(c =>
      changeIds.includes(c.id) ? { ...c, synced: true } : c
    );
    await localforage.setItem('sync-queue', updated);
  } catch (error) {
    console.error('标记变更失败:', error);
  }
}

/**
 * 清理已同步的变更
 */
export async function cleanupSyncedChanges(): Promise<void> {
  try {
    const queue = await localforage.getItem<SyncChange[]>('sync-queue') || [];
    const pending = queue.filter(c => !c.synced);
    await localforage.setItem('sync-queue', pending);
  } catch (error) {
    console.error('清理变更队列失败:', error);
  }
}

/**
 * 执行同步（模拟）
 */
export async function performSync(config: SyncConfig): Promise<{
  success: boolean;
  syncedCount: number;
  conflicts: SyncConflict[];
  error?: string;
}> {
  if (!config.enabled || !config.endpoint) {
    return {
      success: false,
      syncedCount: 0,
      conflicts: [],
      error: '同步未启用或未配置'
    };
  }

  try {
    // 获取待同步的变更
    const pendingChanges = await getPendingChanges();

    if (pendingChanges.length === 0) {
      return {
        success: true,
        syncedCount: 0,
        conflicts: []
      };
    }

    // 模拟API调用
    // 在真实实现中，这里会调用实际的API
    // const response = await fetch(config.endpoint, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${config.apiKey}`
    //   },
    //   body: JSON.stringify({ changes: pendingChanges })
    // });

    // 模拟成功响应
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 标记为已同步
    const changeIds = pendingChanges.map(c => c.id);
    await markChangesSynced(changeIds);

    // 更新最后同步时间
    await localforage.setItem('sync-last-time', new Date().toISOString());

    // 更新数据哈希
    const currentData = await loadAllData();
    const hashes: Record<string, string> = {};
    for (const [key, value] of Object.entries(currentData)) {
      hashes[key] = calculateHash(value);
    }
    await localforage.setItem('sync-last-hashes', hashes);

    return {
      success: true,
      syncedCount: pendingChanges.length,
      conflicts: []
    };
  } catch (error) {
    return {
      success: false,
      syncedCount: 0,
      conflicts: [],
      error: error instanceof Error ? error.message : '同步失败'
    };
  }
}

/**
 * 拉取远程数据（模拟）
 */
export async function pullRemoteData(config: SyncConfig): Promise<{
  success: boolean;
  conflicts: SyncConflict[];
  error?: string;
}> {
  if (!config.enabled || !config.endpoint) {
    return {
      success: false,
      conflicts: [],
      error: '同步未启用或未配置'
    };
  }

  try {
    // 模拟API调用
    // const response = await fetch(`${config.endpoint}/pull`, {
    //   headers: {
    //     'Authorization': `Bearer ${config.apiKey}`
    //   }
    // });

    // 模拟成功响应
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 在真实实现中，这里会比较本地和远程数据，检测冲突
    const conflicts: SyncConflict[] = [];

    return {
      success: true,
      conflicts
    };
  } catch (error) {
    return {
      success: false,
      conflicts: [],
      error: error instanceof Error ? error.message : '拉取数据失败'
    };
  }
}

/**
 * 解决冲突
 */
export async function resolveConflict(
  conflict: SyncConflict,
  resolution: 'local' | 'remote' | 'merge'
): Promise<boolean> {
  try {
    const data = await loadAllData();

    if (resolution === 'local') {
      // 保持本地数据
      // 无需操作
    } else if (resolution === 'remote') {
      // 使用远程数据
      if (Array.isArray(data[conflict.collection])) {
        const index = data[conflict.collection].findIndex((item: any) => item.id === conflict.itemId);
        if (index !== -1) {
          data[conflict.collection][index] = conflict.remoteData;
        }
      } else {
        data[conflict.collection] = conflict.remoteData;
      }
      await saveAllData(data);
    } else if (resolution === 'merge') {
      // 合并数据（简单合并策略）
      const merged = { ...conflict.localData, ...conflict.remoteData };
      if (Array.isArray(data[conflict.collection])) {
        const index = data[conflict.collection].findIndex((item: any) => item.id === conflict.itemId);
        if (index !== -1) {
          data[conflict.collection][index] = merged;
        }
      } else {
        data[conflict.collection] = merged;
      }
      await saveAllData(data);
    }

    // 标记冲突为已解决
    const conflicts = await localforage.getItem<SyncConflict[]>('sync-conflicts') || [];
    const updated = conflicts.map(c =>
      c.id === conflict.id ? { ...c, resolved: true, resolution } : c
    );
    await localforage.setItem('sync-conflicts', updated);

    return true;
  } catch (error) {
    console.error('解决冲突失败:', error);
    return false;
  }
}

// ==================== Zustand Store ====================

interface SyncStore {
  config: SyncConfig;
  status: SyncStatus;
  conflicts: SyncConflict[];

  // 操作方法
  updateConfig: (updates: Partial<SyncConfig>) => void;
  sync: () => Promise<void>;
  pull: () => Promise<void>;
  resolveConflict: (conflictId: string, resolution: 'local' | 'remote' | 'merge') => Promise<void>;
  loadConfig: () => Promise<void>;
  saveConfig: () => Promise<void>;
}

export const useSyncStore = create<SyncStore>((set, get) => ({
  config: DEFAULT_CONFIG,
  status: {
    lastSyncSuccess: true,
    syncInProgress: false,
    pendingChanges: 0
  },
  conflicts: [],

  updateConfig: (updates) => {
    set(state => ({
      config: { ...state.config, ...updates }
    }));
    get().saveConfig();
  },

  sync: async () => {
    const { config } = get();

    set(state => ({
      status: { ...state.status, syncInProgress: true }
    }));

    try {
      // 检测变更
      const changes = await detectChanges();
      await queueChanges(changes);

      // 执行同步
      const result = await performSync(config);

      // 清理已同步的变更
      await cleanupSyncedChanges();

      // 更新状态
      const pendingChanges = await getPendingChanges();
      set(_ => ({
        status: {
          lastSyncTime: new Date().toISOString(),
          lastSyncSuccess: result.success,
          syncInProgress: false,
          pendingChanges: pendingChanges.length,
          error: result.error
        },
        conflicts: result.conflicts
      }));
    } catch (error) {
      set(state => ({
        status: {
          ...state.status,
          lastSyncSuccess: false,
          syncInProgress: false,
          error: error instanceof Error ? error.message : '同步失败'
        }
      }));
    }
  },

  pull: async () => {
    const { config } = get();

    set(state => ({
      status: { ...state.status, syncInProgress: true }
    }));

    try {
      const result = await pullRemoteData(config);

      set(state => ({
        status: {
          ...state.status,
          lastSyncTime: new Date().toISOString(),
          lastSyncSuccess: result.success,
          syncInProgress: false,
          error: result.error
        },
        conflicts: result.conflicts
      }));
    } catch (error) {
      set(state => ({
        status: {
          ...state.status,
          lastSyncSuccess: false,
          syncInProgress: false,
          error: error instanceof Error ? error.message : '拉取失败'
        }
      }));
    }
  },

  resolveConflict: async (conflictId, resolution) => {
    const { conflicts } = get();
    const conflict = conflicts.find(c => c.id === conflictId);

    if (!conflict) return;

    const success = await resolveConflict(conflict, resolution);

    if (success) {
      set(state => ({
        conflicts: state.conflicts.filter(c => c.id !== conflictId)
      }));
    }
  },

  loadConfig: async () => {
    try {
      const saved = await localforage.getItem<SyncConfig>('sync-config');
      if (saved) {
        set({ config: saved });
      }

      // 加载状态
      const lastSyncTime = await localforage.getItem<string>('sync-last-time');
      const pendingChanges = await getPendingChanges();
      const conflicts = await localforage.getItem<SyncConflict[]>('sync-conflicts') || [];

      set({
        status: {
          lastSyncTime: lastSyncTime || undefined,
          lastSyncSuccess: true,
          syncInProgress: false,
          pendingChanges: pendingChanges.length
        },
        conflicts: conflicts.filter(c => !c.resolved)
      });
    } catch (error) {
      console.error('加载同步配置失败:', error);
    }
  },

  saveConfig: async () => {
    try {
      await localforage.setItem('sync-config', get().config);
    } catch (error) {
      console.error('保存同步配置失败:', error);
    }
  }
}));
