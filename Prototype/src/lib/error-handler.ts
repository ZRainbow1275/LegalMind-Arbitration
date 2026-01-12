/**
 * 统一错误处理工具
 * 
 * 提供统一的错误处理、错误上报和用户提示功能
 */

/** 错误类型 */
export enum ErrorType {
  NETWORK = 'NETWORK',           // 网络错误
  VALIDATION = 'VALIDATION',     // 验证错误
  PERMISSION = 'PERMISSION',     // 权限错误
  NOT_FOUND = 'NOT_FOUND',       // 资源未找到
  CONFLICT = 'CONFLICT',         // 冲突错误
  UNKNOWN = 'UNKNOWN',           // 未知错误
}

/** 错误严重程度 */
export enum ErrorSeverity {
  LOW = 'LOW',           // 低：不影响核心功能
  MEDIUM = 'MEDIUM',     // 中：影响部分功能
  HIGH = 'HIGH',         // 高：影响核心功能
  CRITICAL = 'CRITICAL', // 严重：系统无法使用
}

/** 应用错误类 */
export class AppError extends Error {
  constructor(
    message: string,
    public type: ErrorType = ErrorType.UNKNOWN,
    public severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';

    // 保持正确的原型链
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/** 网络错误 */
export class NetworkError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorType.NETWORK, ErrorSeverity.HIGH, context);
    this.name = 'NetworkError';
  }
}

/** 验证错误 */
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorType.VALIDATION, ErrorSeverity.LOW, context);
    this.name = 'ValidationError';
  }
}

/** 权限错误 */
export class PermissionError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorType.PERMISSION, ErrorSeverity.MEDIUM, context);
    this.name = 'PermissionError';
  }
}

/** 资源未找到错误 */
export class NotFoundError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorType.NOT_FOUND, ErrorSeverity.MEDIUM, context);
    this.name = 'NotFoundError';
  }
}

/** 错误处理器 */
export function handleError(error: unknown, context?: Record<string, unknown>): void {
  console.error('[Error]', error, context);

  let message = '发生未知错误，请稍后重试';
  let severity = ErrorSeverity.MEDIUM;

  if (error instanceof AppError) {
    message = error.message;
    severity = error.severity;
  } else if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }

  // 显示用户提示（需要在组件中实现）
  showErrorToast(message, severity, context);

  // 生产环境上报错误
  if (process.env.NODE_ENV === 'production') {
    reportError(error, context);
  }
}

/** 显示错误提示 */
function showErrorToast(message: string, severity: ErrorSeverity, context?: Record<string, unknown>): void {
  // 这里需要与UI组件集成
  // 暂时使用console.error
  console.error(`[${severity}] ${message}`);

  // Simple toast implementation
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg text-white z-50 transition-opacity duration-300 ${severity === ErrorSeverity.HIGH ? 'bg-red-500' :
      severity === ErrorSeverity.MEDIUM ? 'bg-yellow-500' : 'bg-blue-500'
    }`;
  const contextStr = context ? ` [${Object.keys(context).join(', ')}]` : '';
  toast.textContent = `${message}${contextStr}`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 3000);
  // toast({
  //   title: '错误',
  //   description: message,
  //   variant: 'destructive',
  // });
}

/** 上报错误到监控服务 */
function reportError(error: unknown, context?: Record<string, unknown>): void {
  // TODO: 集成Sentry或其他错误监控服务
  console.log('[Report Error]', {
    error,
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
  });
}

/** 异步错误处理装饰器 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  errorMessage?: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, {
        function: fn.name,
        args,
        customMessage: errorMessage,
      });
      throw error;
    }
  }) as T;
}

/** HTTP错误处理 */
export async function handleHttpResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    switch (response.status) {
      case 400:
        throw new ValidationError(
          errorData.message || '请求参数错误',
          { status: response.status, data: errorData }
        );
      case 401:
        throw new PermissionError(
          '未授权，请先登录',
          { status: response.status }
        );
      case 403:
        throw new PermissionError(
          '没有权限执行此操作',
          { status: response.status }
        );
      case 404:
        throw new NotFoundError(
          errorData.message || '请求的资源不存在',
          { status: response.status }
        );
      case 409:
        throw new AppError(
          errorData.message || '数据冲突',
          ErrorType.CONFLICT,
          ErrorSeverity.MEDIUM,
          { status: response.status, data: errorData }
        );
      case 500:
      case 502:
      case 503:
        throw new NetworkError(
          '服务器错误，请稍后重试',
          { status: response.status }
        );
      default:
        throw new NetworkError(
          `HTTP错误: ${response.status}`,
          { status: response.status, data: errorData }
        );
    }
  }

  return response.json();
}

/** 安全的异步执行 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    handleError(error);
    return fallback;
  }
}

/** React Hook: 错误处理 */
export function useErrorHandler() {
  return {
    handleError,
    safeAsync,
  };
}

