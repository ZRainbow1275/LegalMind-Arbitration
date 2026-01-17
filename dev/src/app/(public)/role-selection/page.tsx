// src/app/(public)/role-selection/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShieldCheck } from 'lucide-react';
import { z } from 'zod';
import { mapPlatformRolesToPersonas, type PlatformRoleKey } from '@/lib/capabilities';
import { ROLE_INFOS, type UserRole } from '@/components/layout/role-switcher';

export default function RoleSelectionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string>('');
  const [platformRoles, setPlatformRoles] = useState<PlatformRoleKey[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const platformRoleSchema = z.enum([
      'END_USER',
      'LAWYER',
      'ARBITRATOR',
      'MEDIATOR',
      'COURT',
      'NOTARY',
      'ADMIN',
      'OPS_ADMIN',
      'AUDITOR_READONLY',
      'APPLICANT',
      'RESPONDENT',
    ]);

    const meSchema = z.object({
      success: z.literal(true),
      data: z.object({
        user: z.object({
          email: z.string().email(),
        }),
        platformRoles: z.array(platformRoleSchema).default([]),
      }),
    });

    const load = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        const json: unknown = await res.json().catch(() => null);

        if (!res.ok) {
          if (!cancelled) router.replace('/login');
          return;
        }

        const parsed = meSchema.safeParse(json);
        if (!parsed.success) {
          if (!cancelled) {
            setErrorMessage('无法获取当前登录信息，请重新登录');
            router.replace('/login');
          }
          return;
        }

        if (cancelled) return;
        setEmail(parsed.data.data.user.email);
        setPlatformRoles(parsed.data.data.platformRoles as PlatformRoleKey[]);
      } catch (e) {
        if (cancelled) return;
        setErrorMessage(e instanceof Error ? e.message : '加载失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const availableRoles = useMemo<UserRole[]>(() => {
    if (platformRoles.length === 0) return [];
    return mapPlatformRolesToPersonas(platformRoles) as UserRole[];
  }, [platformRoles]);

  const roleCards = useMemo(
    () => ROLE_INFOS.filter((role) => availableRoles.includes(role.id)),
    [availableRoles]
  );

  const resolveEntryPath = (role: UserRole): string => {
    switch (role) {
      case 'arbitrator':
        return '/arbitrator/dashboard';
      case 'ops':
        return '/ops';
      case 'auditor':
        return '/reports';
      default:
        return '/dashboard';
    }
  };

  function chooseRole(role: UserRole) {
    try {
      localStorage.setItem('userRole', role);
    } catch {}
    router.replace(resolveEntryPath(role));
  }

  return (
    <div className="min-h-screen bg-gray-50 text-foreground">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center">
            <ShieldCheck className="w-5 h-5 mr-2 text-primary-600" />
            选择您的身份
          </h1>
          <Badge className="bg-primary-600">{loading ? '加载中' : '已登录'}</Badge>
        </div>
        <Separator className="bg-gray-200" />

        {errorMessage && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {errorMessage}
          </div>
        )}

        {!loading && (
          <div className="text-sm text-muted-foreground">
            当前账号：<span className="font-medium text-foreground">{email}</span>
          </div>
        )}

        {!loading && roleCards.length === 0 ? (
          <div className="text-sm text-yellow-800 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
            当前账号未分配任何可用身份，请联系管理员分配平台角色后再登录。
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {roleCards.map((role) => {
              const Icon = role.icon;
              return (
                <Card key={role.id} className="border border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Icon className={`w-5 h-5 ${role.color}`} />
                      {role.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                    <Button
                      disabled={loading}
                      className="w-full"
                      onClick={() => chooseRole(role.id)}
                    >
                      以{role.name}身份进入
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          说明：可选身份由后台下发的 platformRoles 决定；如需开通更多身份（律师/仲裁员/调解员/法院/公证/运维等），请联系管理员分配权限。
        </div>

        <div className="text-xs">
          <Link href="/login" className="text-primary-600 hover:underline">
            返回登录
          </Link>
        </div>
      </div>
    </div>
  );
}

