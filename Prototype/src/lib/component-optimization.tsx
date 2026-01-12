
import React, { ComponentType, useCallback } from 'react';
import { componentCache } from './component-optimization-utils';

/**
 * 条件渲染优化
 */
export function ConditionalRender<P extends object>({
  condition,
  component: Component,
  fallback,
  ...props
}: {
  condition: boolean;
  component: ComponentType<P>;
  fallback?: React.ReactNode;
} & P) {
  if (!condition) {
    return fallback || null;
  }

  return React.createElement(Component, props as any);
}

/**
 * 组件性能分析器
 */
export function ProfiledComponent<P extends object>({
  id,
  component: Component,
  onRender,
  ...props
}: {
  id: string;
  component: ComponentType<P>;
  onRender?: (
    id: string,
    phase: 'mount' | 'update' | 'nested-update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number
  ) => void;
} & P) {
  const handleRender = useCallback(
    (
      id: string,
      phase: 'mount' | 'update' | 'nested-update',
      actualDuration: number,
      baseDuration: number,
      startTime: number,
      commitTime: number
    ) => {
      if (onRender) {
        onRender(id, phase, actualDuration, baseDuration, startTime, commitTime);
      } else {
        console.log(`[Profiler] ${id} ${phase}:`, {
          actualDuration,
          baseDuration,
          startTime,
          commitTime,
        });
      }
    },
    [onRender]
  );

  return (
    <React.Profiler id={id} onRender={handleRender}>
      <Component {...(props as P)} />
    </React.Profiler>
  );
}

/**
 * 错误边界组件
 */
export class ErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="error-boundary">
            <h2>Something went wrong</h2>
            <details>
              <summary>Error details</summary>
              <pre>{this.state.error?.toString()}</pre>
            </details>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

/**
 * 组件缓存
 */
export function CachedComponent<P extends object>({
  cacheKey,
  component: Component,
  ...props
}: {
  cacheKey: string;
  component: ComponentType<P>;
} & P) {
  if (componentCache.has(cacheKey)) {
    return componentCache.get(cacheKey)!;
  }

  const element = React.createElement(Component, props as P);
  componentCache.set(cacheKey, element);

  return element;
}
