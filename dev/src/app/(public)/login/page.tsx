// src/app/(public)/login/page.tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Scale, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff,
  ArrowRight,
  Shield,
  Smartphone,
} from 'lucide-react';
import { AuthStatus } from '@/components/debug/auth-status';
import { z } from 'zod';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phone: '',
    verificationCode: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleOidcLogin = () => {
    router.push('/api/auth/oidc/start?returnTo=/role-selection&client=app');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 手机号登录交给统一身份（OIDC/IdP）完成，避免本地实现短信/验证码 mock
    if (loginMethod === 'phone') {
      handleOidcLogin();
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });

      const json: unknown = await res.json().catch(() => null);
      const errorSchema = z.object({
        success: z.literal(false),
        error: z.object({ message: z.string() }).optional(),
      });
      const okSchema = z.object({ success: z.literal(true) });

      if (!res.ok) {
        const parsedError = errorSchema.safeParse(json);
        setErrorMessage(parsedError.success ? (parsedError.data.error?.message || '登录失败') : '登录失败');
        return;
      }

      if (!okSchema.safeParse(json).success) {
        setErrorMessage('登录失败');
        return;
      }

      router.replace('/role-selection');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '登录失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Title */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center shadow-brand">
              <Scale className="w-8 h-8 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">欢迎回到 LegalMind</h1>
            <p className="text-muted-foreground mt-1">登录您的仲裁账户</p>
          </div>
        </div>

        {/* Login Form */}
        <Card className="shadow-brand-lg border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center">账户登录</CardTitle>
            <div className="flex items-center justify-center space-x-2">
              <Badge variant="secondary" className="bg-success-50 text-success-700">
                <Shield className="w-3 h-3 mr-1" />
                安全登录
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* 登录方式切换 */}
            <div className="flex space-x-2 p-1 bg-gray-100 rounded-lg">
              <Button
                type="button"
                variant={loginMethod === 'email' ? 'default' : 'ghost'}
                size="sm"
                className="flex-1"
                onClick={() => setLoginMethod('email')}
              >
                <Mail className="w-4 h-4 mr-2" />
                邮箱登录
              </Button>
              <Button
                type="button"
                variant={loginMethod === 'phone' ? 'default' : 'ghost'}
                size="sm"
                className="flex-1"
                onClick={() => setLoginMethod('phone')}
              >
                <Smartphone className="w-4 h-4 mr-2" />
                手机登录
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {loginMethod === 'email' ? (
                <>
                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      邮箱地址
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="请输入您的邮箱地址"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      密码
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="请输入您的密码"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="pl-10 pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                    手机号登录由统一身份（OIDC/IdP）提供，请点击下方按钮跳转完成认证。
                  </div>
                  <Button type="button" className="w-full" onClick={handleOidcLogin}>
                    前往统一身份登录
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </>
              )}

              {/* Remember & Forgot - 只在邮箱登录时显示 */}
              {loginMethod === 'email' && (
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" className="rounded border-border" />
                    <span className="text-muted-foreground">记住我</span>
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    忘记密码？
                  </Link>
                </div>
              )}

              {errorMessage && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                  {errorMessage}
                </div>
              )}

              {/* Login Button */}
              {loginMethod === 'email' && (
                <Button
                  type="submit"
                  className="w-full bg-primary-500 hover:bg-primary-600 text-white"
                  size="lg"
                  disabled={submitting}
                >
                  {submitting ? '登录中...' : '登录'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </form>

            {/* Register Link */}
            <div className="text-center text-sm">
              <span className="text-muted-foreground">还没有账户？</span>
              <Link 
                href="/register" 
                className="text-primary-600 hover:text-primary-700 transition-colors ml-1 font-medium"
              >
                立即注册
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="text-center text-xs text-muted-foreground">
          <p>登录即表示您同意我们的
            <Link href="/terms" className="text-primary-600 hover:underline">服务条款</Link> 和
            <Link href="/privacy" className="text-primary-600 hover:underline">隐私政策</Link>
          </p>
        </div>

        {/* Debug Component */}
        <AuthStatus />
      </div>
    </div>
  );
}
