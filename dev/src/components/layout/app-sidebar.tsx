// src/components/layout/app-sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import {
  Scale,
  ChevronRight,
  Settings,
} from 'lucide-react';
import { getNavigationForRole } from '@/config/navigation';
import { useRole } from '@/components/layout/role-switcher';
import { useUserStore } from '@/store';
import { logger } from '@/lib/logger';

// 底部导航项
const bottomItems = [
  {
    name: '设置与帮助',
    href: '/settings',
    icon: Settings,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const { currentRole } = useRole();
  const { capabilities } = useUserStore();
  // 进入时默认展开包含当前路径的分组
  useEffect(()=>{
    // 如果 pathname 包含某分组 href 前缀，则展开该分组名称
    const groupsToExpand: string[] = [];
    const nav = getNavigationForRole(currentRole, capabilities);
    nav.forEach(item=>{
      if(item.children && (pathname===item.href || pathname.startsWith(item.href + '/'))){
        groupsToExpand.push(item.name);
      }
    });
    if(groupsToExpand.length>0) setExpandedItems(prev=> Array.from(new Set([...prev, ...groupsToExpand])));
  },[pathname, currentRole, capabilities]);

  // 根据用户角色获取导航项
  const navigationItems = getNavigationForRole(currentRole, capabilities);

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev =>
      prev.includes(itemName)
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  const isExpanded = (itemName: string) => expandedItems.includes(itemName);
  // 折叠状态持久化
  useEffect(() => {
    try {
      localStorage.setItem('sidebar_expanded', JSON.stringify(expandedItems));
    } catch (e) {
      logger.error({ err: e }, 'Failed to persist sidebar expansion state');
    }
  }, [expandedItems]);

  useEffect(() => {
    try {
      const s = localStorage.getItem('sidebar_expanded');
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) setExpandedItems(parsed);
      }
    } catch (e) {
      logger.error({ err: e }, 'Failed to restore sidebar expansion state');
    }
  }, []);


  return (
    <Sidebar className="border-r border-border">
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center space-x-2 group hover-lift">
          <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-brand group-hover:shadow-brand-lg transition-all duration-300 group-hover:scale-110">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-900 group-hover:text-orange-700 transition-colors">LegalMind</span>
            <span className="text-xs text-gray-600 -mt-1 group-hover:text-orange-500 transition-colors">Arbitrate</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarMenu>
          {navigationItems.map((item) => (
            <SidebarMenuItem key={item.name}>
              {item.children ? (
                // 有子菜单的项目
                <div>
                  <SidebarMenuButton
                    onClick={() => toggleExpanded(item.name)}
                    isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                    className="w-full nav-item hover-lift"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-3">
                        <item.icon className="w-5 h-5" />
                        <span>{item.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {item.badge && (
                          <Badge variant="secondary" className="bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-brand">
                            {item.badge}
                          </Badge>
                        )}
                        <div className={`transition-transform duration-300 ${isExpanded(item.name) ? 'rotate-90' : ''}`}>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </SidebarMenuButton>

                  {/* 子菜单动画容器 */}
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isExpanded(item.name) ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}>
                    <div className="ml-8 mt-2 space-y-1 animate-slide-up">
                      {item.children.map((child, index) => (
                        <SidebarMenuButton
                          key={child.name}
                          asChild
                          isActive={pathname === child.href || pathname.startsWith(child.href + '/')}
                          size="sm"
                          className="nav-item-animate hover-lift"
                          style={{animationDelay: `${index * 0.1}s`}}
                        >
                          <Link href={child.href} className="text-sm text-gray-600 hover:text-orange-700 transition-colors">
                            {child.name}
                          </Link>
                        </SidebarMenuButton>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                // 没有子菜单的项目
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                  className="w-full nav-item hover-lift"
                >
                  <Link href={item.href} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <item.icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <Badge variant="secondary" className="bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-brand">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          {bottomItems.map((item) => (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                size="sm"
              >
                <Link href={item.href} className="flex items-center space-x-3">
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm">{item.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
