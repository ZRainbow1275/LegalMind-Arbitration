/**
 * 网络优化工具
 * 
 * 提供网络请求优化的工具函数
 */

/**
 * 请求批处理器
 */
export class RequestBatcher<T = any, R = any> {
  private queue: Array<{
    data: T;
    resolve: (result: R) => void;
    reject: (error: Error) => void;
  }> = [];

  private timer: NodeJS.Timeout | null = null;
  private batchSize: number;
  private delay: number;
  private processor: (batch: T[]) => Promise<R[]>;

  constructor(
    processor: (batch: T[]) => Promise<R[]>,
    options: { batchSize?: number; delay?: number } = {}
  ) {
    this.processor = processor;
    this.batchSize = options.batchSize || 10;
    this.delay = options.delay || 100;
  }

  /**
   * 添加请求到批处理队列
   */
  public add(data: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({ data, resolve, reject });

      // 如果达到批处理大小，立即处理
      if (this.queue.length >= this.batchSize) {
        this.flush();
      } else if (!this.timer) {
        // 否则设置延迟处理
        this.timer = setTimeout(() => this.flush(), this.delay);
      }
    });
  }

  /**
   * 立即处理所有待处理的请求
   */
  public async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.batchSize);
    const dataArray = batch.map(item => item.data);

    try {
      const results = await this.processor(dataArray);

      batch.forEach((item, index) => {
        item.resolve(results[index]);
      });
    } catch (error) {
      batch.forEach(item => {
        item.reject(error as Error);
      });
    }

    // 如果还有剩余请求，继续处理
    if (this.queue.length > 0) {
      this.timer = setTimeout(() => this.flush(), this.delay);
    }
  }

  /**
   * 清空队列
   */
  public clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.queue.forEach(item => {
      item.reject(new Error('Request cancelled'));
    });

    this.queue = [];
  }
}

/**
 * 请求去重器
 */
export class RequestDeduplicator<T = any> {
  private pending = new Map<string, Promise<T>>();

  /**
   * 执行请求（自动去重）
   */
  public async execute(
    key: string,
    fetcher: () => Promise<T>
  ): Promise<T> {
    // 如果已有相同请求在进行中，返回该Promise
    if (this.pending.has(key)) {
      return this.pending.get(key)!;
    }

    // 创建新请求
    const promise = fetcher().finally(() => {
      this.pending.delete(key);
    });

    this.pending.set(key, promise);
    return promise;
  }

  /**
   * 取消所有待处理的请求
   */
  public clear(): void {
    this.pending.clear();
  }

  /**
   * 获取待处理请求数量
   */
  public getPendingCount(): number {
    return this.pending.size;
  }
}

/**
 * 请求重试器
 */
export class RequestRetrier {
  private maxRetries: number;
  private retryDelay: number;
  private backoffMultiplier: number;

  constructor(options: {
    maxRetries?: number;
    retryDelay?: number;
    backoffMultiplier?: number;
  } = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.backoffMultiplier = options.backoffMultiplier || 2;
  }

  /**
   * 执行请求（自动重试）
   */
  public async execute<T>(
    fetcher: () => Promise<T>,
    shouldRetry?: (error: Error) => boolean
  ): Promise<T> {
    let lastError: Error;
    let delay = this.retryDelay;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fetcher();
      } catch (error) {
        lastError = error as Error;

        // 检查是否应该重试
        if (shouldRetry && !shouldRetry(lastError)) {
          throw lastError;
        }

        // 如果还有重试次数，等待后重试
        if (attempt < this.maxRetries) {
          console.log(
            `[RequestRetrier] Retry attempt ${attempt + 1}/${this.maxRetries} after ${delay}ms`
          );
          
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= this.backoffMultiplier;
        }
      }
    }

    throw lastError!;
  }
}

/**
 * 数据压缩器
 */
export class DataCompressor {
  /**
   * 压缩JSON数据
   */
  public static compressJSON(data: any): string {
    const json = JSON.stringify(data);
    
    // 简单的压缩：移除空格和换行
    return json.replace(/\s+/g, '');
  }

  /**
   * 解压JSON数据
   */
  public static decompressJSON(compressed: string): any {
    return JSON.parse(compressed);
  }

  /**
   * 使用LZ压缩（需要额外库）
   */
  public static async compressLZ(data: string): Promise<string> {
    // 这里需要集成LZ压缩库
    // 暂时返回原数据
    return data;
  }

  /**
   * 使用LZ解压（需要额外库）
   */
  public static async decompressLZ(compressed: string): Promise<string> {
    // 这里需要集成LZ压缩库
    // 暂时返回原数据
    return compressed;
  }
}

/**
 * 预加载管理器
 */
export class PreloadManager {
  private preloaded = new Map<string, any>();
  private loading = new Set<string>();

  /**
   * 预加载资源
   */
  public async preload<T>(
    key: string,
    fetcher: () => Promise<T>
  ): Promise<void> {
    if (this.preloaded.has(key) || this.loading.has(key)) {
      return;
    }

    this.loading.add(key);

    try {
      const data = await fetcher();
      this.preloaded.set(key, data);
    } catch (error) {
      console.error(`[PreloadManager] Failed to preload ${key}:`, error);
    } finally {
      this.loading.delete(key);
    }
  }

  /**
   * 获取预加载的资源
   */
  public get<T>(key: string): T | null {
    return this.preloaded.get(key) || null;
  }

  /**
   * 检查是否已预加载
   */
  public has(key: string): boolean {
    return this.preloaded.has(key);
  }

  /**
   * 清空预加载缓存
   */
  public clear(): void {
    this.preloaded.clear();
    this.loading.clear();
  }

  /**
   * 批量预加载
   */
  public async preloadBatch(
    items: Array<{ key: string; fetcher: () => Promise<any> }>
  ): Promise<void> {
    await Promise.all(
      items.map(({ key, fetcher }) => this.preload(key, fetcher))
    );
  }
}

/**
 * 离线缓存管理器
 */
export class OfflineCacheManager {
  private dbName = 'legalmind-offline-cache';
  private storeName = 'requests';
  private db: IDBDatabase | null = null;

  /**
   * 初始化IndexedDB
   */
  public async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * 保存到离线缓存
   */
  public async set(key: string, data: any, ttl?: number): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const item = {
        key,
        data,
        timestamp: Date.now(),
        ttl,
      };

      const request = store.put(item);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * 从离线缓存获取
   */
  public async get<T>(key: string): Promise<T | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const item = request.result;

        if (!item) {
          resolve(null);
          return;
        }

        // 检查是否过期
        if (item.ttl && Date.now() - item.timestamp > item.ttl) {
          this.delete(key);
          resolve(null);
          return;
        }

        resolve(item.data);
      };
    });
  }

  /**
   * 删除离线缓存
   */
  public async delete(key: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * 清空离线缓存
   */
  public async clear(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

/**
 * 全局实例
 */
export const requestDeduplicator = new RequestDeduplicator();
export const requestRetrier = new RequestRetrier();
export const preloadManager = new PreloadManager();
export const offlineCacheManager = new OfflineCacheManager();

