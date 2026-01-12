/**
 * Web Worker池管理
 * 
 * 用于在后台线程中执行重计算任务，避免阻塞主线程
 */

/**
 * Worker任务
 */
interface WorkerTask<T = any, R = any> {
  id: string;
  type: string;
  data: T;
  resolve: (result: R) => void;
  reject: (error: Error) => void;
  priority: number;
  createdAt: number;
}

/**
 * Worker实例
 */
interface WorkerInstance {
  worker: Worker;
  busy: boolean;
  taskCount: number;
}

/**
 * Worker池配置
 */
interface WorkerPoolConfig {
  maxWorkers: number;
  workerScript: string;
  taskTimeout: number;
}

/**
 * Worker池管理器
 */
export class WorkerPool {
  private workers: WorkerInstance[] = [];
  private taskQueue: WorkerTask[] = [];
  private config: WorkerPoolConfig;
  private taskMap: Map<string, WorkerTask> = new Map();

  constructor(config: Partial<WorkerPoolConfig> = {}) {
    this.config = {
      maxWorkers: config.maxWorkers || navigator.hardwareConcurrency || 4,
      workerScript: config.workerScript || '/workers/compute-worker.js',
      taskTimeout: config.taskTimeout || 30000, // 30秒
    };

    this.initializeWorkers();
  }

  /**
   * 初始化Worker池
   */
  private initializeWorkers(): void {
    for (let i = 0; i < this.config.maxWorkers; i++) {
      try {
        const worker = new Worker(this.config.workerScript);

        worker.onmessage = (e) => this.handleWorkerMessage(i, e);
        worker.onerror = (e) => this.handleWorkerError(i, e);

        this.workers.push({
          worker,
          busy: false,
          taskCount: 0,
        });
      } catch (error) {
        console.error(`[WorkerPool] Failed to create worker ${i}:`, error);
      }
    }

    console.log(`[WorkerPool] Initialized with ${this.workers.length} workers`);
  }

  /**
   * 处理Worker消息
   */
  private handleWorkerMessage(workerIndex: number, event: MessageEvent): void {
    const { taskId, result, error } = event.data;
    const task = this.taskMap.get(taskId);

    if (!task) {
      console.warn(`[WorkerPool] Task ${taskId} not found`);
      return;
    }

    // 标记Worker为空闲
    this.workers[workerIndex].busy = false;

    // 移除任务
    this.taskMap.delete(taskId);

    // 解决或拒绝Promise
    if (error) {
      task.reject(new Error(error));
    } else {
      task.resolve(result);
    }

    // 处理下一个任务
    this.processNextTask();
  }

  /**
   * 处理Worker错误
   */
  private handleWorkerError(workerIndex: number, error: ErrorEvent): void {
    console.error(`[WorkerPool] Worker ${workerIndex} error:`, error);

    // 标记Worker为空闲
    this.workers[workerIndex].busy = false;

    // 处理下一个任务
    this.processNextTask();
  }

  /**
   * 执行任务
   */
  public execute<T = any, R = any>(
    type: string,
    data: T,
    priority: number = 0
  ): Promise<R> {
    return new Promise((resolve, reject) => {
      const task: WorkerTask<T, R> = {
        id: `task-${Date.now()}-${Math.random()}`,
        type,
        data,
        resolve,
        reject,
        priority,
        createdAt: Date.now(),
      };

      // 添加到任务队列
      this.taskQueue.push(task);
      this.taskMap.set(task.id, task);

      // 按优先级排序
      this.taskQueue.sort((a, b) => b.priority - a.priority);

      // 设置超时
      setTimeout(() => {
        if (this.taskMap.has(task.id)) {
          this.taskMap.delete(task.id);
          reject(new Error('Task timeout'));
        }
      }, this.config.taskTimeout);

      // 尝试处理任务
      this.processNextTask();
    });
  }

  /**
   * 处理下一个任务
   */
  private processNextTask(): void {
    // 查找空闲Worker
    const availableWorker = this.workers.find(w => !w.busy);

    if (!availableWorker || this.taskQueue.length === 0) {
      return;
    }

    // 获取下一个任务
    const task = this.taskQueue.shift();
    if (!task) return;

    // 标记Worker为忙碌
    availableWorker.busy = true;
    availableWorker.taskCount++;

    // 发送任务到Worker
    availableWorker.worker.postMessage({
      taskId: task.id,
      type: task.type,
      data: task.data,
    });
  }

  /**
   * 获取池状态
   */
  public getStatus(): {
    totalWorkers: number;
    busyWorkers: number;
    queuedTasks: number;
    activeTasks: number;
  } {
    return {
      totalWorkers: this.workers.length,
      busyWorkers: this.workers.filter(w => w.busy).length,
      queuedTasks: this.taskQueue.length,
      activeTasks: this.taskMap.size,
    };
  }

  /**
   * 清空任务队列
   */
  public clearQueue(): void {
    this.taskQueue.forEach(task => {
      task.reject(new Error('Task cancelled'));
      this.taskMap.delete(task.id);
    });

    this.taskQueue = [];
  }

  /**
   * 销毁Worker池
   */
  public destroy(): void {
    this.clearQueue();

    this.workers.forEach(({ worker }) => {
      worker.terminate();
    });

    this.workers = [];
    console.log('[WorkerPool] Destroyed');
  }
}

/**
 * 全局Worker池实例
 */
export const workerPool = new WorkerPool();

/**
 * 在Worker中执行布局计算
 */
export async function computeLayoutInWorker(
  nodes: any[],
  connections: any[],
  layoutType: string
): Promise<any[]> {
  return workerPool.execute('layout', { nodes, connections, layoutType }, 1);
}

/**
 * 在Worker中执行AI推荐
 */
export async function computeRecommendationsInWorker(
  state: any,
  caseData: any
): Promise<any[]> {
  return workerPool.execute('recommendations', { state, caseData }, 2);
}

/**
 * 在Worker中执行搜索
 */
export async function searchInWorker(
  nodes: any[],
  query: string
): Promise<any[]> {
  return workerPool.execute('search', { nodes, query }, 0);
}

/**
 * 在Worker中执行数据处理
 */
export async function processDataInWorker<T = any, R = any>(
  type: string,
  data: T
): Promise<R> {
  return workerPool.execute(type, data, 0);
}

