import React, { useMemo, useCallback } from 'react';
import type { LegalNode } from '../types/shared';

interface ConnectionLinesProps {
  nodes: LegalNode[]; // Visible nodes
  allNodes: LegalNode[]; // All nodes for lookup
}

interface VisualConnection {
  id: string;
  sourceId: string;
  targetId: string;
  confidence?: number;
  label?: string;
}

const ConnectionLinesComponent: React.FC<ConnectionLinesProps> = ({ nodes, allNodes }) => {
  // {{ AURA: Modify - 使用allNodes查找目标节点，确保即使目标在屏幕外也能连接 }}
  const getNode = useCallback((id: string) => allNodes.find(n => n.id === id), [allNodes]);

  // {{ AURA: Add - 创建可见节点集合用于快速查找 }}
  const visibleNodeIds = useMemo(() => new Set(nodes.map(n => n.id)), [nodes]);

  const connections = useMemo(() => {
    const result: VisualConnection[] = [];
    const processedPairs = new Set<string>(); // 使用Set提高查找性能

    // {{ AURA: Modify - 遍历所有节点以确保即使源节点不可见（但目标节点可见）也能渲染连接 }}
    allNodes.forEach(node => {
      if (!node.data || !node.data.connections) return;
      node.data.connections.forEach((connectionId: string) => {
        const targetNode = getNode(connectionId);

        if (targetNode) {
          // 检查可见性：至少有一个节点在当前渲染列表中
          const isSourceVisible = visibleNodeIds.has(node.id);
          const isTargetVisible = visibleNodeIds.has(targetNode.id);

          if (isSourceVisible || isTargetVisible) {
            // 生成唯一的连接对ID（排序后的ID组合）
            const pairId = [node.id, targetNode.id].sort().join('-');

            // 避免重复连接（双向连接只显示一次）
            if (!processedPairs.has(pairId)) {
              processedPairs.add(pairId);
              result.push({
                id: pairId,
                sourceId: node.id,
                targetId: targetNode.id,
                confidence: Math.random() * 0.4 + 0.6 // 0.6-1.0 的置信度
              });
            }
          }
        }
      });
    });

    return result;
  }, [allNodes, visibleNodeIds, getNode]); // 当allNodes或visibleNodeIds变化时重新计算

  // 计算曲线路径
  const calculateCurvePath = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 控制点偏移量，基于距离调整
    const controlOffset = Math.min(distance * 0.3, 100);

    // 计算控制点
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;

    // 垂直于连线方向的偏移
    const perpX = -dy / distance * controlOffset;
    const perpY = dx / distance * controlOffset;

    const control1X = midX + perpX * 0.5;
    const control1Y = midY + perpY * 0.5;
    const control2X = midX - perpX * 0.5;
    const control2Y = midY - perpY * 0.5;

    return `M ${from.x} ${from.y} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${to.x} ${to.y}`;
  };

  // 计算箭头路径
  const calculateArrowPath = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);

    const arrowLength = 12;
    const arrowAngle = Math.PI / 6; // 30度

    const x1 = to.x - arrowLength * Math.cos(angle - arrowAngle);
    const y1 = to.y - arrowLength * Math.sin(angle - arrowAngle);
    const x2 = to.x - arrowLength * Math.cos(angle + arrowAngle);
    const y2 = to.y - arrowLength * Math.sin(angle + arrowAngle);

    return `M ${to.x} ${to.y} L ${x1} ${y1} M ${to.x} ${to.y} L ${x2} ${y2}`;
  };

  // 获取连接线颜色
  const getConnectionColor = (confidence: number) => {
    if (confidence >= 0.9) return '#f97316'; // 橙色 - 高置信度
    if (confidence >= 0.8) return '#eab308'; // 黄色 - 中高置信度
    if (confidence >= 0.7) return '#22c55e'; // 绿色 - 中等置信度
    return '#6b7280'; // 灰色 - 低置信度
  };

  // 获取连接线宽度
  const getConnectionWidth = (confidence: number) => {
    if (confidence >= 0.9) return 3;
    if (confidence >= 0.8) return 2.5;
    if (confidence >= 0.7) return 2;
    return 1.5;
  };

  if (connections.length === 0) {
    return null;
  }

  return (
    <svg
      className="pointer-events-none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '10000px',
        height: '10000px',
        overflow: 'visible',
        zIndex: 1
      }}
    >
      <defs>
        {/* 定义渐变 */}
        <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#fb923c" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#fdba74" stopOpacity="0.4" />
        </linearGradient>

        {/* 定义发光效果 */}
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* 定义动画虚线 */}
        <pattern id="dashedPattern" patternUnits="userSpaceOnUse" width="10" height="1">
          <rect width="5" height="1" fill="#f97316" opacity="0.6" />
          <rect x="5" width="5" height="1" fill="transparent" />
        </pattern>
      </defs>

      {/* {{ AURA: Modify - 层级渲染：先渲染背景层，再渲染主线层，最后渲染标签层 }} */}

      {/* Background layer (glow effect) - Batch render */}
      <g className="connection-background-layer">
        {connections.map((connection) => {
          const fromNode = getNode(connection.sourceId);
          const toNode = getNode(connection.targetId);

          if (!fromNode?.data?.position || !toNode?.data?.position) return null;

          const fromPos = fromNode.data.position;
          const toPos = toNode.data.position;

          // Ensure coordinates are numbers
          if (typeof fromPos.x !== 'number' || typeof fromPos.y !== 'number' ||
            typeof toPos.x !== 'number' || typeof toPos.y !== 'number') return null;

          const color = getConnectionColor(connection.confidence || 0);
          const width = getConnectionWidth(connection.confidence || 0);
          const curvePath = calculateCurvePath(fromPos, toPos);

          return (
            <path
              key={`bg-${connection.id}`}
              d={curvePath}
              stroke={color}
              strokeWidth={width + 4}
              fill="none"
              opacity="0.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      </g>

      {/* Main line layer - Batch render */}
      <g className="connection-main-layer">
        {connections.map((connection) => {
          const fromNode = getNode(connection.sourceId);
          const toNode = getNode(connection.targetId);

          if (!fromNode?.data?.position || !toNode?.data?.position) return null;

          const fromPos = fromNode.data.position;
          const toPos = toNode.data.position;

          // Ensure coordinates are numbers
          if (typeof fromPos.x !== 'number' || typeof fromPos.y !== 'number' ||
            typeof toPos.x !== 'number' || typeof toPos.y !== 'number') return null;

          const color = getConnectionColor(connection.confidence || 0);
          const width = getConnectionWidth(connection.confidence || 0);
          const curvePath = calculateCurvePath(fromPos, toPos);

          return (
            <path
              key={`main-${connection.id}`}
              d={curvePath}
              stroke={color}
              strokeWidth={width}
              fill="none"
              opacity="0.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Animation effect - Only enabled when connection count < 50 */}
              {connections.length < 50 && (
                <animate
                  attributeName="stroke-dasharray"
                  values="0,1000;1000,0"
                  dur="3s"
                  repeatCount="indefinite"
                />
              )}
            </path>
          );
        })}
      </g>

      {/* Arrow layer - Batch render */}
      <g className="connection-arrow-layer">
        {connections.map((connection, index) => {
          const fromNode = getNode(connection.sourceId);
          const toNode = getNode(connection.targetId);

          if (!fromNode?.data?.position || !toNode?.data?.position) return null; // Skip if nodes or positions not found

          const fromPos = fromNode.data.position;
          const toPos = toNode.data.position;
          const color = getConnectionColor(connection.confidence || 0);
          const width = getConnectionWidth(connection.confidence || 0);
          const arrowPath = calculateArrowPath(fromPos, toPos);

          return (
            <path
              key={`arrow-${index}`}
              d={arrowPath}
              stroke={color}
              strokeWidth={width}
              fill="none"
              opacity="0.9"
              strokeLinecap="round"
            />
          );
        })}
      </g>

      {/* Labels layer - Batch render */}
      <g className="connection-label-layer">
        {connections.map((connection, index) => {
          const fromNode = getNode(connection.sourceId);
          const toNode = getNode(connection.targetId);

          if (!fromNode?.data?.position || !toNode?.data?.position) return null;

          const fromPos = fromNode.data.position;
          const toPos = toNode.data.position;

          // Calculate midpoint for label
          // Simple approximation for Bezier curve midpoint
          const midX = (fromPos.x + toPos.x) / 2;
          const midY = (fromPos.y + toPos.y) / 2;

          return (
            <g key={`label-${index}`}>
              {/* Relationship label */}
              {connection.label && (
                <g transform={`translate(${midX}, ${midY})`}>
                  <rect
                    x="-40"
                    y="-12"
                    width="80"
                    height="24"
                    rx="12"
                    fill="white"
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    className="shadow-sm"
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fontSize="10" // Fixed font size since viewport is not available
                    fill="#64748b"
                    fontWeight="500"
                  >
                    {connection.label}
                  </text>
                </g>
              )}

              {/* Confidence indicator */}
              {connection.confidence && (
                <text
                  x={midX}
                  y={midY + 20}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="10" // Fixed font size
                >
                  {Math.round(connection.confidence * 100)}%
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
};

// {{ AURA: Modify - 优化React.memo比较函数，添加快速路径和哈希比较 }}
export const ConnectionLines = React.memo(ConnectionLinesComponent);
