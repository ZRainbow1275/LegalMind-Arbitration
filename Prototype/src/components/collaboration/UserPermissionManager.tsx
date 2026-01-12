import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Users,
  Shield,
  Eye,
  Trash2,
  UserPlus,
  Settings,
  Crown,
  Star,
  AlertTriangle,
  CheckCircle,
  Clock,
  Mail,
} from 'lucide-react';

// 用户角色定义
type UserRole =
  | 'admin' // 管理员
  | 'arbitrator' // 仲裁员
  | 'lawyer' // 律师
  | 'party' // 当事人
  | 'assistant' // 助理
  | 'observer'; // 观察员

// 权限类型定义
type Permission =
  | 'view_case' // 查看案件
  | 'edit_case' // 编辑案件
  | 'delete_case' // 删除案件
  | 'view_documents' // 查看文档
  | 'upload_documents' // 上传文档
  | 'edit_documents' // 编辑文档
  | 'delete_documents' // 删除文档
  | 'view_evidence' // 查看证据
  | 'submit_evidence' // 提交证据
  | 'challenge_evidence' // 质证
  | 'view_hearing' // 查看庭审
  | 'participate_hearing' // 参与庭审
  | 'manage_hearing' // 管理庭审
  | 'view_ai_analysis' // 查看AI分析
  | 'use_ai_tools' // 使用AI工具
  | 'export_data' // 导出数据
  | 'manage_users' // 管理用户
  | 'system_settings'; // 系统设置

// 用户数据结构
interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  permissions: Permission[];
  avatar?: string;
  organization?: string;
  title?: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  lastLogin?: string;
  createdAt: string;
  caseAccess: string[]; // 可访问的案件ID列表
  notes?: string;
}

// 角色权限配置
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'view_case', 'edit_case', 'delete_case',
    'view_documents', 'upload_documents', 'edit_documents', 'delete_documents',
    'view_evidence', 'submit_evidence', 'challenge_evidence',
    'view_hearing', 'participate_hearing', 'manage_hearing',
    'view_ai_analysis', 'use_ai_tools',
    'export_data', 'manage_users', 'system_settings'
  ],
  arbitrator: [
    'view_case', 'edit_case',
    'view_documents', 'upload_documents',
    'view_evidence', 'challenge_evidence',
    'view_hearing', 'participate_hearing', 'manage_hearing',
    'view_ai_analysis', 'use_ai_tools',
    'export_data'
  ],
  lawyer: [
    'view_case',
    'view_documents', 'upload_documents',
    'view_evidence', 'submit_evidence', 'challenge_evidence',
    'view_hearing', 'participate_hearing',
    'view_ai_analysis', 'use_ai_tools',
    'export_data'
  ],
  party: [
    'view_case',
    'view_documents', 'upload_documents',
    'view_evidence', 'submit_evidence',
    'view_hearing', 'participate_hearing'
  ],
  assistant: [
    'view_case',
    'view_documents', 'upload_documents',
    'view_evidence',
    'view_hearing'
  ],
  observer: [
    'view_case',
    'view_documents',
    'view_evidence',
    'view_hearing'
  ]
};

interface UserPermissionManagerProps {
  caseId: string;
  currentUser: User;
  onUserUpdate?: (user: User) => void;
  onUserRemove?: (userId: string) => void;
  onUserInvite?: (email: string, role: UserRole) => void;
}

export const UserPermissionManager: React.FC<UserPermissionManagerProps> = ({
  caseId,
  // currentUser,
  // onUserUpdate,
  // onUserRemove,
  onUserInvite
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('observer');
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending'>('all');

  // 初始化用户数据
  useEffect(() => {
    const mockUsers: User[] = [
      {
        id: 'user-001',
        name: '张仲裁员',
        email: 'zhang.arbitrator@legalmind.com',
        phone: '+86 138-0000-0001',
        role: 'arbitrator',
        permissions: ROLE_PERMISSIONS.arbitrator,
        avatar: '👨‍⚖️',
        organization: 'LegalMind仲裁院',
        title: '首席仲裁员',
        status: 'active',
        lastLogin: '2024-01-21 14:30',
        createdAt: '2024-01-01',
        caseAccess: [caseId],
        notes: '资深仲裁员，专业领域：商事争议'
      },
      {
        id: 'user-002',
        name: '李律师',
        email: 'li.lawyer@lawfirm.com',
        phone: '+86 138-0000-0002',
        role: 'lawyer',
        permissions: ROLE_PERMISSIONS.lawyer,
        avatar: '👩‍💼',
        organization: '金诚律师事务所',
        title: '合伙人律师',
        status: 'active',
        lastLogin: '2024-01-21 16:45',
        createdAt: '2024-01-05',
        caseAccess: [caseId],
        notes: '申请人代理律师'
      },
      {
        id: 'user-003',
        name: '王律师',
        email: 'wang.lawyer@lawfirm.com',
        phone: '+86 138-0000-0003',
        role: 'lawyer',
        permissions: ROLE_PERMISSIONS.lawyer,
        avatar: '👨‍💼',
        organization: '正义律师事务所',
        title: '高级律师',
        status: 'active',
        lastLogin: '2024-01-21 15:20',
        createdAt: '2024-01-08',
        caseAccess: [caseId],
        notes: '被申请人代理律师'
      },
      {
        id: 'user-004',
        name: '陈总经理',
        email: 'chen.ceo@company.com',
        phone: '+86 138-0000-0004',
        role: 'party',
        permissions: ROLE_PERMISSIONS.party,
        avatar: '👔',
        organization: '科技有限公司',
        title: '总经理',
        status: 'active',
        lastLogin: '2024-01-20 10:15',
        createdAt: '2024-01-10',
        caseAccess: [caseId],
        notes: '申请人法定代表人'
      },
      {
        id: 'user-005',
        name: '刘助理',
        email: 'liu.assistant@lawfirm.com',
        role: 'assistant',
        permissions: ROLE_PERMISSIONS.assistant,
        avatar: '👩‍💻',
        organization: '金诚律师事务所',
        title: '律师助理',
        status: 'pending',
        createdAt: '2024-01-20',
        caseAccess: [caseId],
        notes: '待确认参与'
      }
    ];
    setUsers(mockUsers);
  }, [caseId]);

  // 获取角色配置
  const getRoleConfig = (role: UserRole) => {
    const configs = {
      admin: { label: '管理员', color: 'bg-red-500', textColor: 'text-red-700', icon: Crown },
      arbitrator: { label: '仲裁员', color: 'bg-purple-500', textColor: 'text-purple-700', icon: Shield },
      lawyer: { label: '律师', color: 'bg-blue-500', textColor: 'text-blue-700', icon: Star },
      party: { label: '当事人', color: 'bg-green-500', textColor: 'text-green-700', icon: Users },
      assistant: { label: '助理', color: 'bg-yellow-500', textColor: 'text-yellow-700', icon: Settings },
      observer: { label: '观察员', color: 'bg-gray-500', textColor: 'text-gray-700', icon: Eye }
    };
    return configs[role];
  };

  // 获取状态配置
  const getStatusConfig = (status: User['status']) => {
    const configs = {
      active: { label: '活跃', color: 'bg-green-100 text-green-700', icon: CheckCircle },
      inactive: { label: '非活跃', color: 'bg-gray-100 text-gray-700', icon: Clock },
      pending: { label: '待确认', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
      suspended: { label: '已暂停', color: 'bg-red-100 text-red-700', icon: AlertTriangle }
    };
    return configs[status];
  };



  // 更新用户角色
  const updateUserRole = useCallback((userId: string, newRole: UserRole) => {
    setUsers(prev => prev.map(user =>
      user.id === userId
        ? { ...user, role: newRole, permissions: ROLE_PERMISSIONS[newRole] }
        : user
    ));
  }, []);

  // 更新用户状态
  const updateUserStatus = useCallback((userId: string, newStatus: User['status']) => {
    setUsers(prev => prev.map(user =>
      user.id === userId
        ? { ...user, status: newStatus }
        : user
    ));
  }, []);

  // 邀请用户
  const handleInviteUser = useCallback(() => {
    if (!inviteEmail) return;

    const newUser: User = {
      id: `user-${Date.now()}`,
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      role: inviteRole,
      permissions: ROLE_PERMISSIONS[inviteRole],
      status: 'pending',
      createdAt: new Date().toISOString(),
      caseAccess: [caseId]
    };

    setUsers(prev => [...prev, newUser]);
    setInviteEmail('');
    setShowInviteDialog(false);
    onUserInvite?.(inviteEmail, inviteRole);
  }, [inviteEmail, inviteRole, caseId, onUserInvite]);

  // 过滤用户
  const filteredUsers = users.filter(user => {
    const roleMatch = filterRole === 'all' || user.role === filterRole;
    const statusMatch = filterStatus === 'all' || user.status === filterStatus;
    return roleMatch && statusMatch;
  });

  // 权限统计
  const permissionStats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === 'active').length,
    pendingUsers: users.filter(u => u.status === 'pending').length,
    adminUsers: users.filter(u => u.role === 'admin').length
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-4">
      {/* 控制面板 */}
      <Card className="border-orange-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-500" />
              用户权限管理
              <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                案件 {caseId}
              </Badge>
            </CardTitle>

            <Button
              variant="default"
              size="sm"
              onClick={() => setShowInviteDialog(true)}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              邀请用户
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">总用户数</p>
                <p className="text-lg font-bold text-blue-600">{permissionStats.totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">活跃用户</p>
                <p className="text-lg font-bold text-green-600">{permissionStats.activeUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">待确认</p>
                <p className="text-lg font-bold text-yellow-600">{permissionStats.pendingUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">管理员</p>
                <p className="text-lg font-bold text-red-600">{permissionStats.adminUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 用户过滤器 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-md font-semibold text-gray-800">用户列表</CardTitle>
            <div className="flex items-center gap-2">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as UserRole | 'all')}
                className="text-xs border border-gray-300 rounded px-2 py-1"
              >
                <option value="all">所有角色</option>
                <option value="admin">管理员</option>
                <option value="arbitrator">仲裁员</option>
                <option value="lawyer">律师</option>
                <option value="party">当事人</option>
                <option value="assistant">助理</option>
                <option value="observer">观察员</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'pending')}
                className="text-xs border border-gray-300 rounded px-2 py-1"
              >
                <option value="all">所有状态</option>
                <option value="active">活跃</option>
                <option value="pending">待确认</option>
              </select>
              <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                {filteredUsers.length} 个用户
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredUsers.map((user) => {
              const roleConfig = getRoleConfig(user.role);
              const statusConfig = getStatusConfig(user.status);
              const RoleIcon = roleConfig.icon;
              const StatusIcon = statusConfig.icon;
              const isSelected = selectedUser === user.id;

              return (
                <div key={user.id}>
                  <div
                    className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${isSelected ? 'bg-orange-50 border border-orange-200' : 'hover:bg-gray-50 border border-gray-200'
                      }`}
                    onClick={() => setSelectedUser(isSelected ? null : user.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-lg">
                          {user.avatar || '👤'}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            {user.name}
                            <div className={`w-3 h-3 rounded-full ${roleConfig.color}`} />
                          </h3>
                          <p className="text-xs text-gray-600">{user.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={`text-xs ${roleConfig.textColor}`}>
                              <RoleIcon className="w-3 h-3 mr-1" />
                              {roleConfig.label}
                            </Badge>
                            <Badge variant="secondary" className={`text-xs ${statusConfig.color}`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {user.lastLogin && (
                          <span className="text-xs text-gray-500">
                            最后登录: {user.lastLogin}
                          </span>
                        )}
                        <Button variant="outline" size="sm" className="text-xs">
                          编辑权限
                        </Button>
                      </div>
                    </div>

                    {/* 展开详情 */}
                    {isSelected && (
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                        {/* 用户信息 */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-xs font-medium text-gray-700 mb-2">基本信息</h4>
                            <div className="space-y-1">
                              <p className="text-xs text-gray-600">组织: {user.organization || '未设置'}</p>
                              <p className="text-xs text-gray-600">职位: {user.title || '未设置'}</p>
                              {user.phone && (
                                <p className="text-xs text-gray-600">电话: {user.phone}</p>
                              )}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xs font-medium text-gray-700 mb-2">权限概览</h4>
                            <div className="flex flex-wrap gap-1">
                              {user.permissions.slice(0, 6).map((permission, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {permission.replace(/_/g, ' ')}
                                </Badge>
                              ))}
                              {user.permissions.length > 6 && (
                                <Badge variant="outline" className="text-xs">
                                  +{user.permissions.length - 6} 更多
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 备注 */}
                        {user.notes && (
                          <div className="bg-blue-50 rounded p-3">
                            <h4 className="text-xs font-medium text-blue-700 mb-1">备注</h4>
                            <p className="text-xs text-blue-700">{user.notes}</p>
                          </div>
                        )}

                        {/* 操作按钮 */}
                        <div className="flex items-center gap-2">
                          <select
                            value={user.role}
                            onChange={(e) => updateUserRole(user.id, e.target.value as UserRole)}
                            className="text-xs border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="admin">管理员</option>
                            <option value="arbitrator">仲裁员</option>
                            <option value="lawyer">律师</option>
                            <option value="party">当事人</option>
                            <option value="assistant">助理</option>
                            <option value="observer">观察员</option>
                          </select>

                          <select
                            value={user.status}
                            onChange={(e) => updateUserStatus(user.id, e.target.value as User['status'])}
                            className="text-xs border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="active">活跃</option>
                            <option value="inactive">非活跃</option>
                            <option value="pending">待确认</option>
                            <option value="suspended">已暂停</option>
                          </select>

                          <Button variant="outline" size="sm" className="text-xs">
                            <Mail className="w-3 h-3 mr-1" />
                            发送邮件
                          </Button>

                          <Button variant="outline" size="sm" className="text-xs text-red-600">
                            <Trash2 className="w-3 h-3 mr-1" />
                            移除
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 邀请用户对话框 */}
      {showInviteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-gray-800">邀请新用户</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">邮箱地址</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="请输入邮箱地址"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">用户角色</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  <option value="observer">观察员</option>
                  <option value="assistant">助理</option>
                  <option value="party">当事人</option>
                  <option value="lawyer">律师</option>
                  <option value="arbitrator">仲裁员</option>
                  <option value="admin">管理员</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-4">
                <Button
                  variant="default"
                  onClick={handleInviteUser}
                  disabled={!inviteEmail}
                  className="flex-1"
                >
                  发送邀请
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowInviteDialog(false)}
                  className="flex-1"
                >
                  取消
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
