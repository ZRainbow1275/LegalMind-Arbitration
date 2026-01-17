// src/components/hearing/hearing-access-guard.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Key,
  UserCheck,
  Calendar,
  ArrowLeft
} from 'lucide-react';
import { useHearingAccess } from '@/hooks/useHearingAccess';
import { useRole } from '@/components/layout/role-switcher';

interface HearingAccessGuardProps {
  hearingId: string;
  caseId: string;
  hearingCode?: string;
  startTime?: string;
  endTime?: string;
  requiresVerification?: boolean;
  children: React.ReactNode;
  onAccessGranted?: () => void;
}

export function HearingAccessGuard({
  hearingId,
  caseId,
  hearingCode,
  startTime,
  endTime,
  requiresVerification = true,
  children,
  onAccessGranted
}: HearingAccessGuardProps) {
  const router = useRouter();

  // 安全地获取角色，如果在RoleProvider外部则使用默认值
  let currentRole: string = 'applicant';
  try {
    const roleContext = useRole();
    currentRole = roleContext.currentRole;
  } catch (error) {
    // 如果在RoleProvider外部，使用默认角色
    console.warn('HearingAccessGuard: useRole called outside RoleProvider, using default role');
  }

  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');

  const { accessResult, verifyHearingCode, isCodeVerified } = useHearingAccess({
    hearingId,
    caseId,
    hearingCode,
    requiresVerification,
    allowedRoles: ['applicant', 'respondent', 'arbitrator'],
    startTime,
    endTime
  });

  // 处理庭审码验证
  const handleCodeSubmit = () => {
    if (!codeInput.trim()) {
      setCodeError('请输入庭审码');
      return;
    }

    const isValid = verifyHearingCode(codeInput);
    if (!isValid) {
      setCodeError('庭审码错误，请重新输入');
      setCodeInput('');
    } else {
      setCodeError('');
      if (onAccessGranted) {
        onAccessGranted();
      }
    }
  };

  // 格式化时间显示
  const formatTimeUntilStart = (minutes: number): string => {
    if (minutes <= 0) return '庭审已开始';
    if (minutes < 60) return `${minutes}分钟后开始`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}小时${remainingMinutes}分钟后开始`;
  };

  // 获取角色显示名称
  const getRoleDisplayName = (role: string): string => {
    switch (role) {
      case 'arbitrator': return '仲裁员';
      case 'applicant': return '申请人';
      case 'respondent': return '被申请人';
      default: return '参与者';
    }
  };

  // 如果有访问权限且不需要验证码，直接显示内容
  if (accessResult.hasAccess && !accessResult.requiresCode) {
    return <>{children}</>;
  }

  // 显示访问控制界面
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary-600" />
          </div>
          <CardTitle className="text-xl">庭审准入验证</CardTitle>
          <CardDescription>
            请完成身份验证以进入庭审
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 用户信息 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">当前身份</span>
              <Badge variant="secondary">
                {getRoleDisplayName(currentRole)}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">案件编号</span>
              <span className="text-sm font-medium">{caseId}</span>
            </div>
          </div>

          {/* 访问状态检查 */}
          {!accessResult.hasAccess && (
            <Alert variant={accessResult.reason?.includes('权限') ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {accessResult.reason}
              </AlertDescription>
            </Alert>
          )}

          {/* 时间信息 */}
          {accessResult.timeUntilStart !== undefined && accessResult.timeUntilStart > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">庭审时间</span>
              </div>
              <p className="text-sm text-blue-700">
                {formatTimeUntilStart(accessResult.timeUntilStart)}
              </p>
              {accessResult.canEnterWaiting && (
                <p className="text-xs text-blue-600 mt-1">
                  您可以进入等候室准备
                </p>
              )}
            </div>
          )}

          {/* 庭审码输入 */}
          {accessResult.requiresCode && !isCodeVerified && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  庭审码
                </label>
                <Input
                  type="text"
                  placeholder="请输入6位庭审码"
                  value={codeInput}
                  onChange={(e) => {
                    setCodeInput(e.target.value);
                    setCodeError('');
                  }}
                  maxLength={6}
                  className={codeError ? 'border-red-500' : ''}
                />
                {codeError && (
                  <p className="text-sm text-red-600">{codeError}</p>
                )}
              </div>
              <Button 
                onClick={handleCodeSubmit}
                className="w-full"
                disabled={!codeInput.trim()}
              >
                验证并进入
              </Button>
            </div>
          )}

          {/* 验证成功 */}
          {isCodeVerified && (
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">验证成功</span>
              </div>
              <p className="text-sm text-green-700">
                您已通过身份验证，可以进入庭审
              </p>
            </div>
          )}

          {/* 准入提示 */}
          {accessResult.hasAccess && (
            <div className="space-y-3">
              {accessResult.canEnterWaiting && (
                <Button 
                  onClick={() => router.push(`/hearings/${hearingId}/waiting`)}
                  className="w-full"
                  variant="outline"
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  进入等候室
                </Button>
              )}
              
              {accessResult.canEnterLive && (
                <Button 
                  onClick={() => router.push(`/hearings/${hearingId}/live`)}
                  className="w-full"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  进入庭审直播
                </Button>
              )}
            </div>
          )}

          {/* 返回按钮 */}
          <div className="pt-4 border-t">
            <Button 
              variant="ghost" 
              onClick={() => router.back()}
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
