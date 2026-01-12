/**
 * 加载动画组件
 */

import React from 'react';

export interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  message?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = '#f97316',
  message,
  fullScreen = false,
}) => {
  const sizeMap = {
    small: 24,
    medium: 48,
    large: 72,
  };
  
  const spinnerSize = sizeMap[size];
  
  const spinner = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div
        style={{
          width: spinnerSize,
          height: spinnerSize,
          border: `4px solid ${color}20`,
          borderTopColor: color,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      
      {message && (
        <div
          style={{
            fontSize: size === 'small' ? 12 : size === 'medium' ? 14 : 16,
            color: '#6b7280',
            textAlign: 'center',
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
  
  if (fullScreen) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          zIndex: 9999,
        }}
      >
        {spinner}
      </div>
    );
  }
  
  return spinner;
};

// 添加旋转动画
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

