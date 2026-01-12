/**
 * 数据版本管理器
 * 
 * 功能：
 * 1. 数据版本控制
 * 2. 数据迁移
 * 3. 数据备份和恢复
 * 4. 数据导入导出
 */

import localforage from 'localforage';

// ==================== 数据结构定义 ====================

export interface DataVersion {
  version: string; // 语义化版本号 (e.g., "1.0.0")
  timestamp: string;
  description: string;
  changes: string[];
}

export interface DataSnapshot {
  id: string;
  version: string;
  timestamp: string;
  description: string;
  data: {
    disputeFoci?: any[];
    evidences?: any[];
    evidenceChains?: any[];
    procedures?: any[];
    panels?: any[];
    arbitrators?: any[];
    [key: string]: any;
  };
  size: number; // 字节数
}

export interface MigrationScript {
  fromVersion: string;
  toVersion: string;
  migrate: (data: any) => any;
  description: string;
}

// ==================== 版本历史 ====================

export const VERSION_HISTORY: DataVersion[] = [
  {
    version: '1.0.0',
    timestamp: '2025-10-09',
    description: '初始版本',
    changes: [
      '争议焦点管理器',
      '证据链分析器',
      '仲裁流程管理器',
      '仲裁庭管理器'
    ]
  }
];

export const CURRENT_VERSION = '1.0.0';

// ==================== 迁移脚本 ====================

export const MIGRATION_SCRIPTS: MigrationScript[] = [
  // 未来版本的迁移脚本将在这里添加
  // 示例：
  // {
  //   fromVersion: '1.0.0',
  //   toVersion: '1.1.0',
  //   migrate: (data) => {
  //     // 迁移逻辑
  //     return data;
  //   },
  //   description: '添加新字段'
  // }
];

// ==================== 核心功能 ====================

/**
 * 获取当前数据版本
 */
export async function getCurrentDataVersion(): Promise<string> {
  try {
    const version = await localforage.getItem<string>('data-version');
    return version || '1.0.0';
  } catch (error) {
    console.error('获取数据版本失败:', error);
    return '1.0.0';
  }
}

/**
 * 设置数据版本
 */
export async function setDataVersion(version: string): Promise<void> {
  try {
    await localforage.setItem('data-version', version);
  } catch (error) {
    console.error('设置数据版本失败:', error);
  }
}

/**
 * 比较版本号
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }
  
  return 0;
}

/**
 * 检查是否需要迁移
 */
export async function needsMigration(): Promise<boolean> {
  const currentVersion = await getCurrentDataVersion();
  return compareVersions(currentVersion, CURRENT_VERSION) < 0;
}

/**
 * 执行数据迁移
 */
export async function migrateData(): Promise<{
  success: boolean;
  fromVersion: string;
  toVersion: string;
  errors: string[];
}> {
  const fromVersion = await getCurrentDataVersion();
  const errors: string[] = [];
  
  if (compareVersions(fromVersion, CURRENT_VERSION) >= 0) {
    return {
      success: true,
      fromVersion,
      toVersion: CURRENT_VERSION,
      errors: []
    };
  }
  
  try {
    // 创建备份
    await createBackup(`迁移前备份 (${fromVersion} -> ${CURRENT_VERSION})`);
    
    // 加载所有数据
    const allData = await loadAllData();
    
    // 执行迁移脚本链
    let currentData = allData;
    let currentVer = fromVersion;
    
    while (compareVersions(currentVer, CURRENT_VERSION) < 0) {
      const script = MIGRATION_SCRIPTS.find(s => s.fromVersion === currentVer);
      
      if (!script) {
        errors.push(`未找到从 ${currentVer} 的迁移脚本`);
        break;
      }
      
      try {
        currentData = script.migrate(currentData);
        currentVer = script.toVersion;
      } catch (error) {
        errors.push(`迁移失败 (${script.fromVersion} -> ${script.toVersion}): ${error}`);
        break;
      }
    }
    
    if (errors.length === 0) {
      // 保存迁移后的数据
      await saveAllData(currentData);
      await setDataVersion(CURRENT_VERSION);
      
      return {
        success: true,
        fromVersion,
        toVersion: CURRENT_VERSION,
        errors: []
      };
    } else {
      // 迁移失败，恢复备份
      const backups = await listBackups();
      if (backups.length > 0) {
        await restoreBackup(backups[0].id);
      }
      
      return {
        success: false,
        fromVersion,
        toVersion: currentVer,
        errors
      };
    }
  } catch (error) {
    errors.push(`迁移过程出错: ${error}`);
    return {
      success: false,
      fromVersion,
      toVersion: fromVersion,
      errors
    };
  }
}

/**
 * 加载所有数据
 */
export async function loadAllData(): Promise<any> {
  const keys = [
    'dispute-foci',
    'evidences',
    'evidence-chains',
    'arbitration-procedures',
    'arbitrators',
    'arbitration-panels',
    'case-description'
  ];
  
  const data: any = {};
  
  for (const key of keys) {
    try {
      const value = await localforage.getItem(key);
      if (value !== null) {
        data[key] = value;
      }
    } catch (error) {
      console.error(`加载 ${key} 失败:`, error);
    }
  }
  
  return data;
}

/**
 * 保存所有数据
 */
export async function saveAllData(data: any): Promise<void> {
  for (const [key, value] of Object.entries(data)) {
    try {
      await localforage.setItem(key, value);
    } catch (error) {
      console.error(`保存 ${key} 失败:`, error);
    }
  }
}

/**
 * 创建数据快照
 */
export async function createSnapshot(description: string): Promise<DataSnapshot> {
  const data = await loadAllData();
  const dataStr = JSON.stringify(data);
  const size = new Blob([dataStr]).size;
  
  const snapshot: DataSnapshot = {
    id: `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    version: CURRENT_VERSION,
    timestamp: new Date().toISOString(),
    description,
    data,
    size
  };
  
  return snapshot;
}

/**
 * 创建备份
 */
export async function createBackup(description: string): Promise<string> {
  const snapshot = await createSnapshot(description);
  
  // 保存到备份列表
  const backups = await listBackups();
  backups.unshift(snapshot);
  
  // 只保留最近10个备份
  const recentBackups = backups.slice(0, 10);
  await localforage.setItem('data-backups', recentBackups);
  
  return snapshot.id;
}

/**
 * 列出所有备份
 */
export async function listBackups(): Promise<DataSnapshot[]> {
  try {
    const backups = await localforage.getItem<DataSnapshot[]>('data-backups');
    return backups || [];
  } catch (error) {
    console.error('列出备份失败:', error);
    return [];
  }
}

/**
 * 恢复备份
 */
export async function restoreBackup(backupId: string): Promise<boolean> {
  try {
    const backups = await listBackups();
    const backup = backups.find(b => b.id === backupId);
    
    if (!backup) {
      console.error('备份不存在:', backupId);
      return false;
    }
    
    await saveAllData(backup.data);
    await setDataVersion(backup.version);
    
    return true;
  } catch (error) {
    console.error('恢复备份失败:', error);
    return false;
  }
}

/**
 * 删除备份
 */
export async function deleteBackup(backupId: string): Promise<boolean> {
  try {
    const backups = await listBackups();
    const filtered = backups.filter(b => b.id !== backupId);
    await localforage.setItem('data-backups', filtered);
    return true;
  } catch (error) {
    console.error('删除备份失败:', error);
    return false;
  }
}

/**
 * 导出数据
 */
export async function exportData(): Promise<string> {
  const snapshot = await createSnapshot('数据导出');
  return JSON.stringify(snapshot, null, 2);
}

/**
 * 导入数据
 */
export async function importData(jsonStr: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const snapshot = JSON.parse(jsonStr) as DataSnapshot;
    
    // 验证数据结构
    if (!snapshot.version || !snapshot.data) {
      return {
        success: false,
        error: '无效的数据格式'
      };
    }
    
    // 创建当前数据的备份
    await createBackup('导入前备份');
    
    // 导入数据
    await saveAllData(snapshot.data);
    await setDataVersion(snapshot.version);
    
    // 如果版本不匹配，执行迁移
    if (compareVersions(snapshot.version, CURRENT_VERSION) < 0) {
      await migrateData();
    }
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '导入失败'
    };
  }
}

