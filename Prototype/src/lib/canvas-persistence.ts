/**
 * 画布状态持久化服务
 * 
 * 负责画布状态的保存、加载和自动同步
 */

import {
  CanvasState,
  CanvasSaveOptions,
  CanvasLoadOptions,
  CanvasSyncStatus,
  CanvasSyncEvent,
} from '../interfaces/case-canvas-mapping';

/**
 * 画布持久化类
 */
export class CanvasPersistence {
  private saveDebounceTimer: NodeJS.Timeout | null = null;
  private saveDebounceDelay = 2000; // 2秒防抖
  private syncStatus: CanvasSyncStatus = CanvasSyncStatus.SYNCED;
  private eventListeners: ((event: CanvasSyncEvent) => void)[] = [];

  /**
   * 保存画布状态到后端
   */
  async saveCanvasState(
    caseId: string,
    state: CanvasState,
    options: CanvasSaveOptions = {}
  ): Promise<void> {
    try {
      this.setSyncStatus(caseId, CanvasSyncStatus.SYNCING);

      const response = await fetch(`/api/cases/${caseId}/canvas`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          canvasState: state,
          options,
        }),
      });

      if (!response.ok) {
        throw new Error(`保存失败: ${response.statusText}`);
      }

      this.setSyncStatus(caseId, CanvasSyncStatus.SYNCED);
      this.emitEvent({
        type: 'save',
        caseId,
        timestamp: new Date(),
        status: CanvasSyncStatus.SYNCED,
      });

      console.log(`[CanvasPersistence] 画布状态已保存: ${caseId}`);
    } catch (error) {
      console.error('[CanvasPersistence] 保存失败:', error);
      this.setSyncStatus(caseId, CanvasSyncStatus.ERROR);
      this.emitEvent({
        type: 'error',
        caseId,
        timestamp: new Date(),
        status: CanvasSyncStatus.ERROR,
        error: error instanceof Error ? error.message : '未知错误',
      });
      throw error;
    }
  }

  /**
   * 从后端加载画布状态
   */
  async loadCanvasState(
    caseId: string,
    options: CanvasLoadOptions = {}
  ): Promise<CanvasState | null> {
    try {
      this.setSyncStatus(caseId, CanvasSyncStatus.SYNCING);

      const url = new URL(`/api/cases/${caseId}/canvas`, window.location.origin);
      if (options.version) {
        url.searchParams.set('version', options.version);
      }
      if (options.metadataOnly) {
        url.searchParams.set('metadataOnly', 'true');
      }

      const response = await fetch(url.toString());

      if (response.status === 404) {
        // 画布不存在，返回null
        this.setSyncStatus(caseId, CanvasSyncStatus.SYNCED);
        return null;
      }

      if (!response.ok) {
        throw new Error(`加载失败: ${response.statusText}`);
      }

      const data = await response.json();
      const canvasState = data.canvasState as CanvasState;

      this.setSyncStatus(caseId, CanvasSyncStatus.SYNCED);
      this.emitEvent({
        type: 'load',
        caseId,
        timestamp: new Date(),
        status: CanvasSyncStatus.SYNCED,
        data: canvasState,
      });

      console.log(`[CanvasPersistence] 画布状态已加载: ${caseId}`);
      return canvasState;
    } catch (error) {
      console.error('[CanvasPersistence] 加载失败:', error);
      this.setSyncStatus(caseId, CanvasSyncStatus.ERROR);
      this.emitEvent({
        type: 'error',
        caseId,
        timestamp: new Date(),
        status: CanvasSyncStatus.ERROR,
        error: error instanceof Error ? error.message : '未知错误',
      });
      throw error;
    }
  }

  /**
   * 自动保存（防抖）
   */
  autoSave(caseId: string, state: CanvasState): void {
    // 标记为有未保存的更改
    this.setSyncStatus(caseId, CanvasSyncStatus.DIRTY);

    // 清除之前的定时器
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }

    // 设置新的定时器
    this.saveDebounceTimer = setTimeout(() => {
      this.saveCanvasState(caseId, state, { immediate: false });
    }, this.saveDebounceDelay);
  }

  /**
   * 立即保存（取消防抖）
   */
  async saveImmediately(caseId: string, state: CanvasState): Promise<void> {
    // 清除防抖定时器
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
    }

    // 立即保存
    await this.saveCanvasState(caseId, state, { immediate: true });
  }

  /**
   * 删除画布状态
   */
  async deleteCanvasState(caseId: string): Promise<void> {
    try {
      const response = await fetch(`/api/cases/${caseId}/canvas`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`删除失败: ${response.statusText}`);
      }

      console.log(`[CanvasPersistence] 画布状态已删除: ${caseId}`);
    } catch (error) {
      console.error('[CanvasPersistence] 删除失败:', error);
      throw error;
    }
  }

  /**
   * 获取画布历史版本列表
   */
  async getCanvasVersions(caseId: string): Promise<any[]> {
    try {
      const response = await fetch(`/api/cases/${caseId}/canvas/versions`);

      if (!response.ok) {
        throw new Error(`获取版本列表失败: ${response.statusText}`);
      }

      const data = await response.json();
      return data.versions || [];
    } catch (error) {
      console.error('[CanvasPersistence] 获取版本列表失败:', error);
      throw error;
    }
  }

  /**
   * 设置同步状态
   */
  private setSyncStatus(caseId: string, status: CanvasSyncStatus): void {
    this.syncStatus = status;
    this.emitEvent({
      type: 'sync',
      caseId,
      timestamp: new Date(),
      status,
    });
  }

  /**
   * 获取当前同步状态
   */
  getSyncStatus(): CanvasSyncStatus {
    return this.syncStatus;
  }

  /**
   * 监听同步事件
   */
  addEventListener(listener: (event: CanvasSyncEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(listener: (event: CanvasSyncEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * 触发事件
   */
  private emitEvent(event: CanvasSyncEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[CanvasPersistence] 事件监听器错误:', error);
      }
    });
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
    }
    this.eventListeners = [];
  }
}

/**
 * 全局画布持久化实例
 */
export const canvasPersistence = new CanvasPersistence();

