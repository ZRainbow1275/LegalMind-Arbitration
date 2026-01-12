/**
 * 性能优化工具函数测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  throttle,
  debounce,

  createBatchUpdater,
  getVisibleRange,
  measurePerformance,
  createLRUCache
} from './performance';

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应该限制函数执行频率', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    throttled();
    throttled();

    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);
    throttled();

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('应该传递正确的参数', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled('arg1', 'arg2');

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应该延迟执行函数', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('应该取消之前的调用', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced();
    debounced();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('createBatchUpdater', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应该批量处理更新', () => {
    const fn = vi.fn();
    const batchUpdate = createBatchUpdater(fn, 100);

    batchUpdate('item1');
    batchUpdate('item2');
    batchUpdate('item3');

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(['item1', 'item2', 'item3']);
  });
});

describe('getVisibleRange', () => {
  it('应该计算可见区域', () => {
    const items = Array.from({ length: 100 }, (_, i) => i);
    const result = getVisibleRange(items, 500, 600, 50, 3);

    expect(result.startIndex).toBeGreaterThanOrEqual(0);
    expect(result.endIndex).toBeLessThanOrEqual(items.length);
    expect(result.startIndex).toBeLessThan(result.endIndex);
  });

  it('应该包含overscan项目', () => {
    const items = Array.from({ length: 100 }, (_, i) => i);
    const overscan = 5;
    const result = getVisibleRange(items, 500, 600, 50, overscan);

    // 应该包含额外的overscan项目
    const visibleCount = Math.ceil(600 / 50);
    expect(result.endIndex - result.startIndex).toBeGreaterThan(visibleCount);
  });

  it('应该处理边界情况', () => {
    const items = Array.from({ length: 10 }, (_, i) => i);

    // 顶部边界
    const topResult = getVisibleRange(items, 0, 600, 50, 3);
    expect(topResult.startIndex).toBe(0);

    // 底部边界
    const bottomResult = getVisibleRange(items, 1000, 600, 50, 3);
    expect(bottomResult.endIndex).toBe(items.length);
  });
});

describe('measurePerformance', () => {
  it('应该测量函数执行时间', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    const fn = () => {
      let sum = 0;
      for (let i = 0; i < 1000; i++) {
        sum += i;
      }
      return sum;
    };

    const measured = measurePerformance('testFunction', fn);
    const result = measured();

    expect(result).toBe(499500);
    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleSpy.mock.calls[0][0]).toContain('testFunction');
    expect(consoleSpy.mock.calls[0][0]).toContain('ms');

    consoleSpy.mockRestore();
  });
});

describe('createLRUCache', () => {
  it('应该存储和获取值', () => {
    const cache = createLRUCache<string, number>(3);

    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
  });

  it('应该在超过最大大小时删除最旧的项', () => {
    const cache = createLRUCache<string, number>(3);

    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.set('d', 4); // 应该删除'a'

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
    expect(cache.get('d')).toBe(4);
  });

  it('应该更新最近使用的项', () => {
    const cache = createLRUCache<string, number>(3);

    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    cache.get('a'); // 'a'变为最近使用

    cache.set('d', 4); // 应该删除'b'而不是'a'

    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('c')).toBe(3);
    expect(cache.get('d')).toBe(4);
  });

  it('应该检查键是否存在', () => {
    const cache = createLRUCache<string, number>(3);

    cache.set('a', 1);

    expect(cache.has('a')).toBe(true);
    expect(cache.has('b')).toBe(false);
  });

  it('应该清空缓存', () => {
    const cache = createLRUCache<string, number>(3);

    cache.set('a', 1);
    cache.set('b', 2);

    expect(cache.size).toBe(2);

    cache.clear();

    expect(cache.size).toBe(0);
    expect(cache.get('a')).toBeUndefined();
  });
});

