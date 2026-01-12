/**
 * 权限管理面板
 * 
 * 提供用户权限管理、邀请链接和权限日志查看
 */

import React, { useState } from 'react';
import {
  usePermissionStore,
  ROLE_PERMISSIONS,
  type Role,
} from '../../lib/permission-manager';
import { useCollaborationStore } from '../../lib/collaboration-engine';

interface PermissionPanelProps {
  canvasId: string;
  onClose: () => void;
}

export const PermissionPanel: React.FC<PermissionPanelProps> = ({
  canvasId,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'invites' | 'logs'>('users');

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 800,
          maxHeight: '80vh',
          backgroundColor: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div
          style={{
            padding: 24,
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
                权限管理
              </h2>
              <p style={{ fontSize: 14, color: '#6b7280', margin: '4px 0 0 0' }}>
                管理画布的用户权限和访问控制
              </p>
            </div>

            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f3f4f6',
                color: '#6b7280',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              关闭
            </button>
          </div>

          {/* 标签页 */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            {(['users', 'invites', 'logs'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: activeTab === tab ? '#f97316' : 'transparent',
                  color: activeTab === tab ? '#ffffff' : '#6b7280',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {tab === 'users' ? '用户' : tab === 'invites' ? '邀请链接' : '日志'}
              </button>
            ))}
          </div>
        </div>

        {/* 内容区 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {activeTab === 'users' && <UsersTab canvasId={canvasId} />}
          {activeTab === 'invites' && <InvitesTab canvasId={canvasId} />}
          {activeTab === 'logs' && <LogsTab canvasId={canvasId} />}
        </div>
      </div>
    </div>
  );
};

// ==================== 用户标签页 ====================

const UsersTab: React.FC<{ canvasId: string }> = ({ canvasId }) => {
  const { users, currentUser } = useCollaborationStore();
  const { userPermissions, setUserRole, removeUser, currentUserRole } = usePermissionStore();

  const canvasUsers = Array.from(userPermissions.values())
    .filter(p => p.canvasId === canvasId);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 'bold', color: '#1f2937', margin: '0 0 8px 0' }}>
          画布用户 ({canvasUsers.length})
        </h3>
        <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
          管理用户的角色和权限
        </p>
      </div>

      {canvasUsers.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>
          暂无用户
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {canvasUsers.map(permission => {
            const user = users.get(permission.userId);
            const roleInfo = ROLE_PERMISSIONS[permission.role];

            return (
              <div
                key={permission.userId}
                style={{
                  padding: 16,
                  backgroundColor: '#f9fafb',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      backgroundColor: user?.color || '#9ca3af',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      fontWeight: 'bold',
                    }}
                  >
                    {user?.name.charAt(0).toUpperCase() || '?'}
                  </div>

                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#1f2937' }}>
                      {user?.name || '未知用户'}
                      {permission.userId === currentUser?.id && (
                        <span style={{ marginLeft: 8, fontSize: 12, color: '#6b7280' }}>
                          (你)
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      {roleInfo.description}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    value={permission.role}
                    onChange={(e) => {
                      if (currentUser) {
                        setUserRole(permission.userId, canvasId, e.target.value as Role, currentUser.id);
                      }
                    }}
                    disabled={currentUserRole !== 'owner'}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: 6,
                      fontSize: 14,
                      cursor: currentUserRole === 'owner' ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {Object.entries(ROLE_PERMISSIONS).map(([role, info]) => (
                      <option key={role} value={role}>
                        {info.role}
                      </option>
                    ))}
                  </select>

                  {currentUserRole === 'owner' && permission.userId !== currentUser?.id && (
                    <button
                      onClick={() => removeUser(permission.userId, canvasId)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#ef4444',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 14,
                      }}
                    >
                      移除
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ==================== 邀请链接标签页 ====================

const InvitesTab: React.FC<{ canvasId: string }> = ({ canvasId }) => {
  const { currentUser } = useCollaborationStore();
  const { invitationLinks, createInvitationLink, revokeInvitationLink } = usePermissionStore();
  const [selectedRole, setSelectedRole] = useState<Role>('editor');

  const canvasInvites = Array.from(invitationLinks.values())
    .filter(link => link.canvasId === canvasId);

  const handleCreateInvite = () => {
    if (currentUser) {
      createInvitationLink(canvasId, selectedRole, currentUser.id);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 'bold', color: '#1f2937', margin: '0 0 8px 0' }}>
          邀请链接
        </h3>
        <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
          创建邀请链接以添加新用户
        </p>
      </div>

      {/* 创建邀请链接 */}
      <div
        style={{
          padding: 16,
          backgroundColor: '#f9fafb',
          borderRadius: 8,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as Role)}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              fontSize: 14,
            }}
          >
            {Object.entries(ROLE_PERMISSIONS).map(([role, info]) => (
              <option key={role} value={role}>
                {info.description}
              </option>
            ))}
          </select>

          <button
            onClick={handleCreateInvite}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f97316',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            创建链接
          </button>
        </div>
      </div>

      {/* 邀请链接列表 */}
      {canvasInvites.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>
          暂无邀请链接
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {canvasInvites.map(link => {
            const isExpired = new Date(link.expiresAt) < new Date();
            const isMaxedOut = link.maxUses && link.usedCount >= link.maxUses;

            return (
              <div
                key={link.id}
                style={{
                  padding: 16,
                  backgroundColor: '#f9fafb',
                  borderRadius: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#1f2937' }}>
                      {ROLE_PERMISSIONS[link.role].description}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                      使用次数: {link.usedCount}{link.maxUses ? ` / ${link.maxUses}` : ''}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      过期时间: {new Date(link.expiresAt).toLocaleString('zh-CN')}
                    </div>
                  </div>

                  <button
                    onClick={() => revokeInvitationLink(link.id)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 12,
                      height: 'fit-content',
                    }}
                  >
                    撤销
                  </button>
                </div>

                {(isExpired || isMaxedOut) && (
                  <div
                    style={{
                      padding: 8,
                      backgroundColor: '#fee2e2',
                      color: '#991b1b',
                      borderRadius: 4,
                      fontSize: 12,
                      marginTop: 8,
                    }}
                  >
                    {isExpired ? '已过期' : '已达到最大使用次数'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ==================== 日志标签页 ====================

const LogsTab: React.FC<{ canvasId: string }> = ({ canvasId }) => {
  const { getPermissionLogs } = usePermissionStore();
  const logs = getPermissionLogs(canvasId);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 'bold', color: '#1f2937', margin: '0 0 8px 0' }}>
          权限日志
        </h3>
        <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
          查看权限变更历史
        </p>
      </div>

      {logs.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>
          暂无日志
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {logs.map(log => (
            <div
              key={log.id}
              style={{
                padding: 12,
                backgroundColor: '#f9fafb',
                borderRadius: 8,
              }}
            >
              <div style={{ fontSize: 14, color: '#1f2937', marginBottom: 4 }}>
                {log.details}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                {new Date(log.timestamp).toLocaleString('zh-CN')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

