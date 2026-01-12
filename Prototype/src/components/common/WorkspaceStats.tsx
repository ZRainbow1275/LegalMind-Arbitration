/**
 * 工作台统计信息组件
 * 计算和提供工作台的各种统计数据
 */

import React from 'react';
import type { LegalNode } from '../DrawnixLegalWorkspace';
import type { ConnectionElement as Connection } from '../../types/canvas-elements';

export interface WorkspaceStatsData {
  // 节点统计
  totalNodes: number;
  nodesByType: Record<string, number>;
  nodesByStatus: Record<string, number>;

  // 连接统计
  totalConnections: number;
  connectionsByType: Record<string, number>;

  // 选中统计
  selectedCount: number;
  selectedNodeTypes: string[];

  // 协作统计
  collaboratorCount: number;
  collaboratorNames: string[];

  // 性能统计
  performanceGain: number;
  cullingRate: number;
}

/**
 * 从节点的connections字段计算实际的连接数
 * 避免重复计数（双向连接只计算一次）
 */
export function calculateActualConnections(nodes: LegalNode[]): number {
  const processedPairs = new Set<string>();
  let count = 0;

  nodes.forEach(node => {
    // 检查connections是否存在
    if (!node.data.connections || !Array.isArray(node.data.connections)) {
      return;
    }

    node.data.connections.forEach(connectionId => {
      const targetNode = nodes.find(n => n.id === connectionId);
      if (targetNode) {
        // 生成唯一的连接对ID（排序后的ID组合）
        const pairId = [node.id, targetNode.id].sort().join('-');

        // 避免重复连接（双向连接只计算一次）
        if (!processedPairs.has(pairId)) {
          processedPairs.add(pairId);
          count++;
        }
      }
    });
  });

  return count;
}

/**
 * 计算工作台统计信息
 */
export function calculateWorkspaceStats(
  nodes: LegalNode[],
  connections: Connection[],
  selectedNodeIds: string[],
  virtualizationStats?: { estimatedPerformanceGain: number; nodeCullingRate: number }
): WorkspaceStatsData {
  // 节点统计
  const nodesByType: Record<string, number> = {};
  const nodesByStatus: Record<string, number> = {};

  nodes.forEach((node) => {
    // 统计节点类型
    const type = node.type || 'unknown';
    nodesByType[type] = (nodesByType[type] || 0) + 1;

    // 统计节点状态
    const status = node.data?.status || 'unknown';
    nodesByStatus[status] = (nodesByStatus[status] || 0) + 1;
  });

  // {{ AURA: Fix - 使用实际的连接数而不是workspaceState.connections }}
  // 从nodes的connections字段计算实际连接数
  const actualConnectionCount = calculateActualConnections(nodes);

  // 连接统计
  const connectionsByType: Record<string, number> = {};

  connections.forEach((conn) => {
    const type = conn.type || 'unknown';
    connectionsByType[type] = (connectionsByType[type] || 0) + 1;
  });

  // 选中节点类型
  const selectedNodeTypes = nodes
    .filter((node) => selectedNodeIds.includes(node.id))
    .map((node) => node.type || 'unknown');

  // 协作者统计（从评论、光标、选中指示中获取）
  // 这里先使用模拟数据，实际应该从协作store中获取
  const collaboratorCount = 1; // 当前只有自己
  const collaboratorNames = ['当前用户'];

  return {
    totalNodes: nodes.length,
    nodesByType,
    nodesByStatus,
    totalConnections: actualConnectionCount, // {{ AURA: Fix - 使用实际连接数 }}
    connectionsByType,
    selectedCount: selectedNodeIds.length,
    selectedNodeTypes,
    collaboratorCount,
    collaboratorNames,
    performanceGain: virtualizationStats?.estimatedPerformanceGain || 0,
    cullingRate: virtualizationStats?.nodeCullingRate || 0,
  };
}

/**
 * 格式化节点类型名称
 */
export function formatNodeType(type: string): string {
  const typeNames: Record<string, string> = {
    'legal-case': '案件信息',
    'legal-person': '人物关系',
    'legal-document': '文档管理',
    'legal-hearing': '庭审记录',
    'legal-mediation': '调解协商',
    'legal-timeline': '时间轴',
    'unknown': '未知类型',
  };
  return typeNames[type] || type;
}

/**
 * 格式化节点状态名称
 */
export function formatNodeStatus(status: string): string {
  const statusNames: Record<string, string> = {
    'pending': '待处理',
    'active': '进行中',
    'completed': '已完成',
    'cancelled': '已取消',
    'unknown': '未知状态',
  };
  return statusNames[status] || status;
}

/**
 * 格式化连接类型名称
 */
export function formatConnectionType(type: string): string {
  const typeNames: Record<string, string> = {
    'related-to': '相关',
    'depends-on': '依赖',
    'conflicts-with': '冲突',
    'supports': '支持',
    'references': '引用',
    'unknown': '未知类型',
  };
  return typeNames[type] || type;
}

/**
 * 生成节点类型分布的工具提示内容
 */
export function generateNodeTypeTooltip(nodesByType: Record<string, number>): React.ReactNode {
  const entries = Object.entries(nodesByType);
  if (entries.length === 0) {
    return <div className="text-xs">暂无节点</div>;
  }

  return (
    <div className="space-y-1">
      <div className="font-semibold text-xs mb-1">节点类型分布：</div>
      {entries.map(([type, count]) => (
        <div key={type} className="flex justify-between gap-4 text-xs">
          <span>{formatNodeType(type)}</span>
          <span className="font-medium">{count}个</span>
        </div>
      ))}
    </div>
  );
}

/**
 * 生成连接类型分布的工具提示内容
 */
export function generateConnectionTypeTooltip(connectionsByType: Record<string, number>): React.ReactNode {
  const entries = Object.entries(connectionsByType);
  if (entries.length === 0) {
    return <div className="text-xs">暂无连接</div>;
  }

  return (
    <div className="space-y-1">
      <div className="font-semibold text-xs mb-1">连接类型分布：</div>
      {entries.map(([type, count]) => (
        <div key={type} className="flex justify-between gap-4 text-xs">
          <span>{formatConnectionType(type)}</span>
          <span className="font-medium">{count}条</span>
        </div>
      ))}
    </div>
  );
}

/**
 * 生成选中节点的工具提示内容
 */
export function generateSelectedNodesTooltip(
  selectedNodeTypes: string[],
  nodes: LegalNode[],
  selectedNodeIds: string[]
): React.ReactNode {
  if (selectedNodeTypes.length === 0) {
    return <div className="text-xs">未选中任何节点</div>;
  }

  const selectedNodes = nodes.filter((node) => selectedNodeIds.includes(node.id));

  return (
    <div className="space-y-1">
      <div className="font-semibold text-xs mb-1">选中的节点：</div>
      {selectedNodes.slice(0, 5).map((node) => (
        <div key={node.id} className="text-xs">
          • {node.data?.title || '未命名节点'}
        </div>
      ))}
      {selectedNodes.length > 5 && (
        <div className="text-xs text-gray-500">...还有{selectedNodes.length - 5}个节点</div>
      )}
    </div>
  );
}

/**
 * 生成协作者的工具提示内容
 */
export function generateCollaboratorsTooltip(collaboratorNames: string[]): React.ReactNode {
  if (collaboratorNames.length === 0) {
    return <div className="text-xs">暂无协作者</div>;
  }

  return (
    <div className="space-y-1">
      <div className="font-semibold text-xs mb-1">在线协作者：</div>
      {collaboratorNames.map((name, index) => (
        <div key={index} className="text-xs">
          • {name}
        </div>
      ))}
    </div>
  );
}

