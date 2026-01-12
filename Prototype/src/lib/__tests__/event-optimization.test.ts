/**
 * 事件优化模块单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  throttle,
  debounce,
  EventDelegator,
  addOptimizedEventListener,
  createThrottledHandler,
  createDebouncedHandler
} from '../event-optimization';

describe('EventOptimization', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== 节流函数测试 ====================

  describe('throttle', () => {
    it('应该限制函数执行频率', () => {
      const func = vi.fn();
      const throttled = throttle(func, 100);

      // 快速调用多次
      throttled();
      throttled();
      throttled();

      // 应该只执行一次（leading）
      expect(func).toHaveBeenCalledTimes(1);

      // 等待100ms后再调用
      vi.advanceTimersByTime(100);
      throttled();

      expect(func).toHaveBeenCalledTimes(2);
    });

    it('应该支持leading选项', () => {
      const func = vi.fn();
      const throttled = throttle(func, 100, { leading: false });

      throttled();
      expect(func).toHaveBeenCalledTimes(0);

      vi.advanceTimersByTime(100);
      expect(func).toHaveBeenCalledTimes(1);
    });

    it('应该支持trailing选项', () => {
      const func = vi.fn();
      const throttled = throttle(func, 100, { trailing: false });

      throttled();
      throttled();
      throttled();

      expect(func).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      expect(func).toHaveBeenCalledTimes(1); // trailing=false，不会再次执行
    });

    it('应该支持取消', () => {
      const func = vi.fn();
      const throttled = throttle(func, 100);

      throttled();
      throttled();
      throttled.cancel();

      vi.advanceTimersByTime(100);
      expect(func).toHaveBeenCalledTimes(1); // 只有第一次调用
    });

    it('应该传递正确的参数', () => {
      const func = vi.fn();
      const throttled = throttle(func, 100);

      throttled('arg1', 'arg2');
      expect(func).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });

  // ==================== 防抖函数测试 ====================

  describe('debounce', () => {
    it('应该延迟执行函数', () => {
      const func = vi.fn();
      const debounced = debounce(func, 100);

      debounced();
      expect(func).toHaveBeenCalledTimes(0);

      vi.advanceTimersByTime(100);
      expect(func).toHaveBeenCalledTimes(1);
    });

    it('应该在连续调用时重新计时', () => {
      const func = vi.fn();
      const debounced = debounce(func, 100);

      debounced();
      vi.advanceTimersByTime(50);
      debounced();
      vi.advanceTimersByTime(50);
      debounced();

      expect(func).toHaveBeenCalledTimes(0);

      vi.advanceTimersByTime(100);
      expect(func).toHaveBeenCalledTimes(1);
    });

    it('应该支持leading选项', () => {
      const func = vi.fn();
      const debounced = debounce(func, 100, { leading: true });

      debounced();
      expect(func).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      expect(func).toHaveBeenCalledTimes(1);
    });

    it('应该支持maxWait选项', () => {
      const func = vi.fn();
      const debounced = debounce(func, 100, { maxWait: 200 });

      debounced();
      vi.advanceTimersByTime(50);
      debounced();
      vi.advanceTimersByTime(50);
      debounced();
      vi.advanceTimersByTime(50);
      debounced();
      vi.advanceTimersByTime(50);

      // 达到maxWait，应该执行
      expect(func).toHaveBeenCalledTimes(1);
    });

    it('应该支持取消', () => {
      const func = vi.fn();
      const debounced = debounce(func, 100);

      debounced();
      debounced.cancel();

      vi.advanceTimersByTime(100);
      expect(func).toHaveBeenCalledTimes(0);
    });

    it('应该支持立即执行', () => {
      const func = vi.fn();
      const debounced = debounce(func, 100);

      debounced();
      debounced.flush();

      expect(func).toHaveBeenCalledTimes(1);
    });

    it('应该传递正确的参数', () => {
      const func = vi.fn();
      const debounced = debounce(func, 100);

      debounced('arg1', 'arg2');
      vi.advanceTimersByTime(100);

      expect(func).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });

  // ==================== 事件委托测试 ====================

  describe('EventDelegator', () => {
    let container: HTMLDivElement;
    let delegator: EventDelegator;

    beforeEach(() => {
      container = document.createElement('div');
      container.innerHTML = `
        <button class="btn" data-id="1">Button 1</button>
        <button class="btn" data-id="2">Button 2</button>
        <div class="wrapper">
          <button class="btn" data-id="3">Button 3</button>
        </div>
      `;
      document.body.appendChild(container);
      delegator = new EventDelegator();
    });

    afterEach(() => {
      document.body.removeChild(container);
      delegator.clear();
    });

    it('应该委托事件到子元素', () => {
      const handler = vi.fn();
      delegator.on(container, 'click', '.btn', handler);

      const button = container.querySelector('.btn') as HTMLButtonElement;
      button.click();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('应该支持嵌套元素', () => {
      const handler = vi.fn();
      delegator.on(container, 'click', '.btn', handler);

      const button = container.querySelector('.wrapper .btn') as HTMLButtonElement;
      button.click();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('应该返回移除函数', () => {
      const handler = vi.fn();
      const remove = delegator.on(container, 'click', '.btn', handler);

      const button = container.querySelector('.btn') as HTMLButtonElement;
      button.click();
      expect(handler).toHaveBeenCalledTimes(1);

      remove();
      button.click();
      expect(handler).toHaveBeenCalledTimes(1); // 不再增加
    });

    it('应该支持节流选项', () => {
      const handler = vi.fn();
      delegator.on(container, 'click', '.btn', handler, { throttle: 100 });

      const button = container.querySelector('.btn') as HTMLButtonElement;
      button.click();
      button.click();
      button.click();

      expect(handler).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      button.click();
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('应该支持防抖选项', () => {
      const handler = vi.fn();
      delegator.on(container, 'click', '.btn', handler, { debounce: 100 });

      const button = container.querySelector('.btn') as HTMLButtonElement;
      button.click();
      button.click();
      button.click();

      expect(handler).toHaveBeenCalledTimes(0);

      vi.advanceTimersByTime(100);
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== 优化的事件监听器测试 ====================

  describe('addOptimizedEventListener', () => {
    let element: HTMLDivElement;

    beforeEach(() => {
      element = document.createElement('div');
      document.body.appendChild(element);
    });

    afterEach(() => {
      document.body.removeChild(element);
    });

    it('应该添加事件监听器', () => {
      const handler = vi.fn();
      const remove = addOptimizedEventListener(element, 'click', handler);

      element.click();
      expect(handler).toHaveBeenCalledTimes(1);

      remove();
      element.click();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('应该支持节流选项', () => {
      const handler = vi.fn();
      addOptimizedEventListener(element, 'click', handler, { throttle: 100 });

      element.click();
      element.click();
      element.click();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('应该支持防抖选项', () => {
      const handler = vi.fn();
      addOptimizedEventListener(element, 'click', handler, { debounce: 100 });

      element.click();
      element.click();
      element.click();

      expect(handler).toHaveBeenCalledTimes(0);

      vi.advanceTimersByTime(100);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('应该对滚动事件默认使用被动监听', () => {
      const handler = vi.fn();
      const addEventListenerSpy = vi.spyOn(element, 'addEventListener');

      addOptimizedEventListener(element, 'scroll', handler);

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'scroll',
        expect.any(Function),
        expect.objectContaining({ passive: true })
      );
    });
  });

  // ==================== 便捷函数测试 ====================

  describe('createThrottledHandler', () => {
    it('应该创建节流处理函数', () => {
      const handler = vi.fn();
      const throttled = createThrottledHandler(handler, 100);

      throttled(new Event('click'));
      throttled(new Event('click'));
      throttled(new Event('click'));

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('createDebouncedHandler', () => {
    it('应该创建防抖处理函数', () => {
      const handler = vi.fn();
      const debounced = createDebouncedHandler(handler, 100);

      debounced(new Event('click'));
      debounced(new Event('click'));
      debounced(new Event('click'));

      expect(handler).toHaveBeenCalledTimes(0);

      vi.advanceTimersByTime(100);
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});

