/**
 * 导入服务
 * 
 * 功能：
 * - JSON导入
 * - 数据验证
 * - 冲突检测
 * - 数据合并
 * 
 * @author AI Agent
 * @date 2025-11-06
 */

import type { LegalNode, Connection } from '../components/workspace/types';

/**
 * 导入选项
 */
export interface ImportOptions {
  /** 是否替换现有数据 */
  replace?: boolean;
  /** 是否合并数据 */
  merge?: boolean;
  /** 冲突解决策略 */
  conflictStrategy?: 'skip' | 'replace' | 'rename';
  /** 是否验证数据 */
  validate?: boolean;
}

/**
 * 导入结果
 */
export interface ImportResult {
  /** 成功导入的节点数 */
  nodesImported: number;
  /** 成功导入的连接数 */
  connectionsImported: number;
  /** 跳过的节点数 */
  nodesSkipped: number;
  /** 跳过的连接数 */
  connectionsSkipped: number;
  /** 错误信息 */
  errors: string[];
  /** 警告信息 */
  warnings: string[];
}

/**
 * 工作台数据格式
 */
export interface WorkspaceData {
  nodes: LegalNode[];
  connections: Connection[];
  viewport?: {
    zoom: number;
    origination: [number, number];
  };
  metadata?: {
    version: string;
    exportedAt?: string;
    exportedBy?: string;
  };
}

/**
 * JSON Schema验证
 */


/**
 * 导入服务类
 */
export class ImportService {
  /**
   * 从JSON文件导入
   */
  async importFromJSON(
    file: File,
    existingNodes: LegalNode[],
    existingConnections: Connection[],
    options: ImportOptions = {}
  ): Promise<{ data: WorkspaceData; result: ImportResult }> {
    const {
      replace = false,
      merge: _merge = true,
      conflictStrategy = 'rename',
      validate = true,
    } = options;

    // 读取文件
    const text = await file.text();
    let data: WorkspaceData;

    try {
      data = JSON.parse(text);
    } catch (error) {
      throw new Error('无效的JSON文件');
    }

    // 验证数据
    if (validate) {
      this.validateData(data);
    }

    // 确保数据完整性
    if (!data.nodes) {
      data.nodes = [];
    }
    if (!data.connections) {
      data.connections = [];
    }

    // 初始化结果
    const result: ImportResult = {
      nodesImported: 0,
      connectionsImported: 0,
      nodesSkipped: 0,
      connectionsSkipped: 0,
      errors: [],
      warnings: [],
    };

    // 处理节点
    const processedNodes: LegalNode[] = [];
    const nodeIdMap = new Map<string, string>(); // 旧ID -> 新ID映射

    for (const node of data.nodes) {
      // 规范化节点数据，确保必需字段存在
      const normalizedNode = this.normalizeNode(node);

      const existingNode = existingNodes.find(n => n.id === normalizedNode.id);

      if (existingNode) {
        // 节点ID冲突
        if (conflictStrategy === 'skip') {
          result.nodesSkipped++;
          result.warnings.push(`节点 ${normalizedNode.id} 已存在，已跳过`);
          continue;
        } else if (conflictStrategy === 'replace') {
          processedNodes.push(normalizedNode);
          nodeIdMap.set(normalizedNode.id, normalizedNode.id);
          result.nodesImported++;
        } else if (conflictStrategy === 'rename') {
          const newId = this.generateUniqueId(normalizedNode.id, existingNodes);
          const renamedNode = { ...normalizedNode, id: newId };
          processedNodes.push(renamedNode);
          nodeIdMap.set(normalizedNode.id, newId);
          result.nodesImported++;
          result.warnings.push(`节点 ${normalizedNode.id} 已重命名为 ${newId}`);
        }
      } else {
        processedNodes.push(normalizedNode);
        nodeIdMap.set(normalizedNode.id, normalizedNode.id);
        result.nodesImported++;
      }
    }

    // 处理连接
    const processedConnections: Connection[] = [];

    for (const conn of data.connections) {
      // 更新连接的source和target ID
      const newSource = nodeIdMap.get(conn.source);
      const newTarget = nodeIdMap.get(conn.target);

      if (!newSource || !newTarget) {
        result.connectionsSkipped++;
        result.warnings.push(`连接 ${conn.id} 的节点不存在，已跳过`);
        continue;
      }

      const existingConn = existingConnections.find(c => c.id === conn.id);

      if (existingConn) {
        if (conflictStrategy === 'skip') {
          result.connectionsSkipped++;
          continue;
        } else if (conflictStrategy === 'replace') {
          processedConnections.push({
            ...conn,
            source: newSource,
            target: newTarget,
          });
          result.connectionsImported++;
        } else if (conflictStrategy === 'rename') {
          const newId = this.generateUniqueConnectionId(conn.id, existingConnections);
          processedConnections.push({
            ...conn,
            id: newId,
            source: newSource,
            target: newTarget,
          });
          result.connectionsImported++;
        }
      } else {
        processedConnections.push({
          ...conn,
          source: newSource,
          target: newTarget,
        });
        result.connectionsImported++;
      }
    }

    // 合并或替换数据
    const finalData: WorkspaceData = {
      nodes: replace ? processedNodes : [...existingNodes, ...processedNodes],
      connections: replace ? processedConnections : [...existingConnections, ...processedConnections],
      viewport: data.viewport,
      metadata: data.metadata,
    };

    return { data: finalData, result };
  }

  /**
   * 验证数据格式
   */
  private validateData(data: any): void {
    if (!data || typeof data !== 'object') {
      throw new Error('无效的数据格式');
    }

    if (!Array.isArray(data.nodes)) {
      throw new Error('缺少nodes字段或格式错误');
    }

    if (!Array.isArray(data.connections)) {
      throw new Error('缺少connections字段或格式错误');
    }

    // 验证节点
    for (const node of data.nodes) {
      if (!node.id || !node.type || !node.data) {
        throw new Error(`节点格式错误: ${JSON.stringify(node)}`);
      }
      if (!node.data.title || !node.data.status) {
        throw new Error(`节点数据格式错误: ${node.id}`);
      }
    }

    // 验证连接
    for (const conn of data.connections) {
      if (!conn.id || !conn.source || !conn.target || !conn.type) {
        throw new Error(`连接格式错误: ${JSON.stringify(conn)}`);
      }
    }
  }

  /**
   * 规范化节点数据，确保必需字段存在
   */
  private normalizeNode(node: any): LegalNode {
    // 确保data对象存在
    if (!node.data) {
      node.data = {};
    }

    // 规范化节点类型（确保以'legal-'开头）
    if (node.type && !node.type.startsWith('legal-')) {
      node.type = `legal-${node.type}`;
    }
    if (!node.type) {
      node.type = 'legal-case';
    }

    // 确保必需字段存在
    if (!node.data.connections) {
      node.data.connections = [];
    }

    if (!node.data.metadata) {
      node.data.metadata = {};
    }

    if (!node.data.position) {
      node.data.position = { x: 100, y: 100 };
    }

    if (!node.data.status) {
      node.data.status = 'pending';
    }

    if (!node.data.title) {
      node.data.title = '未命名节点';
    }

    if (!node.data.description) {
      node.data.description = '';
    }

    return node as LegalNode;
  }

  /**
   * 生成唯一节点ID
   */
  private generateUniqueId(baseId: string, existingNodes: LegalNode[]): string {
    let counter = 1;
    let newId = `${baseId}-copy`;

    while (existingNodes.some(n => n.id === newId)) {
      newId = `${baseId}-copy-${counter}`;
      counter++;
    }

    return newId;
  }

  /**
   * 生成唯一连接ID
   */
  private generateUniqueConnectionId(baseId: string, existingConnections: Connection[]): string {
    let counter = 1;
    let newId = `${baseId}-copy`;

    while (existingConnections.some(c => c.id === newId)) {
      newId = `${baseId}-copy-${counter}`;
      counter++;
    }

    return newId;
  }

  /**
   * 从剪贴板导入
   */
  async importFromClipboard(
    existingNodes: LegalNode[],
    existingConnections: Connection[],
    options: ImportOptions = {}
  ): Promise<{ data: WorkspaceData; result: ImportResult }> {
    try {
      const text = await navigator.clipboard.readText();
      const data = JSON.parse(text);

      // 创建临时File对象
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const file = new File([blob], 'clipboard.json', { type: 'application/json' });

      return this.importFromJSON(file, existingNodes, existingConnections, options);
    } catch (error) {
      throw new Error('从剪贴板导入失败: ' + (error as Error).message);
    }
  }
}

/**
 * 全局导入服务实例
 */
export const globalImportService = new ImportService();

