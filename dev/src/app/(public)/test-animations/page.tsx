// src/app/(public)/test-animations/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Heart, 
  Star, 
  ArrowRight,
  CheckCircle,
} from 'lucide-react';

export default function TestAnimationsPage() {
  return (
    <div className="min-h-screen bg-gradient-card p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* 页面标题 */}
        <div className="text-center animate-fade-in">
          <h1 className="text-4xl font-bold text-gradient mb-4">
            动画效果测试页面
          </h1>
          <p className="text-gray-600 text-lg">
            测试所有的动画和交互效果
          </p>
        </div>

        {/* 按钮测试 */}
        <section className="animate-slide-up">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">按钮效果</h2>
          <div className="flex flex-wrap gap-4">
            <Button className="btn-primary btn-ripple hover-lift">
              主要按钮
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="outline" className="hover-lift">
              轮廓按钮
            </Button>
            <Button variant="secondary" className="hover-lift">
              次要按钮
            </Button>
            <Button variant="ghost" className="hover-lift">
              幽灵按钮
            </Button>
          </div>
        </section>

        {/* 卡片测试 */}
        <section className="animate-scale-in">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">卡片效果</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((index) => (
              <Card 
                key={index} 
                className="card card-animate hover-lift group"
                style={{animationDelay: `${index * 0.2}s`}}
              >
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Star className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 group-hover:text-orange-700 transition-colors">
                    卡片标题 {index}
                  </h3>
                  <p className="text-gray-600 group-hover:text-gray-900 transition-colors">
                    这是一个测试卡片，展示悬停效果和动画。
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* 徽章测试 */}
        <section className="animate-bounce-in">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">徽章效果</h2>
          <div className="flex flex-wrap gap-4">
            <Badge className="bg-orange-100 text-orange-700 hover-glow pulse-primary">
              <Zap className="w-4 h-4 mr-2" />
              脉冲效果
            </Badge>
            <Badge variant="secondary" className="hover-lift">
              悬停提升
            </Badge>
            <Badge className="bg-green-100 text-green-700 hover-glow">
              <CheckCircle className="w-4 h-4 mr-2" />
              成功状态
            </Badge>
          </div>
        </section>

        {/* 文字效果测试 */}
        <section className="animate-fade-in" style={{animationDelay: '0.5s'}}>
          <h2 className="text-2xl font-bold mb-6 text-gray-900">文字效果</h2>
          <div className="space-y-4">
            <h3 className="text-3xl font-bold text-gradient">
              渐变文字效果
            </h3>
            <h3 className="text-3xl font-bold text-gradient-secondary">
              次要渐变效果
            </h3>
          </div>
        </section>

        {/* 阴影效果测试 */}
        <section className="animate-slide-up" style={{animationDelay: '0.7s'}}>
          <h2 className="text-2xl font-bold mb-6 text-gray-900">阴影效果</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-white rounded-lg shadow-card hover:shadow-card-hover transition-shadow">
              <h4 className="font-semibold mb-2">卡片阴影</h4>
              <p className="text-gray-600 text-sm">基础卡片阴影效果</p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-brand hover:shadow-brand-lg transition-shadow">
              <h4 className="font-semibold mb-2">品牌阴影</h4>
              <p className="text-gray-600 text-sm">橙色品牌阴影效果</p>
            </div>
            <div className="p-6 bg-white rounded-lg hover-glow">
              <h4 className="font-semibold mb-2">发光效果</h4>
              <p className="text-gray-600 text-sm">悬停发光效果</p>
            </div>
            <div className="p-6 bg-white rounded-lg border-gradient">
              <h4 className="font-semibold mb-2">渐变边框</h4>
              <p className="text-gray-600 text-sm">渐变边框效果</p>
            </div>
          </div>
        </section>

        {/* 加载动画测试 */}
        <section className="animate-fade-in" style={{animationDelay: '1s'}}>
          <h2 className="text-2xl font-bold mb-6 text-gray-900">加载动画</h2>
          <div className="flex items-center space-x-8">
            <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full loading-spinner"></div>
            <div className="text-gray-600">
              加载中<span className="loading-dots"></span>
            </div>
            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="progress-bar h-full bg-gradient-to-r from-orange-500 to-orange-600 w-3/4"></div>
            </div>
          </div>
        </section>

        {/* 骨架屏测试 */}
        <section className="animate-slide-up" style={{animationDelay: '1.2s'}}>
          <h2 className="text-2xl font-bold mb-6 text-gray-900">骨架屏效果</h2>
          <div className="space-y-4">
            <div className="skeleton h-4 w-3/4 rounded"></div>
            <div className="skeleton h-4 w-1/2 rounded"></div>
            <div className="skeleton h-4 w-2/3 rounded"></div>
          </div>
        </section>

        {/* 交互提示 */}
        <section className="text-center animate-bounce-in" style={{animationDelay: '1.5s'}}>
          <div className="p-8 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg">
            <Heart className="w-12 h-12 text-orange-500 mx-auto mb-4 animate-pulse" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              动画效果已激活！
            </h3>
            <p className="text-gray-600">
              尝试悬停、点击各种元素来体验丰富的交互效果
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
