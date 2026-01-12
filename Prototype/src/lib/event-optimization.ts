/**
 * 事件处理优化模块
 * 
 * 功能：
 * 1. 事件节流（Throttle）
 * 2. 事件防抖（Debounce）
 * 3. 事件委托（Event Delegation）
 * 4. 被动事件监听器（Passive Event Listeners）
 * 5. 事件池（Event Pool）
 */

// ==================== 类型定义 ====================

export type ThrottleOptions = {
  leading?: boolean;  // 是否在开始时立即执行
  trailing?: boolean; // 是否在结束时执行
};

export type DebounceOptions = {
  leading?: boolean;  // 是否在开始时立即执行
  maxWait?: number;   // 最大等待时间
};

export type EventListenerOptions = AddEventListenerOptions & {
  throttle?: number;  // 节流间隔（毫秒）
  debounce?: number;  // 防抖延迟（毫秒）
};

// ==================== 节流函数 ====================

/**
 * 节流函数 - 限制函数在指定时间内只执行一次
 * 适用场景：滚动、鼠标移动、窗口调整大小等高频事件
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: ThrottleOptions = {}
): T & { cancel: () => void } {
  const { leading = true, trailing = true } = options;

  let timeout: ReturnType<typeof setTimeout> | null = null;
  let previous = 0;
  let lastArgs: any[] | null = null;
  let lastThis: any = null;

  const later = () => {
    previous = leading === false ? 0 : Date.now();
    timeout = null;
    if (lastArgs) {
      func.apply(lastThis, lastArgs);
      lastArgs = lastThis = null;
    }
  };

  const throttled = function (this: any, ...args: any[]) {
    const now = Date.now();

    if (!previous && leading === false) {
      previous = now;
    }

    const remaining = wait - (now - previous);
    lastThis = this; // eslint-disable-line @typescript-eslint/no-this-alias
    lastArgs = args;

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(this, args);
      lastArgs = lastThis = null;
    } else if (!timeout && trailing !== false) {
      timeout = setTimeout(later, remaining);
    }
  } as T & { cancel: () => void };

  throttled.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
    }
    previous = 0;
    timeout = lastArgs = lastThis = null;
  };

  return throttled;
}

// ==================== 防抖函数 ====================

/**
 * 防抖函数 - 延迟执行函数，如果在延迟期间再次调用则重新计时
 * 适用场景：搜索输入、表单验证、窗口调整大小后的处理等
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: DebounceOptions = {}
): T & { cancel: () => void; flush: () => void } {
  const { leading = false, maxWait } = options;

  let timeout: ReturnType<typeof setTimeout> | null = null;
  let maxTimeout: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: any[] | null = null;
  let lastThis: any = null;
  let lastCallTime = 0;
  let lastInvokeTime = 0;

  const invokeFunc = (time: number) => {
    const args = lastArgs;
    const thisArg = lastThis;

    lastArgs = lastThis = null;
    lastInvokeTime = time;
    return func.apply(thisArg, args || []);
  };

  const leadingEdge = (time: number) => {
    lastInvokeTime = time;
    timeout = setTimeout(timerExpired, wait);
    return leading ? invokeFunc(time) : undefined;
  };

  const remainingWait = (time: number) => {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = wait - timeSinceLastCall;

    return maxWait !== undefined
      ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
      : timeWaiting;
  };

  const shouldInvoke = (time: number) => {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;

    return (
      lastCallTime === 0 ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    );
  };

  const timerExpired = () => {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    timeout = setTimeout(timerExpired, remainingWait(time));
  };

  const trailingEdge = (time: number) => {
    timeout = null;

    if (lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = lastThis = null;
    return undefined;
  };

  const debounced = function (this: any, ...args: any[]) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this; // eslint-disable-line @typescript-eslint/no-this-alias
    lastCallTime = time;

    if (isInvoking) {
      if (timeout === null) {
        return leadingEdge(lastCallTime);
      }
      if (maxWait !== undefined) {
        timeout = setTimeout(timerExpired, wait);
        return invokeFunc(lastCallTime);
      }
    }
    if (timeout === null) {
      timeout = setTimeout(timerExpired, wait);
    }
  } as T & { cancel: () => void; flush: () => void };

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
    }
    if (maxTimeout) {
      clearTimeout(maxTimeout);
    }
    lastInvokeTime = 0;
    lastArgs = lastThis = timeout = maxTimeout = null;
  };

  debounced.flush = () => {
    if (timeout === null) {
      return undefined;
    }
    return trailingEdge(Date.now());
  };

  return debounced;
}

// ==================== 事件委托 ====================

/**
 * 事件委托管理器
 * 在父元素上监听事件，通过事件冒泡处理子元素的事件
 */
export class EventDelegator {
  private listeners = new Map<string, Map<string, EventListener>>();

  /**
   * 添加委托事件监听器
   * @param container 容器元素
   * @param eventType 事件类型
   * @param selector CSS选择器
   * @param handler 事件处理函数
   * @param options 事件选项
   */
  on(
    container: HTMLElement,
    eventType: string,
    selector: string,
    handler: EventListener,
    options?: EventListenerOptions
  ): () => void {
    const key = `${eventType}:${selector}`;

    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Map());
    }

    const eventListeners = this.listeners.get(eventType)!;

    // 创建委托处理函数
    const delegatedHandler: EventListener = (event) => {
      const target = event.target as HTMLElement;
      const matchedElement = target.closest(selector);

      if (matchedElement && container.contains(matchedElement)) {
        // 修改event.currentTarget指向匹配的元素
        Object.defineProperty(event, 'currentTarget', {
          value: matchedElement,
          configurable: true
        });
        handler.call(matchedElement, event);
      }
    };

    // 应用节流或防抖
    let finalHandler = delegatedHandler;
    if (options?.throttle) {
      finalHandler = throttle(delegatedHandler, options.throttle);
    } else if (options?.debounce) {
      finalHandler = debounce(delegatedHandler, options.debounce);
    }

    // 添加事件监听器
    const listenerOptions: AddEventListenerOptions = {
      capture: options?.capture,
      passive: options?.passive,
      once: options?.once
    };

    container.addEventListener(eventType, finalHandler, listenerOptions);
    eventListeners.set(key, finalHandler);

    // 返回移除函数
    return () => {
      container.removeEventListener(eventType, finalHandler, listenerOptions);
      eventListeners.delete(key);
      if (eventListeners.size === 0) {
        this.listeners.delete(eventType);
      }
    };
  }

  /**
   * 移除所有委托事件监听器
   */
  clear() {
    this.listeners.clear();
  }
}

// ==================== 优化的事件监听器 ====================

/**
 * 添加优化的事件监听器
 * 自动应用节流、防抖和被动监听
 */
export function addOptimizedEventListener(
  target: EventTarget,
  eventType: string,
  handler: EventListener,
  options?: EventListenerOptions
): () => void {
  let finalHandler = handler;

  // 应用节流或防抖
  if (options?.throttle) {
    finalHandler = throttle(handler, options.throttle);
  } else if (options?.debounce) {
    finalHandler = debounce(handler, options.debounce);
  }

  // 对于某些事件类型，默认使用被动监听器
  const passiveEvents = ['scroll', 'wheel', 'touchstart', 'touchmove'];
  const listenerOptions: AddEventListenerOptions = {
    capture: options?.capture,
    passive: options?.passive ?? passiveEvents.includes(eventType),
    once: options?.once
  };

  target.addEventListener(eventType, finalHandler, listenerOptions);

  // 返回移除函数
  return () => {
    target.removeEventListener(eventType, finalHandler, listenerOptions);
    if ('cancel' in finalHandler && typeof finalHandler.cancel === 'function') {
      finalHandler.cancel();
    }
  };
}

// ==================== 导出便捷函数 ====================

/**
 * 创建节流的事件处理函数
 */
export function createThrottledHandler<T extends Event>(
  handler: (event: T) => void,
  wait: number,
  options?: ThrottleOptions
) {
  return throttle(handler, wait, options);
}

/**
 * 创建防抖的事件处理函数
 */
export function createDebouncedHandler<T extends Event>(
  handler: (event: T) => void,
  wait: number,
  options?: DebounceOptions
) {
  return debounce(handler, wait, options);
}

