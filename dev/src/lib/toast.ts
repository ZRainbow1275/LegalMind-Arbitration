// dev/src/lib/toast.ts
// 简单的toast实现，替代sonner

interface ToastOptions {
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

class ToastManager {
  private container: HTMLElement | null = null;

  private createContainer() {
    if (this.container) return this.container;
    
    this.container = document.createElement('div');
    this.container.id = 'toast-container';
    this.container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      pointer-events: none;
    `;
    document.body.appendChild(this.container);
    return this.container;
  }

  private createToast(message: string, options: ToastOptions = {}) {
    const { type = 'info', duration = 3000 } = options;
    
    const toast = document.createElement('div');
    toast.style.cssText = `
      background: ${this.getBackgroundColor(type)};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 350px;
      word-wrap: break-word;
      pointer-events: auto;
      transform: translateX(100%);
      transition: transform 0.3s ease-out, opacity 0.3s ease-out;
      opacity: 0;
    `;
    
    toast.textContent = message;
    
    const container = this.createContainer();
    container.appendChild(toast);
    
    // 动画进入
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(0)';
      toast.style.opacity = '1';
    });
    
    // 自动移除
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      toast.style.opacity = '0';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, duration);
    
    return toast;
  }

  private getBackgroundColor(type: string): string {
    switch (type) {
      case 'success':
        return '#10B981'; // green-500
      case 'error':
        return '#EF4444'; // red-500
      case 'warning':
        return '#F59E0B'; // yellow-500
      case 'info':
      default:
        return '#3B82F6'; // blue-500
    }
  }

  success(message: string, duration?: number) {
    return this.createToast(message, { type: 'success', duration });
  }

  error(message: string, duration?: number) {
    return this.createToast(message, { type: 'error', duration });
  }

  warning(message: string, duration?: number) {
    return this.createToast(message, { type: 'warning', duration });
  }

  info(message: string, duration?: number) {
    return this.createToast(message, { type: 'info', duration });
  }
}

// 创建全局实例
const toastManager = new ToastManager();

// 导出toast函数，兼容sonner API
export const toast = {
  success: (message: string, duration?: number) => toastManager.success(message, duration),
  error: (message: string, duration?: number) => toastManager.error(message, duration),
  warning: (message: string, duration?: number) => toastManager.warning(message, duration),
  info: (message: string, duration?: number) => toastManager.info(message, duration),
};

// 默认导出
export default toast;
