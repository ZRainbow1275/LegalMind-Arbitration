
import { performanceMonitor } from './performance-monitor';

// ==================== 函数包装器 ====================

/**
 * 包装同步函数，添加性能监控
 */
export function wrapWithPerformanceMonitoring<T extends (...args: any[]) => any>(
    fn: T,
    name: string,
    type: 'render' | 'operation' | 'memory' | 'network' = 'operation'
): T {
    return ((...args: any[]) => {
        const perfId = performanceMonitor.start(name, type, {
            args: args.length
        });

        try {
            const result = fn(...args);
            performanceMonitor.end(perfId);
            return result;
        } catch (error) {
            performanceMonitor.end(perfId);
            throw error;
        }
    }) as T;
}

/**
 * 包装异步函数，添加性能监控
 */
export function wrapAsyncWithPerformanceMonitoring<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    name: string,
    type: 'render' | 'operation' | 'memory' | 'network' = 'operation'
): T {
    return (async (...args: any[]) => {
        const perfId = performanceMonitor.start(name, type, {
            args: args.length
        });

        try {
            const result = await fn(...args);
            performanceMonitor.end(perfId);
            return result;
        } catch (error) {
            performanceMonitor.end(perfId);
            throw error;
        }
    }) as T;
}

// ==================== Store包装器 ====================

/**
 * 包装Store的所有方法，添加性能监控
 */
export function wrapStoreWithPerformanceMonitoring<T extends Record<string, any>>(
    store: T,
    storeName: string,
    excludeMethods: string[] = []
): T {
    const wrappedStore = { ...store };

    Object.keys(store).forEach(key => {
        const value = store[key];

        // 跳过非函数和排除的方法
        if (typeof value !== 'function' || excludeMethods.includes(key)) {
            return;
        }

        const methodName = `${storeName}.${key}`;

        // 判断是否为异步函数
        if (value.constructor.name === 'AsyncFunction') {
            (wrappedStore as any)[key] = wrapAsyncWithPerformanceMonitoring(value, methodName);
        } else {
            (wrappedStore as any)[key] = wrapWithPerformanceMonitoring(value, methodName);
        }
    });

    return wrappedStore;
}

// ==================== 批量操作包装器 ====================

/**
 * 包装批量操作，添加性能监控
 */
export function wrapBatchOperation<T>(
    operation: () => T,
    operationName: string,
    itemCount: number
): T {
    const perfId = performanceMonitor.start(operationName, 'operation', {
        itemCount
    });

    try {
        const result = operation();
        performanceMonitor.end(perfId);
        return result;
    } catch (error) {
        performanceMonitor.end(perfId);
        throw error;
    }
}

/**
 * 包装异步批量操作，添加性能监控
 */
export async function wrapAsyncBatchOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    itemCount: number
): Promise<T> {
    const perfId = performanceMonitor.start(operationName, 'operation', {
        itemCount
    });

    try {
        const result = await operation();
        performanceMonitor.end(perfId);
        return result;
    } catch (error) {
        performanceMonitor.end(perfId);
        throw error;
    }
}

// ==================== 渲染性能监控 ====================

/**
 * 监控渲染性能
 */
export function monitorRenderPerformance(componentName: string): {
    start: () => void;
    end: () => void;
} {
    let perfId: string | null = null;

    return {
        start: () => {
            perfId = performanceMonitor.start(`渲染${componentName}`, 'render');
        },
        end: () => {
            if (perfId) {
                performanceMonitor.end(perfId);
                perfId = null;
            }
        }
    };
}

// ==================== 内存监控 ====================

/**
 * 监控内存使用
 */
export function monitorMemoryUsage(operationName: string): void {
    if (!(performance as any).memory) {
        console.warn('浏览器不支持内存监控');
        return;
    }

    const memory = (performance as any).memory;
    const perfId = performanceMonitor.start(operationName, 'memory', {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
    });

    performanceMonitor.end(perfId);
}

// ==================== 网络监控 ====================

/**
 * 监控网络请求
 */
export async function monitorNetworkRequest<T>(
    requestName: string,
    request: () => Promise<T>
): Promise<T> {
    const perfId = performanceMonitor.start(requestName, 'network');

    try {
        const result = await request();
        performanceMonitor.end(perfId);
        return result;
    } catch (error) {
        performanceMonitor.end(perfId);
        throw error;
    }
}

// ==================== 自动监控装饰器 ====================

/**
 * 自动监控装饰器（用于类方法）
 */
export function AutoMonitor(name?: string) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;
        const methodName = name || `${target.constructor.name}.${propertyKey}`;

        descriptor.value = function (...args: any[]) {
            const perfId = performanceMonitor.start(methodName, 'operation');

            try {
                const result = originalMethod.apply(this, args);

                if (result instanceof Promise) {
                    return result.then(
                        (value) => {
                            performanceMonitor.end(perfId);
                            return value;
                        },
                        (error) => {
                            performanceMonitor.end(perfId);
                            throw error;
                        }
                    );
                }

                performanceMonitor.end(perfId);
                return result;
            } catch (error) {
                performanceMonitor.end(perfId);
                throw error;
            }
        };

        return descriptor;
    };
}

// ==================== 性能阈值检查 ====================

/**
 * 检查操作是否超过性能阈值
 */
export function checkPerformanceThreshold(
    duration: number,
    threshold: number,
    operationName: string
): void {
    if (duration > threshold) {
        console.warn(
            `[性能警告] ${operationName} 耗时 ${duration.toFixed(2)}ms，超过阈值 ${threshold}ms`
        );
    }
}

/**
 * 包装函数并检查性能阈值
 */
export function wrapWithThresholdCheck<T extends (...args: any[]) => any>(
    fn: T,
    name: string,
    threshold: number
): T {
    return ((...args: any[]) => {
        const start = performance.now();
        const result = fn(...args);
        const duration = performance.now() - start;

        checkPerformanceThreshold(duration, threshold, name);

        return result;
    }) as T;
}
