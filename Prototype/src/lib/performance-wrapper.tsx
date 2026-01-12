
import { performanceMonitor } from './performance-monitor';
import React from 'react';

// ==================== React组件包装器 ====================

/**
 * 包装React组件渲染，添加性能监控
 */
export function wrapComponentWithPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
): React.ComponentType<P> {
  return (props: P) => {
    const perfId = performanceMonitor.start(`渲染${componentName}`, 'render');

    try {
      const result = <Component {...props} />;

      // 使用useEffect在渲染完成后结束监控
      React.useEffect(() => {
        performanceMonitor.end(perfId);
      });

      return result;
    } catch (error) {
      performanceMonitor.end(perfId);
      throw error;
    }
  };
}
