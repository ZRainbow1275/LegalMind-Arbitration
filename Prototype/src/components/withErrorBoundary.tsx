
import React from 'react';
import { ErrorBoundary, ErrorBoundaryProps } from './ErrorBoundary';

/**
 * 创建带错误边界的组件
 */
export function withErrorBoundary<P extends object>(
    Component: React.ComponentType<P>,
    errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.FC<P> {
    const WrappedComponent: React.FC<P> = (props) => (
        <ErrorBoundary {...errorBoundaryProps}>
            <Component {...props} />
        </ErrorBoundary>
    );

    WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

    return WrappedComponent;
}
