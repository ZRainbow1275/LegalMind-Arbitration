// src/components/layout/role-switcher.tsx
'use client';


import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Scale,
  Users,
  ChevronDown,
  Check,
  UserCheck,
  Gavel,
  Shield,
  Building2,
  Stamp
} from 'lucide-react';
import { mapPlatformRolesToPersonas } from '@/lib/capabilities';

export type UserRole =
  | 'applicant'
  | 'respondent'
  | 'lawyer'
  | 'arbitrator'
  | 'mediator'
  | 'admin'
  | 'ops'
  | 'auditor'
  | 'court'
  | 'notary';

export interface RoleInfo {
  id: UserRole;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}

export const ROLE_INFOS: RoleInfo[] = [
  {
    id: 'applicant',
    name: '申请人',
    description: '仲裁申请方',
    icon: UserCheck,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    id: 'respondent',
    name: '被申请人',
    description: '仲裁被申请方',
    icon: Users,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50'
  },
  {
    id: 'lawyer',
    name: '律师',
    description: '代理/法律服务视角',
    icon: Scale,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50'
  },
  {
    id: 'arbitrator',
    name: '仲裁员',
    description: '仲裁案件审理员',
    icon: Gavel,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  {
    id: 'mediator',
    name: '调解员',
    description: '调解会议与程序推进',
    icon: Users,
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50'
  },
  {
    id: 'admin',
    name: '管理员',
    description: '业务后台管理',
    icon: Shield,
    color: 'text-slate-700',
    bgColor: 'bg-slate-50'
  },
  {
    id: 'ops',
    name: '运维后台',
    description: '配置/权限/审计管理',
    icon: Shield,
    color: 'text-red-700',
    bgColor: 'bg-red-50'
  },
  {
    id: 'auditor',
    name: '审计',
    description: '只读审计与导出',
    icon: Shield,
    color: 'text-gray-700',
    bgColor: 'bg-gray-50'
  },
  {
    id: 'court',
    name: '法院',
    description: '司法确认/执行对接',
    icon: Building2,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50'
  },
  {
    id: 'notary',
    name: '公证机构',
    description: '存证/时间戳对接',
    icon: Stamp,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50'
  }
];

interface RoleSwitcherProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  availableRoles?: UserRole[];
  className?: string;
}

export function RoleSwitcher({ 
  currentRole, 
  onRoleChange, 
  availableRoles = ['applicant', 'respondent', 'arbitrator'],
  className 
}: RoleSwitcherProps) {
  const currentRoleInfo = ROLE_INFOS.find(role => role.id === currentRole);
  const filteredRoles = ROLE_INFOS.filter(role => availableRoles.includes(role.id));

  if (!currentRoleInfo) return null;

  const CurrentIcon = currentRoleInfo.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className={`flex items-center space-x-2 h-auto p-2 hover-lift ${className}`}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${currentRoleInfo.bgColor}`}>
            <CurrentIcon className={`h-4 w-4 ${currentRoleInfo.color}`} />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium text-gray-900">{currentRoleInfo.name}</span>
            <span className="text-xs text-gray-500">{currentRoleInfo.description}</span>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-64 shadow-lg">
        <DropdownMenuLabel>
          <div className="flex items-center space-x-2">
            <Scale className="h-4 w-4 text-orange-500" />
            <span>切换身份</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {filteredRoles.map((role) => {
          const RoleIcon = role.icon;
          const isSelected = role.id === currentRole;
          
          return (
            <DropdownMenuItem
              key={role.id}
              onClick={() => onRoleChange(role.id)}
              className="flex items-center space-x-3 p-3 cursor-pointer"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${role.bgColor}`}>
                <RoleIcon className={`h-4 w-4 ${role.color}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{role.name}</span>
                  {isSelected && <Check className="h-4 w-4 text-green-600" />}
                </div>
                <p className="text-xs text-gray-500">{role.description}</p>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// 角色徽章组件
interface RoleBadgeProps {
  role: UserRole;
  size?: 'sm' | 'md' | 'lg';
}

export function RoleBadge({ role, size = 'md' }: RoleBadgeProps) {      
  const roleInfo = ROLE_INFOS.find(r => r.id === role);
  if (!roleInfo) return null;

  const sizeConfig = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  return (
    <Badge 
      className={`${roleInfo.bgColor} ${roleInfo.color} border-0 ${sizeConfig[size]}`}
    >
      {roleInfo.name}
    </Badge>
  );
}

// 角色权限检查 Hook
export function useRolePermissions(currentRole: UserRole) {
  const permissions = {
    applicant: {
      canSubmitApplication: true,
      canViewOwnCases: true,
      canUploadEvidence: true,
      canRequestMediation: true,
      canWithdrawCase: true,
      canChangeRequest: true,
      canViewArbitratorInfo: true,
      canManageCases: false,
      canAssignArbitrators: false,
      canIssueAwards: false
    },
    respondent: {
      canSubmitApplication: false,
      canViewOwnCases: true,
      canUploadEvidence: true,
      canSubmitDefense: true,
      canRequestMediation: true,
      canObjectJurisdiction: true,
      canViewArbitratorInfo: true,
      canManageCases: false,
      canAssignArbitrators: false,
      canIssueAwards: false
    },
    arbitrator: {
      canSubmitApplication: false,
      canViewOwnCases: false,
      canViewAllCases: true,
      canManageCases: true,
      canAssignArbitrators: true,
      canScheduleHearings: true,
      canReviewEvidence: true,
      canIssueAwards: true,
      canManageMediation: true,
      canMakeDecisions: true
    },
    lawyer: {
      canSubmitApplication: false,
      canViewOwnCases: true,
      canUploadEvidence: true,
      canRequestMediation: true,
      canWithdrawCase: false,
      canChangeRequest: true,
      canViewArbitratorInfo: true,
      canManageCases: false,
      canAssignArbitrators: false,
      canIssueAwards: false
    },
    mediator: {
      canSubmitApplication: false,
      canViewOwnCases: false,
      canViewAllCases: true,
      canManageCases: true,
      canAssignArbitrators: false,
      canScheduleHearings: false,
      canReviewEvidence: true,
      canIssueAwards: false,
      canManageMediation: true,
      canMakeDecisions: true
    },
    admin: {
      canSubmitApplication: false,
      canViewOwnCases: false,
      canViewAllCases: true,
      canManageCases: true,
      canAssignArbitrators: true,
      canScheduleHearings: true,
      canReviewEvidence: true,
      canIssueAwards: true,
      canManageMediation: true,
      canMakeDecisions: true
    },
    ops: {
      canSubmitApplication: false,
      canViewOwnCases: false,
      canViewAllCases: true,
      canManageCases: false,
      canAssignArbitrators: false,
      canScheduleHearings: false,
      canReviewEvidence: false,
      canIssueAwards: false,
      canManageMediation: false,
      canMakeDecisions: false
    },
    auditor: {
      canSubmitApplication: false,
      canViewOwnCases: false,
      canViewAllCases: true,
      canManageCases: false,
      canAssignArbitrators: false,
      canScheduleHearings: false,
      canReviewEvidence: true,
      canIssueAwards: false,
      canManageMediation: false,
      canMakeDecisions: false
    },
    court: {
      canSubmitApplication: false,
      canViewOwnCases: false,
      canViewAllCases: true,
      canManageCases: false,
      canAssignArbitrators: false,
      canScheduleHearings: false,
      canReviewEvidence: true,
      canIssueAwards: false,
      canManageMediation: false,
      canMakeDecisions: false
    },
    notary: {
      canSubmitApplication: false,
      canViewOwnCases: false,
      canViewAllCases: true,
      canManageCases: false,
      canAssignArbitrators: false,
      canScheduleHearings: false,
      canReviewEvidence: true,
      canIssueAwards: false,
      canManageMediation: false,
      canMakeDecisions: false
    }
  };

  return permissions[currentRole];
}

// 角色上下文提供者
import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useUserStore } from '@/store';

interface RoleContextType {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  permissions: ReturnType<typeof useRolePermissions>;
  availableRoles: UserRole[];
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

interface RoleProviderProps {
  children: ReactNode;
  initialRole?: UserRole;
}

export function RoleProvider({ children, initialRole = 'applicant' }: RoleProviderProps) {
  const { platformRoles } = useUserStore();
  const availableRoles = mapPlatformRolesToPersonas(platformRoles) as UserRole[];

  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('userRole');
      if (saved && ROLE_INFOS.some((r) => r.id === saved)) {
        // 检查保存的角色是否在可用角色列表中
        if (availableRoles.includes(saved as UserRole)) {
          return saved as UserRole;
        }
      }
    }
    return initialRole;
  });

  const permissions = useRolePermissions(currentRole);

  useEffect(() => {
    try { localStorage.setItem('userRole', currentRole); } catch {}
  }, [currentRole]);

  // 当用户变更时，检查当前角色是否仍然可用
  useEffect(() => {
    if (!availableRoles.includes(currentRole)) {
      const newRole = availableRoles[0] || 'applicant';
      if (newRole !== currentRole) {
        setCurrentRole(newRole);
      }
    }
  }, [availableRoles, currentRole]); // 移除user依赖，避免循环与 mock 推断

  return (
    <RoleContext.Provider value={{ currentRole, setCurrentRole, permissions, availableRoles }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    // 在开发环境中提供更详细的错误信息
    if (process.env.NODE_ENV === 'development') {
      console.error('useRole hook was called outside of RoleProvider. Make sure the component is wrapped with RoleProvider.');
    }
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}

// 角色保护组件
interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGuard({ allowedRoles, children, fallback = null }: RoleGuardProps) {
  const { currentRole } = useRole();
  
  if (!allowedRoles.includes(currentRole)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

// 权限保护组件
interface PermissionGuardProps {
  permission: keyof ReturnType<typeof useRolePermissions>;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGuard({ permission, children, fallback = null }: PermissionGuardProps) {
  const { permissions } = useRole();
  
  if (!permissions[permission]) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}
