// dev/src/app/(public)/register/page.tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Scale, Mail, Lock, IdCard, ShieldCheck, Building2, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [isEnterprise, setIsEnterprise] = useState(false);
  const [agree, setAgree] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agree) return alert('请先阅读并同意隐私政策与服务条款');
    // 原型：注册后跳转登录
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center shadow-brand">
              <Scale className="w-8 h-8 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold">创建仲裁账户</h1>
            <p className="text-muted-foreground mt-1">请填写您的基本信息</p>
          </div>
        </div>

        <Card className="shadow-brand-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">账户信息</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 基本信息 */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">邮箱</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="用于登录与通知" className="pl-10" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">密码</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="password" type="password" placeholder="至少8位，包含数字与字母" className="pl-10" required />
                  </div>
                </div>
              </div>

              {/* 实名/主体信息（等保三级指引） */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="realName">真实姓名</Label>
                  <div className="relative">
                    <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="realName" placeholder="与证件一致" className="pl-10" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="idNumber">证件号码</Label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="idNumber" placeholder="用于实名认证（加密存储）" className="pl-10" required />
                  </div>
                </div>
              </div>

              {/* 主体类型 */}
              <div className="md:col-span-2">
                <label className="flex items-center space-x-2 text-sm">
                  <input type="checkbox" onChange={(e) => setIsEnterprise(e.target.checked)} />
                  <span className="text-muted-foreground">我是企业/组织</span>
                </label>
              </div>

              {isEnterprise && (
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">企业名称</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="companyName" placeholder="统一社会信用代码登记名称" className="pl-10" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="uscCode">统一社会信用代码</Label>
                    <Input id="uscCode" placeholder="18位代码" />
                  </div>
                </div>
              )}

              {/* 条款 */}
              <div className="md:col-span-2 flex items-center justify-between">
                <label className="flex items-center space-x-2 text-sm">
                  <Checkbox id="agree" checked={agree} onCheckedChange={(v) => setAgree(!!v)} />
                  <span className="text-muted-foreground">
                    我已阅读并同意 <Link href="/privacy" className="text-primary-600">隐私政策</Link> 与 <Link href="/terms" className="text-primary-600">服务条款</Link>
                  </span>
                </label>
                <Button type="submit" className="bg-primary-500 hover:bg-primary-600 text-white">
                  完成注册
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              <div className="md:col-span-2 text-center text-sm text-muted-foreground">
                已有账户？ <Link href="/login" className="text-primary-600">登录</Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

