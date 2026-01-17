// dev/src/components/home/cta-auth.tsx
'use client';

// 小型鉴权CTA组件：根据是否登录决定跳转到仪表盘或登录/注册
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useUserStore } from '@/store';

interface Props {
  primaryLabel?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
}

export function CTAAuthButtons({
  primaryLabel = '立即申请仲裁',
  size = 'lg',
}: Props) {
  const router = useRouter();
  // 临时简化：直接跳转到角色选择页面，避免store相关的无限循环问题
  // const isAuthenticated = useUserStore((s) => s.isAuthenticated);

  function handlePrimary() {
    // 临时简化逻辑，直接跳转到角色选择
    router.push('/role-selection');
  }

  return (
    <div className="flex items-center justify-center">
      <Button size={size} className="btn-primary btn-ripple px-8 py-3 text-lg hover-lift" onClick={handlePrimary}>
        {primaryLabel}
        <ArrowRight className="w-5 h-5 ml-2" />
      </Button>
    </div>
  );
}

