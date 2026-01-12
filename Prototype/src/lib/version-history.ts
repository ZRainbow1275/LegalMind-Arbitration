/**
 * 版本历史服务
 * 
 * 管理画布状态的版本历史
 */

import { CanvasState } from '../interfaces/case-canvas-mapping';

/**
 * 版本记录
 */
export interface VersionRecord {
  id: string;
  caseId: string;
  version: number;
  state: CanvasState;
  description: string;
  createdBy: string;
  createdAt: string;
  metadata?: {
    nodeCount: number;
    connectionCount: number;
    editCount: number;
  };
}

/**
 * 版本比较结果
 */
export interface VersionDiff {
  added: {
    nodes: any[];
    connections: any[];
  };
  removed: {
    nodes: any[];
    connections: any[];
  };
  modified: {
    nodes: any[];
    connections: any[];
  };
}

/**
 * 版本历史服务
 */
export class VersionHistory {
  private versions = new Map<string, VersionRecord[]>();
  private maxVersions = 50; // 最多保留50个版本

  /**
   * 保存版本
   */
  async saveVersion(
    caseId: string,
    state: CanvasState,
    description: string,
    createdBy: string = 'system'
  ): Promise<VersionRecord> {
    const versions = this.versions.get(caseId) || [];
    const version = versions.length + 1;

    const record: VersionRecord = {
      id: `version-${caseId}-${version}`,
      caseId,
      version,
      state: JSON.parse(JSON.stringify(state)), // 深拷贝
      description,
      createdBy,
      createdAt: new Date().toISOString(),
      metadata: {
        nodeCount: state.nodes.length,
        connectionCount: state.connections.length,
        editCount: state.metadata.editCount,
      },
    };

    versions.push(record);

    // 限制版本数量
    if (versions.length > this.maxVersions) {
      versions.shift(); // 删除最旧的版本
    }

    this.versions.set(caseId, versions);

    console.log(`[VersionHistory] 已保存版本 ${version}:`, description);
    return record;
  }

  /**
   * 获取版本列表
   */
  async getVersions(caseId: string): Promise<VersionRecord[]> {
    return this.versions.get(caseId) || [];
  }

  /**
   * 获取特定版本
   */
  async getVersion(caseId: string, version: number): Promise<VersionRecord | null> {
    const versions = this.versions.get(caseId) || [];
    return versions.find(v => v.version === version) || null;
  }

  /**
   * 恢复到特定版本
   */
  async restoreVersion(caseId: string, version: number): Promise<CanvasState | null> {
    const record = await this.getVersion(caseId, version);
    if (!record) {
      console.error(`[VersionHistory] 版本 ${version} 不存在`);
      return null;
    }

    console.log(`[VersionHistory] 恢复到版本 ${version}:`, record.description);
    return JSON.parse(JSON.stringify(record.state)); // 深拷贝
  }

  /**
   * 比较两个版本
   */
  async compareVersions(
    caseId: string,
    version1: number,
    version2: number
  ): Promise<VersionDiff | null> {
    const record1 = await this.getVersion(caseId, version1);
    const record2 = await this.getVersion(caseId, version2);

    if (!record1 || !record2) {
      console.error('[VersionHistory] 版本不存在');
      return null;
    }

    const state1 = record1.state;
    const state2 = record2.state;

    // 比较节点
    const nodes1Map = new Map(state1.nodes.map(n => [n.id, n]));
    const nodes2Map = new Map(state2.nodes.map(n => [n.id, n]));

    const addedNodes = state2.nodes.filter(n => !nodes1Map.has(n.id));
    const removedNodes = state1.nodes.filter(n => !nodes2Map.has(n.id));
    const modifiedNodes = state2.nodes.filter(n => {
      const node1 = nodes1Map.get(n.id);
      return node1 && JSON.stringify(node1) !== JSON.stringify(n);
    });

    // 比较连接
    const connections1Map = new Map(state1.connections.map(c => [c.id, c]));
    const connections2Map = new Map(state2.connections.map(c => [c.id, c]));

    const addedConnections = state2.connections.filter(c => !connections1Map.has(c.id));
    const removedConnections = state1.connections.filter(c => !connections2Map.has(c.id));
    const modifiedConnections = state2.connections.filter(c => {
      const conn1 = connections1Map.get(c.id);
      return conn1 && JSON.stringify(conn1) !== JSON.stringify(c);
    });

    return {
      added: {
        nodes: addedNodes,
        connections: addedConnections,
      },
      removed: {
        nodes: removedNodes,
        connections: removedConnections,
      },
      modified: {
        nodes: modifiedNodes,
        connections: modifiedConnections,
      },
    };
  }

  /**
   * 删除版本
   */
  async deleteVersion(caseId: string, version: number): Promise<boolean> {
    const versions = this.versions.get(caseId) || [];
    const index = versions.findIndex(v => v.version === version);

    if (index === -1) {
      console.error(`[VersionHistory] 版本 ${version} 不存在`);
      return false;
    }

    versions.splice(index, 1);
    this.versions.set(caseId, versions);

    console.log(`[VersionHistory] 已删除版本 ${version}`);
    return true;
  }

  /**
   * 清空版本历史
   */
  async clearVersions(caseId: string): Promise<void> {
    this.versions.delete(caseId);
    console.log(`[VersionHistory] 已清空版本历史: ${caseId}`);
  }

  /**
   * 获取版本统计
   */
  async getVersionStats(caseId: string): Promise<{
    totalVersions: number;
    oldestVersion: VersionRecord | null;
    latestVersion: VersionRecord | null;
  }> {
    const versions = this.versions.get(caseId) || [];

    return {
      totalVersions: versions.length,
      oldestVersion: versions[0] || null,
      latestVersion: versions[versions.length - 1] || null,
    };
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.versions.clear();
  }
}

/**
 * 全局版本历史实例
 */
export const versionHistory = new VersionHistory();

