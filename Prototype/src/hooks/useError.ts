
import React, { ErrorInfo } from 'react';
import { ErrorLogger } from '../utils/errorLogger';

// ==================== React Hooks ====================

/**
 * 错误处理Hook
 */
export function useErrorHandler() {
    const handleError = React.useCallback((error: Error, context?: string) => {
        console.error(`Error in ${context || 'component'}:`, error);

        // 记录到ErrorLogger
        ErrorLogger.log(error, { componentStack: context || 'Unknown' } as ErrorInfo, context);

        // 这里可以添加错误上报逻辑
        // 例如发送到错误监控服务

        // 显示用户友好的错误提示
        // 可以使用toast或其他通知组件
    }, []);

    return handleError;
}

/**
 * 异步错误处理Hook
 * 用于在异步操作中抛出错误，让ErrorBoundary捕获
 */
export function useAsyncError() {
    const [, setError] = React.useState();

    return React.useCallback((error: Error) => {
        setError(() => {
            throw error;
        });
    }, []);
}
