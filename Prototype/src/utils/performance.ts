/**
 * 性能优化工具函数
 * 
 * 提供节流、防抖、虚拟化等性能优化工具
 */

// ==================== 节流函数 ====================

/**
 * 节流函数 - 限制函数执行频率
 * 
 * @param func 要节流的函数
 * @param delay 延迟时间（毫秒）
 * @returns 节流后的函数
 * 
 * @example
 * const handleScroll = throttle(() => {
 *   console.log('Scrolling...');
 * }, 100);
 * 
 * window.addEventListener('scroll', handleScroll);
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= delay) {
      // 立即执行
      lastCall = now;
      func.apply(this, args);
    } else {
      // 延迟执行
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        func.apply(this, args);
      }, delay - timeSinceLastCall);
    }
  };
}

// ==================== 防抖函数 ====================

/**
 * 防抖函数 - 延迟执行函数，直到停止调用一段时间后才执行
 * 
 * @param func 要防抖的函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的函数
 * 
 * @example
 * const handleSearch = debounce((query: string) => {
 *   console.log('Searching for:', query);
 * }, 300);
 * 
 * input.addEventListener('input', (e) => handleSearch(e.target.value));
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return function (this: any, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

// ==================== RAF节流 ====================

/**
 * requestAnimationFrame节流 - 使用RAF限制函数执行频率
 * 
 * 适用于动画、滚动等需要高性能的场景
 * 
 * @param func 要节流的函数
 * @returns 节流后的函数
 * 
 * @example
 * const handleMouseMove = rafThrottle((e: MouseEvent) => {
 *   console.log('Mouse position:', e.clientX, e.clientY);
 * });
 * 
 * canvas.addEventListener('mousemove', handleMouseMove);
 */
export function rafThrottle<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;
  let lastArgs: Parameters<T> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    lastArgs = args;

    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        if (lastArgs) {
          func.apply(this, lastArgs);
        }
        rafId = null;
        lastArgs = null;
      });
    }
  };
}

// ==================== 批量更新 ====================

/**
 * 批量更新 - 将多个更新合并为一次执行
 * 
 * @param func 要批量执行的函数
 * @param delay 延迟时间（毫秒）
 * @returns 批量更新函数
 * 
 * @example
 * const batchUpdate = createBatchUpdater((items: string[]) => {
 *   console.log('Updating items:', items);
 * }, 100);
 * 
 * batchUpdate('item1');
 * batchUpdate('item2');
 * batchUpdate('item3');
 * // 只会执行一次，参数为 ['item1', 'item2', 'item3']
 */
export function createBatchUpdater<T>(
  func: (items: T[]) => void,
  delay: number = 100
): (item: T) => void {
  let items: T[] = [];
  let timeoutId: NodeJS.Timeout | null = null;

  return function (item: T) {
    items.push(item);

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(items);
      items = [];
      timeoutId = null;
    }, delay);
  };
}

// ==================== 虚拟化辅助函数 ====================

/**
 * 计算可见区域内的项目
 * 
 * @param items 所有项目
 * @param scrollTop 滚动位置
 * @param containerHeight 容器高度
 * @param itemHeight 项目高度
 * @param overscan 额外渲染的项目数量（上下各overscan个）
 * @returns 可见项目的索引范围
 * 
 * @example
 * const { startIndex, endIndex, offsetY } = getVisibleRange(
 *   items,
 *   scrollTop,
 *   600,
 *   50,
 *   5
 * );
 * 
 * const visibleItems = items.slice(startIndex, endIndex);
 */
export function getVisibleRange(
  items: any[],
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  overscan: number = 3
): {
  startIndex: number;
  endIndex: number;
  offsetY: number;
} {
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );
  const offsetY = startIndex * itemHeight;

  return { startIndex, endIndex, offsetY };
}

// ==================== 性能监控 ====================

/**
 * 性能监控装饰器
 * 
 * @param name 函数名称
 * @param func 要监控的函数
 * @returns 包装后的函数
 * 
 * @example
 * const expensiveFunction = measurePerformance('expensiveFunction', () => {
 *   // 耗时操作
 * });
 */
export function measurePerformance<T extends (...args: any[]) => any>(
  name: string,
  func: T
): T {
  return function (this: any, ...args: Parameters<T>): ReturnType<T> {
    const startTime = performance.now();
    const result = func.apply(this, args);
    const endTime = performance.now();

    console.log(`[Performance] ${name} took ${(endTime - startTime).toFixed(2)}ms`);

    return result;
  } as T;
}

/**
 * 异步性能监控
 * 
 * @param name 函数名称
 * @param func 要监控的异步函数
 * @returns 包装后的异步函数
 */
export function measurePerformanceAsync<T extends (...args: any[]) => Promise<any>>(
  name: string,
  func: T
): T {
  return async function (this: any, ...args: Parameters<T>): Promise<ReturnType<T>> {
    const startTime = performance.now();
    const result = await func.apply(this, args);
    const endTime = performance.now();

    console.log(`[Performance] ${name} took ${(endTime - startTime).toFixed(2)}ms`);

    return result;
  } as T;
}

// ==================== 内存优化 ====================

/**
 * 创建LRU缓存
 * 
 * @param maxSize 最大缓存数量
 * @returns LRU缓存实例
 * 
 * @example
 * const cache = createLRUCache<string, any>(100);
 * cache.set('key1', { data: 'value1' });
 * const value = cache.get('key1');
 */
export function createLRUCache<K, V>(maxSize: number) {
  const cache = new Map<K, V>();

  return {
    get(key: K): V | undefined {
      if (!cache.has(key)) return undefined;

      // 移到最后（最近使用）
      const value = cache.get(key)!;
      cache.delete(key);
      cache.set(key, value);

      return value;
    },

    set(key: K, value: V): void {
      // 如果已存在，先删除
      if (cache.has(key)) {
        cache.delete(key);
      }

      // 添加到最后
      cache.set(key, value);

      // 如果超过最大大小，删除最旧的（第一个）
      if (cache.size > maxSize) {
        const firstKey = cache.keys().next().value;
        if (firstKey !== undefined) {
          cache.delete(firstKey);
        }
      }
    },

    has(key: K): boolean {
      return cache.has(key);
    },

    clear(): void {
      cache.clear();
    },

    get size(): number {
      return cache.size;
    }
  };
}

