// dev/src/app/(public)/reset-password/page.tsx
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Lock, 
  ArrowRight, 
  Scale, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  Loader2,
  AlertTriangle 
} from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [tokenValid, setTokenValid] = useState(true);

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    // 验证token是否有效
    if (!token || !email) {
      setTokenValid(false);
      setError('重置链接无效或已过期');
    }
  }, [token, email]);

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return '密码至少需要8个字符';
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return '密码必须包含大小写字母和数字';
    }
    return '';
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // 验证密码
      const passwordError = validatePassword(password);
      if (passwordError) {
        throw new Error(passwordError);
      }

      if (password !== confirmPassword) {
        throw new Error('两次输入的密码不一致');
      }

      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setIsSuccess(true);
      
      // 3秒后跳转到登录页
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置失败，请重试');
    } finally {
      setIsLoading(false);
    }
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-red-500 rounded-2xl flex items-center justify-center shadow-brand">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">链接无效</h1>
              <p className="text-muted-foreground mt-1">重置链接无效或已过期</p>
            </div>
          </div>

          <Card className="shadow-brand-lg border-0">
            <CardContent className="pt-6 text-center">
              <p className="text-gray-600 mb-6">
                该重置链接可能已过期或无效。请重新申请密码重置。
              </p>
              <div className="space-y-3">
                <Button asChild className="w-full bg-primary-500 hover:bg-primary-600 text-white">
                  <Link href="/forgot-password">
                    重新申请重置
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/login">返回登录</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center shadow-brand">
              <Scale className="w-8 h-8 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">重置密码</h1>
            <p className="text-muted-foreground mt-1">为您的账户设置新密码</p>
          </div>
        </div>

        <Card className="shadow-brand-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-center">
              {isSuccess ? '密码重置成功' : '设置新密码'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isSuccess ? (
              <div className="space-y-4 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">密码重置成功</h3>
                  <p className="text-gray-600 mb-4">
                    您的密码已成功重置。正在跳转到登录页面...
                  </p>
                  <p className="text-sm text-gray-500">
                    如果没有自动跳转，请点击下方按钮
                  </p>
                </div>
                <Button asChild className="w-full bg-primary-500 hover:bg-primary-600 text-white">
                  <Link href="/login">
                    立即登录
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email">邮箱</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={email || ''} 
                    disabled 
                    className="bg-gray-50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">新密码</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="password" 
                      type={showPassword ? 'text' : 'password'}
                      placeholder="请输入新密码" 
                      className="pl-10 pr-10" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required 
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    密码至少8位，包含大小写字母和数字
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">确认密码</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="confirmPassword" 
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="请再次输入新密码" 
                      className="pl-10 pr-10" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required 
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-primary-500 hover:bg-primary-600 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      重置中...
                    </>
                  ) : (
                    <>
                      重置密码
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
                
                <div className="text-center text-sm text-muted-foreground">
                  <Link href="/login" className="text-primary-600 hover:text-primary-700">返回登录</Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
