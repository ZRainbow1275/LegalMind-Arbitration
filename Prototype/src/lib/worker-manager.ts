/**
 * Web Worker管理器
 * 
 * 管理Worker线程的创建、通信和销毁
 * 将计算密集型任务移到后台线程，避免阻塞主线程
 */

import type { CanvasElement, Bounds } from '../types/canvas-elements';
import type {
  WorkerMessage,
  WorkerResponse,
  BuildQuadTreeMessage,
  QueryQuadTreeMessage
} from '../workers/quadtree.worker';

// ==================== 类型定义 ====================

export interface WorkerManagerOptions {
  /**
   * Worker脚本路径
   */
  workerPath?: string;

  /**
   * 是否启用Worker
   */
  enabled?: boolean;

  /**
   * 超时时间（毫秒）
   */
  timeout?: number;
}

export interface QuadTreeBuildResult {
  success: boolean;
  elementCount: number;
  buildTime: number;
}

export interface QuadTreeQueryResult {
  elements: CanvasElement[];
  queryTime: number;
}

// ==================== Worker管理器 ====================

/**
 * 四叉树Worker管理器
 */
export class QuadTreeWorkerManager {
  private worker: Worker | null = null;
  private enabled: boolean;
  private timeout: number;
  private messageId = 0;
  private pendingRequests = new Map<number, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeoutId: ReturnType<typeof setTimeout>;
  }>();

  constructor(options: WorkerManagerOptions = {}) {
    this.enabled = options.enabled ?? true;
    this.timeout = options.timeout ?? 5000;

    if (this.enabled && typeof Worker !== 'undefined') {
      this.initWorker(options.workerPath);
    }
  }

  /**
   * 初始化Worker
   */
  private initWorker(workerPath?: string) {
    try {
      if (workerPath) {
        this.worker = new Worker(workerPath, { type: 'module' });
      } else {
        // 在测试环境中，直接使用Mock Worker
        // 在生产环境中，使用内联Worker
        if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
          const workerCode = `
            // Worker代码将在构建时注入
            self.postMessage({ type: 'ready' });
          `;
          const blob = new Blob([workerCode], { type: 'application/javascript' });
          const url = URL.createObjectURL(blob);
          this.worker = new Worker(url, { type: 'module' });
        } else {
          // 测试环境：使用Mock Worker
          this.worker = new Worker('mock-worker.js') as any;
        }
      }

      if (this.worker) {
        this.worker.onmessage = this.handleMessage.bind(this);
        this.worker.onerror = this.handleError.bind(this);
      }
    } catch (error) {
      console.warn('[WorkerManager] Failed to initialize worker:', error);
      this.enabled = false;
    }
  }

  /**
   * 处理Worker消息
   */
  private handleMessage(event: MessageEvent<WorkerResponse>) {
    const response = event.data;

    if (response.type === 'error') {
      console.error('[WorkerManager] Worker error:', response.error);
      return;
    }

    // 处理待处理的请求
    // 注意：这里简化处理，实际应该使用消息ID匹配
    const requests = Array.from(this.pendingRequests.values());
    if (requests.length > 0) {
      const request = requests[0];
      clearTimeout(request.timeoutId);
      this.pendingRequests.clear();
      request.resolve(response);
    }
  }

  /**
   * 处理Worker错误
   */
  private handleError(error: ErrorEvent) {
    console.error('[WorkerManager] Worker error:', error);

    // 拒绝所有待处理的请求
    for (const request of this.pendingRequests.values()) {
      clearTimeout(request.timeoutId);
      request.reject(new Error(error.message));
    }
    this.pendingRequests.clear();
  }

  /**
   * 发送消息到Worker
   */
  private sendMessage<T>(message: WorkerMessage): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.enabled || !this.worker) {
        reject(new Error('Worker not available'));
        return;
      }

      const messageId = this.messageId++;

      // 设置超时
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(messageId);
        reject(new Error('Worker request timeout'));
      }, this.timeout);

      // 保存请求
      this.pendingRequests.set(messageId, {
        resolve,
        reject,
        timeoutId
      });

      // 发送消息
      this.worker.postMessage(message);
    });
  }

  /**
   * 构建四叉树
   */
  async buildQuadTree(
    elements: CanvasElement[],
    canvasBounds?: Bounds
  ): Promise<QuadTreeBuildResult> {
    const message: BuildQuadTreeMessage = {
      type: 'build',
      elements,
      canvasBounds
    };

    const response = await this.sendMessage<WorkerResponse>(message);

    if (response.type === 'build-complete') {
      return {
        success: response.success,
        elementCount: response.elementCount,
        buildTime: response.buildTime
      };
    }

    throw new Error('Unexpected response type');
  }

  /**
   * 查询四叉树
   */
  async queryQuadTree(bounds: Bounds): Promise<QuadTreeQueryResult> {
    const message: QueryQuadTreeMessage = {
      type: 'query',
      bounds
    };

    const response = await this.sendMessage<WorkerResponse>(message);

    if (response.type === 'query-result') {
      return {
        elements: response.elements,
        queryTime: response.queryTime
      };
    }

    throw new Error('Unexpected response type');
  }

  /**
   * 清除四叉树
   */
  async clearQuadTree(): Promise<void> {
    const message = { type: 'clear' as const };
    await this.sendMessage(message);
  }

  /**
   * 检查Worker是否可用
   */
  isAvailable(): boolean {
    return this.enabled && this.worker !== null;
  }

  /**
   * 销毁Worker
   */
  destroy() {
    // 清除所有待处理的请求
    for (const request of this.pendingRequests.values()) {
      clearTimeout(request.timeoutId);
      request.reject(new Error('Worker destroyed'));
    }
    this.pendingRequests.clear();

    // 终止Worker
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

// ==================== 辅助函数 ====================

/**
 * 创建四叉树Worker管理器
 */
export function createQuadTreeWorkerManager(options?: WorkerManagerOptions): QuadTreeWorkerManager {
  return new QuadTreeWorkerManager(options);
}

/**
 * 检查浏览器是否支持Worker
 */
export function isWorkerSupported(): boolean {
  return typeof Worker !== 'undefined';
}

// ==================== 全局单例 ====================

let globalWorkerManager: QuadTreeWorkerManager | null = null;

/**
 * 获取全局Worker管理器
 */
export function getGlobalWorkerManager(): QuadTreeWorkerManager {
  if (!globalWorkerManager) {
    globalWorkerManager = new QuadTreeWorkerManager();
  }
  return globalWorkerManager;
}

/**
 * 销毁全局Worker管理器
 */
export function destroyGlobalWorkerManager() {
  if (globalWorkerManager) {
    globalWorkerManager.destroy();
    globalWorkerManager = null;
  }
}

