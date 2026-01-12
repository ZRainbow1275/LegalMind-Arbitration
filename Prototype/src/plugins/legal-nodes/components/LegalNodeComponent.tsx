import React from 'react';
import { PlaitBoard } from '@plait/core';
import { LegalNode, LegalNodeTypes } from '../types';
import { LegalNodeEngine } from '../engines/legal-node-engine';
import { useWorkspaceStore, WorkspaceStore } from '../../../stores/workspaceStore';

interface LegalNodeComponentProps {
  node: LegalNode;
  board: PlaitBoard;
  selected?: boolean;
  onDoubleClick?: (node: LegalNode) => void;
}

export const LegalNodeComponent: React.FC<LegalNodeComponentProps> = ({
  node,
  selected = false,
  onDoubleClick
}) => {
  const bounds = LegalNodeEngine.getNodeBounds(node);
  const icon = LegalNodeEngine.getNodeIcon(node.type as LegalNodeTypes);
  const title = LegalNodeEngine.getNodeTitle(node);
  const subtitle = LegalNodeEngine.getNodeSubtitle(node);

  // Get zoom level for LOD
  const zoomLevel = useWorkspaceStore((state: WorkspaceStore) => state.zoomLevel);
  const isSimplified = zoomLevel < 0.6;

  const handleDoubleClick = () => {
    onDoubleClick?.(node);
  };

  const renderNodeShape = () => {
    const commonProps = {
      fill: node.fill || '#f5f5f5',
      stroke: node.strokeColor || '#666',
      strokeWidth: node.strokeWidth || 2,
      opacity: node.opacity || 1,
      style: { cursor: 'pointer' }
    };

    // Simplified view for low zoom
    if (isSimplified) {
      return (
        <g onDoubleClick={handleDoubleClick}>
          <rect
            x={bounds.x}
            y={bounds.y}
            width={bounds.width}
            height={bounds.height}
            rx={4}
            ry={4}
            {...commonProps}
          />
          {/* Only show icon in simplified mode */}
          <text
            x={bounds.x + bounds.width / 2}
            y={bounds.y + bounds.height / 2 + 5}
            textAnchor="middle"
            fontSize="24"
            fill="#333"
          >
            {icon}
          </text>
        </g>
      );
    }

    switch (node.type) {
      case LegalNodeTypes.person: {
        // 圆形人物节点
        const radius = Math.min(bounds.width, bounds.height) / 2;
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;

        return (
          <g onDoubleClick={handleDoubleClick}>
            <circle
              cx={centerX}
              cy={centerY}
              r={radius}
              {...commonProps}
            />
            <text
              x={centerX}
              y={centerY - 10}
              textAnchor="middle"
              fontSize="24"
              fill="#333"
            >
              {icon}
            </text>
            <text
              x={centerX}
              y={centerY + 15}
              textAnchor="middle"
              fontSize="12"
              fill="#333"
              fontWeight="bold"
            >
              {title}
            </text>
            <text
              x={centerX}
              y={centerY + 30}
              textAnchor="middle"
              fontSize="10"
              fill="#666"
            >
              {subtitle}
            </text>
          </g>
        );
      }

      case LegalNodeTypes.timeline: {
        // 菱形时间轴节点
        const centerXDiamond = bounds.x + bounds.width / 2;
        const centerYDiamond = bounds.y + bounds.height / 2;


        const diamondPath = `M ${centerXDiamond},${bounds.y} 
                            L ${bounds.x + bounds.width},${centerYDiamond} 
                            L ${centerXDiamond},${bounds.y + bounds.height} 
                            L ${bounds.x},${centerYDiamond} Z`;

        return (
          <g onDoubleClick={handleDoubleClick}>
            <path
              d={diamondPath}
              {...commonProps}
            />
            <text
              x={centerXDiamond}
              y={centerYDiamond - 5}
              textAnchor="middle"
              fontSize="16"
              fill="#333"
            >
              {icon}
            </text>
            <text
              x={centerXDiamond}
              y={centerYDiamond + 15}
              textAnchor="middle"
              fontSize="10"
              fill="#333"
              fontWeight="bold"
            >
              {title.length > 8 ? title.substring(0, 8) + '...' : title}
            </text>
          </g>
        );
      }

      case LegalNodeTypes.process: {
        // 六边形流程节点
        const centerXHex = bounds.x + bounds.width / 2;
        const centerYHex = bounds.y + bounds.height / 2;
        const hexRadius = Math.min(bounds.width, bounds.height) / 2 * 0.8;

        const hexPoints = [];
        for (let i = 0; i < 6; i++) {
          const angle = (i * 60 - 90) * Math.PI / 180;
          const x = centerXHex + hexRadius * Math.cos(angle);
          const y = centerYHex + hexRadius * Math.sin(angle);
          hexPoints.push(`${x},${y}`);
        }

        return (
          <g onDoubleClick={handleDoubleClick}>
            <polygon
              points={hexPoints.join(' ')}
              {...commonProps}
            />
            <text
              x={centerXHex}
              y={centerYHex - 10}
              textAnchor="middle"
              fontSize="20"
              fill="#333"
            >
              {icon}
            </text>
            <text
              x={centerXHex}
              y={centerYHex + 10}
              textAnchor="middle"
              fontSize="10"
              fill="#333"
              fontWeight="bold"
            >
              {title.length > 10 ? title.substring(0, 10) + '...' : title}
            </text>
            <text
              x={centerXHex}
              y={centerYHex + 25}
              textAnchor="middle"
              fontSize="9"
              fill="#666"
            >
              {subtitle}
            </text>
          </g>
        );
      }

      case LegalNodeTypes.aiAssistant: {
        // 星形AI助手节点
        const centerXStar = bounds.x + bounds.width / 2;
        const centerYStar = bounds.y + bounds.height / 2;
        const outerRadius = Math.min(bounds.width, bounds.height) / 2 * 0.8;
        const innerRadius = outerRadius * 0.4;

        const starPoints = [];
        for (let i = 0; i < 10; i++) {
          const angle = (i * 36 - 90) * Math.PI / 180;
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const x = centerXStar + radius * Math.cos(angle);
          const y = centerYStar + radius * Math.sin(angle);
          starPoints.push(`${x},${y}`);
        }

        return (
          <g onDoubleClick={handleDoubleClick}>
            <defs>
              <linearGradient id={`aiGradient-${node.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#667eea" />
                <stop offset="100%" stopColor="#764ba2" />
              </linearGradient>
            </defs>
            <polygon
              points={starPoints.join(' ')}
              fill={`url(#aiGradient-${node.id})`}
              stroke={node.strokeColor || '#5e72e4'}
              strokeWidth={node.strokeWidth || 2}
              opacity={node.opacity || 1}
              style={{ cursor: 'pointer' }}
            />
            <text
              x={centerXStar}
              y={centerYStar + 5}
              textAnchor="middle"
              fontSize="24"
              fill="white"
            >
              {icon}
            </text>
          </g>
        );
      }

      case LegalNodeTypes.document: {
        // 文档形状节点
        const docCornerSize = 15;
        const docPath = `M ${bounds.x},${bounds.y} 
                        L ${bounds.x + bounds.width - docCornerSize},${bounds.y} 
                        L ${bounds.x + bounds.width},${bounds.y + docCornerSize} 
                        L ${bounds.x + bounds.width},${bounds.y + bounds.height} 
                        L ${bounds.x},${bounds.y + bounds.height} Z
                        M ${bounds.x + bounds.width - docCornerSize},${bounds.y} 
                        L ${bounds.x + bounds.width - docCornerSize},${bounds.y + docCornerSize} 
                        L ${bounds.x + bounds.width},${bounds.y + docCornerSize}`;

        return (
          <g onDoubleClick={handleDoubleClick}>
            <path
              d={docPath}
              {...commonProps}
            />
            <text
              x={bounds.x + bounds.width / 2}
              y={bounds.y + 30}
              textAnchor="middle"
              fontSize="20"
              fill="#333"
            >
              {icon}
            </text>
            <text
              x={bounds.x + bounds.width / 2}
              y={bounds.y + 55}
              textAnchor="middle"
              fontSize="11"
              fill="#333"
              fontWeight="bold"
            >
              {title.length > 12 ? title.substring(0, 12) + '...' : title}
            </text>
            <text
              x={bounds.x + bounds.width / 2}
              y={bounds.y + 70}
              textAnchor="middle"
              fontSize="9"
              fill="#666"
            >
              {subtitle}
            </text>
          </g>
        );
      }

      default:
        // 默认矩形节点（案件信息）
        return (
          <g onDoubleClick={handleDoubleClick}>
            <rect
              x={bounds.x}
              y={bounds.y}
              width={bounds.width}
              height={bounds.height}
              rx={8}
              ry={8}
              {...commonProps}
            />
            <text
              x={bounds.x + bounds.width / 2}
              y={bounds.y + 25}
              textAnchor="middle"
              fontSize="20"
              fill="#333"
            >
              {icon}
            </text>
            <text
              x={bounds.x + bounds.width / 2}
              y={bounds.y + 45}
              textAnchor="middle"
              fontSize="12"
              fill="#333"
              fontWeight="bold"
            >
              {title}
            </text>
            <text
              x={bounds.x + bounds.width / 2}
              y={bounds.y + 60}
              textAnchor="middle"
              fontSize="10"
              fill="#666"
            >
              {subtitle}
            </text>

            {/* 状态指示器 */}
            {node.type === LegalNodeTypes.case && (
              <circle
                cx={bounds.x + bounds.width - 15}
                cy={bounds.y + 15}
                r={6}
                fill={LegalNodeEngine.getStatusColor(node.caseInfo.status)}
                stroke="white"
                strokeWidth={2}
              />
            )}
          </g>
        );
    }
  };

  return (
    <g className={`legal-node ${selected ? 'selected' : ''}`}>
      {renderNodeShape()}

      {/* 选中状态边框 */}
      {selected && (
        <rect
          x={bounds.x - 3}
          y={bounds.y - 3}
          width={bounds.width + 6}
          height={bounds.height + 6}
          fill="none"
          stroke="#FF6B35"
          strokeWidth={2}
          strokeDasharray="5,5"
          rx={node.type === LegalNodeTypes.person ? bounds.width / 2 : 8}
          ry={node.type === LegalNodeTypes.person ? bounds.height / 2 : 8}
        />
      )}
    </g>
  );
};

export default LegalNodeComponent;
