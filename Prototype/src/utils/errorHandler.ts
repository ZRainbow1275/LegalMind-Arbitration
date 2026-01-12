// 错误类型定义
export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AI_ANALYSIS = 'AI_ANALYSIS',
  CANVAS_OPERATION = 'CANVAS_OPERATION',
  FILE_OPERATION = 'FILE_OPERATION',
  PERMISSION = 'PERMISSION',
  STORAGE = 'STORAGE',
  DATA_PERSISTENCE = 'DATA_PERSISTENCE',
  UNKNOWN = 'UNKNOWN'
}

// 错误严重程度
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// 自定义错误类
export class LegalWorkspaceError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly context?: string;
  public readonly timestamp: Date;
  public readonly userMessage: string;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: string,
    userMessage?: string
  ) {
    super(message);
    this.name = 'LegalWorkspaceError';
    this.type = type;
    this.severity = severity;
    this.context = context;
    this.timestamp = new Date();
    this.userMessage = userMessage || this.getDefaultUserMessage();
  }

  private getDefaultUserMessage(): string {
    switch (this.type) {
      case ErrorType.NETWORK:
        return '网络连接出现问题，请检查网络连接后重试';
      case ErrorType.VALIDATION:
        return '输入的数据格式不正确，请检查后重新输入';
      case ErrorType.AI_ANALYSIS:
        return 'AI分析服务暂时不可用，请稍后重试';
      case ErrorType.CANVAS_OPERATION:
        return '画布操作失败，请刷新页面后重试';
      case ErrorType.FILE_OPERATION:
        return '文件操作失败，请检查文件格式和大小';
      case ErrorType.PERMISSION:
        return '您没有执行此操作的权限，请联系管理员';
      default:
        return '操作失败，请稍后重试';
    }
  }
}

// 错误处理器类
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: LegalWorkspaceError[] = [];
  private maxLogSize = 100;

  private constructor() { }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // 处理错误
  public handleError(error: Error | LegalWorkspaceError, context?: string): void {
    let workspaceError: LegalWorkspaceError;

    if (error instanceof LegalWorkspaceError) {
      workspaceError = error;
    } else {
      // 将普通错误转换为LegalWorkspaceError
      workspaceError = new LegalWorkspaceError(
        error.message,
        this.inferErrorType(error),
        this.inferErrorSeverity(error),
        context
      );
    }

    // 记录错误
    this.logError(workspaceError);

    // 根据严重程度决定处理方式
    this.processError(workspaceError);
  }

  // 推断错误类型
  private inferErrorType(error: Error): ErrorType {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return ErrorType.NETWORK;
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorType.VALIDATION;
    }
    if (message.includes('ai') || message.includes('analysis')) {
      return ErrorType.AI_ANALYSIS;
    }
    if (message.includes('canvas') || message.includes('viewport')) {
      return ErrorType.CANVAS_OPERATION;
    }
    if (message.includes('file') || message.includes('upload')) {
      return ErrorType.FILE_OPERATION;
    }
    if (message.includes('permission') || message.includes('unauthorized')) {
      return ErrorType.PERMISSION;
    }

    return ErrorType.UNKNOWN;
  }

  // 推断错误严重程度
  private inferErrorSeverity(error: Error): ErrorSeverity {
    const message = error.message.toLowerCase();

    if (message.includes('critical') || message.includes('fatal')) {
      return ErrorSeverity.CRITICAL;
    }
    if (message.includes('warning') || message.includes('minor')) {
      return ErrorSeverity.LOW;
    }

    return ErrorSeverity.MEDIUM;
  }

  // 记录错误
  private logError(error: LegalWorkspaceError): void {
    this.errorLog.unshift(error);

    // 限制日志大小
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }

    // 控制台输出
    console.error(`[${error.severity}] ${error.type}: ${error.message}`, {
      context: error.context,
      timestamp: error.timestamp,
      stack: error.stack
    });
  }

  // 处理错误
  private processError(error: LegalWorkspaceError): void {
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        this.handleCriticalError(error);
        break;
      case ErrorSeverity.HIGH:
        this.handleHighSeverityError(error);
        break;
      case ErrorSeverity.MEDIUM:
        this.handleMediumSeverityError(error);
        break;
      case ErrorSeverity.LOW:
        this.handleLowSeverityError(error);
        break;
    }
  }

  private handleCriticalError(error: LegalWorkspaceError): void {
    // 关键错误：显示错误页面，可能需要重新加载应用
    console.error('Critical error occurred:', error);
    // 这里可以触发全局错误状态
  }

  private handleHighSeverityError(error: LegalWorkspaceError): void {
    // 高严重性错误：显示错误对话框
    console.error('High severity error:', error);
    // 这里可以显示模态对话框
  }

  private handleMediumSeverityError(error: LegalWorkspaceError): void {
    // 中等严重性错误：显示通知
    console.warn('Medium severity error:', error);
    // 这里可以显示toast通知
  }

  private handleLowSeverityError(error: LegalWorkspaceError): void {
    // 低严重性错误：仅记录日志
    console.info('Low severity error:', error);
  }

  // 获取错误日志
  public getErrorLog(): LegalWorkspaceError[] {
    return [...this.errorLog];
  }

  // 清除错误日志
  public clearErrorLog(): void {
    this.errorLog = [];
  }

  // 获取错误统计
  public getErrorStats(): Record<ErrorType, number> {
    const stats: Record<ErrorType, number> = {
      [ErrorType.NETWORK]: 0,
      [ErrorType.VALIDATION]: 0,
      [ErrorType.AI_ANALYSIS]: 0,
      [ErrorType.CANVAS_OPERATION]: 0,
      [ErrorType.FILE_OPERATION]: 0,
      [ErrorType.PERMISSION]: 0,
      [ErrorType.STORAGE]: 0,
      [ErrorType.DATA_PERSISTENCE]: 0,
      [ErrorType.UNKNOWN]: 0
    };

    this.errorLog.forEach(error => {
      stats[error.type]++;
    });

    return stats;
  }
}

// 导出单例实例
export const errorHandler = ErrorHandler.getInstance();

// 便捷函数
export function handleError(
  error: Error | LegalWorkspaceError,
  typeOrContext?: ErrorType | string,
  severity?: ErrorSeverity,
  context?: string
): void {
  if (typeof typeOrContext === 'string') {
    errorHandler.handleError(error, typeOrContext);
  } else {
    const type = typeOrContext || ErrorType.UNKNOWN;
    const sev = severity || ErrorSeverity.MEDIUM;
    const ctx = context;

    if (error instanceof LegalWorkspaceError) {
      errorHandler.handleError(error, ctx);
    } else {
      const workspaceError = new LegalWorkspaceError(
        error.message,
        type,
        sev,
        ctx
      );
      errorHandler.handleError(workspaceError, ctx);
    }
  }
}

export function createError(
  message: string,
  type: ErrorType,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  context?: string,
  userMessage?: string
): LegalWorkspaceError {
  return new LegalWorkspaceError(message, type, severity, context, userMessage);
}

// 异步操作错误处理包装器
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string,
  errorType: ErrorType = ErrorType.UNKNOWN
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    const workspaceError = error instanceof LegalWorkspaceError
      ? error
      : new LegalWorkspaceError(
        error instanceof Error ? error.message : String(error),
        errorType,
        ErrorSeverity.MEDIUM,
        context
      );

    handleError(workspaceError, context);
    return null;
  }
}
