/**
 * ErrorBoundary - React错误边界组件（增强版）
 *
 * 功能：
 * - 捕获组件树中的JavaScript错误
 * - 防止应用崩溃
 * - 显示友好的错误恢复界面
 * - 记录错误信息到内存和localStorage
 * - 支持错误恢复和重试
 * - 集成内存泄漏检测器
 *
 * 基于2025年React最佳实践
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { AlertTriangle, RefreshCw, Home, Bug, Copy, Download } from 'lucide-react';
import { ErrorLogger } from '../utils/errorLogger';

// ==================== 类型定义 ====================

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, errorInfo: ErrorInfo, reset: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorTime: Date | null;
  errorCount: number;
}

// ==================== ErrorBoundary组件 ====================

export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorTime: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorTime: new Date(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 记录错误信息
    ErrorLogger.log(error, errorInfo, this.props.componentName);

    // 更新state
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // 调用用户提供的错误回调
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorTime: null,
    });
  };

  handleGoHome = () => {
    window.location.reload();
  };

  handleCopyError = () => {
    const { error, errorInfo } = this.state;
    if (error && errorInfo) {
      const errorText = `Error: ${error.message}\n\nStack:\n${error.stack}\n\nComponent Stack:\n${errorInfo.componentStack}`;
      navigator.clipboard.writeText(errorText).then(() => {
        alert('错误信息已复制到剪贴板');
      });
    }
  };

  handleDownloadLogs = () => {
    const logs = ErrorLogger.exportLogs();
    const blob = new Blob([logs], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-logs-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  render() {
    const { hasError, error, errorInfo, errorCount } = this.state;
    const { children, fallback } = this.props;
    const isDevelopment = process.env.NODE_ENV === 'development';
    const showDetails = isDevelopment && (this.props.showDetails ?? true);

    if (hasError && error) {
      // 如果提供了自定义fallback函数，使用它
      if (typeof fallback === 'function' && errorInfo) {
        return fallback(error, errorInfo, this.handleRetry);
      }

      // 如果提供了自定义fallback组件，使用它
      if (fallback && typeof fallback !== 'function') {
        return fallback;
      }

      // 默认错误UI（增强版）
      return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl border-orange-200 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold">出错了</CardTitle>
                  <p className="text-orange-100 text-sm mt-1">
                    应用遇到了一个意外错误，但不用担心，您的数据是安全的。
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {/* 错误统计 */}
              {errorCount > 1 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                  ⚠️ 此错误已发生 {errorCount} 次
                </div>
              )}

              {/* 错误信息 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">错误信息</h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 font-mono text-sm">{error.message}</p>
                </div>
              </div>

              {/* 详细信息（开发环境） */}
              {showDetails && errorInfo && (
                <details className="group">
                  <summary className="cursor-pointer font-semibold text-gray-700 text-sm flex items-center gap-2 hover:text-orange-600">
                    <Bug className="w-4 h-4" />
                    详细信息（开发模式）
                    <span className="text-xs text-gray-500 group-open:hidden">点击展开</span>
                  </summary>
                  <div className="mt-3 space-y-3">
                    <div>
                      <strong className="text-xs text-gray-600">错误堆栈:</strong>
                      <pre className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700 overflow-auto max-h-48">
                        {error.stack}
                      </pre>
                    </div>
                    <div>
                      <strong className="text-xs text-gray-600">组件堆栈:</strong>
                      <pre className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700 overflow-auto max-h-48">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  </div>
                </details>
              )}

              {/* 操作按钮 */}
              <div className="flex flex-wrap gap-2 pt-4">
                <Button
                  onClick={this.handleRetry}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600"
                >
                  <RefreshCw className="w-4 h-4" />
                  重试
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex items-center gap-2 border-orange-200 hover:border-orange-400"
                >
                  <Home className="w-4 h-4" />
                  刷新页面
                </Button>
                {showDetails && (
                  <>
                    <Button
                      onClick={this.handleCopyError}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      复制错误
                    </Button>
                    <Button
                      onClick={this.handleDownloadLogs}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      下载日志
                    </Button>
                  </>
                )}
              </div>

              {/* 帮助信息 */}
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 建议</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 点击"重试"按钮尝试恢复</li>
                  <li>• 如果问题持续，请刷新页面</li>
                  <li>• 您的工作已自动保存（如果启用了自动保存）</li>
                  <li>• 如需帮助，请联系技术支持</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return children;
  }
}



export default ErrorBoundary;
