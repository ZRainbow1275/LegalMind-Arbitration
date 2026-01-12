/**
 * 冲突解决机制
 * 
 * 处理多用户编辑时的冲突
 */

import { CanvasState } from '../interfaces/case-canvas-mapping';
import { LegalNode } from '../interfaces/legal-elements';

/**
 * 冲突类型
 */
export type ConflictType = 'node-modified' | 'node-deleted' | 'connection-modified' | 'connection-deleted' | 'viewport-changed';

/**
 * 冲突记录
 */
export interface Conflict {
  id: string;
  type: ConflictType;
  localChange: any;
  remoteChange: any;
  timestamp: string;
  resolved: boolean;
  resolution?: 'local' | 'remote' | 'merge';
}

/**
 * 冲突解决策略
 */
export type ConflictResolutionStrategy = 'last-write-wins' | 'manual' | 'auto-merge';

/**
 * 冲突解决服务
 */
export class ConflictResolution {
  private conflicts: Map<string, Conflict[]> = new Map();
  private strategy: ConflictResolutionStrategy = 'last-write-wins';

  /**
   * 设置冲突解决策略
   */
  setStrategy(strategy: ConflictResolutionStrategy): void {
    this.strategy = strategy;
    console.log(`[ConflictResolution] 冲突解决策略设置为: ${strategy}`);
  }

  /**
   * 检测冲突
   */
  detectConflicts(
    caseId: string,
    localState: CanvasState,
    remoteState: CanvasState
  ): Conflict[] {
    const conflicts: Conflict[] = [];

    // 检测节点冲突
    const nodeConflicts = this.detectNodeConflicts(localState.nodes, remoteState.nodes);
    conflicts.push(...nodeConflicts);

    // 检测连接冲突
    const connectionConflicts = this.detectConnectionConflicts(
      localState.connections,
      remoteState.connections
    );
    conflicts.push(...connectionConflicts);

    // 检测视口冲突
    if (JSON.stringify(localState.viewport) !== JSON.stringify(remoteState.viewport)) {
      conflicts.push({
        id: `conflict-viewport-${Date.now()}`,
        type: 'viewport-changed',
        localChange: localState.viewport,
        remoteChange: remoteState.viewport,
        timestamp: new Date().toISOString(),
        resolved: false,
      });
    }

    // 保存冲突记录
    if (conflicts.length > 0) {
      this.conflicts.set(caseId, conflicts);
      console.log(`[ConflictResolution] 检测到 ${conflicts.length} 个冲突`);
    }

    return conflicts;
  }

  /**
   * 解决冲突
   */
  async resolveConflicts(
    caseId: string,
    localState: CanvasState,
    remoteState: CanvasState
  ): Promise<CanvasState> {
    const conflicts = this.detectConflicts(caseId, localState, remoteState);

    if (conflicts.length === 0) {
      console.log('[ConflictResolution] 无冲突，使用远程状态');
      return remoteState;
    }

    console.log(`[ConflictResolution] 使用策略 ${this.strategy} 解决 ${conflicts.length} 个冲突`);

    switch (this.strategy) {
      case 'last-write-wins':
        return this.resolveWithLastWriteWins(localState, remoteState, conflicts);
      case 'auto-merge':
        return this.resolveWithAutoMerge(localState, remoteState, conflicts);
      case 'manual':
        // 手动解决需要用户交互，这里返回本地状态并标记冲突
        console.warn('[ConflictResolution] 需要手动解决冲突');
        return localState;
      default:
        return remoteState;
    }
  }

  /**
   * 使用"最后写入获胜"策略解决冲突
   */
  private resolveWithLastWriteWins(
    _localState: CanvasState,
    remoteState: CanvasState,
    conflicts: Conflict[]
  ): CanvasState {
    // 简单地使用远程状态
    conflicts.forEach(conflict => {
      conflict.resolved = true;
      conflict.resolution = 'remote';
    });

    console.log('[ConflictResolution] 使用远程状态（最后写入获胜）');
    return remoteState;
  }

  /**
   * 使用自动合并策略解决冲突
   */
  private resolveWithAutoMerge(
    localState: CanvasState,
    remoteState: CanvasState,
    conflicts: Conflict[]
  ): CanvasState {
    const mergedState: CanvasState = {
      nodes: [],
      connections: [],
      viewport: remoteState.viewport, // 视口使用远程状态
      metadata: {
        ...localState.metadata,
        editCount: Math.max(localState.metadata.editCount, remoteState.metadata.editCount),
      },
    };

    // 合并节点
    // const localNodesMap = new Map(localState.nodes.map(n => [n.id, n]));
    const remoteNodesMap = new Map(remoteState.nodes.map(n => [n.id, n]));

    // 添加所有远程节点
    mergedState.nodes.push(...remoteState.nodes);

    // 添加本地独有的节点
    localState.nodes.forEach(localNode => {
      if (!remoteNodesMap.has(localNode.id)) {
        mergedState.nodes.push(localNode);
      }
    });

    // 合并连接
    // const localConnectionsMap = new Map(localState.connections.map(c => [c.id, c]));
    const remoteConnectionsMap = new Map(remoteState.connections.map(c => [c.id, c]));

    // 添加所有远程连接
    mergedState.connections.push(...remoteState.connections);

    // 添加本地独有的连接
    localState.connections.forEach(localConnection => {
      if (!remoteConnectionsMap.has(localConnection.id)) {
        mergedState.connections.push(localConnection);
      }
    });

    conflicts.forEach(conflict => {
      conflict.resolved = true;
      conflict.resolution = 'merge';
    });

    console.log('[ConflictResolution] 自动合并完成');
    return mergedState;
  }

  /**
   * 检测节点冲突
   */
  private detectNodeConflicts(localNodes: LegalNode[], remoteNodes: LegalNode[]): Conflict[] {
    const conflicts: Conflict[] = [];
    // const localNodesMap = new Map(localNodes.map(n => [n.id, n]));
    const remoteNodesMap = new Map(remoteNodes.map(n => [n.id, n]));

    // 检测修改冲突
    localNodes.forEach(localNode => {
      const remoteNode = remoteNodesMap.get(localNode.id);
      if (remoteNode && JSON.stringify(localNode) !== JSON.stringify(remoteNode)) {
        conflicts.push({
          id: `conflict-node-${localNode.id}-${Date.now()}`,
          type: 'node-modified',
          localChange: localNode,
          remoteChange: remoteNode,
          timestamp: new Date().toISOString(),
          resolved: false,
        });
      }
    });

    // 检测删除冲突
    localNodes.forEach(localNode => {
      if (!remoteNodesMap.has(localNode.id)) {
        conflicts.push({
          id: `conflict-node-deleted-${localNode.id}-${Date.now()}`,
          type: 'node-deleted',
          localChange: localNode,
          remoteChange: null,
          timestamp: new Date().toISOString(),
          resolved: false,
        });
      }
    });

    return conflicts;
  }

  /**
   * 检测连接冲突
   */
  private detectConnectionConflicts(localConnections: any[], remoteConnections: any[]): Conflict[] {
    const conflicts: Conflict[] = [];
    // const localConnectionsMap = new Map(localConnections.map(c => [c.id, c]));
    const remoteConnectionsMap = new Map(remoteConnections.map(c => [c.id, c]));

    // 检测修改冲突
    localConnections.forEach(localConnection => {
      const remoteConnection = remoteConnectionsMap.get(localConnection.id);
      if (remoteConnection && JSON.stringify(localConnection) !== JSON.stringify(remoteConnection)) {
        conflicts.push({
          id: `conflict-connection-${localConnection.id}-${Date.now()}`,
          type: 'connection-modified',
          localChange: localConnection,
          remoteChange: remoteConnection,
          timestamp: new Date().toISOString(),
          resolved: false,
        });
      }
    });

    // 检测删除冲突
    localConnections.forEach(localConnection => {
      if (!remoteConnectionsMap.has(localConnection.id)) {
        conflicts.push({
          id: `conflict-connection-deleted-${localConnection.id}-${Date.now()}`,
          type: 'connection-deleted',
          localChange: localConnection,
          remoteChange: null,
          timestamp: new Date().toISOString(),
          resolved: false,
        });
      }
    });

    return conflicts;
  }

  /**
   * 获取冲突列表
   */
  getConflicts(caseId: string): Conflict[] {
    return this.conflicts.get(caseId) || [];
  }

  /**
   * 清除冲突
   */
  clearConflicts(caseId: string): void {
    this.conflicts.delete(caseId);
    console.log(`[ConflictResolution] 已清除冲突: ${caseId}`);
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.conflicts.clear();
  }
}

/**
 * 全局冲突解决实例
 */
export const conflictResolution = new ConflictResolution();

