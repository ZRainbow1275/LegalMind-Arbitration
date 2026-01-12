import React from 'react';

interface NavigationToolbarProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onFitToScreen: () => void;
  onCenterView: () => void;
}

export const NavigationToolbar: React.FC<NavigationToolbarProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onFitToScreen,
  onCenterView
}) => {
  const formatZoom = (zoom: number) => {
    return `${Math.round(zoom * 100)}%`;
  };

  const toolbarButtonStyle = {
    padding: '8px 12px',
    border: '1px solid #ddd',
    backgroundColor: 'white',
    color: '#333',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.2s ease'
  };

  const toolbarButtonHoverStyle = {
    ...toolbarButtonStyle,
    backgroundColor: '#f5f5f5',
    borderColor: '#FF6B35'
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: '20px',
      right: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      backgroundColor: 'white',
      padding: '12px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      zIndex: 1000,
      border: '1px solid #e0e0e0'
    }}>
      {/* 缩放控制 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        paddingBottom: '8px',
        borderBottom: '1px solid #eee'
      }}>
        <button
          onClick={onZoomOut}
          style={toolbarButtonStyle}
          onMouseEnter={(e) => {
            Object.assign(e.currentTarget.style, toolbarButtonHoverStyle);
          }}
          onMouseLeave={(e) => {
            Object.assign(e.currentTarget.style, toolbarButtonStyle);
          }}
          title="缩小"
        >
          <span style={{ fontSize: '14px' }}>−</span>
        </button>
        
        <div style={{
          padding: '6px 12px',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: '500',
          color: '#666',
          minWidth: '50px',
          textAlign: 'center'
        }}>
          {formatZoom(zoom)}
        </div>
        
        <button
          onClick={onZoomIn}
          style={toolbarButtonStyle}
          onMouseEnter={(e) => {
            Object.assign(e.currentTarget.style, toolbarButtonHoverStyle);
          }}
          onMouseLeave={(e) => {
            Object.assign(e.currentTarget.style, toolbarButtonStyle);
          }}
          title="放大"
        >
          <span style={{ fontSize: '14px' }}>+</span>
        </button>
      </div>

      {/* 视图控制 */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        <button
          onClick={onZoomReset}
          style={toolbarButtonStyle}
          onMouseEnter={(e) => {
            Object.assign(e.currentTarget.style, toolbarButtonHoverStyle);
          }}
          onMouseLeave={(e) => {
            Object.assign(e.currentTarget.style, toolbarButtonStyle);
          }}
          title="重置缩放 (100%)"
        >
          <span style={{ fontSize: '12px' }}>🎯</span>
          <span>重置</span>
        </button>
        
        <button
          onClick={onFitToScreen}
          style={toolbarButtonStyle}
          onMouseEnter={(e) => {
            Object.assign(e.currentTarget.style, toolbarButtonHoverStyle);
          }}
          onMouseLeave={(e) => {
            Object.assign(e.currentTarget.style, toolbarButtonStyle);
          }}
          title="适应屏幕"
        >
          <span style={{ fontSize: '12px' }}>📐</span>
          <span>适应</span>
        </button>
        
        <button
          onClick={onCenterView}
          style={toolbarButtonStyle}
          onMouseEnter={(e) => {
            Object.assign(e.currentTarget.style, toolbarButtonHoverStyle);
          }}
          onMouseLeave={(e) => {
            Object.assign(e.currentTarget.style, toolbarButtonStyle);
          }}
          title="居中视图"
        >
          <span style={{ fontSize: '12px' }}>🎪</span>
          <span>居中</span>
        </button>
      </div>

      {/* 快捷键提示 */}
      <div style={{
        paddingTop: '8px',
        borderTop: '1px solid #eee',
        fontSize: '10px',
        color: '#999',
        lineHeight: '1.3'
      }}>
        <div>快捷键:</div>
        <div>Ctrl + 滚轮: 缩放</div>
        <div>空格 + 拖拽: 平移</div>
        <div>Ctrl + 0: 重置</div>
      </div>
    </div>
  );
};

// 迷你版导航工具栏（用于紧凑布局）
export const MiniNavigationToolbar: React.FC<NavigationToolbarProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset
}) => {
  const formatZoom = (zoom: number) => {
    return `${Math.round(zoom * 100)}%`;
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      backgroundColor: 'white',
      padding: '4px 8px',
      borderRadius: '6px',
      border: '1px solid #ddd',
      fontSize: '12px'
    }}>
      <button
        onClick={onZoomOut}
        style={{
          padding: '4px 6px',
          border: 'none',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          borderRadius: '3px'
        }}
        title="缩小"
      >
        −
      </button>
      
      <span style={{
        padding: '2px 6px',
        backgroundColor: '#f8f9fa',
        borderRadius: '3px',
        fontSize: '11px',
        minWidth: '40px',
        textAlign: 'center'
      }}>
        {formatZoom(zoom)}
      </span>
      
      <button
        onClick={onZoomIn}
        style={{
          padding: '4px 6px',
          border: 'none',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          borderRadius: '3px'
        }}
        title="放大"
      >
        +
      </button>
      
      <button
        onClick={onZoomReset}
        style={{
          padding: '4px 6px',
          border: 'none',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          borderRadius: '3px',
          marginLeft: '4px'
        }}
        title="重置"
      >
        🎯
      </button>
    </div>
  );
};
