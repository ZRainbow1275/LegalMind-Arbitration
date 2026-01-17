// src/config/navigation.ts
import {
  LayoutDashboard,
  FileText,
  Users,
  Video,
  Gavel,
  Settings,
  Calendar,
  FolderOpen,
  Scale,
  MessageSquare,
  BarChart3,
  Shield,
  Bell,
  Archive,
  Bot
} from 'lucide-react';
import type { UserRole } from '@/components/layout/role-switcher';
import type { CapabilityNavKey, UserCapabilities } from '@/lib/capabilities';

export interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  children?: NavigationItem[];
  navKey?: CapabilityNavKey; // 对齐后端下发的 capabilities.nav
  roles?: UserRole[]; // 允许访问的角色
  permissions?: string[]; // 需要的权限
}

// 基础导航配置
export const baseNavigationItems: NavigationItem[] = [
  {
    name: '工作台',
    href: '/dashboard',
    icon: LayoutDashboard,
    navKey: 'dashboard',
    roles: ['applicant', 'respondent', 'lawyer', 'arbitrator', 'mediator', 'admin', 'court', 'notary']
  },
  {
    name: '案件管理',
    href: '/cases',
    icon: FileText,
    navKey: 'cases',
    roles: ['applicant', 'respondent', 'lawyer', 'arbitrator', 'mediator', 'admin', 'court', 'notary'],
    children: [
      {
        name: '我的案件',
        href: '/cases',
        icon: FileText,
        roles: ['applicant', 'respondent', 'lawyer', 'admin']
      },
      {
        name: '新建申请',
        href: '/cases/new',
        icon: FileText,
        roles: ['applicant', 'lawyer', 'admin']
      },
      {
        name: '草稿箱',
        href: '/cases/drafts',
        icon: FolderOpen,
        roles: ['applicant', 'respondent', 'lawyer', 'admin']
      },
      {
        name: '案件审理',
        href: '/cases/review',
        icon: Scale,
        roles: ['arbitrator', 'mediator', 'admin']
      },
      {
        name: '案件分配',
        href: '/cases/assignment',
        icon: Users,
        roles: ['arbitrator', 'admin']
      }
    ]
  },
  {
    name: '庭审管理',
    href: '/hearing',
    icon: Video,
    navKey: 'hearings',
    roles: ['applicant', 'respondent', 'lawyer', 'arbitrator', 'mediator', 'admin'],
    children: [
      {
        name: '庭审安排',
        href: '/hearing/schedule',
        icon: Calendar,
        roles: ['arbitrator', 'mediator', 'admin']
      },
      {
        name: '在线庭审',
        href: '/hearing/online',
        icon: Video,
        roles: ['applicant', 'respondent', 'lawyer', 'arbitrator', 'mediator', 'admin']
      },
      {
        name: '庭审记录',
        href: '/hearing/records',
        icon: Archive,
        roles: ['applicant', 'respondent', 'lawyer', 'arbitrator', 'mediator', 'admin']
      }
    ]
  },
  {
    name: '仲裁员库',
    href: '/arbitrators',
    icon: Gavel,
    navKey: 'arbitrators',
    roles: ['applicant', 'respondent', 'lawyer', 'arbitrator', 'mediator', 'admin', 'court', 'notary']
  },
  {
    name: '文档管理',
    href: '/documents',
    icon: FolderOpen,
    navKey: 'documents',
    roles: ['applicant', 'respondent', 'lawyer', 'arbitrator', 'mediator', 'admin', 'court', 'notary'],
    children: [
      {
        name: '文档库',
        href: '/documents',
        icon: FolderOpen,
        roles: ['applicant', 'respondent', 'lawyer', 'arbitrator', 'mediator', 'admin', 'court', 'notary']
      },
      {
        name: '文书生成',
        href: '/documents/generate',
        icon: FileText,
        roles: ['applicant', 'respondent', 'lawyer', 'arbitrator', 'mediator', 'admin']
      },
      {
        name: '模板管理',
        href: '/documents/templates',
        icon: Archive,
        roles: ['arbitrator', 'mediator', 'admin']
      }
    ]
  },
  {
    name: '调解服务',
    href: '/mediation',
    icon: MessageSquare,
    navKey: 'mediation',
    roles: ['applicant', 'respondent', 'lawyer', 'arbitrator', 'mediator', 'admin'],
    children: [
      {
        name: '调解申请',
        href: '/mediation/apply',
        icon: MessageSquare,
        roles: ['applicant', 'respondent', 'lawyer', 'admin']
      },
      {
        name: '调解管理',
        href: '/mediation/management',
        icon: Settings,
        roles: ['applicant', 'respondent', 'lawyer', 'arbitrator', 'mediator', 'admin']
      }
    ]
  },
  {
    name: '日程安排',
    href: '/schedule',
    icon: Calendar,
    navKey: 'schedule',
    roles: ['applicant', 'respondent', 'lawyer', 'arbitrator', 'mediator', 'admin']
  },
  {
    name: '消息中心',
    href: '/messages',
    icon: Bell,
    navKey: 'messages',
    roles: ['applicant', 'respondent', 'lawyer', 'arbitrator', 'mediator', 'admin', 'court', 'notary']
  },
  {
    name: 'AI智能助手',
    href: '/ai-assistant',
    icon: Bot,
    badge: 'NEW',
    navKey: 'ai-assistant',
    roles: ['applicant', 'respondent', 'lawyer', 'arbitrator', 'mediator', 'admin']
  },
  {
    name: '统计报告',
    href: '/reports',
    icon: BarChart3,
    navKey: 'reports',
    roles: ['arbitrator', 'mediator', 'admin', 'auditor', 'court', 'notary'],
    children: [
      {
        name: '案件统计',
        href: '/reports/cases',
        icon: BarChart3,
        roles: ['arbitrator', 'mediator', 'admin', 'auditor', 'court', 'notary']
      },
      {
        name: '效率分析',
        href: '/reports/efficiency',
        icon: BarChart3,
        roles: ['arbitrator', 'mediator', 'admin', 'auditor', 'court', 'notary']
      }
    ]
  },
  {
    name: '运维后台',
    href: '/ops',
    icon: Shield,
    navKey: 'ops',
    roles: ['ops']
  },

];

// 根据用户角色过滤导航项
export function getNavigationForRole(
  role: UserRole,
  capabilities?: UserCapabilities | null
): NavigationItem[] {
  const allowedNav = capabilities?.nav ? new Set(capabilities.nav) : null;

  return baseNavigationItems
    .filter((item) => {
      if (allowedNav && item.navKey && !allowedNav.has(item.navKey)) return false;
      return !item.roles || item.roles.includes(role);
    })
    .map((item) => {
      const resolvedHref =
        item.navKey === 'dashboard' && role === 'arbitrator'
          ? '/arbitrator/dashboard'
          : item.href;

      const filteredChildren = item.children?.filter(
        (child) => !child.roles || child.roles.includes(role)
      );

      return {
        ...item,
        href: resolvedHref,
        children: filteredChildren && filteredChildren.length > 0 ? filteredChildren : undefined,
      };
    });
}

// 快捷操作配置
export const quickActions = {
  applicant: [
    {
      name: '新建仲裁申请',
      href: '/cases/new',
      icon: FileText,
      description: '提交新的仲裁申请',
      color: 'orange'
    },
    {
      name: '查看我的案件',
      href: '/cases',
      icon: FolderOpen,
      description: '查看案件进度',
      color: 'blue'
    },
    {
      name: '上传证据',
      href: '/documents',
      icon: FolderOpen,
      description: '上传案件证据',
      color: 'green'
    },
    {
      name: 'AI智能助手',
      href: '/ai-assistant',
      icon: Bot,
      description: '获取AI法律建议',
      color: 'purple'
    }
  ],
  respondent: [
    {
      name: '提交答辩书',
      href: '/cases',
      icon: FileText,
      description: '回应仲裁申请',
      color: 'orange'
    },
    {
      name: '查看案件详情',
      href: '/cases',
      icon: FolderOpen,
      description: '查看案件信息',
      color: 'blue'
    },
    {
      name: '申请调解',
      href: '/mediation',
      icon: MessageSquare,
      description: '申请调解服务',
      color: 'green'
    },
    {
      name: 'AI智能助手',
      href: '/ai-assistant',
      icon: Bot,
      description: '获取AI法律建议',
      color: 'purple'
    }
  ],
  arbitrator: [
    {
      name: '案件审理',
      href: '/cases/review',
      icon: Scale,
      description: '审理分配的案件',
      color: 'purple'
    },
    {
      name: '安排庭审',
      href: '/hearing/schedule',
      icon: Calendar,
      description: '安排庭审时间',
      color: 'blue'
    },
    {
      name: '制作裁决书',
      href: '/documents/generate',
      icon: FileText,
      description: '生成仲裁文书',
      color: 'green'
    },
    {
      name: 'AI智能助手',
      href: '/ai-assistant',
      icon: Bot,
      description: '获取AI法律建议',
      color: 'purple'
    }
  ]
};

// 面包屑导航配置
export const breadcrumbConfig: Record<string, string[]> = {
  '/dashboard': ['工作台'],
  '/cases': ['案件管理', '我的案件'],
  '/cases/new': ['案件管理', '新建申请'],
  '/cases/drafts': ['案件管理', '草稿箱'],
  '/cases/review': ['案件管理', '案件审理'],
  '/hearing': ['庭审管理'],
  '/hearing/schedule': ['庭审管理', '庭审安排'],
  '/hearing/online': ['庭审管理', '在线庭审'],
  '/arbitrators': ['仲裁员', '仲裁员库'],
  '/documents': ['文档管理', '文档库'],
  '/documents/generate': ['文档管理', '文书生成'],
  '/mediation': ['调解服务'],
  '/schedule': ['日程安排'],
  '/ai-assistant': ['AI智能助手'],
  '/reports': ['统计报告'],
  '/settings': ['系统设置']
};

// 页面权限配置
export const pagePermissions: Record<string, UserRole[]> = {
  '/dashboard': ['applicant', 'respondent', 'arbitrator'],
  '/cases': ['applicant', 'respondent', 'arbitrator'],
  '/cases/new': ['applicant'],
  '/cases/drafts': ['applicant', 'respondent'],
  '/cases/review': ['arbitrator'],
  '/hearing': ['applicant', 'respondent', 'arbitrator'],
  '/hearing/schedule': ['arbitrator'],
  '/arbitrators': ['applicant', 'respondent', 'arbitrator'],
  '/arbitrators/management': ['arbitrator'],
  '/documents': ['applicant', 'respondent', 'arbitrator'],
  '/documents/generate': ['applicant', 'respondent', 'arbitrator'],
  '/documents/templates': ['arbitrator'],
  '/mediation': ['applicant', 'respondent', 'arbitrator'],
  '/schedule': ['applicant', 'respondent', 'arbitrator'],
  '/ai-assistant': ['applicant', 'respondent', 'arbitrator'],
  '/reports': ['arbitrator'],
  '/settings': ['applicant', 'respondent', 'arbitrator']
};

// 检查用户是否有权限访问页面
export function hasPagePermission(path: string, role: UserRole): boolean {
  const permissions = pagePermissions[path];
  return !permissions || permissions.includes(role);
}
