/**
 * 权限管理系统
 * 
 * 提供基于角色的访问控制（RBAC）
 */

import { create } from 'zustand';

// ==================== 类型定义 ====================

export type Role = 'owner' | 'editor' | 'commenter' | 'viewer';

export type Permission =
  | 'canvas.view'
  | 'canvas.edit'
  | 'canvas.delete'
  | 'element.create'
  | 'element.update'
  | 'element.delete'
  | 'comment.create'
  | 'comment.update'
  | 'comment.delete'
  | 'user.invite'
  | 'user.remove'
  | 'permission.manage';

export interface RolePermissions {
  role: Role;
  permissions: Permission[];
  description: string;
}

export interface UserPermission {
  userId: string;
  canvasId: string;
  role: Role;
  grantedAt: string;
  grantedBy: string;
}

export interface InvitationLink {
  id: string;
  canvasId: string;
  role: Role;
  expiresAt: string;
  createdBy: string;
  createdAt: string;
  usedCount: number;
  maxUses?: number;
}

export interface PermissionLog {
  id: string;
  canvasId: string;
  userId: string;
  action: string;
  details: string;
  timestamp: string;
}

// ==================== 角色权限定义 ====================

export const ROLE_PERMISSIONS: Record<Role, RolePermissions> = {
  owner: {
    role: 'owner',
    description: '拥有者 - 完全控制权限',
    permissions: [
      'canvas.view',
      'canvas.edit',
      'canvas.delete',
      'element.create',
      'element.update',
      'element.delete',
      'comment.create',
      'comment.update',
      'comment.delete',
      'user.invite',
      'user.remove',
      'permission.manage',
    ],
  },
  editor: {
    role: 'editor',
    description: '编辑者 - 可以编辑画布和元素',
    permissions: [
      'canvas.view',
      'canvas.edit',
      'element.create',
      'element.update',
      'element.delete',
      'comment.create',
      'comment.update',
    ],
  },
  commenter: {
    role: 'commenter',
    description: '评论者 - 只能查看和评论',
    permissions: [
      'canvas.view',
      'comment.create',
      'comment.update',
    ],
  },
  viewer: {
    role: 'viewer',
    description: '查看者 - 只能查看',
    permissions: [
      'canvas.view',
    ],
  },
};

// ==================== 权限Store ====================

interface PermissionStore {
  // 用户权限
  userPermissions: Map<string, UserPermission>;

  // 邀请链接
  invitationLinks: Map<string, InvitationLink>;

  // 权限日志
  permissionLogs: PermissionLog[];

  // 当前用户角色
  currentUserRole: Role | null;

  // 操作
  setUserRole: (userId: string, canvasId: string, role: Role, grantedBy: string) => void;
  removeUser: (userId: string, canvasId: string) => void;
  createInvitationLink: (canvasId: string, role: Role, createdBy: string, expiresInDays?: number, maxUses?: number) => InvitationLink;
  revokeInvitationLink: (linkId: string) => void;
  useInvitationLink: (linkId: string) => boolean;
  checkPermission: (userId: string, permission: Permission) => boolean;
  getUserRole: (userId: string, canvasId: string) => Role | null;
  logPermissionAction: (canvasId: string, userId: string, action: string, details: string) => void;
  getPermissionLogs: (canvasId: string, limit?: number) => PermissionLog[];
}

export const usePermissionStore = create<PermissionStore>((set, get) => ({
  // ==================== 初始状态 ====================

  userPermissions: new Map(),
  invitationLinks: new Map(),
  permissionLogs: [],
  currentUserRole: null,

  // ==================== 用户权限管理 ====================

  setUserRole: (userId, canvasId, role, grantedBy) => {
    const { userPermissions } = get();
    const key = `${userId}-${canvasId}`;

    const permission: UserPermission = {
      userId,
      canvasId,
      role,
      grantedAt: new Date().toISOString(),
      grantedBy,
    };

    const newPermissions = new Map(userPermissions);
    newPermissions.set(key, permission);
    set({ userPermissions: newPermissions });

    // 记录日志
    get().logPermissionAction(
      canvasId,
      userId,
      'role_changed',
      `角色变更为: ${role}`
    );
  },

  removeUser: (userId, canvasId) => {
    const { userPermissions } = get();
    const key = `${userId}-${canvasId}`;

    const newPermissions = new Map(userPermissions);
    newPermissions.delete(key);
    set({ userPermissions: newPermissions });

    // 记录日志
    get().logPermissionAction(
      canvasId,
      userId,
      'user_removed',
      '用户被移除'
    );
  },

  // ==================== 邀请链接管理 ====================

  createInvitationLink: (canvasId, role, createdBy, expiresInDays = 7, maxUses) => {
    const link: InvitationLink = {
      id: `invite-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      canvasId,
      role,
      expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString(),
      createdBy,
      createdAt: new Date().toISOString(),
      usedCount: 0,
      maxUses,
    };

    const { invitationLinks } = get();
    const newLinks = new Map(invitationLinks);
    newLinks.set(link.id, link);
    set({ invitationLinks: newLinks });

    // 记录日志
    get().logPermissionAction(
      canvasId,
      createdBy,
      'invitation_created',
      `创建邀请链接，角色: ${role}`
    );

    return link;
  },

  revokeInvitationLink: (linkId) => {
    const { invitationLinks } = get();
    const link = invitationLinks.get(linkId);

    if (link) {
      const newLinks = new Map(invitationLinks);
      newLinks.delete(linkId);
      set({ invitationLinks: newLinks });

      // 记录日志
      get().logPermissionAction(
        link.canvasId,
        link.createdBy,
        'invitation_revoked',
        `撤销邀请链接: ${linkId}`
      );
    }
  },

  useInvitationLink: (linkId) => {
    const { invitationLinks } = get();
    const link = invitationLinks.get(linkId);

    if (!link) {
      console.error('[Permission] 邀请链接不存在');
      return false;
    }

    // 检查是否过期
    if (new Date(link.expiresAt) < new Date()) {
      console.error('[Permission] 邀请链接已过期');
      return false;
    }

    // 检查使用次数
    if (link.maxUses && link.usedCount >= link.maxUses) {
      console.error('[Permission] 邀请链接已达到最大使用次数');
      return false;
    }

    // 更新使用次数
    const updatedLink = {
      ...link,
      usedCount: link.usedCount + 1,
    };

    const newLinks = new Map(invitationLinks);
    newLinks.set(linkId, updatedLink);
    set({ invitationLinks: newLinks });

    return true;
  },

  // ==================== 权限检查 ====================

  checkPermission: (_userId, permission) => {
    const { currentUserRole } = get();

    if (!currentUserRole) {
      return false;
    }

    const rolePermissions = ROLE_PERMISSIONS[currentUserRole];
    return rolePermissions.permissions.includes(permission);
  },

  getUserRole: (userId, canvasId) => {
    const { userPermissions } = get();
    const key = `${userId}-${canvasId}`;
    const permission = userPermissions.get(key);
    return permission?.role || null;
  },

  // ==================== 权限日志 ====================

  logPermissionAction: (canvasId, userId, action, details) => {
    const { permissionLogs } = get();

    const log: PermissionLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      canvasId,
      userId,
      action,
      details,
      timestamp: new Date().toISOString(),
    };

    const newLogs = [...permissionLogs, log];

    // 限制日志数量（最多1000条）
    if (newLogs.length > 1000) {
      newLogs.shift();
    }

    set({ permissionLogs: newLogs });
  },

  getPermissionLogs: (canvasId, limit = 50) => {
    const { permissionLogs } = get();
    return permissionLogs
      .filter(log => log.canvasId === canvasId)
      .slice(-limit)
      .reverse();
  },
}));

// ==================== 辅助函数 ====================

/**
 * 检查用户是否有权限执行操作
 */
export function hasPermission(role: Role | null, permission: Permission): boolean {
  if (!role) return false;
  const rolePermissions = ROLE_PERMISSIONS[role];
  return rolePermissions.permissions.includes(permission);
}

/**
 * 获取角色的所有权限
 */
export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role].permissions;
}

/**
 * 比较两个角色的权限级别
 */
export function compareRoles(role1: Role, role2: Role): number {
  const roleOrder: Role[] = ['owner', 'editor', 'commenter', 'viewer'];
  return roleOrder.indexOf(role1) - roleOrder.indexOf(role2);
}

/**
 * 检查角色是否可以授予另一个角色
 */
export function canGrantRole(granterRole: Role, targetRole: Role): boolean {
  // 只有owner可以授予owner角色
  if (targetRole === 'owner') {
    return granterRole === 'owner';
  }

  // 其他情况，授予者的权限必须高于或等于目标角色
  return compareRoles(granterRole, targetRole) <= 0;
}

