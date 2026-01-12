/**
 * Toast通知组件
 */

import React, { useState, useEffect } from 'react';
import { useToastStore, Toast } from '../../stores/toastStore';

// ==================== 组件 ====================

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 400,
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // 进入动画
    const timer = setTimeout(() => {
      setIsExiting(false);
    }, 10);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const getTypeConfig = () => {
    switch (toast.type) {
      case 'success':
        return {
          icon: '✅',
          backgroundColor: '#10b981',
          color: '#ffffff',
        };
      case 'error':
        return {
          icon: '❌',
          backgroundColor: '#ef4444',
          color: '#ffffff',
        };
      case 'warning':
        return {
          icon: '⚠️',
          backgroundColor: '#f59e0b',
          color: '#ffffff',
        };
      case 'info':
        return {
          icon: 'ℹ️',
          backgroundColor: '#3b82f6',
          color: '#ffffff',
        };
    }
  };

  const config = getTypeConfig();

  return (
    <div
      style={{
        backgroundColor: config.backgroundColor,
        color: config.color,
        borderRadius: 8,
        padding: 16,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        minWidth: 300,
        opacity: isExiting ? 0 : 1,
        transform: isExiting ? 'translateX(100%)' : 'translateX(0)',
        transition: 'all 0.3s ease',
      }}
    >
      <div style={{ fontSize: 20 }}>{config.icon}</div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 4 }}>
          {toast.title}
        </div>

        {toast.message && (
          <div style={{ fontSize: 12, opacity: 0.9 }}>
            {toast.message}
          </div>
        )}
      </div>

      <button
        onClick={handleClose}
        style={{
          backgroundColor: 'transparent',
          border: 'none',
          color: config.color,
          cursor: 'pointer',
          fontSize: 18,
          padding: 0,
          opacity: 0.7,
        }}
      >
        ×
      </button>
    </div>
  );
};

// ==================== 辅助函数 ====================



