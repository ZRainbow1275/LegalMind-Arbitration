// src/app/(public)/page.tsx
import Link from 'next/link';
import { CTAAuthButtons } from '@/components/home/cta-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Scale,
  Shield,
  Zap,
  Users,
  Video,
  FileText,
  ArrowRight,
  CheckCircle,
  Star,
} from 'lucide-react';

export default function HomePage() {
  const features = [
    {
      icon: Video,
      title: '在线视频仲裁',
      description: '安全、庄重的数字法庭环境，支持多方视频会议和实时交互',
      highlight: true,
    },
    {
      icon: Zap,
      title: 'AI智能助手',
      description: 'OCR文档识别、语音转文字、智能推荐等AI功能提升效率',
      highlight: false,
    },
    {
      icon: Shield,
      title: '安全可靠',
      description: '端到端加密、实名认证、电子签名确保数据安全',
      highlight: false,
    },
    {
      icon: Users,
      title: '专业仲裁庭',
      description: '资深仲裁员团队，智能推荐匹配最适合的专家',
      highlight: false,
    },
  ];

  const stats = [
    { label: '累计案件', value: '10,000+', icon: FileText },
    { label: '专业仲裁员', value: '500+', icon: Users },
    { label: '用户满意度', value: '98%', icon: Star },
    { label: '平均处理时间', value: '45天', icon: CheckCircle },
  ];

  return (
    <div className="min-h-screen page-enter">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-orange-50 via-white to-orange-100 py-20 lg:py-32 overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-orange-100 opacity-90"></div>
        <div className="absolute top-10 left-10 w-72 h-72 bg-orange-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-bounce-in"></div>
        <div className="absolute top-40 right-10 w-96 h-96 bg-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-bounce-in" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute bottom-10 left-1/2 w-80 h-80 bg-orange-100 rounded-full mix-blend-multiply filter blur-xl opacity-25 animate-bounce-in" style={{animationDelay: '1s'}}></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-8">
            {/* Hero Badge */}
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 px-4 py-2 animate-fade-in hover-glow pulse-primary">
              <Zap className="w-4 h-4 mr-2" />
              革命性在线仲裁平台
            </Badge>

            {/* Hero Title */}
            <div className="space-y-4 animate-slide-up">
              <h1 className="text-4xl lg:text-6xl font-bold text-foreground">
                科技赋能法律
                <span className="text-gradient block lg:inline lg:ml-4 animate-scale-in">
                  让争议解决更快、更稳、更可信
                </span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-in" style={{animationDelay: '0.3s'}}>
                LegalMind Arbitrate 以实时音视频、智能识别与流程自动化，重构仲裁全流程，
                以清晰、可追溯与高效为原则，帮助各方更快达成公正结果。
              </p>
            </div>

            {/* Hero Actions */}
            <div className="animate-slide-up" style={{animationDelay: '0.5s'}}>
              {/* CTA 按鉴权跳转 */}
              <CTAAuthButtons />
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center justify-center space-x-8 text-sm text-gray-600 pt-8 animate-fade-in" style={{animationDelay: '0.7s'}}>
              <div className="flex items-center space-x-2 hover-lift">
                <Shield className="w-4 h-4 text-green-500" />
                <span>银行级安全</span>
              </div>
              <div className="flex items-center space-x-2 hover-lift">
                <Scale className="w-4 h-4 text-orange-500" />
                <span>法律合规</span>
              </div>
              <div className="flex items-center space-x-2 hover-lift">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>7×24小时服务</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              为什么选择 LegalMind Arbitrate
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              我们将传统仲裁程序与现代科技完美结合，为您提供前所未有的仲裁体验
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 临时简化版本，移除复杂的动画和交互 */}
            {features.map((feature, index) => (
              <Card
                key={`feature-${index}`}
                className="bg-white shadow-card"
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-orange-100 text-orange-600">
                      <feature.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-r from-orange-50 to-orange-100 relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0 bg-white/50"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-orange-600"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {/* 临时简化版本，移除复杂的动画和交互 */}
            {stats.map((stat, index) => (
              <div
                key={`stat-${index}`}
                className="text-center"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-orange-500 to-orange-600 relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-black/10"></div>
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-white/5 rounded-full blur-2xl"></div>

        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 animate-fade-in">
            准备开始您的仲裁申请？
          </h2>
          <p className="text-lg text-orange-100 mb-8 max-w-2xl mx-auto animate-slide-up" style={{animationDelay: '0.2s'}}>
            加入数千家企业和个人的选择，体验更高效、更专业的在线仲裁服务
          </p>
          <div className="animate-scale-in" style={{animationDelay: '0.4s'}}>
            {/* CTA 按鉴权跳转 */}
            <CTAAuthButtons primaryLabel="立即申请仲裁" />
          </div>
        </div>
      </section>
    </div>
  );
}
