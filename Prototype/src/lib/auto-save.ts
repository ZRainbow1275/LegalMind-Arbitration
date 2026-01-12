/**
 * AutoSave - 自动保存系统
 * 
 * 功能：
 * - 自动保存数据到localStorage
 * - 防抖优化，避免频繁保存
 * - 保存历史记录
 * - 保存状态指示
 * - 数据恢复功能
 * - 版本管理
 * 
 * 基于2025年React最佳实践
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useCleanupManager } from './cleanup-utils';

// ==================== 类型定义 ====================

export interface AutoSaveOptions {
  /** 保存间隔（毫秒），默认30秒 */
  interval?: number;
  /** 防抖延迟（毫秒），默认1秒 */
  debounce?: number;
  /** 最大历史记录数，默认10 */
  maxHistory?: number;
  /** 存储键名 */
  storageKey: string;
  /** 保存回调 */
  onSave?: (data: any) => Promise<void> | void;
  /** 错误回调 */
  onError?: (error: Error) => void;
  /** 是否启用，默认true */
  enabled?: boolean;
  /** 是否压缩数据，默认false */
  compress?: boolean;
}

export interface SaveHistory {
  /** 保存时间 */
  timestamp: Date;
  /** 数据快照 */
  data: any;
  /** 版本号 */
  version: number;
  /** 数据大小（字节） */
  size: number;
}

export interface AutoSaveState {
  /** 是否正在保存 */
  isSaving: boolean;
  /** 最后保存时间 */
  lastSaved: Date | null;
  /** 保存历史 */
  history: SaveHistory[];
  /** 错误信息 */
  error: Error | null;
  /** 是否有未保存的更改 */
  hasUnsavedChanges: boolean;
}

// ==================== 存储管理器 ====================

class StorageManager {
  /**
   * 保存数据到localStorage
   */
  static save(key: string, data: any): void {
    try {
      const jsonData = JSON.stringify(data);

      // TODO: 如果需要压缩，可以使用pako或lz-string库
      // if (compress) {
      //   const compressed = pako.deflate(jsonData);
      //   localStorage.setItem(key, compressed);
      // } else {
      //   localStorage.setItem(key, jsonData);
      // }

      localStorage.setItem(key, jsonData);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new Error('存储空间不足，请清理旧数据');
      }
      throw error;
    }
  }

  /**
   * 从localStorage加载数据
   */
  static load<T>(key: string): T | null {
    try {
      const data = localStorage.getItem(key);
      if (!data) return null;

      // TODO: 如果数据被压缩，需要解压
      // if (compress) {
      //   const decompressed = pako.inflate(data, { to: 'string' });
      //   return JSON.parse(decompressed);
      // }

      return JSON.parse(data);
    } catch (error) {
      console.error('[StorageManager] Failed to load data:', error);
      return null;
    }
  }

  /**
   * 删除数据
   */
  static remove(key: string): void {
    localStorage.removeItem(key);
  }

  /**
   * 获取数据大小（字节）
   */
  static getSize(data: any): number {
    return new Blob([JSON.stringify(data)]).size;
  }
}

// ==================== 历史记录管理器 ====================

class HistoryManager {
  private history: SaveHistory[] = [];
  private maxHistory: number;
  private storageKey: string;

  constructor(storageKey: string, maxHistory: number = 10) {
    this.storageKey = `${storageKey}_history`;
    this.maxHistory = maxHistory;
    this.loadHistory();
  }

  /**
   * 添加历史记录
   */
  add(data: any): void {
    const history: SaveHistory = {
      timestamp: new Date(),
      data,
      version: this.history.length + 1,
      size: StorageManager.getSize(data),
    };

    this.history.push(history);

    // 限制历史记录数量
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    this.saveHistory();
  }

  /**
   * 获取历史记录
   */
  getHistory(): SaveHistory[] {
    return [...this.history];
  }

  /**
   * 获取指定版本的数据
   */
  getVersion(version: number): any | null {
    const history = this.history.find(h => h.version === version);
    return history ? history.data : null;
  }

  /**
   * 清空历史记录
   */
  clear(): void {
    this.history = [];
    this.saveHistory();
  }

  /**
   * 保存历史记录到localStorage
   */
  private saveHistory(): void {
    try {
      // 只保存元数据，不保存完整数据（节省空间）
      const metadata = this.history.map(h => ({
        timestamp: h.timestamp.toISOString(),
        version: h.version,
        size: h.size,
      }));
      StorageManager.save(this.storageKey, metadata);
    } catch (error) {
      console.error('[HistoryManager] Failed to save history:', error);
    }
  }

  /**
   * 从localStorage加载历史记录
   */
  private loadHistory(): void {
    try {
      const metadata = StorageManager.load<any[]>(this.storageKey);
      if (metadata) {
        // 只加载元数据，实际数据在需要时从主存储加载
        this.history = metadata.map(m => ({
          timestamp: new Date(m.timestamp),
          data: null, // 不加载完整数据
          version: m.version,
          size: m.size,
        }));
      }
    } catch (error) {
      console.error('[HistoryManager] Failed to load history:', error);
    }
  }
}

// ==================== React Hook ====================

/**
 * 自动保存Hook
 */
export function useAutoSave<T>(
  data: T,
  options: AutoSaveOptions
): AutoSaveState & {
  saveNow: () => Promise<void>;
  restore: () => T | null;
  clearHistory: () => void;
} {
  const {
    interval = 30000, // 30秒
    debounce = 1000, // 1秒
    maxHistory = 10,
    storageKey,
    onSave,
    onError,
    enabled = true,
  } = options;

  const [state, setState] = useState<AutoSaveState>({
    isSaving: false,
    lastSaved: null,
    history: [],
    error: null,
    hasUnsavedChanges: false,
  });

  const cleanupManager = useCleanupManager('AutoSave');
  const historyManagerRef = useRef<HistoryManager | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastDataRef = useRef<T>(data);

  // 初始化历史记录管理器
  useEffect(() => {
    historyManagerRef.current = new HistoryManager(storageKey, maxHistory);

    // 加载历史记录
    setState(prev => ({
      ...prev,
      history: historyManagerRef.current!.getHistory(),
    }));
  }, [storageKey, maxHistory]);

  /**
   * 执行保存
   */
  const performSave = useCallback(async (dataToSave: T) => {
    if (!enabled) return;

    setState(prev => ({ ...prev, isSaving: true, error: null }));

    try {
      // 保存到localStorage
      StorageManager.save(storageKey, dataToSave);

      // 添加到历史记录
      if (historyManagerRef.current) {
        historyManagerRef.current.add(dataToSave);
      }

      // 调用用户提供的保存回调
      if (onSave) {
        await onSave(dataToSave);
      }

      setState(prev => ({
        ...prev,
        isSaving: false,
        lastSaved: new Date(),
        hasUnsavedChanges: false,
        history: historyManagerRef.current?.getHistory() || [],
      }));

      console.log('[AutoSave] Data saved successfully');
    } catch (error) {
      const err = error instanceof Error ? error : new Error('保存失败');

      setState(prev => ({
        ...prev,
        isSaving: false,
        error: err,
      }));

      if (onError) {
        onError(err);
      }

      console.error('[AutoSave] Failed to save data:', error);
    }
  }, [enabled, storageKey, onSave, onError]);

  /**
   * 立即保存
   */
  const saveNow = useCallback(async () => {
    await performSave(data);
  }, [data, performSave]);

  /**
   * 恢复数据
   */
  const restore = useCallback((): T | null => {
    return StorageManager.load<T>(storageKey);
  }, [storageKey]);

  /**
   * 清空历史记录
   */
  const clearHistory = useCallback(() => {
    if (historyManagerRef.current) {
      historyManagerRef.current.clear();
      setState(prev => ({ ...prev, history: [] }));
    }
  }, []);

  // 监听数据变化，设置防抖保存
  useEffect(() => {
    if (!enabled) return;

    // 检查数据是否真的变化了
    if (JSON.stringify(data) === JSON.stringify(lastDataRef.current)) {
      return;
    }

    lastDataRef.current = data;
    setState(prev => ({ ...prev, hasUnsavedChanges: true }));

    // 清除之前的防抖定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 设置新的防抖定时器
    debounceTimerRef.current = setTimeout(() => {
      performSave(data);
    }, debounce);

    cleanupManager.add(() => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    });
  }, [data, enabled, debounce, performSave, cleanupManager]);

  // 设置定期保存
  useEffect(() => {
    if (!enabled || interval <= 0) return;

    intervalTimerRef.current = setInterval(() => {
      if (state.hasUnsavedChanges) {
        performSave(data);
      }
    }, interval);

    cleanupManager.add(() => {
      if (intervalTimerRef.current) {
        clearInterval(intervalTimerRef.current);
      }
    });

    return () => {
      if (intervalTimerRef.current) {
        clearInterval(intervalTimerRef.current);
      }
    };
  }, [enabled, interval, state.hasUnsavedChanges, data, performSave, cleanupManager]);

  return {
    ...state,
    saveNow,
    restore,
    clearHistory,
  };
}

// ==================== 导出工具函数 ====================

/**
 * 清除指定键的所有保存数据
 */
export function clearAutoSaveData(storageKey: string): void {
  StorageManager.remove(storageKey);
  StorageManager.remove(`${storageKey}_history`);
}

/**
 * 获取所有自动保存的键
 */
export function getAllAutoSaveKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && !key.endsWith('_history')) {
      keys.push(key);
    }
  }
  return keys;
}

/**
 * 导出所有自动保存数据
 */
export function exportAllAutoSaveData(): Record<string, any> {
  const data: Record<string, any> = {};
  const keys = getAllAutoSaveKeys();

  keys.forEach(key => {
    const value = StorageManager.load(key);
    if (value) {
      data[key] = value;
    }
  });

  return data;
}

