// src/app/loading.tsx
import { Card, CardContent } from '@/components/ui/card';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-brand-lg">
        <CardContent className="p-12 text-center">
          {/* 加载动画 */}
          <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>

          {/* 加载文本 */}
          <h2 className="text-2xl font-bold text-gray-900 mb-4">加载中...</h2>
          <p className="text-gray-600 mb-6">
            正在为您准备最佳的仲裁服务体验
          </p>

          {/* 进度条 */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
          </div>

          {/* 提示文本 */}
          <p className="text-sm text-gray-500">
            LegalMind 智能仲裁平台
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
