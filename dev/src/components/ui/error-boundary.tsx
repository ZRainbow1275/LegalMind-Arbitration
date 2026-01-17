// src/components/ui/error-boundary.tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
}

interface ErrorFallbackProps {
  error?: Error;
  resetError: () => void;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // 这里可以添加错误报告服务
    // reportError(error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

// 默认错误回退组件
function DefaultErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-card">
      <Card className="w-full max-w-lg shadow-brand-lg animate-scale-in">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-xl text-gray-900">出现了一些问题</CardTitle>
          <CardDescription>
            很抱歉，应用程序遇到了意外错误。我们已经记录了这个问题，并会尽快修复。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDevelopment && error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="text-sm font-medium text-red-800 mb-2">错误详情（开发模式）：</h4>
              <pre className="text-xs text-red-700 overflow-auto max-h-32">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={resetError} 
              className="flex-1 btn-primary btn-ripple hover-lift"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              重试
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/dashboard'}
              className="flex-1 hover-lift"
            >
              <Home className="h-4 w-4 mr-2" />
              返回首页
            </Button>
          </div>
          
          <div className="text-center">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                // 这里可以添加错误报告功能
                alert('错误报告功能将在后续版本中提供');
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <Bug className="h-4 w-4 mr-2" />
              报告问题
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 页面级错误组件
interface PageErrorProps {
  title?: string;
  description?: string;
  action?:
    | { label: string; href: string }
    | { label: string; onClick: () => void };

}

export function PageError({ 
  title = "页面加载失败", 
  description = "无法加载页面内容，请稍后重试。",
  action
}: PageErrorProps) {
  return (
    <div className="flex items-center justify-center min-h-96 p-8">
      <div className="text-center animate-fade-in">
        <div className="w-20 h-20 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="h-10 w-10 text-white" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
        <p className="text-gray-600 mb-6 max-w-md">{description}</p>
        {action && (
          'href' in action ? (
            <a href={action.href}>
              <Button className="btn-primary btn-ripple hover-lift">{action.label}</Button>
            </a>
          ) : (
            <Button onClick={action.onClick} className="btn-primary btn-ripple hover-lift">
              {action.label}
            </Button>
          )
        )}
      </div>
    </div>
  );
}

// 加载状态组件
interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingState({ message = "加载中...", size = 'md' }: LoadingStateProps) {
  const sizeConfig = {
    sm: { container: 'min-h-32', spinner: 'w-6 h-6', text: 'text-sm' },
    md: { container: 'min-h-64', spinner: 'w-8 h-8', text: 'text-base' },
    lg: { container: 'min-h-96', spinner: 'w-12 h-12', text: 'text-lg' }
  };

  const config = sizeConfig[size];

  return (
    <div className={`flex items-center justify-center ${config.container} p-8`}>
      <div className="text-center animate-fade-in">
        <div className={`${config.spinner} border-4 border-orange-200 border-t-orange-500 rounded-full loading-spinner mx-auto mb-4`}></div>
        <p className={`text-gray-600 ${config.text}`}>{message}</p>
      </div>
    </div>
  );
}

// 空状态组件
interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?:
    | { label: string; href: string }
    | { label: string; onClick: () => void };

}

export function EmptyState({ 
  icon: Icon = AlertTriangle, 
  title, 
  description, 
  action 
}: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center min-h-64 p-8">
      <div className="text-center animate-fade-in">
        <div className="w-16 h-16 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        {description && (
          <p className="text-gray-600 mb-6 max-w-md">{description}</p>
        )}
        {action && (
          'href' in action ? (
            <a href={action.href}>
              <Button className="btn-primary btn-ripple hover-lift">{action.label}</Button>
            </a>
          ) : (
            <Button onClick={action.onClick} className="btn-primary btn-ripple hover-lift">
              {action.label}
            </Button>
          )
        )}
      </div>
    </div>
  );
}

// 网络错误组件
export function NetworkError({ onRetry }: { onRetry: () => void }) {
  return (
    <PageError
      title="网络连接失败"
      description="无法连接到服务器，请检查您的网络连接后重试。"
      action={{
        label: "重新连接",
        onClick: onRetry
      }}
    />
  );
}

// 权限错误组件
export function PermissionError() {
  return (
    <PageError
      title="访问被拒绝"
      description="您没有权限访问此页面或执行此操作。"
      action={{
        label: "返回首页",
        onClick: () => window.location.href = '/dashboard'
      }}
    />
  );
}
