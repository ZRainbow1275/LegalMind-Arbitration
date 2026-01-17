// src/app/(private)/dashboard/page.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { WelcomeCard } from '@/components/dashboard/welcome-card';
import { ActionCenterCard } from '@/components/dashboard/action-center-card';
import { MyCasesCard } from '@/components/dashboard/my-cases-card';
import { SmartInsights, QuickStats } from '@/components/dashboard/smart-insights';
import { SmartSuggestions } from '@/components/ai/smart-suggestions';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">工作台</h1>
          <p className="text-gray-600 mt-1">
            欢迎回到 LegalMind Arbitrate，管理您的仲裁案件和任务
          </p>
        </div>

        {/* 顶部主CTA保留为“新建仲裁”，避免重复按钮 */}
        <div className="flex items-center space-x-4">
          <Link href="/cases/new">
            <Button size="lg" className="btn-primary btn-ripple hover-lift shadow-brand-lg px-8 py-4 text-lg font-semibold">
              <Plus className="w-6 h-6 mr-3" />
              新建仲裁
            </Button>
          </Link>
        </div>
      </div>

      {/* 快速统计 */}
      <div className="animate-slide-up" style={{animationDelay: '0.2s'}}>
        <QuickStats />
      </div>

      {/* Main Content Grid（将“我的案件”卡片前置并加重）*/}
      <div className="grid grid-cols-1 xl:grid-cols-5 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Left Column - Welcome + 我的案件（主要内容）*/}
        <div className="xl:col-span-3 lg:col-span-2 space-y-4 md:space-y-6">
          <div className="animate-slide-up card-responsive" style={{animationDelay: '0.3s'}}>
            <WelcomeCard />
          </div>
          <div className="animate-slide-up card-responsive" style={{animationDelay: '0.4s'}}>
            <MyCasesCard />
          </div>
        </div>

        {/* Right Column - 洞察与行动中心（扩展到更多空间）*/}
        <div className="xl:col-span-2 lg:col-span-2 space-y-4 md:space-y-6">
          <div className="animate-slide-up card-responsive" style={{animationDelay: '0.5s'}}>
            <SmartSuggestions pageContext="dashboard" />
          </div>
          <div className="animate-slide-up card-responsive" style={{animationDelay: '0.6s'}}>
            <SmartInsights />
          </div>
          <div className="animate-slide-up card-responsive" style={{animationDelay: '0.7s'}}>
            <ActionCenterCard />
          </div>
        </div>
      </div>
    </div>
  );
}
