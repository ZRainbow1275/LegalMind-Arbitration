// src/app/(private)/layout.tsx
'use client';

import { useEffect } from 'react';

import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { RoleProvider } from '@/components/layout/role-switcher';
import { useAuthGuard } from '@/middleware/auth-guard';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { AppFooter } from '@/components/layout/app-footer';
import { useDataSync } from '@/hooks/useDataSync';
import { FloatingAIAssistant } from '@/components/ai/floating-ai-assistant';
import { dataSyncManager } from '@/lib/data-sync';

// 内部组件，在RoleProvider内部处理数据同步
function PrivateLayoutInner({ children }: { children: React.ReactNode }) {
  // 启用数据同步管理（在RoleProvider内部）
  useDataSync();

  // 启动数据同步管理器
  useEffect(() => {
    dataSyncManager.startAutoSync();

    return () => {
      dataSyncManager.stopAutoSync();
    };
  }, []);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/30">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <AppHeader />
          <main className="flex-1 p-6">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>
          <AppFooter />
        </div>
      </div>
    </SidebarProvider>
  );
}

export default function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useAuthGuard();

  // 启用会话超时管理
  useSessionTimeout({
    timeoutMinutes: 30, // 30分钟超时
    warningMinutes: 5,  // 5分钟前警告
  });

  return (
    <ErrorBoundary>
      <RoleProvider>
        <PrivateLayoutInner>
          {children}
        </PrivateLayoutInner>

        {/* 全平台AI助手 */}
        <FloatingAIAssistant />
      </RoleProvider>
    </ErrorBoundary>
  );
}
