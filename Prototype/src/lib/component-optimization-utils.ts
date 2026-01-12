
import { memo } from 'react';
import React, { ComponentType } from 'react';

/**
 * 深度比较函数
 */
export function deepEqual(a: any, b: any): boolean {
    if (a === b) return true;

    if (
        typeof a !== 'object' ||
        typeof b !== 'object' ||
        a === null ||
        b === null
    ) {
        return false;
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
        if (!keysB.includes(key) || !deepEqual(a[key], b[key])) {
            return false;
        }
    }

    return true;
}

/**
 * 优化的memo（使用深度比较）
 */
export function deepMemo<P extends object>(
    Component: ComponentType<P>,
    displayName?: string
): ComponentType<P> {
    const MemoizedComponent = memo(Component, deepEqual);

    if (displayName) {
        MemoizedComponent.displayName = displayName;
    }

    return MemoizedComponent as any;
}

/**
 * 优化的memo（使用自定义比较函数）
 */
export function customMemo<P extends object>(
    Component: ComponentType<P>,
    areEqual: (prevProps: P, nextProps: P) => boolean,
    displayName?: string
): ComponentType<P> {
    const MemoizedComponent = memo(Component, areEqual);

    if (displayName) {
        MemoizedComponent.displayName = displayName;
    }

    return MemoizedComponent as any;
}



/**
 * 性能优化装饰器
 */
export function optimizeComponent<P extends object>(
    options: {
        memo?: boolean;
        deepCompare?: boolean;
        displayName?: string;
        logRenders?: boolean;
    } = {}
) {
    return function (Component: ComponentType<P>): ComponentType<P> {
        let OptimizedComponent = Component;

        // 添加渲染日志
        if (options.logRenders) {
            const OriginalComponent = OptimizedComponent;
            OptimizedComponent = (props: P) => {
                console.log(`[Render] ${options.displayName || Component.name}`);
                return React.createElement(OriginalComponent, props);
            };
        }

        // 添加memo
        if (options.memo) {
            if (options.deepCompare) {
                OptimizedComponent = deepMemo(OptimizedComponent, options.displayName);
            } else {
                OptimizedComponent = memo(OptimizedComponent) as any;
                if (options.displayName) {
                    OptimizedComponent.displayName = options.displayName;
                }
            }
        }

        return OptimizedComponent;
    };
}

/**
 * 批量优化组件
 */
export function optimizeComponents<T extends Record<string, ComponentType<any>>>(
    components: T,
    options: {
        memo?: boolean;
        deepCompare?: boolean;
        logRenders?: boolean;
    } = {}
): T {
    const optimizedComponents = {} as T;

    for (const key in components) {
        optimizedComponents[key] = optimizeComponent({
            ...options,
            displayName: key,
        })(components[key]) as any;
    }

    return optimizedComponents;
}

/**
 * 懒加载组件包装器
 */
export function lazyComponent<P extends object>(
    loader: () => Promise<{ default: ComponentType<P> }>,
    fallback?: React.ReactNode
): ComponentType<P> {
    const LazyComponent = React.lazy(loader);

    return (props: P) => (
        React.createElement(
            React.Suspense,
            { fallback: fallback || React.createElement('div', null, 'Loading...') },
            React.createElement(LazyComponent, props as any)
        )
    );
}

/**
 * 预加载组件
 */
export function preloadComponent<P extends object>(
    loader: () => Promise<{ default: ComponentType<P> }>
): void {
    loader();
}

/**
 * 组件缓存
 */
export const componentCache = new Map<string, React.ReactElement>();

/**
 * 清空组件缓存
 */
export function clearComponentCache(cacheKey?: string): void {
    if (cacheKey) {
        componentCache.delete(cacheKey);
    } else {
        componentCache.clear();
    }
}

/**
 * 组件预渲染
 */
export function prerenderComponent<P extends object>(
    Component: ComponentType<P>,
    props: P
): React.ReactElement {
    return React.createElement(Component, props);
}

/**
 * 批量预渲染
 */
export function prerenderComponents<P extends object>(
    components: Array<{ Component: ComponentType<P>; props: P }>
): React.ReactElement[] {
    return components.map(({ Component, props }) =>
        React.createElement(Component, props)
    );
}
