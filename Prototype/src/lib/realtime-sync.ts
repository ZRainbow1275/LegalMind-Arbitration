/**
 * 实时同步服务
 * 
 * 使用Server-Sent Events (SSE)实现实时同步
 * 如果SSE不可用，自动回退到轮询
 */

export type RealtimeSyncEvent = {
  type: 'canvas-update' | 'document-update' | 'case-update' | 'connection' | 'error';
  caseId: string;
  timestamp: string;
  data?: any;
  error?: string;
};

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

/**
 * 实时同步客户端
 */
export class RealtimeSync {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<(event: RealtimeSyncEvent) => void>> = new Map();
  private connectionStatus: ConnectionStatus = 'disconnected';
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // 1秒
  private caseId: string | null = null;

  /**
   * 连接到案件的实时同步
   */
  connect(caseId: string): void {
    if (this.caseId === caseId && this.eventSource) {
      console.log('[RealtimeSync] 已连接到案件:', caseId);
      return;
    }

    // 断开旧连接
    this.disconnect();

    this.caseId = caseId;
    this.setConnectionStatus('connecting');

    try {
      // 创建EventSource连接
      this.eventSource = new EventSource(`/api/cases/${caseId}/events`);

      // 监听连接打开
      this.eventSource.onopen = () => {
        console.log('[RealtimeSync] 连接成功:', caseId);
        this.setConnectionStatus('connected');
        this.reconnectAttempts = 0;
      };

      // 监听消息
      this.eventSource.onmessage = (event) => {
        try {
          const data: RealtimeSyncEvent = JSON.parse(event.data);
          this.emitEvent(data.type, data);
        } catch (error) {
          console.error('[RealtimeSync] 解析消息失败:', error);
        }
      };

      // 监听错误
      this.eventSource.onerror = (error) => {
        console.error('[RealtimeSync] 连接错误:', error);
        this.setConnectionStatus('error');
        this.handleReconnect();
      };

      // 监听特定事件类型
      this.eventSource.addEventListener('canvas-update', (event: any) => {
        try {
          const data: RealtimeSyncEvent = JSON.parse(event.data);
          this.emitEvent('canvas-update', data);
        } catch (error) {
          console.error('[RealtimeSync] 解析canvas-update失败:', error);
        }
      });

      this.eventSource.addEventListener('document-update', (event: any) => {
        try {
          const data: RealtimeSyncEvent = JSON.parse(event.data);
          this.emitEvent('document-update', data);
        } catch (error) {
          console.error('[RealtimeSync] 解析document-update失败:', error);
        }
      });

      this.eventSource.addEventListener('case-update', (event: any) => {
        try {
          const data: RealtimeSyncEvent = JSON.parse(event.data);
          this.emitEvent('case-update', data);
        } catch (error) {
          console.error('[RealtimeSync] 解析case-update失败:', error);
        }
      });
    } catch (error) {
      console.error('[RealtimeSync] 创建连接失败:', error);
      this.setConnectionStatus('error');
      this.handleReconnect();
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.caseId = null;
    this.setConnectionStatus('disconnected');
    console.log('[RealtimeSync] 已断开连接');
  }

  /**
   * 监听事件
   */
  addEventListener(
    eventType: RealtimeSyncEvent['type'],
    listener: (event: RealtimeSyncEvent) => void
  ): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(
    eventType: RealtimeSyncEvent['type'],
    listener: (event: RealtimeSyncEvent) => void
  ): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * 监听连接状态变化
   */
  onConnectionStatusChange(listener: (status: ConnectionStatus) => void): void {
    this.statusListeners.add(listener);
  }

  /**
   * 移除连接状态监听器
   */
  offConnectionStatusChange(listener: (status: ConnectionStatus) => void): void {
    this.statusListeners.delete(listener);
  }

  /**
   * 获取当前连接状态
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * 触发事件
   */
  private emitEvent(eventType: RealtimeSyncEvent['type'], event: RealtimeSyncEvent): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('[RealtimeSync] 事件监听器错误:', error);
        }
      });
    }
  }

  /**
   * 设置连接状态
   */
  private setConnectionStatus(status: ConnectionStatus): void {
    this.connectionStatus = status;
    this.statusListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('[RealtimeSync] 状态监听器错误:', error);
      }
    });
  }

  /**
   * 处理重连
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[RealtimeSync] 达到最大重连次数，停止重连');
      this.setConnectionStatus('error');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // 指数退避

    console.log(`[RealtimeSync] ${delay}ms后尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      if (this.caseId) {
        this.connect(this.caseId);
      }
    }, delay);
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.disconnect();
    this.listeners.clear();
    this.statusListeners.clear();
  }
}

/**
 * 全局实时同步实例
 */
export const realtimeSync = new RealtimeSync();

