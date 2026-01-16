/**
 * 权限控制服务
 * 
 * 管理用户对画布的访问权限
 */

/**
 * 用户角色
 */
export type PlatformRoleKey =
  | 'END_USER'
  | 'LAWYER'
  | 'ARBITRATOR'
  | 'MEDIATOR'
  | 'COURT'
  | 'NOTARY'
  | 'ADMIN'
  | 'OPS_ADMIN'
  | 'AUDITOR_READONLY'
  | 'APPLICANT'
  | 'RESPONDENT';

export type LegacyUserRole =
  | 'admin'
  | 'arbitrator'
  | 'mediator'
  | 'lawyer'
  | 'ops'
  | 'auditor'
  | 'court'
  | 'notary'
  | 'end_user'
  | 'applicant'
  | 'respondent'
  | 'observer';

export type UserRole = PlatformRoleKey | LegacyUserRole;

function normalizeRole(role: UserRole): PlatformRoleKey {
  switch (role) {
    case 'ADMIN':
    case 'OPS_ADMIN':
    case 'AUDITOR_READONLY':
    case 'ARBITRATOR':
    case 'MEDIATOR':
    case 'LAWYER':
    case 'END_USER':
    case 'COURT':
    case 'NOTARY':
    case 'APPLICANT':
    case 'RESPONDENT':
      return role;

    case 'admin':
      return 'ADMIN';
    case 'ops':
      return 'OPS_ADMIN';
    case 'auditor':
    case 'observer':
      return 'AUDITOR_READONLY';
    case 'arbitrator':
      return 'ARBITRATOR';
    case 'mediator':
      return 'MEDIATOR';
    case 'lawyer':
      return 'LAWYER';
    case 'end_user':
      return 'END_USER';
    case 'court':
      return 'COURT';
    case 'notary':
      return 'NOTARY';
    case 'applicant':
      return 'APPLICANT';
    case 'respondent':
      return 'RESPONDENT';
  }
}

/**
 * 权限类型
 */
export type Permission = 
  | 'view-canvas'           // 查看画布
  | 'edit-canvas'           // 编辑画布
  | 'add-node'              // 添加节点
  | 'delete-node'           // 删除节点
  | 'edit-node'             // 编辑节点
  | 'add-connection'        // 添加连接
  | 'delete-connection'     // 删除连接
  | 'view-document'         // 查看文档
  | 'upload-document'       // 上传文档
  | 'delete-document'       // 删除文档
  | 'export-canvas'         // 导出画布
  | 'manage-permissions';   // 管理权限

/**
 * 角色权限映射
 */
const rolePermissions: Record<PlatformRoleKey, Permission[]> = {
  ADMIN: [
    'view-canvas',
    'edit-canvas',
    'add-node',
    'delete-node',
    'edit-node',
    'add-connection',
    'delete-connection',
    'view-document',
    'upload-document',
    'delete-document',
    'export-canvas',
    'manage-permissions',
  ],
  OPS_ADMIN: [
    'view-canvas',
    'view-document',
    'export-canvas',
    'manage-permissions',
  ],
  AUDITOR_READONLY: [
    'view-canvas',
    'view-document',
    'export-canvas',
  ],
  ARBITRATOR: [
    'view-canvas',
    'edit-canvas',
    'add-node',
    'delete-node',
    'edit-node',
    'add-connection',
    'delete-connection',
    'view-document',
    'upload-document',
    'export-canvas',
  ],
  MEDIATOR: [
    'view-canvas',
    'edit-canvas',
    'add-node',
    'delete-node',
    'edit-node',
    'add-connection',
    'delete-connection',
    'view-document',
    'upload-document',
    'export-canvas',
  ],
  LAWYER: [
    'view-canvas',
    'edit-canvas',
    'add-node',
    'edit-node',
    'add-connection',
    'view-document',
    'upload-document',
    'export-canvas',
  ],
  END_USER: [
    'view-canvas',
    'edit-canvas',
    'add-node',
    'edit-node',
    'add-connection',
    'view-document',
    'upload-document',
    'export-canvas',
  ],
  APPLICANT: [
    'view-canvas',
    'edit-canvas',
    'add-node',
    'edit-node',
    'add-connection',
    'view-document',
    'upload-document',
    'export-canvas',
  ],
  RESPONDENT: [
    'view-canvas',
    'edit-canvas',
    'add-node',
    'edit-node',
    'add-connection',
    'view-document',
    'upload-document',
    'export-canvas',
  ],
  COURT: [
    'view-canvas',
    'view-document',
    'export-canvas',
  ],
  NOTARY: [
    'view-canvas',
    'view-document',
    'export-canvas',
  ],
};

/**
 * 用户信息
 */
export interface User {
  id: string;
  role: UserRole;
  caseId: string;
}

/**
 * 权限控制服务
 */
export class PermissionControl {
  private currentUser: User | null = null;

  /**
   * 设置当前用户
   */
  setCurrentUser(user: User): void {
    this.currentUser = { ...user, role: normalizeRole(user.role) };
    console.log(
      `[PermissionControl] 当前用户: ${user.id}, 角色: ${this.currentUser.role}`
    );
  }

  /**
   * 获取当前用户
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * 检查权限
   */
  hasPermission(permission: Permission): boolean {
    if (!this.currentUser) {
      console.warn('[PermissionControl] 未设置当前用户');
      return false;
    }

    const permissions = rolePermissions[normalizeRole(this.currentUser.role)];
    const hasPermission = permissions.includes(permission);

    if (!hasPermission) {
      console.warn(`[PermissionControl] 用户 ${this.currentUser.id} 没有权限: ${permission}`);
    }

    return hasPermission;
  }

  /**
   * 检查多个权限（需要全部满足）
   */
  hasAllPermissions(permissions: Permission[]): boolean {
    return permissions.every(p => this.hasPermission(p));
  }

  /**
   * 检查多个权限（满足任意一个即可）
   */
  hasAnyPermission(permissions: Permission[]): boolean {
    return permissions.some(p => this.hasPermission(p));
  }

  /**
   * 获取用户的所有权限
   */
  getUserPermissions(): Permission[] {
    if (!this.currentUser) {
      return [];
    }

    return rolePermissions[normalizeRole(this.currentUser.role)];
  }

  /**
   * 检查是否可以查看画布
   */
  canViewCanvas(): boolean {
    return this.hasPermission('view-canvas');
  }

  /**
   * 检查是否可以编辑画布
   */
  canEditCanvas(): boolean {
    return this.hasPermission('edit-canvas');
  }

  /**
   * 检查是否可以添加节点
   */
  canAddNode(): boolean {
    return this.hasPermission('add-node');
  }

  /**
   * 检查是否可以删除节点
   */
  canDeleteNode(): boolean {
    return this.hasPermission('delete-node');
  }

  /**
   * 检查是否可以编辑节点
   */
  canEditNode(): boolean {
    return this.hasPermission('edit-node');
  }

  /**
   * 检查是否可以添加连接
   */
  canAddConnection(): boolean {
    return this.hasPermission('add-connection');
  }

  /**
   * 检查是否可以删除连接
   */
  canDeleteConnection(): boolean {
    return this.hasPermission('delete-connection');
  }

  /**
   * 检查是否可以查看文档
   */
  canViewDocument(): boolean {
    return this.hasPermission('view-document');
  }

  /**
   * 检查是否可以上传文档
   */
  canUploadDocument(): boolean {
    return this.hasPermission('upload-document');
  }

  /**
   * 检查是否可以删除文档
   */
  canDeleteDocument(): boolean {
    return this.hasPermission('delete-document');
  }

  /**
   * 检查是否可以导出画布
   */
  canExportCanvas(): boolean {
    return this.hasPermission('export-canvas');
  }

  /**
   * 检查是否可以管理权限
   */
  canManagePermissions(): boolean {
    return this.hasPermission('manage-permissions');
  }

  /**
   * 获取角色的所有权限
   */
  getRolePermissions(role: UserRole): Permission[] {
    return rolePermissions[normalizeRole(role)];
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.currentUser = null;
  }
}

/**
 * 全局权限控制实例
 */
export const permissionControl = new PermissionControl();
