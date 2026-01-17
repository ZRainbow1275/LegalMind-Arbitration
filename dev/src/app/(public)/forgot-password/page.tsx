// dev/src/app/(public)/forgot-password/page.tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, ArrowRight, Scale, CheckCircle, Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 简单的邮箱验证
      if (!email.includes('@')) {
        throw new Error('请输入有效的邮箱地址');
      }

      setIsSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败，请重试');
    } finally {
      setIsLoading(false);
    }
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
            <h1 className="text-2xl font-bold text-foreground">找回密码</h1>
            <p className="text-muted-foreground mt-1">通过邮箱接收重置链接</p>
          </div>
        </div>

        <Card className="shadow-brand-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-center">
              {isSubmitted ? '邮件已发送' : '账户验证'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isSubmitted ? (
              <div className="space-y-4 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">重置链接已发送</h3>
                  <p className="text-gray-600 mb-4">
                    我们已向 <strong>{email}</strong> 发送了密码重置链接。
                    请检查您的邮箱（包括垃圾邮件文件夹）。
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    链接将在 24 小时后过期。如果您没有收到邮件，请检查邮箱地址是否正确。
                  </p>
                </div>
                <div className="space-y-3">
                  <Button
                    onClick={() => {
                      setIsSubmitted(false);
                      setEmail('');
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    重新发送
                  </Button>
                  <Button asChild className="w-full bg-primary-500 hover:bg-primary-600 text-white">
                    <Link href="/login">
                      返回登录
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
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
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="请输入注册邮箱"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                    />
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
                      发送中...
                    </>
                  ) : (
                    <>
                      发送重置链接
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

