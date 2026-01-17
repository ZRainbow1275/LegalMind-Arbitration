// dev/src/lib/security/rbac.ts
// 基于角色的访问控制（RBAC）系统 - 等保三级标准

/**
 * 系统权限枚举
 * 细粒度权限控制到具体操作
 */
export enum Permission {
  // 用户管理权限
  USER_VIEW = 'user:view',
  USER_CREATE = 'user:create',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_MANAGE_ROLES = 'user:manage_roles',
  
  // 案件管理权限
  CASE_VIEW_OWN = 'case:view_own',
  CASE_VIEW_ALL = 'case:view_all',
  CASE_CREATE = 'case:create',
  CASE_UPDATE_OWN = 'case:update_own',
  CASE_UPDATE_ALL = 'case:update_all',
  CASE_DELETE_OWN = 'case:delete_own',
  CASE_DELETE_ALL = 'case:delete_all',
  CASE_ASSIGN = 'case:assign',
  
  // 文档管理权限
  DOCUMENT_VIEW_OWN = 'document:view_own',
  DOCUMENT_VIEW_ALL = 'document:view_all',
  DOCUMENT_UPLOAD = 'document:upload',
  DOCUMENT_DELETE_OWN = 'document:delete_own',
  DOCUMENT_DELETE_ALL = 'document:delete_all',
  DOCUMENT_DOWNLOAD = 'document:download',
  
  // 庭审管理权限
  HEARING_VIEW_OWN = 'hearing:view_own',
  HEARING_VIEW_ALL = 'hearing:view_all',
  HEARING_CREATE = 'hearing:create',
  HEARING_UPDATE = 'hearing:update',
  HEARING_DELETE = 'hearing:delete',
  HEARING_CONDUCT = 'hearing:conduct',
  
  // 调解管理权限
  MEDIATION_VIEW_OWN = 'mediation:view_own',
  MEDIATION_VIEW_ALL = 'mediation:view_all',
  MEDIATION_CREATE = 'mediation:create',
  MEDIATION_UPDATE = 'mediation:update',
  MEDIATION_APPROVE = 'mediation:approve',
  
  // 文书生成权限
  DOCUMENT_TEMPLATE_VIEW = 'template:view',
  DOCUMENT_TEMPLATE_CREATE = 'template:create',
  DOCUMENT_TEMPLATE_UPDATE = 'template:update',
  DOCUMENT_TEMPLATE_DELETE = 'template:delete',
  DOCUMENT_GENERATE = 'document:generate',
  
  // AI功能权限
  AI_OCR_USE = 'ai:ocr',
  AI_SPEECH_USE = 'ai:speech',
  AI_ASSISTANT_USE = 'ai:assistant',
  AI_ANALYSIS_USE = 'ai:analysis',
  
  // 系统管理权限
  SYSTEM_CONFIG_VIEW = 'system:config_view',
  SYSTEM_CONFIG_UPDATE = 'system:config_update',
  SYSTEM_AUDIT_VIEW = 'system:audit_view',
  SYSTEM_CACHE_MANAGE = 'system:cache_manage',
  SYSTEM_PERFORMANCE_VIEW = 'system:performance_view',
  
  // 批量操作权限
  BATCH_IMPORT = 'batch:import',
  BATCH_EXPORT = 'batch:export',
  BATCH_DELETE = 'batch:delete',
}

/**
 * 系统角色定义
 * 每个角色包含一组权限
 */
export const RolePermissions: Record<string, Permission[]> = {
  // 超级管理员 - 拥有所有权限
  SUPER_ADMIN: Object.values(Permission),
  
  // 系统管理员 - 系统配置和用户管理
  ADMIN: [
    Permission.USER_VIEW,
    Permission.USER_CREATE,
    Permission.USER_UPDATE,
    Permission.USER_MANAGE_ROLES,
    Permission.CASE_VIEW_ALL,
    Permission.DOCUMENT_VIEW_ALL,
    Permission.HEARING_VIEW_ALL,
    Permission.MEDIATION_VIEW_ALL,
    Permission.SYSTEM_CONFIG_VIEW,
    Permission.SYSTEM_CONFIG_UPDATE,
    Permission.SYSTEM_AUDIT_VIEW,
    Permission.SYSTEM_CACHE_MANAGE,
    Permission.SYSTEM_PERFORMANCE_VIEW,
    Permission.BATCH_IMPORT,
    Permission.BATCH_EXPORT,
  ],
  
  // 仲裁员 - 案件处理和庭审主持
  ARBITRATOR: [
    Permission.USER_VIEW,
    Permission.CASE_VIEW_ALL,
    Permission.CASE_UPDATE_ALL,
    Permission.CASE_ASSIGN,
    Permission.DOCUMENT_VIEW_ALL,
    Permission.DOCUMENT_UPLOAD,
    Permission.DOCUMENT_DOWNLOAD,
    Permission.DOCUMENT_GENERATE,
    Permission.HEARING_VIEW_ALL,
    Permission.HEARING_CREATE,
    Permission.HEARING_UPDATE,
    Permission.HEARING_CONDUCT,
    Permission.MEDIATION_VIEW_ALL,
    Permission.MEDIATION_CREATE,
    Permission.MEDIATION_UPDATE,
    Permission.MEDIATION_APPROVE,
    Permission.DOCUMENT_TEMPLATE_VIEW,
    Permission.AI_OCR_USE,
    Permission.AI_SPEECH_USE,
    Permission.AI_ASSISTANT_USE,
    Permission.AI_ANALYSIS_USE,
  ],
  
  // 书记员 - 案件协助和文档管理
  CLERK: [
    Permission.USER_VIEW,
    Permission.CASE_VIEW_ALL,
    Permission.CASE_CREATE,
    Permission.CASE_UPDATE_ALL,
    Permission.DOCUMENT_VIEW_ALL,
    Permission.DOCUMENT_UPLOAD,
    Permission.DOCUMENT_DOWNLOAD,
    Permission.DOCUMENT_GENERATE,
    Permission.HEARING_VIEW_ALL,
    Permission.HEARING_CREATE,
    Permission.HEARING_UPDATE,
    Permission.MEDIATION_VIEW_ALL,
    Permission.DOCUMENT_TEMPLATE_VIEW,
    Permission.AI_OCR_USE,
    Permission.AI_SPEECH_USE,
    Permission.AI_ASSISTANT_USE,
  ],
  
  // 当事人 - 查看和管理自己的案件
  PARTY: [
    Permission.CASE_VIEW_OWN,
    Permission.CASE_CREATE,
    Permission.CASE_UPDATE_OWN,
    Permission.DOCUMENT_VIEW_OWN,
    Permission.DOCUMENT_UPLOAD,
    Permission.DOCUMENT_DOWNLOAD,
    Permission.HEARING_VIEW_OWN,
    Permission.MEDIATION_VIEW_OWN,
    Permission.AI_OCR_USE,
  ],
  
  // 代理人 - 代表当事人参与案件
  AGENT: [
    Permission.CASE_VIEW_OWN,
    Permission.CASE_UPDATE_OWN,
    Permission.DOCUMENT_VIEW_OWN,
    Permission.DOCUMENT_UPLOAD,
    Permission.DOCUMENT_DOWNLOAD,
    Permission.HEARING_VIEW_OWN,
    Permission.MEDIATION_VIEW_OWN,
    Permission.AI_OCR_USE,
    Permission.AI_ASSISTANT_USE,
  ],
  
  // 观察员 - 只读权限
  OBSERVER: [
    Permission.CASE_VIEW_ALL,
    Permission.DOCUMENT_VIEW_ALL,
    Permission.HEARING_VIEW_ALL,
    Permission.MEDIATION_VIEW_ALL,
  ],
};

/**
 * 权限检查器
 */
export class PermissionChecker {
  /**
   * 检查用户是否拥有指定权限
   * @param userRoles 用户角色列表
   * @param requiredPermission 需要的权限
   * @returns 是否拥有权限
   */
  static hasPermission(userRoles: string[], requiredPermission: Permission): boolean {
    for (const role of userRoles) {
      const permissions = RolePermissions[role];
      if (permissions && permissions.includes(requiredPermission)) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * 检查用户是否拥有所有指定权限
   * @param userRoles 用户角色列表
   * @param requiredPermissions 需要的权限列表
   * @returns 是否拥有所有权限
   */
  static hasAllPermissions(userRoles: string[], requiredPermissions: Permission[]): boolean {
    return requiredPermissions.every(permission => 
      this.hasPermission(userRoles, permission)
    );
  }
  
  /**
   * 检查用户是否拥有任一指定权限
   * @param userRoles 用户角色列表
   * @param requiredPermissions 需要的权限列表
   * @returns 是否拥有任一权限
   */
  static hasAnyPermission(userRoles: string[], requiredPermissions: Permission[]): boolean {
    return requiredPermissions.some(permission => 
      this.hasPermission(userRoles, permission)
    );
  }
  
  /**
   * 获取用户的所有权限
   * @param userRoles 用户角色列表
   * @returns 权限列表
   */
  static getUserPermissions(userRoles: string[]): Permission[] {
    const permissions = new Set<Permission>();
    
    for (const role of userRoles) {
      const rolePermissions = RolePermissions[role];
      if (rolePermissions) {
        rolePermissions.forEach(p => permissions.add(p));
      }
    }
    
    return Array.from(permissions);
  }
  
  /**
   * 检查用户是否为管理员
   * @param userRoles 用户角色列表
   * @returns 是否为管理员
   */
  static isAdmin(userRoles: string[]): boolean {
    return userRoles.includes('SUPER_ADMIN') || userRoles.includes('ADMIN');
  }
  
  /**
   * 检查用户是否为仲裁员
   * @param userRoles 用户角色列表
   * @returns 是否为仲裁员
   */
  static isArbitrator(userRoles: string[]): boolean {
    return userRoles.includes('ARBITRATOR');
  }
}

/**
 * 资源所有权检查器
 * 用于检查用户是否拥有特定资源的访问权限
 */
export class ResourceOwnershipChecker {
  /**
   * 检查用户是否为案件参与者
   * @param userId 用户ID
   * @param caseParticipants 案件参与者列表
   * @returns 是否为参与者
   */
  static isCaseParticipant(userId: string, caseParticipants: { userId: string }[]): boolean {
    return caseParticipants.some(p => p.userId === userId);
  }
  
  /**
   * 检查用户是否为文档所有者
   * @param userId 用户ID
   * @param documentOwnerId 文档所有者ID
   * @returns 是否为所有者
   */
  static isDocumentOwner(userId: string, documentOwnerId: string): boolean {
    return userId === documentOwnerId;
  }
  
  /**
   * 检查用户是否可以访问资源
   * @param userId 用户ID
   * @param userRoles 用户角色
   * @param resourceOwnerId 资源所有者ID
   * @param viewAllPermission 查看所有资源的权限
   * @returns 是否可以访问
   */
  static canAccessResource(
    userId: string,
    userRoles: string[],
    resourceOwnerId: string,
    viewAllPermission: Permission
  ): boolean {
    // 如果是资源所有者，可以访问
    if (userId === resourceOwnerId) {
      return true;
    }
    
    // 如果有查看所有资源的权限，可以访问
    if (PermissionChecker.hasPermission(userRoles, viewAllPermission)) {
      return true;
    }
    
    return false;
  }
}

/**
 * 权限装饰器工厂
 * 用于保护API路由
 */
export function requirePermission(...permissions: Permission[]) {
  return function (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      // 从请求中获取用户信息（需要在中间件中设置）
      const request = args[0] as { user?: { roles?: unknown } } | undefined;
      const user = request?.user;
      
      if (!user) {
        throw new Error('未授权：用户未登录');
      }
      
      const userRoles = Array.isArray(user.roles) ? (user.roles as string[]) : [];
      
      // 检查权限
      if (!PermissionChecker.hasAllPermissions(userRoles, permissions)) {
        throw new Error('权限不足：缺少必要的权限');
      }
      
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}
