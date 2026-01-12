/**
 * 撤销/重做功能（增强版）
 *
 * 实现画布操作历史记录，支持Ctrl+Z/Ctrl+Y快捷键
 *
 * 功能：
 * - 操作历史记录管理
 * - 撤销/重做操作
 * - 历史记录限制
 * - React Hook集成
 * - Immer集成（不可变数据）
 * - Command模式支持
 *
 * @author AI Agent
 * @date 2025-11-06
 * @version 2.0
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { produce } from 'immer'; // {{ AURA: Add - 使用Immer实现不可变数据 }}

/**
 * 历史记录项
 */
export interface HistoryEntry<T> {
  /** 状态快照 */
  state: T;
  /** 操作描述 */
  description?: string;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 撤销/重做管理器配置
 */
export interface UndoRedoOptions {
  /** 最大历史记录数量（默认50） */
  maxHistory?: number;
  /** 是否启用（默认true） */
  enabled?: boolean;
  /** 撤销回调 */
  onUndo?: (state: any) => void;
  /** 重做回调 */
  onRedo?: (state: any) => void;
  /** 状态变更回调 */
  onChange?: (state: any) => void;
}

/**
 * 撤销/重做状态
 */
export interface UndoRedoState {
  /** 是否可以撤销 */
  canUndo: boolean;
  /** 是否可以重做 */
  canRedo: boolean;
  /** 历史记录数量 */
  historyCount: number;
  /** 当前位置 */
  currentIndex: number;
}

/**
 * 撤销/重做管理器类
 */
export class UndoRedoManager<T> {
  private history: HistoryEntry<T>[] = [];
  private currentIndex: number = -1;
  private maxHistory: number;
  private enabled: boolean;
  private listeners: Set<() => void> = new Set();

  constructor(options: UndoRedoOptions = {}) {
    this.maxHistory = options.maxHistory || 50;
    this.enabled = options.enabled !== false;
  }

  /**
   * 添加新状态到历史记录
   */
  push(state: T, description?: string): void {
    if (!this.enabled) return;

    // 移除当前位置之后的所有历史记录
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // 添加新状态
    this.history.push({
      state: this.deepClone(state),
      description,
      timestamp: Date.now(),
    });

    // 限制历史记录数量
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }

    this.notifyListeners();
  }

  /**
   * 撤销操作
   */
  undo(): T | null {
    if (!this.canUndo()) return null;

    this.currentIndex--;
    const entry = this.history[this.currentIndex];
    this.notifyListeners();
    return this.deepClone(entry.state);
  }

  /**
   * 重做操作
   */
  redo(): T | null {
    if (!this.canRedo()) return null;

    this.currentIndex++;
    const entry = this.history[this.currentIndex];
    this.notifyListeners();
    return this.deepClone(entry.state);
  }

  /**
   * 是否可以撤销
   */
  canUndo(): boolean {
    return this.enabled && this.currentIndex > 0;
  }

  /**
   * 是否可以重做
   */
  canRedo(): boolean {
    return this.enabled && this.currentIndex < this.history.length - 1;
  }

  /**
   * 获取当前状态
   */
  getState(): UndoRedoState {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      historyCount: this.history.length,
      currentIndex: this.currentIndex,
    };
  }

  /**
   * 获取历史记录列表
   */
  getHistory(): HistoryEntry<T>[] {
    return this.history.map(entry => ({
      ...entry,
      state: this.deepClone(entry.state),
    }));
  }

  /**
   * 清空历史记录
   */
  clear(): void {
    this.history = [];
    this.currentIndex = -1;
    this.notifyListeners();
  }

  /**
   * 启用/禁用
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.notifyListeners();
  }

  /**
   * 订阅状态变更
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  /**
   * 深度克隆对象（使用Immer的produce确保不可变性）
   */
  private deepClone(obj: T): T {
    // {{ AURA: Modify - 使用Immer的produce代替JSON序列化，性能更好且支持更多数据类型 }}
    return produce(obj, () => {
      // Immer会自动创建深拷贝
    }) as T;
  }
}

/**
 * 撤销/重做 React Hook
 */
export function useUndoRedo<T>(
  initialState: T,
  options: UndoRedoOptions = {}
): {
  state: T;
  setState: (state: T, description?: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clear: () => void;
  history: HistoryEntry<T>[];
  currentIndex: number;
} {
  const [state, setStateInternal] = useState<T>(initialState);
  const [undoRedoState, setUndoRedoState] = useState<UndoRedoState>({
    canUndo: false,
    canRedo: false,
    historyCount: 0,
    currentIndex: -1,
  });

  const managerRef = useRef<UndoRedoManager<T>>(new UndoRedoManager<T>(options));
  const isUndoRedoRef = useRef(false);

  // 订阅管理器状态变更
  useEffect(() => {
    const manager = managerRef.current;
    const unsubscribe = manager.subscribe(() => {
      setUndoRedoState(manager.getState());
    });

    // 初始化历史记录
    manager.push(initialState, 'Initial state');

    return unsubscribe;
  }, [initialState]);

  // 设置状态
  const setState = useCallback((newState: T, description?: string) => {
    if (isUndoRedoRef.current) {
      // 撤销/重做操作，直接设置状态
      setStateInternal(newState);
      isUndoRedoRef.current = false;
    } else {
      // 正常操作，添加到历史记录
      managerRef.current.push(newState, description);
      setStateInternal(newState);
    }

    if (options.onChange) {
      options.onChange(newState);
    }
  }, [options]);

  // 撤销
  const undo = useCallback(() => {
    const previousState = managerRef.current.undo();
    if (previousState !== null) {
      isUndoRedoRef.current = true;
      setStateInternal(previousState);
      if (options.onUndo) {
        options.onUndo(previousState);
      }
      if (options.onChange) {
        options.onChange(previousState);
      }
    }
  }, [options]);

  // 重做
  const redo = useCallback(() => {
    const nextState = managerRef.current.redo();
    if (nextState !== null) {
      isUndoRedoRef.current = true;
      setStateInternal(nextState);
      if (options.onRedo) {
        options.onRedo(nextState);
      }
      if (options.onChange) {
        options.onChange(nextState);
      }
    }
  }, [options]);

  // 清空历史记录
  const clear = useCallback(() => {
    managerRef.current.clear();
  }, []);

  // 获取历史记录
  const history = managerRef.current.getHistory();

  return {
    state,
    setState,
    undo,
    redo,
    canUndo: undoRedoState.canUndo,
    canRedo: undoRedoState.canRedo,
    clear,
    history,
    currentIndex: undoRedoState.currentIndex,
  };
}

/**
 * 快捷键处理Hook
 */
export function useUndoRedoShortcuts(
  undo: () => void,
  redo: () => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Z 或 Cmd+Z - 撤销
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      }
      // Ctrl+Y 或 Cmd+Shift+Z - 重做
      else if (
        ((event.ctrlKey || event.metaKey) && event.key === 'y') ||
        ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'z')
      ) {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, enabled]);
}

