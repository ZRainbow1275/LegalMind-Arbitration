/**
 * 统一数据管理器
 * 
 * 功能：
 * 1. 统一管理所有业务数据
 * 2. 集成版本控制
 * 3. 集成数据同步
 * 4. 提供统一的保存/加载接口
 */

import { create } from 'zustand';
import localforage from 'localforage';
import {
  getCurrentDataVersion,
  setDataVersion,
  needsMigration,
  migrateData,
  createBackup,
  CURRENT_VERSION
} from './data-version-manager';
import { detectChanges, queueChanges } from './data-sync-manager';

// ==================== 数据结构定义 ====================

export interface UnifiedData {
  version: string;
  timestamp: string;
  data: {
    'dispute-foci': any[];
    'evidences': any[];
    'evidence-chains': any[];
    'arbitration-procedures': any[];
    'arbitrators': any[];
    'arbitration-panels': any[];
    'case-description': string;
  };
}

// ==================== 核心功能 ====================

/**
 * 加载所有数据
 */
export async function loadAllUnifiedData(): Promise<UnifiedData> {
  const version = await getCurrentDataVersion();

  const data = {
    'dispute-foci': await localforage.getItem<any[]>('dispute-foci') || [],
    'evidences': await localforage.getItem<any[]>('evidences') || [],
    'evidence-chains': await localforage.getItem<any[]>('evidence-chains') || [],
    'arbitration-procedures': await localforage.getItem<any[]>('arbitration-procedures') || [],
    'arbitrators': await localforage.getItem<any[]>('arbitrators') || [],
    'arbitration-panels': await localforage.getItem<any[]>('arbitration-panels') || [],
    'case-description': await localforage.getItem<string>('case-description') || ''
  };

  return {
    version,
    timestamp: new Date().toISOString(),
    data
  };
}

/**
 * 保存所有数据
 */
export async function saveAllUnifiedData(unifiedData: UnifiedData): Promise<void> {
  await setDataVersion(unifiedData.version);

  for (const [key, value] of Object.entries(unifiedData.data)) {
    await localforage.setItem(key, value);
  }
}

/**
 * 初始化数据系统
 */
export async function initializeDataSystem(): Promise<{
  success: boolean;
  needsMigration: boolean;
  currentVersion: string;
  error?: string;
}> {
  try {
    const currentVersion = await getCurrentDataVersion();
    const needsMig = await needsMigration();

    if (needsMig) {
      // 自动执行迁移
      const result = await migrateData();
      if (!result.success) {
        return {
          success: false,
          needsMigration: true,
          currentVersion,
          error: result.errors.join(', ')
        };
      }
    }

    return {
      success: true,
      needsMigration: false,
      currentVersion: CURRENT_VERSION
    };
  } catch (error) {
    return {
      success: false,
      needsMigration: false,
      currentVersion: '1.0.0',
      error: error instanceof Error ? error.message : '初始化失败'
    };
  }
}

/**
 * 自动备份（在重要操作前）
 */
export async function autoBackup(description: string): Promise<string | null> {
  try {
    const backupId = await createBackup(`自动备份: ${description}`);
    return backupId;
  } catch (error) {
    console.error('自动备份失败:', error);
    return null;
  }
}

/**
 * 检测并记录数据变更
 */
export async function trackDataChanges(): Promise<void> {
  try {
    const changes = await detectChanges();
    if (changes.length > 0) {
      await queueChanges(changes);
    }
  } catch (error) {
    console.error('跟踪数据变更失败:', error);
  }
}

// ==================== Zustand Store ====================

interface UnifiedDataStore {
  initialized: boolean;
  currentVersion: string;
  lastBackupTime: string | null;
  autoBackupEnabled: boolean;
  autoSyncEnabled: boolean;

  // 操作方法
  initialize: () => Promise<void>;
  performBackup: (description: string) => Promise<boolean>;
  enableAutoBackup: (enabled: boolean) => void;
  enableAutoSync: (enabled: boolean) => void;
  getDataSummary: () => Promise<{
    totalItems: number;
    collections: Record<string, number>;
    lastModified: string;
  }>;
}

export const useUnifiedDataStore = create<UnifiedDataStore>((set) => ({
  initialized: false,
  currentVersion: '1.0.0',
  lastBackupTime: null,
  autoBackupEnabled: true,
  autoSyncEnabled: false,

  initialize: async () => {
    const result = await initializeDataSystem();

    if (result.success) {
      set({
        initialized: true,
        currentVersion: result.currentVersion
      });

      // 加载上次备份时间
      const lastBackup = await localforage.getItem<string>('last-backup-time');
      if (lastBackup) {
        set({ lastBackupTime: lastBackup });
      }
    } else {
      console.error('数据系统初始化失败:', result.error);
    }
  },

  performBackup: async (description) => {
    try {
      await createBackup(description);
      const now = new Date().toISOString();

      await localforage.setItem('last-backup-time', now);
      set({ lastBackupTime: now });

      return true;
    } catch (error) {
      console.error('备份失败:', error);
      return false;
    }
  },

  enableAutoBackup: (enabled) => {
    set({ autoBackupEnabled: enabled });
    localforage.setItem('auto-backup-enabled', enabled);
  },

  enableAutoSync: (enabled) => {
    set({ autoSyncEnabled: enabled });
    localforage.setItem('auto-sync-enabled', enabled);
  },

  getDataSummary: async () => {
    const data = await loadAllUnifiedData();

    const collections: Record<string, number> = {};
    let totalItems = 0;

    for (const [key, value] of Object.entries(data.data)) {
      if (Array.isArray(value)) {
        collections[key] = value.length;
        totalItems += value.length;
      } else if (typeof value === 'string') {
        collections[key] = value.length > 0 ? 1 : 0;
        totalItems += value.length > 0 ? 1 : 0;
      }
    }

    return {
      totalItems,
      collections,
      lastModified: data.timestamp
    };
  }
}));

// ==================== 自动保存钩子 ====================

/**
 * 包装Store的保存方法，添加自动备份和变更跟踪
 */
export function wrapSaveMethod(
  originalSave: () => Promise<void>,
  storeName: string
): () => Promise<void> {
  return async () => {
    // 执行原始保存
    await originalSave();

    // 检查是否需要自动备份
    const autoBackupEnabled = await localforage.getItem<boolean>('auto-backup-enabled');
    if (autoBackupEnabled !== false) { // 默认启用
      const lastBackup = await localforage.getItem<string>('last-backup-time');
      const now = Date.now();

      // 如果距离上次备份超过1小时，自动备份
      if (!lastBackup || now - new Date(lastBackup).getTime() > 3600000) {
        await autoBackup(`${storeName}数据更新`);
      }
    }

    // 跟踪数据变更（用于同步）
    const autoSyncEnabled = await localforage.getItem<boolean>('auto-sync-enabled');
    if (autoSyncEnabled) {
      await trackDataChanges();
    }
  };
}

// ==================== 数据完整性检查 ====================

/**
 * 检查数据完整性
 */
export async function checkDataIntegrity(): Promise<{
  valid: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  try {
    const data = await loadAllUnifiedData();

    // 检查版本
    if (!data.version) {
      issues.push('缺少数据版本信息');
    }

    // 检查数据结构
    const requiredKeys = [
      'dispute-foci',
      'evidences',
      'evidence-chains',
      'arbitration-procedures',
      'arbitrators',
      'arbitration-panels'
    ];

    for (const key of requiredKeys) {
      if (!(key in data.data)) {
        issues.push(`缺少数据集合: ${key}`);
      } else if (!Array.isArray(data.data[key as keyof typeof data.data])) {
        issues.push(`数据集合格式错误: ${key}`);
      }
    }

    // 检查数据关联性
    const evidences = data.data.evidences;
    const chains = data.data['evidence-chains'];

    chains.forEach((chain: any) => {
      if (chain.evidenceIds) {
        chain.evidenceIds.forEach((evidenceId: string) => {
          const exists = evidences.some((e: any) => e.id === evidenceId);
          if (!exists) {
            issues.push(`证据链 ${chain.id} 引用了不存在的证据 ${evidenceId}`);
          }
        });
      }
    });

    return {
      valid: issues.length === 0,
      issues
    };
  } catch (error) {
    issues.push(`数据完整性检查失败: ${error}`);
    return {
      valid: false,
      issues
    };
  }
}

/**
 * 修复数据完整性问题
 */
export async function repairDataIntegrity(): Promise<{
  success: boolean;
  repaired: string[];
  errors: string[];
}> {
  const repaired: string[] = [];
  const errors: string[] = [];

  try {
    // 创建修复前备份
    await autoBackup('数据完整性修复前备份');

    const data = await loadAllUnifiedData();

    // 修复缺失的版本信息
    if (!data.version) {
      data.version = CURRENT_VERSION;
      repaired.push('添加了数据版本信息');
    }

    // 修复证据链中的无效引用
    const evidences = data.data.evidences;
    const chains = data.data['evidence-chains'];

    chains.forEach((chain: any) => {
      if (chain.evidenceIds) {
        const validIds = chain.evidenceIds.filter((evidenceId: string) =>
          evidences.some((e: any) => e.id === evidenceId)
        );

        if (validIds.length !== chain.evidenceIds.length) {
          chain.evidenceIds = validIds;
          repaired.push(`修复了证据链 ${chain.id} 的无效引用`);
        }
      }
    });

    // 保存修复后的数据
    await saveAllUnifiedData(data);

    return {
      success: true,
      repaired,
      errors
    };
  } catch (error) {
    errors.push(`数据修复失败: ${error}`);
    return {
      success: false,
      repaired,
      errors
    };
  }
}

