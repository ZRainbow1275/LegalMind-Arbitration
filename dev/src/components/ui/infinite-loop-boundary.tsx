// dev/src/components/ui/infinite-loop-boundary.tsx
'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class InfiniteLoopBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    // 检查是否是无限循环错误
    if (error.message.includes('Maximum update depth exceeded')) {
      return {
        hasError: true,
        errorMessage: 'React无限循环错误已被捕获，正在使用安全模式渲染'
      };
    }
    return { hasError: false, errorMessage: '' };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('InfiniteLoopBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-96 p-8">
          <div className="text-center animate-fade-in">
            <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">组件渲染错误</h3>
            <p className="text-gray-600 mb-6 max-w-md">
              {this.state.errorMessage}
            </p>
            <Button 
              onClick={() => this.setState({ hasError: false, errorMessage: '' })}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              重试
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
