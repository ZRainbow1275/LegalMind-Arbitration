/**
 * 节点动画系统
 * 
 * 实现节点创建/删除/移动动画，提升用户体验
 * 使用CSS transitions和React Spring
 * 
 * 功能：
 * - 节点创建动画（淡入+缩放）
 * - 节点删除动画（淡出+缩放）
 * - 节点移动动画（平滑过渡）
 * - 节点选中动画（高亮）
 * - 动画配置管理
 * 
 * @author AI Agent
 * @date 2025-10-31
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * 动画类型
 */
export enum AnimationType {
  /** 创建动画 */
  CREATE = 'create',
  /** 删除动画 */
  DELETE = 'delete',
  /** 移动动画 */
  MOVE = 'move',
  /** 选中动画 */
  SELECT = 'select',
  /** 取消选中动画 */
  DESELECT = 'deselect',
}

/**
 * 动画状态
 */
export enum AnimationState {
  /** 空闲 */
  IDLE = 'idle',
  /** 进入中 */
  ENTERING = 'entering',
  /** 已进入 */
  ENTERED = 'entered',
  /** 退出中 */
  EXITING = 'exiting',
  /** 已退出 */
  EXITED = 'exited',
}

/**
 * 动画配置
 */
export interface AnimationConfig {
  /** 动画持续时间（毫秒） */
  duration?: number;
  /** 动画延迟（毫秒） */
  delay?: number;
  /** 缓动函数 */
  easing?: string;
  /** 是否启用 */
  enabled?: boolean;
}

/**
 * 节点动画配置
 */
export interface NodeAnimationConfig {
  /** 创建动画配置 */
  create?: AnimationConfig;
  /** 删除动画配置 */
  delete?: AnimationConfig;
  /** 移动动画配置 */
  move?: AnimationConfig;
  /** 选中动画配置 */
  select?: AnimationConfig;
}

/**
 * 默认动画配置
 */
const DEFAULT_ANIMATION_CONFIG: Required<NodeAnimationConfig> = {
  create: {
    duration: 150, // {{ AURA: Fix - 减少动画时长，避免"飞过来"的感觉 }}
    delay: 0,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)', // {{ AURA: Fix - 使用平滑过渡，移除弹性效果 }}
    enabled: true,
  },
  delete: {
    duration: 200,
    delay: 0,
    easing: 'cubic-bezier(0.4, 0, 1, 1)', // 加速退出
    enabled: true,
  },
  move: {
    duration: 250,
    delay: 0,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)', // 平滑过渡
    enabled: true,
  },
  select: {
    duration: 150,
    delay: 0,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    enabled: true,
  },
};

/**
 * 节点动画管理器
 */
export class NodeAnimationManager {
  private config: Required<NodeAnimationConfig>;
  private animatingNodes: Map<string, AnimationState> = new Map();
  private listeners: Set<(nodeId: string, state: AnimationState) => void> = new Set();

  constructor(config: NodeAnimationConfig = {}) {
    this.config = {
      create: { ...DEFAULT_ANIMATION_CONFIG.create, ...config.create },
      delete: { ...DEFAULT_ANIMATION_CONFIG.delete, ...config.delete },
      move: { ...DEFAULT_ANIMATION_CONFIG.move, ...config.move },
      select: { ...DEFAULT_ANIMATION_CONFIG.select, ...config.select },
    };
  }

  /**
   * 开始动画
   */
  startAnimation(nodeId: string, type: AnimationType): void {
    const config = this.getConfig(type);
    if (!config.enabled) return;

    const state = type === AnimationType.DELETE ? AnimationState.EXITING : AnimationState.ENTERING;
    this.setAnimationState(nodeId, state);

    setTimeout(() => {
      const nextState = type === AnimationType.DELETE ? AnimationState.EXITED : AnimationState.ENTERED;
      this.setAnimationState(nodeId, nextState);
    }, (config.duration || 0) + (config.delay || 0));
  }

  /**
   * 停止动画
   */
  stopAnimation(nodeId: string): void {
    this.animatingNodes.delete(nodeId);
    this.notifyListeners(nodeId, AnimationState.IDLE);
  }

  /**
   * 获取动画状态
   */
  getAnimationState(nodeId: string): AnimationState {
    return this.animatingNodes.get(nodeId) || AnimationState.IDLE;
  }

  /**
   * 是否正在动画
   */
  isAnimating(nodeId: string): boolean {
    const state = this.getAnimationState(nodeId);
    return state === AnimationState.ENTERING || state === AnimationState.EXITING;
  }

  /**
   * 订阅动画状态变化
   */
  subscribe(listener: (nodeId: string, state: AnimationState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 获取动画配置
   */
  getConfig(type: AnimationType): AnimationConfig {
    switch (type) {
      case AnimationType.CREATE:
        return this.config.create;
      case AnimationType.DELETE:
        return this.config.delete;
      case AnimationType.MOVE:
        return this.config.move;
      case AnimationType.SELECT:
      case AnimationType.DESELECT:
        return this.config.select;
      default:
        return this.config.create;
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: NodeAnimationConfig): void {
    this.config = {
      create: { ...this.config.create, ...config.create },
      delete: { ...this.config.delete, ...config.delete },
      move: { ...this.config.move, ...config.move },
      select: { ...this.config.select, ...config.select },
    };
  }

  /**
   * 设置动画状态
   */
  private setAnimationState(nodeId: string, state: AnimationState): void {
    this.animatingNodes.set(nodeId, state);
    this.notifyListeners(nodeId, state);
  }

  /**
   * 通知监听器
   */
  private notifyListeners(nodeId: string, state: AnimationState): void {
    this.listeners.forEach(listener => listener(nodeId, state));
  }
}

/**
 * 节点动画Hook
 */
export function useNodeAnimation(
  nodeId: string,
  config: NodeAnimationConfig = {}
): {
  animationState: AnimationState;
  startAnimation: (type: AnimationType) => void;
  stopAnimation: () => void;
  isAnimating: boolean;
  getAnimationStyle: (type: AnimationType) => React.CSSProperties;
} {
  const managerRef = useRef<NodeAnimationManager>(new NodeAnimationManager(config));
  const [animationState, setAnimationState] = useState<AnimationState>(AnimationState.IDLE);

  // 订阅动画状态变化
  useEffect(() => {
    const manager = managerRef.current;
    const unsubscribe = manager.subscribe((id, state) => {
      if (id === nodeId) {
        setAnimationState(state);
      }
    });

    return unsubscribe;
  }, [nodeId]);

  const startAnimation = useCallback((type: AnimationType) => {
    managerRef.current.startAnimation(nodeId, type);
  }, [nodeId]);

  const stopAnimation = useCallback(() => {
    managerRef.current.stopAnimation(nodeId);
  }, [nodeId]);

  const isAnimating = managerRef.current.isAnimating(nodeId);

  const getAnimationStyle = useCallback((type: AnimationType): React.CSSProperties => {
    const config = managerRef.current.getConfig(type);
    const state = animationState;

    const baseStyle: React.CSSProperties = {
      transition: `all ${config.duration || 0}ms ${config.easing || 'ease'} ${config.delay || 0}ms`,
    };

    switch (type) {
      case AnimationType.CREATE:
        if (state === AnimationState.ENTERING) {
          return {
            ...baseStyle,
            opacity: 0,
            transform: 'scale(0.95)', // {{ AURA: Fix - 减小缩放幅度，避免"飞过来"的感觉 }}
          };
        } else if (state === AnimationState.ENTERED) {
          return {
            ...baseStyle,
            opacity: 1,
            transform: 'scale(1)',
          };
        }
        break;

      case AnimationType.DELETE:
        if (state === AnimationState.EXITING) {
          return {
            ...baseStyle,
            opacity: 0,
            transform: 'scale(0.8)',
          };
        }
        break;

      case AnimationType.SELECT:
        return {
          ...baseStyle,
          boxShadow: '0 0 0 3px rgba(255, 107, 53, 0.3)',
          transform: 'scale(1.02)',
        };

      case AnimationType.DESELECT:
        return {
          ...baseStyle,
          boxShadow: 'none',
          transform: 'scale(1)',
        };

      case AnimationType.MOVE:
        return baseStyle;
    }

    return {};
  }, [animationState]);

  return {
    animationState,
    startAnimation,
    stopAnimation,
    isAnimating,
    getAnimationStyle,
  };
}

/**
 * 全局动画管理Hook
 */
export function useGlobalNodeAnimation(
  config: NodeAnimationConfig = {}
): {
  startAnimation: (nodeId: string, type: AnimationType) => void;
  stopAnimation: (nodeId: string) => void;
  getAnimationState: (nodeId: string) => AnimationState;
  isAnimating: (nodeId: string) => boolean;
} {
  const managerRef = useRef<NodeAnimationManager>(new NodeAnimationManager(config));

  const startAnimation = useCallback((nodeId: string, type: AnimationType) => {
    managerRef.current.startAnimation(nodeId, type);
  }, []);

  const stopAnimation = useCallback((nodeId: string) => {
    managerRef.current.stopAnimation(nodeId);
  }, []);

  const getAnimationState = useCallback((nodeId: string) => {
    return managerRef.current.getAnimationState(nodeId);
  }, []);

  const isAnimating = useCallback((nodeId: string) => {
    return managerRef.current.isAnimating(nodeId);
  }, []);

  return {
    startAnimation,
    stopAnimation,
    getAnimationState,
    isAnimating,
  };
}

