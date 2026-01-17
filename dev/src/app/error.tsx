// src/app/error.tsx
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, MessageSquare } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 记录错误到监控服务
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-brand-lg animate-scale-in">
        <CardContent className="p-12 text-center">
          {/* 错误图标 */}
          <div className="w-24 h-24 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-8">
            <AlertTriangle className="h-12 w-12 text-white" />
          </div>

          {/* 标题和描述 */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">系统出现错误</h1>
          <p className="text-lg text-gray-600 mb-6 max-w-md mx-auto">
            抱歉，系统遇到了一个意外错误。我们已经记录了这个问题，请稍后重试。
          </p>

          {/* 错误详情（开发环境） */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-8 p-4 bg-gray-100 rounded-lg text-left">
              <h3 className="font-medium text-gray-900 mb-2">错误详情：</h3>
              <p className="text-sm text-gray-700 font-mono break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-gray-500 mt-2">
                  错误ID: {error.digest}
                </p>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Button 
              size="lg" 
              onClick={reset}
              className="btn-primary btn-ripple hover-lift shadow-brand"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              重新加载
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="hover-lift"
              onClick={() => window.location.href = '/'}
            >
              <Home className="h-5 w-5 mr-2" />
              返回首页
            </Button>
          </div>

          {/* 帮助信息 */}
          <div className="border-t border-gray-200 pt-8">
            <p className="text-gray-600 mb-4">如果问题持续存在，请联系技术支持</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700">
                <MessageSquare className="h-4 w-4 mr-2" />
                在线客服
              </Button>
              <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700">
                <span className="mr-2">📞</span>
                400-123-4567
              </Button>
            </div>
          </div>

          {/* 错误报告 */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-4">
              您的反馈有助于我们改进系统
            </p>
            <Button variant="outline" size="sm">
              报告此问题
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
