import React, { useState } from 'react';

export type ConnectionType = 'related-to' | 'depends-on' | 'conflicts-with' | 'supports' | 'references' | 'assigned-to';

interface ConnectionToolbarProps {
  isConnectionMode: boolean;
  selectedConnectionType: ConnectionType;
  onToggleConnectionMode: () => void;
  onConnectionTypeChange: (type: ConnectionType) => void;
  onClearConnections: () => void;
  connectionCount: number;
}

export const ConnectionToolbar: React.FC<ConnectionToolbarProps> = ({
  isConnectionMode,
  selectedConnectionType,
  onToggleConnectionMode,
  onConnectionTypeChange,
  onClearConnections,
  connectionCount
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const connectionTypes: { type: ConnectionType; label: string; icon: string; color: string }[] = [
    { type: 'related-to', label: '相关', icon: '🔗', color: '#2196f3' },
    { type: 'depends-on', label: '依赖', icon: '⬇️', color: '#ff9800' },
    { type: 'conflicts-with', label: '冲突', icon: '⚡', color: '#f44336' },
    { type: 'supports', label: '支持', icon: '✅', color: '#4caf50' },
    { type: 'references', label: '引用', icon: '📎', color: '#9c27b0' },
    { type: 'assigned-to', label: '分配', icon: '👤', color: '#607d8b' }
  ];

  const getCurrentConnectionType = () => {
    return connectionTypes.find(ct => ct.type === selectedConnectionType) || connectionTypes[0];
  };

  const toolbarStyle = {
    position: 'absolute' as const,
    top: '80px',
    left: '20px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    border: '1px solid #e0e0e0',
    zIndex: 1000,
    overflow: 'hidden'
  };

  const buttonStyle = {
    padding: '10px 16px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    textAlign: 'left' as const,
    transition: 'all 0.2s ease'
  };

  return (
    <div style={toolbarStyle}>
      {/* 主连接按钮 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px'
      }}>
        <button
          onClick={onToggleConnectionMode}
          style={{
            ...buttonStyle,
            backgroundColor: isConnectionMode ? '#FF6B35' : 'white',
            color: isConnectionMode ? 'white' : '#333',
            borderRadius: '6px',
            border: `2px solid ${isConnectionMode ? '#FF6B35' : '#ddd'}`,
            flex: 1
          }}
        >
          <span style={{ fontSize: '16px' }}>🔗</span>
          <span>连接模式</span>
          {connectionCount > 0 && (
            <span style={{
              backgroundColor: isConnectionMode ? 'rgba(255,255,255,0.3)' : '#FF6B35',
              color: isConnectionMode ? 'white' : 'white',
              borderRadius: '10px',
              padding: '2px 6px',
              fontSize: '11px',
              marginLeft: 'auto'
            }}>
              {connectionCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            padding: '8px',
            border: '1px solid #ddd',
            backgroundColor: 'white',
            borderRadius: '4px',
            cursor: 'pointer',
            marginLeft: '8px',
            fontSize: '12px'
          }}
          title="连接类型选项"
        >
          {isExpanded ? '▲' : '▼'}
        </button>
      </div>

      {/* 当前连接类型显示 */}
      {isConnectionMode && (
        <div style={{
          padding: '8px 16px',
          backgroundColor: '#f8f9fa',
          borderTop: '1px solid #eee',
          fontSize: '12px',
          color: '#666'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{getCurrentConnectionType().icon}</span>
            <span>当前类型: {getCurrentConnectionType().label}</span>
          </div>
        </div>
      )}

      {/* 连接类型选择器 */}
      {isExpanded && (
        <div style={{
          borderTop: '1px solid #eee',
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          <div style={{
            padding: '8px 16px',
            fontSize: '12px',
            fontWeight: '600',
            color: '#666',
            backgroundColor: '#f8f9fa'
          }}>
            选择连接类型:
          </div>
          
          {connectionTypes.map((connectionType) => (
            <button
              key={connectionType.type}
              onClick={() => {
                onConnectionTypeChange(connectionType.type);
                setIsExpanded(false);
              }}
              style={{
                ...buttonStyle,
                backgroundColor: selectedConnectionType === connectionType.type ? '#f0f8ff' : 'white',
                borderLeft: selectedConnectionType === connectionType.type ? 
                  `3px solid ${connectionType.color}` : '3px solid transparent'
              }}
              onMouseEnter={(e) => {
                if (selectedConnectionType !== connectionType.type) {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedConnectionType !== connectionType.type) {
                  e.currentTarget.style.backgroundColor = 'white';
                }
              }}
            >
              <span style={{ fontSize: '16px' }}>{connectionType.icon}</span>
              <span>{connectionType.label}</span>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: connectionType.color,
                marginLeft: 'auto'
              }} />
            </button>
          ))}
        </div>
      )}

      {/* 连接管理 */}
      {connectionCount > 0 && (
        <div style={{
          borderTop: '1px solid #eee',
          padding: '8px'
        }}>
          <button
            onClick={onClearConnections}
            style={{
              ...buttonStyle,
              color: '#f44336',
              fontSize: '12px',
              padding: '6px 12px',
              borderRadius: '4px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#ffebee';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span>🗑️</span>
            <span>清除所有连接</span>
          </button>
        </div>
      )}

      {/* 使用说明 */}
      {isConnectionMode && (
        <div style={{
          borderTop: '1px solid #eee',
          padding: '12px 16px',
          backgroundColor: '#f8f9fa',
          fontSize: '11px',
          color: '#666',
          lineHeight: '1.4'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>使用说明:</div>
          <div>1. 点击第一个节点</div>
          <div>2. 点击第二个节点</div>
          <div>3. 自动创建连接</div>
          <div style={{ marginTop: '6px', color: '#999' }}>
            按 ESC 退出连接模式
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionToolbar;
