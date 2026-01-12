/**
 * 协作覆盖层
 *
 * 显示其他用户的光标、选择和头像
 *
 * ⚠️ **未来功能** - 需要WebSocket后端服务器支持
 * 当前此组件不会显示任何内容，因为协作引擎未连接到服务器
 */

import React from 'react';
import { useCollaborationStore } from '../../lib/collaboration-engine';

interface CollaborationOverlayProps {
  viewportTransform: {
    x: number;
    y: number;
    zoom: number;
  };
}

export const CollaborationOverlay: React.FC<CollaborationOverlayProps> = ({
  viewportTransform,
}) => {
  const { users, cursors, selections, connected } = useCollaborationStore();

  // 如果未连接到服务器，不渲染任何内容
  if (!connected) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      {/* 渲染其他用户的光标 */}
      {Array.from(cursors.values()).map(cursor => {
        const user = users.get(cursor.userId);
        if (!user) return null;
        
        // 应用视口变换
        const screenX = cursor.position.x * viewportTransform.zoom + viewportTransform.x;
        const screenY = cursor.position.y * viewportTransform.zoom + viewportTransform.y;
        
        return (
          <div
            key={cursor.userId}
            style={{
              position: 'absolute',
              left: screenX,
              top: screenY,
              transform: 'translate(-2px, -2px)',
              transition: 'all 0.1s ease-out',
            }}
          >
            {/* 光标图标 */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              style={{
                filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
              }}
            >
              <path
                d="M5 3L19 12L12 13L9 20L5 3Z"
                fill={user.color}
                stroke="white"
                strokeWidth="1.5"
              />
            </svg>
            
            {/* 用户名标签 */}
            <div
              style={{
                position: 'absolute',
                left: 20,
                top: 0,
                backgroundColor: user.color,
                color: '#ffffff',
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 500,
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              }}
            >
              {user.name}
            </div>
          </div>
        );
      })}
      
      {/* 渲染其他用户的选择 */}
      {Array.from(selections.values()).map(selection => {
        const user = users.get(selection.userId);
        if (!user || selection.elementIds.length === 0) return null;
        
        return (
          <React.Fragment key={selection.userId}>
            {selection.elementIds.map(elementId => (
              <div
                key={`${selection.userId}-${elementId}`}
                data-element-id={elementId}
                style={{
                  position: 'absolute',
                  border: `2px solid ${user.color}`,
                  borderRadius: 4,
                  pointerEvents: 'none',
                  // 实际位置和大小需要从canvas-store获取
                  // 这里只是示例
                }}
              />
            ))}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ==================== 用户列表组件 ====================

export const UserList: React.FC = () => {
  const { currentUser, users } = useCollaborationStore();
  
  const allUsers = currentUser
    ? [currentUser, ...Array.from(users.values())]
    : Array.from(users.values());
  
  return (
    <div
      style={{
        position: 'fixed',
        top: 80,
        right: 16,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        padding: 12,
        minWidth: 200,
        zIndex: 1000,
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 'bold',
          marginBottom: 12,
          color: '#1f2937',
        }}
      >
        在线用户 ({allUsers.length})
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {allUsers.map(user => (
          <div
            key={user.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {/* 用户头像 */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: user.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: 14,
                fontWeight: 'bold',
              }}
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            
            {/* 用户信息 */}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#1f2937',
                }}
              >
                {user.name}
                {user.id === currentUser?.id && (
                  <span
                    style={{
                      marginLeft: 4,
                      fontSize: 12,
                      color: '#6b7280',
                    }}
                  >
                    (你)
                  </span>
                )}
              </div>
            </div>
            
            {/* 在线状态 */}
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: user.online ? '#10b981' : '#9ca3af',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// ==================== 跟随模式组件 ====================

interface FollowModeProps {
  followingUserId: string | null;
  onFollow: (userId: string | null) => void;
}

export const FollowMode: React.FC<FollowModeProps> = ({
  followingUserId,
  onFollow,
}) => {
  const { users } = useCollaborationStore();
  
  if (!followingUserId) return null;
  
  const followingUser = users.get(followingUserId);
  if (!followingUser) return null;
  
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: followingUser.color,
        color: '#ffffff',
        padding: '12px 20px',
        borderRadius: 24,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        zIndex: 1000,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 500 }}>
        正在跟随 {followingUser.name}
      </div>
      
      <button
        onClick={() => onFollow(null)}
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          border: 'none',
          color: '#ffffff',
          padding: '4px 12px',
          borderRadius: 12,
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 500,
        }}
      >
        停止跟随
      </button>
    </div>
  );
};

