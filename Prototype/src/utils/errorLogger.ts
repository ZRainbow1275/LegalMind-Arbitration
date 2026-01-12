
import { ErrorInfo } from 'react';
import { memoryLeakDetector } from '../lib/memory-leak-detector';

// ==================== 错误日志记录器 ====================

export class ErrorLogger {
    private static logs: Array<{
        error: Error;
        errorInfo: ErrorInfo;
        timestamp: Date;
        componentName?: string;
        memoryUsage?: any;
    }> = [];

    static log(
        error: Error,
        errorInfo: ErrorInfo,
        componentName?: string
    ): void {
        // 获取当前内存使用情况
        const memoryUsage = memoryLeakDetector.getStatus().currentUsage;

        const logEntry = {
            error,
            errorInfo,
            timestamp: new Date(),
            componentName,
            memoryUsage,
        };

        this.logs.push(logEntry);

        // 控制台输出
        console.error('ErrorBoundary caught an error:', {
            component: componentName || 'Unknown',
            error: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            timestamp: logEntry.timestamp.toISOString(),
            memoryUsage,
        });

        // 限制内存日志数量（最多保留100条）
        if (this.logs.length > 100) {
            this.logs.shift();
        }

        // 保存到localStorage（开发环境）
        this.saveToLocalStorage(logEntry);
    }

    private static saveToLocalStorage(logEntry: any): void {
        try {
            if (process.env.NODE_ENV === 'development') {
                const errorLog = {
                    timestamp: logEntry.timestamp.toISOString(),
                    component: logEntry.componentName,
                    error: {
                        name: logEntry.error.name,
                        message: logEntry.error.message,
                        stack: logEntry.error.stack,
                    },
                    errorInfo: {
                        componentStack: logEntry.errorInfo.componentStack,
                    },
                    memoryUsage: logEntry.memoryUsage,
                    userAgent: navigator.userAgent,
                    url: window.location.href,
                };

                const logs = JSON.parse(localStorage.getItem('error_logs') || '[]');
                logs.push(errorLog);

                // 只保留最近100条错误日志
                if (logs.length > 100) {
                    logs.shift();
                }

                localStorage.setItem('error_logs', JSON.stringify(logs));
            }
        } catch (loggingError) {
            console.error('[ErrorLogger] Failed to save to localStorage:', loggingError);
        }
    }

    static getLogs() {
        return [...this.logs];
    }

    static clearLogs(): void {
        this.logs = [];
        try {
            localStorage.removeItem('error_logs');
        } catch (e) {
            console.error('[ErrorLogger] Failed to clear localStorage:', e);
        }
    }

    static exportLogs(): string {
        const logs = this.getLogs().map(log => ({
            timestamp: log.timestamp.toISOString(),
            component: log.componentName,
            error: {
                name: log.error.name,
                message: log.error.message,
                stack: log.error.stack,
            },
            componentStack: log.errorInfo.componentStack,
            memoryUsage: log.memoryUsage,
        }));
        return JSON.stringify(logs, null, 2);
    }
}

// ==================== 错误日志工具函数 ====================

/**
 * 获取内存中的错误日志
 */
export function getErrorLogs() {
    return ErrorLogger.getLogs();
}

/**
 * 获取localStorage中的错误日志
 */
export function getStoredErrorLogs(): any[] {
    try {
        return JSON.parse(localStorage.getItem('error_logs') || '[]');
    } catch {
        return [];
    }
}

/**
 * 清空所有错误日志
 */
export function clearErrorLogs(): void {
    ErrorLogger.clearLogs();
}

/**
 * 导出错误日志为JSON字符串
 */
export function exportErrorLogs(): string {
    return ErrorLogger.exportLogs();
}
