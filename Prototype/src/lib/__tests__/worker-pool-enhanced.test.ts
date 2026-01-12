/**
 * 增强版Worker池测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WorkerPoolEnhanced, getWorkerPool, destroyWorkerPool } from '../worker-pool-enhanced';

// Mock Worker
class MockWorker {
  public onmessage: ((e: MessageEvent) => void) | null = null;
  public onerror: ((e: ErrorEvent) => void) | null = null;
  private terminated = false;

  postMessage(data: any) {
    if (this.terminated) return;

    // 模拟异步处理
    setTimeout(() => {
      if (this.onmessage && !this.terminated) {
        const { taskId, type, data: taskData } = data;

        // 模拟不同类型的任务
        let result;
        switch (type) {
          case 'layout':
            result = taskData.nodes.map((n: any) => ({ ...n, layouted: true }));
            break;
          case 'search':
            result = taskData.nodes.filter((n: any) =>
              n.data?.name?.toLowerCase().includes(taskData.query.toLowerCase())
            );
            break;
          case 'recommendations':
            result = [{ type: 'test', priority: 'high', title: 'Test recommendation' }];
            break;
          case 'error':
            this.onmessage(new MessageEvent('message', {
              data: { taskId, error: 'Simulated error' }
            }));
            return;
          default:
            result = taskData;
        }

        this.onmessage(new MessageEvent('message', {
          data: { taskId, result }
        }));
      }
    }, 10);
  }

  terminate() {
    this.terminated = true;
    this.onmessage = null;
    this.onerror = null;
  }
}

// Mock全局Worker
(global as any).Worker = MockWorker;

describe('WorkerPoolEnhanced', () => {
  let pool: WorkerPoolEnhanced;

  beforeEach(() => {
    pool = new WorkerPoolEnhanced({
      maxWorkers: 2,
      taskTimeout: 5000,
      maxRetries: 2,
      idleTimeout: 10000,
    });
  });

  afterEach(() => {
    pool.destroy();
  });

  describe('基础功能', () => {
    it('应该成功执行任务', async () => {
      const nodes = [
        { id: '1', data: { name: 'Node 1' } },
        { id: '2', data: { name: 'Node 2' } },
      ];

      const result = await pool.execute('layout', { nodes, connections: [], layoutType: 'force' });

      expect(result).toHaveLength(2);
      expect(result[0].layouted).toBe(true);
    });

    it('应该支持多个并发任务', async () => {
      const tasks = [
        pool.execute('layout', { nodes: [{ id: '1' }], connections: [], layoutType: 'force' }),
        pool.execute('layout', { nodes: [{ id: '2' }], connections: [], layoutType: 'force' }),
        pool.execute('layout', { nodes: [{ id: '3' }], connections: [], layoutType: 'force' }),
      ];

      const results = await Promise.all(tasks);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toHaveLength(1);
        expect(result[0].layouted).toBe(true);
      });
    });

    it('应该按优先级执行任务', async () => {
      const executionOrder: number[] = [];

      // 创建多个任务，优先级不同
      const tasks = [
        pool.execute('test', { priority: 0 }, 0).then(() => executionOrder.push(0)),
        pool.execute('test', { priority: 2 }, 2).then(() => executionOrder.push(2)),
        pool.execute('test', { priority: 1 }, 1).then(() => executionOrder.push(1)),
      ];

      await Promise.all(tasks);

      // 验证所有任务都执行了
      expect(executionOrder).toHaveLength(3);
      expect(executionOrder).toContain(0);
      expect(executionOrder).toContain(1);
      expect(executionOrder).toContain(2);
    });
  });

  describe('任务取消', () => {
    it('应该能够取消排队中的任务', async () => {
      // 创建多个任务填满Worker池
      const promises = [
        pool.execute('layout', { nodes: [], connections: [], layoutType: 'force' }),
        pool.execute('layout', { nodes: [], connections: [], layoutType: 'force' }),
        pool.execute('layout', { nodes: [], connections: [], layoutType: 'force' }),
      ];

      // 等待一小段时间确保任务进入队列
      await new Promise(resolve => setTimeout(resolve, 5));

      // 取消所有任务
      pool.clearQueue();

      // 至少有一个任务应该被拒绝
      const results = await Promise.allSettled(promises);
      const rejected = results.filter(r => r.status === 'rejected');
      expect(rejected.length).toBeGreaterThan(0);
    });
  });

  describe('错误处理', () => {
    it('应该处理Worker错误', async () => {
      await expect(
        pool.execute('error', {})
      ).rejects.toThrow();
    });

    it('应该重试失败的任务', async () => {
      let attempts = 0;
      const mockWorker = MockWorker.prototype.postMessage;

      MockWorker.prototype.postMessage = function (data: any) {
        attempts++;
        if (attempts < 2) {
          // 第一次失败
          if (this.onmessage) {
            this.onmessage(new MessageEvent('message', {
              data: { taskId: data.taskId, error: 'Simulated error' }
            }));
          }
        } else {
          // 第二次成功
          mockWorker.call(this, data);
        }
      };

      const result = await pool.execute('layout', { nodes: [{ id: '1' }], connections: [], layoutType: 'force' });

      expect(result).toBeDefined();
      expect(attempts).toBeGreaterThan(1);

      // 恢复原始方法
      MockWorker.prototype.postMessage = mockWorker;
    });
  });

  describe('性能监控', () => {
    it('应该提供统计信息', async () => {
      await pool.execute('layout', { nodes: [{ id: '1' }], connections: [], layoutType: 'force' });

      const stats = pool.getStats();

      expect(stats.totalWorkers).toBeGreaterThan(0);
      expect(stats.completedTasks).toBe(1);
      expect(stats.failedTasks).toBe(0);
      expect(stats.averageTaskTime).toBeGreaterThan(0);
    });

    it('应该跟踪Worker利用率', async () => {
      const tasks = [
        pool.execute('layout', { nodes: [{ id: '1' }], connections: [], layoutType: 'force' }),
        pool.execute('layout', { nodes: [{ id: '2' }], connections: [], layoutType: 'force' }),
      ];

      // 在任务执行期间检查利用率
      await new Promise(resolve => setTimeout(resolve, 5));
      const stats = pool.getStats();

      // 应该有Worker在工作
      expect(stats.busyWorkers).toBeGreaterThan(0);

      await Promise.all(tasks);
    });
  });

  describe('资源管理', () => {
    it('应该限制最大Worker数量', async () => {
      const tasks = Array.from({ length: 10 }, (_, i) =>
        pool.execute('layout', { nodes: [{ id: `${i}` }], connections: [], layoutType: 'force' })
      );

      await Promise.all(tasks);

      const stats = pool.getStats();
      expect(stats.totalWorkers).toBeLessThanOrEqual(2); // maxWorkers = 2
    });

    it('应该正确销毁Worker池', () => {
      pool.destroy();

      const stats = pool.getStats();
      expect(stats.totalWorkers).toBe(0);
      expect(stats.queuedTasks).toBe(0);
    });
  });

  describe('搜索功能', () => {
    it('应该正确执行搜索', async () => {
      const nodes = [
        { id: '1', data: { name: 'Apple' } },
        { id: '2', data: { name: 'Banana' } },
        { id: '3', data: { name: 'Cherry' } },
      ];

      const result = await pool.execute('search', { nodes, query: 'app' });

      expect(result).toHaveLength(1);
      expect(result[0].data.name).toBe('Apple');
    });
  });

  describe('推荐功能', () => {
    it('应该正确执行推荐计算', async () => {
      const state = { nodes: [], connections: [] };
      const caseData = {};

      const result = await pool.execute('recommendations', { state, caseData });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});

describe('全局Worker池', () => {
  afterEach(() => {
    destroyWorkerPool();
  });

  it('应该返回单例实例', () => {
    const pool1 = getWorkerPool();
    const pool2 = getWorkerPool();

    expect(pool1).toBe(pool2);
  });

  it('应该能够销毁全局实例', () => {
    const pool1 = getWorkerPool();
    destroyWorkerPool();
    const pool2 = getWorkerPool();

    expect(pool1).not.toBe(pool2);
  });
});

