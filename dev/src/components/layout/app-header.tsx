// src/components/layout/app-header.tsx
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RoleSwitcher, useRole } from '@/components/layout/role-switcher';
import { NotificationTrigger } from '@/components/layout/notification-panel';
import { GlobalSearch } from '@/components/search/global-search';
import { PerformanceMonitor } from '@/components/performance/performance-monitor';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  Bell,
  Search,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Activity,
  Bot,
  Eye,
  EyeOff
} from 'lucide-react';
import { useUserStore } from '@/store';
import { useAIAssistantStore } from '@/store/ai-assistant';
import { useRouter } from 'next/navigation';
import { useConfirmationDialog } from '@/components/ui/confirmation-dialog';

export function AppHeader() {
  const { currentUser: user, profile, logout } = useUserStore();
  const { currentRole, setCurrentRole, availableRoles } = useRole();
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPerformanceOpen, setIsPerformanceOpen] = useState(false);
  const { isVisible: isAIAssistantVisible, toggleVisible } = useAIAssistantStore();
  const { showConfirmation, ConfirmationDialog } = useConfirmationDialog();

  // 安全退出登录处理函数
  const handleLogout = () => {
    showConfirmation({
      title: '退出登录',
      message: '确定要退出登录吗？\n\n为了您的账户安全，建议您：\n• 清除浏览器缓存\n• 关闭所有相关标签页\n• 确保在安全环境下操作',
      type: 'warning',
      onConfirm: async () => {
        try {
          const csrfToken = document.cookie
            .split('; ')
            .find((c) => c.startsWith('csrf-token='))
            ?.split('=')[1];

          await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include',
            headers: csrfToken
              ? { 'x-csrf-token': decodeURIComponent(csrfToken) }
              : undefined,
          });
        } catch {}
        // 清除用户状态
        logout();
        // 清除本地存储
        localStorage.clear();
        sessionStorage.clear();
        // 跳转到登录页
        router.push('/login');
      }
    });
  };

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setIsSearchOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const profileDisplayName =
    profile && 'realName' in profile
      ? profile.realName
      : profile && 'companyName' in profile
        ? profile.companyName
        : null;
  const displayName = profileDisplayName || user?.email?.split('@')[0] || '用户';
  const displayInitial = displayName.charAt(0);
  const userTypeLabel = user?.userType === 'enterprise' ? '企业用户' : '个人用户';

  return (
    <header className="h-16 border-b border-border bg-white flex items-center justify-between px-2 sm:px-4 md:px-6 relative">
      {/* Left Section */}
      <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4 min-w-0 flex-shrink-0">
        <SidebarTrigger />

        {/* 全局搜索 - 桌面版 */}
        <div className="hidden lg:flex items-center space-x-2">
          <Button
            variant="outline"
            className="w-64 xl:w-80 justify-start text-muted-foreground"
            onClick={() => setIsSearchOpen(true)}
          >
            <Search className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">搜索案件、文档、仲裁员...</span>
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 flex-shrink-0">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
        </div>

        {/* 平板搜索按钮 */}
        <div className="hidden md:flex lg:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSearchOpen(true)}
            className="w-32"
          >
            <Search className="w-4 h-4 mr-2" />
            <span className="text-sm">搜索</span>
          </Button>
        </div>

        {/* 移动端搜索按钮 */}
        <div className="md:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSearchOpen(true)}
          >
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Center Section - Role Switcher */}
      <div className="hidden xl:flex items-center absolute left-1/2 transform -translate-x-1/2">
        <RoleSwitcher
          currentRole={currentRole}
          onRoleChange={setCurrentRole}
          availableRoles={availableRoles}
          className="hover:bg-gray-50"
        />
      </div>

      {/* Spacer for mobile */}
      <div className="flex-1 xl:hidden" />

      {/* Right Section */}
      <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3 lg:space-x-4 flex-shrink-0">
        {/* Role Switcher for mobile/tablet */}
        <div className="xl:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs">
                <Badge variant="outline" className="text-xs px-2 py-1">
                  {currentRole === 'arbitrator' ? '仲裁员' :
                   currentRole === 'applicant' ? '申请人' : '被申请人'}
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {availableRoles.map((role) => (
                <DropdownMenuItem
                  key={role}
                  onClick={() => setCurrentRole(role)}
                  className={currentRole === role ? 'bg-orange-50' : ''}
                >
                  {role === 'arbitrator' ? '仲裁员' :
                   role === 'applicant' ? '申请人' : '被申请人'}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* AI Assistant Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleVisible}
          title={isAIAssistantVisible ? "隐藏AI助手" : "显示AI助手"}
          className={`relative flex-shrink-0 transition-all duration-200 ${
            isAIAssistantVisible ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'hover:bg-gray-100'
          }`}
        >
          <Bot className="w-4 h-4" />
          {isAIAssistantVisible ? (
            <Eye className="w-2 h-2 absolute -top-1 -right-1 text-green-500" />
          ) : (
            <EyeOff className="w-2 h-2 absolute -top-1 -right-1 text-gray-400" />
          )}
        </Button>

        {/* Notifications */}
        <NotificationTrigger />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-1 sm:space-x-2 h-auto p-1 sm:p-2 hover-lift group flex-shrink-0">
              <Avatar className="w-7 h-7 sm:w-8 sm:h-8 group-hover:scale-110 transition-transform duration-300">
                <AvatarFallback className="bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs sm:text-sm shadow-brand">
                  {displayInitial}
                </AvatarFallback>
              </Avatar>
              <div className="hidden lg:flex flex-col items-start min-w-0">
                <span className="text-sm font-medium text-gray-900 group-hover:text-orange-700 transition-colors truncate max-w-20 xl:max-w-none">
                  {displayName}
                </span>
                <span className="text-xs text-gray-600 group-hover:text-orange-500 transition-colors truncate max-w-20 xl:max-w-none">
                  {userTypeLabel}
                </span>
              </div>
              <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 group-hover:text-orange-500 transition-all duration-300 group-data-[state=open]:rotate-180 flex-shrink-0" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-56 shadow-brand-lg border border-orange-100 bg-white rounded-lg"
            sideOffset={8}
          >
            <DropdownMenuLabel className="bg-gradient-to-r from-orange-50 to-orange-100 border-b border-orange-200">
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-medium text-gray-900">{displayName}</span>
                <span className="text-xs text-gray-600">{user?.email || ''}</span>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            {/* 移除“设置与帮助”菜单项，避免与独立设置页重复入口 */}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="flex items-center space-x-2 cursor-pointer hover:bg-orange-50 focus:bg-orange-50"
              onClick={() => setIsPerformanceOpen(true)}
            >
              <Activity className="w-4 h-4 text-green-600" />
              <span>性能监控</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="flex items-center space-x-2 cursor-pointer text-red-600 hover:bg-red-50 focus:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              <span>退出登录</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 全局搜索组件 */}
      <GlobalSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* 性能监控组件 */}
      <PerformanceMonitor
        isVisible={isPerformanceOpen}
        onClose={() => setIsPerformanceOpen(false)}
      />

      {/* 确认对话框 */}
      <ConfirmationDialog />
    </header>
  );
}
