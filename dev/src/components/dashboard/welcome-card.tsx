// src/components/dashboard/welcome-card.tsx
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Sparkles } from 'lucide-react';
import { mockUser, mockProfile } from '@/lib/mock-data';
import { formatDateTime } from '@/lib/utils';
import { useUserStore } from '@/store';
import { useRole } from '@/components/layout/role-switcher';

export function WelcomeCard() {
  // 使用真实的用户数据，fallback到mock数据
  const { currentUser, profile: userProfile } = useUserStore();
  const { currentRole } = useRole();
  const user = currentUser || mockUser;
  const profile = userProfile || mockProfile;
  const currentTime = new Date();

  const displayName =
    'realName' in profile
      ? (profile.realName ?? user.email)
      : 'companyName' in profile
        ? (profile.companyName ?? user.email)
        : user.email;

  const isVerified = profile?.verificationStatus === 'verified' || Boolean(profile?.verifiedAt);
  
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return '早上好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  const getTimeOfDay = () => {
    const hour = currentTime.getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  };

  const timeOfDay = getTimeOfDay();
  const gradientClass = {
    morning: 'from-orange-400 via-orange-500 to-orange-600',
    afternoon: 'from-primary-400 via-primary-500 to-primary-600',
    evening: 'from-orange-600 via-orange-700 to-orange-800',
    night: 'from-slate-600 via-slate-700 to-slate-800',
  }[timeOfDay];

  return (
    <Card className="relative overflow-hidden border-0 shadow-brand">
      {/* Background Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass}`} />
      
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12" />
      
      <CardContent className="relative p-6 text-white">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            {/* Greeting */}
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-white/80" />
                <span className="text-white/80 text-sm font-medium">
                  {getGreeting()}
                </span>
                </div>
                <h1 className="text-2xl font-bold">
                  {displayName}
                </h1>
              </div>

            {/* User Status */}
            <div className="flex items-center space-x-3">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                {user.userType === 'individual' ? '个人用户' : '企业用户'}
              </Badge>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                {currentRole === 'arbitrator' ? '仲裁员' : '当事人'}
              </Badge>
                <Badge
                  variant="secondary"
                  className={`${isVerified
                    ? 'bg-green-500/20 text-white border-green-400/30'    
                    : 'bg-yellow-500/20 text-white border-yellow-400/30'  
                  }`}
                >
                  {isVerified ? '已实名认证' : '待实名认证'}      
                </Badge>
              </div>

            {/* Quick Stats */}
            <div className="flex items-center space-x-6 text-sm text-white/80">
              <div>
                <span className="block text-white text-lg font-semibold">3</span>
                <span>进行中案件</span>
              </div>
              <div>
                <span className="block text-white text-lg font-semibold">1</span>
                <span>待开庭</span>
              </div>
              <div>
                <span className="block text-white text-lg font-semibold">5</span>
                <span>未读消息</span>
              </div>
            </div>
          </div>

          {/* Quick Action */}
          <div className="flex flex-col items-end space-y-3">
            <div className="text-right text-white/80 text-sm">
              <div>{formatDateTime(currentTime)}</div>
            </div>

            {/* 移除“新建申请”按钮，避免与页面主CTA重复 */}
          </div>
        </div>

        {/* Today's Focus */}
        <div className="mt-6 p-4 bg-white/10 rounded-lg backdrop-blur-sm">
          <h3 className="text-sm font-medium text-white/90 mb-2">今日重点</h3>
          <p className="text-sm text-white/80">
            您有 <span className="font-semibold text-white">2个紧急任务</span> 需要处理，
            其中 <span className="font-semibold text-white">1个答辩期限</span> 即将到期。
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
