// src/app/not-found.tsx
'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Home, ArrowLeft, Search, HelpCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-brand-lg animate-scale-in">
        <CardContent className="p-12 text-center">
          {/* 404 图标 */}
          <div className="w-32 h-32 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-8">
            <span className="text-6xl font-bold text-white">404</span>
          </div>

          {/* 标题和描述 */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">页面未找到</h1>
          <p className="text-xl text-gray-600 mb-8 max-w-md mx-auto">
            抱歉，您访问的页面不存在或已被移动。请检查网址是否正确，或返回首页继续浏览。
          </p>

          {/* 操作按钮 */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Link href="/">
              <Button size="lg" className="btn-primary btn-ripple hover-lift shadow-brand">
                <Home className="h-5 w-5 mr-2" />
                返回首页
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="lg" 
              className="hover-lift"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              返回上页
            </Button>
          </div>

          {/* 帮助链接（移除搜索入口） */}
          <div className="border-t border-gray-200 pt-8">
            <p className="text-gray-600 mb-4">需要帮助？</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/settings">
                <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700">
                  <HelpCircle className="h-4 w-4 mr-2" />
                  设置与帮助
                </Button>
              </Link>
            </div>
          </div>

          {/* 常用链接 */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-4">您可能想要访问：</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Link href="/dashboard">
                <Button variant="outline" size="sm">工作台</Button>
              </Link>
              <Link href="/cases">
                <Button variant="outline" size="sm">案件管理</Button>
              </Link>
              <Link href="/documents">
                <Button variant="outline" size="sm">文档管理</Button>
              </Link>
              <Link href="/settings">
                <Button variant="outline" size="sm">系统设置</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
