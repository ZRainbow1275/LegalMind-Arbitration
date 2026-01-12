/**
 * 增强版Worker池管理器
 * 
 * 优化特性：
 * 1. 智能任务调度 - 根据Worker负载自动分配任务
 * 2. 任务优先级队列 - 高优先级任务优先执行
 * 3. 任务取消机制 - 支持取消正在执行的任务
 * 4. 性能监控 - 实时监控Worker性能
 * 5. 错误恢复 - 自动重试失败的任务
 * 6. 资源管理 - 自动清理空闲Worker
 */

export interface WorkerPoolConfig {
  maxWorkers?: number;
  taskTimeout?: number;
  maxRetries?: number;
  idleTimeout?: number;
  enableMonitoring?: boolean;
}

export interface WorkerTask<T = any, R = any> {
  id: string;
  type: string;
  data: T;
  priority: number;
  resolve: (result: R) => void;
  reject: (error: Error) => void;
  createdAt: number;
  retries?: number;
  abortController?: AbortController;
}

export interface WorkerInfo {
  worker: Worker;
  id: string;
  busy: boolean;
  currentTask: string | null;
  tasksCompleted: number;
  totalTime: number;
  errors: number;
  createdAt: number;
  lastUsed: number;
}

export interface WorkerPoolStats {
  totalWorkers: number;
  busyWorkers: number;
  idleWorkers: number;
  queuedTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageTaskTime: number;
  workerUtilization: number;
}

/**
 * 增强版Worker池
 */
export class WorkerPoolEnhanced {
  private workers: WorkerInfo[] = [];
  private taskQueue: WorkerTask[] = [];
  private taskMap: Map<string, WorkerTask> = new Map();
  private config: Required<WorkerPoolConfig>;
  private stats = {
    completedTasks: 0,
    failedTasks: 0,
    totalTaskTime: 0,
  };
  private cleanupTimer: number | null = null;

  constructor(config: WorkerPoolConfig = {}) {
    this.config = {
      maxWorkers: config.maxWorkers ?? 4,
      taskTimeout: config.taskTimeout ?? 30000,
      maxRetries: config.maxRetries ?? 3,
      idleTimeout: config.idleTimeout ?? 60000,
      enableMonitoring: config.enableMonitoring ?? true,
    };

    // 启动清理定时器
    if (this.config.idleTimeout > 0) {
      this.startCleanupTimer();
    }
  }

  /**
   * 执行任务
   */
  public execute<T = any, R = any>(
    type: string,
    data: T,
    priority: number = 0,
    abortSignal?: AbortSignal
  ): Promise<R> {
    return new Promise((resolve, reject) => {
      const abortController = new AbortController();

      // 如果提供了外部AbortSignal，监听它
      if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
          abortController.abort();
          this.cancelTask(task.id);
          reject(new Error('Task aborted'));
        });
      }

      const task: WorkerTask<T, R> = {
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        resolve,
        reject,
        priority,
        createdAt: Date.now(),
        retries: 0,
        abortController,
      };

      // 添加到任务队列
      this.taskQueue.push(task);
      this.taskMap.set(task.id, task);

      // 按优先级排序（高优先级在前）
      this.taskQueue.sort((a, b) => b.priority - a.priority);

      // 设置超时
      setTimeout(() => {
        if (this.taskMap.has(task.id)) {
          this.handleTaskTimeout(task);
        }
      }, this.config.taskTimeout);

      // 尝试处理任务
      this.processNextTask();
    });
  }

  /**
   * 取消任务
   */
  public cancelTask(taskId: string): boolean {
    const task = this.taskMap.get(taskId);
    if (!task) return false;

    // 从队列中移除
    const queueIndex = this.taskQueue.findIndex(t => t.id === taskId);
    if (queueIndex !== -1) {
      this.taskQueue.splice(queueIndex, 1);
    }

    // 如果任务正在执行，中止Worker
    const worker = this.workers.find(w => w.currentTask === taskId);
    if (worker) {
      worker.worker.terminate();
      this.removeWorker(worker.id);
    }

    // 清理任务
    this.taskMap.delete(taskId);
    task.reject(new Error('Task cancelled'));

    return true;
  }

  /**
   * 处理下一个任务
   */
  private processNextTask(): void {
    if (this.taskQueue.length === 0) return;

    // 查找空闲Worker
    let worker = this.workers.find(w => !w.busy);

    // 如果没有空闲Worker且未达到最大数量，创建新Worker
    if (!worker && this.workers.length < this.config.maxWorkers) {
      worker = this.createWorker();
    }

    // 如果有空闲Worker，分配任务
    if (worker) {
      const task = this.taskQueue.shift();
      if (task) {
        this.assignTask(worker, task);
      }
    }
  }

  /**
   * 创建Worker
   */
  private createWorker(): WorkerInfo {
    const worker = new Worker('/workers/compute-worker.js');
    const workerInfo: WorkerInfo = {
      worker,
      id: `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      busy: false,
      currentTask: null,
      tasksCompleted: 0,
      totalTime: 0,
      errors: 0,
      createdAt: Date.now(),
      lastUsed: Date.now(),
    };

    // 监听Worker消息
    worker.onmessage = (e) => this.handleWorkerMessage(workerInfo, e);
    worker.onerror = (e) => this.handleWorkerError(workerInfo, e);

    this.workers.push(workerInfo);
    return workerInfo;
  }

  /**
   * 分配任务给Worker
   */
  private assignTask(worker: WorkerInfo, task: WorkerTask): void {
    worker.busy = true;
    worker.currentTask = task.id;
    worker.lastUsed = Date.now();

    const startTime = performance.now();

    // 发送任务到Worker
    worker.worker.postMessage({
      taskId: task.id,
      type: task.type,
      data: task.data,
    });

    // 保存开始时间用于性能监控
    (task as any).startTime = startTime;
  }

  /**
   * 处理Worker消息
   */
  private handleWorkerMessage(worker: WorkerInfo, event: MessageEvent): void {
    const { taskId, result, error } = event.data;
    const task = this.taskMap.get(taskId);

    if (!task) return;

    const endTime = performance.now();
    const taskTime = endTime - ((task as any).startTime || endTime);

    // 更新Worker状态
    worker.busy = false;
    worker.currentTask = null;
    worker.tasksCompleted++;
    worker.totalTime += taskTime;

    // 更新统计
    this.stats.totalTaskTime += taskTime;

    if (error) {
      this.handleTaskError(task, new Error(error));
    } else {
      this.stats.completedTasks++;
      this.taskMap.delete(taskId);
      task.resolve(result);
    }

    // 处理下一个任务
    this.processNextTask();
  }

  /**
   * 处理Worker错误
   */
  private handleWorkerError(worker: WorkerInfo, error: ErrorEvent): void {
    worker.errors++;

    const taskId = worker.currentTask;
    if (taskId) {
      const task = this.taskMap.get(taskId);
      if (task) {
        this.handleTaskError(task, new Error(error.message));
      }
    }

    // 重置Worker状态
    worker.busy = false;
    worker.currentTask = null;
  }

  /**
   * 处理任务错误
   */
  private handleTaskError(task: WorkerTask, error: Error): void {
    task.retries = (task.retries || 0) + 1;

    if (task.retries < this.config.maxRetries) {
      // 重试任务
      this.taskQueue.unshift(task);
      this.processNextTask();
    } else {
      // 达到最大重试次数，失败
      this.stats.failedTasks++;
      this.taskMap.delete(task.id);
      task.reject(error);
    }
  }

  /**
   * 处理任务超时
   */
  private handleTaskTimeout(task: WorkerTask): void {
    this.cancelTask(task.id);
    task.reject(new Error('Task timeout'));
  }

  /**
   * 移除Worker
   */
  private removeWorker(workerId: string): void {
    const index = this.workers.findIndex(w => w.id === workerId);
    if (index !== -1) {
      const worker = this.workers[index];
      worker.worker.terminate();
      this.workers.splice(index, 1);
    }
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = window.setInterval(() => {
      this.cleanupIdleWorkers();
    }, this.config.idleTimeout / 2);
  }

  /**
   * 清理空闲Worker
   */
  private cleanupIdleWorkers(): void {
    const now = Date.now();
    const idleWorkers = this.workers.filter(
      w => !w.busy && now - w.lastUsed > this.config.idleTimeout
    );

    idleWorkers.forEach(w => this.removeWorker(w.id));
  }

  /**
   * 获取统计信息
   */
  public getStats(): WorkerPoolStats {
    const busyWorkers = this.workers.filter(w => w.busy).length;
    const totalTasks = this.stats.completedTasks + this.stats.failedTasks;

    return {
      totalWorkers: this.workers.length,
      busyWorkers,
      idleWorkers: this.workers.length - busyWorkers,
      queuedTasks: this.taskQueue.length,
      completedTasks: this.stats.completedTasks,
      failedTasks: this.stats.failedTasks,
      averageTaskTime: totalTasks > 0 ? this.stats.totalTaskTime / totalTasks : 0,
      workerUtilization: this.workers.length > 0 ? busyWorkers / this.workers.length : 0,
    };
  }

  /**
   * 清空任务队列
   */
  public clearQueue(): void {
    this.taskQueue.forEach(task => {
      task.reject(new Error('Queue cleared'));
      this.taskMap.delete(task.id);
    });
    this.taskQueue = [];
  }

  /**
   * 销毁Worker池
   */
  public destroy(): void {
    // 停止清理定时器
    if (this.cleanupTimer !== null) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // 清空队列
    this.clearQueue();

    // 终止所有Worker
    this.workers.forEach(({ worker }) => worker.terminate());
    this.workers = [];
  }
}

/**
 * 全局Worker池实例
 */
let globalWorkerPool: WorkerPoolEnhanced | null = null;

/**
 * 获取全局Worker池
 */
export function getWorkerPool(): WorkerPoolEnhanced {
  if (!globalWorkerPool) {
    globalWorkerPool = new WorkerPoolEnhanced({
      maxWorkers: 4,
      taskTimeout: 30000,
      maxRetries: 3,
      idleTimeout: 60000,
      enableMonitoring: true,
    });
  }
  return globalWorkerPool;
}

/**
 * 销毁全局Worker池
 */
export function destroyWorkerPool(): void {
  if (globalWorkerPool) {
    globalWorkerPool.destroy();
    globalWorkerPool = null;
  }
}

// ==================== 便捷函数 ====================

/**
 * 在Worker中执行布局计算
 */
export async function computeLayoutInWorker(
  nodes: any[],
  connections: any[],
  layoutType: 'force' | 'hierarchical' | 'circular' | 'grid',
  abortSignal?: AbortSignal
): Promise<any[]> {
  const pool = getWorkerPool();
  return pool.execute('layout', { nodes, connections, layoutType }, 1, abortSignal);
}

/**
 * 在Worker中执行AI推荐计算
 */
export async function computeRecommendationsInWorker(
  state: any,
  caseData: any,
  abortSignal?: AbortSignal
): Promise<any[]> {
  const pool = getWorkerPool();
  return pool.execute('recommendations', { state, caseData }, 2, abortSignal);
}

/**
 * 在Worker中执行搜索
 */
export async function searchInWorker(
  nodes: any[],
  query: string,
  abortSignal?: AbortSignal
): Promise<any[]> {
  const pool = getWorkerPool();
  return pool.execute('search', { nodes, query }, 0, abortSignal);
}

/**
 * 在Worker中执行数据排序
 */
export async function sortDataInWorker<T = any>(
  data: T[],
  sortKey: string,
  sortOrder: 'asc' | 'desc' = 'asc',
  abortSignal?: AbortSignal
): Promise<T[]> {
  const pool = getWorkerPool();
  return pool.execute('sort', { data, sortKey, sortOrder }, 0, abortSignal);
}

/**
 * 在Worker中执行数据过滤
 */
export async function filterDataInWorker<T = any>(
  data: T[],
  filterFn: string, // 序列化的函数字符串
  abortSignal?: AbortSignal
): Promise<T[]> {
  const pool = getWorkerPool();
  return pool.execute('filter', { data, filterFn }, 0, abortSignal);
}

/**
 * 在Worker中执行数据聚合
 */
export async function aggregateDataInWorker<T = any, R = any>(
  data: T[],
  aggregateFn: string, // 序列化的函数字符串
  abortSignal?: AbortSignal
): Promise<R> {
  const pool = getWorkerPool();
  return pool.execute('aggregate', { data, aggregateFn }, 0, abortSignal);
}

/**
 * 在Worker中执行自定义计算
 */
export async function executeInWorker<T = any, R = any>(
  type: string,
  data: T,
  priority: number = 0,
  abortSignal?: AbortSignal
): Promise<R> {
  const pool = getWorkerPool();
  return pool.execute(type, data, priority, abortSignal);
}

