/**
 * 连接线绘制组件
 * 
 * 支持绘制元素之间的连接线
 */

import React, { useState, useCallback } from 'react';
import type { CanvasElement } from '../../types/canvas-elements';

interface ConnectionDrawerProps {
  elements: CanvasElement[];
  onCreateConnection: (sourceId: string, targetId: string, style: 'straight' | 'curved' | 'orthogonal') => void;
  zoom: number;
}

export const ConnectionDrawer: React.FC<ConnectionDrawerProps> = ({
  // elements,
  // onCreateConnection,
  zoom,
}) => {
  // const [isDrawing, setIsDrawing] = useState(false);
  // const [sourceElement, setSourceElement] = useState<CanvasElement | null>(null);
  // const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0 });
  // const [hoveredElement, setHoveredElement] = useState<CanvasElement | null>(null);
  const [isDrawing] = useState(false);
  const [sourceElement] = useState<CanvasElement | null>(null);
  const [currentPosition] = useState({ x: 0, y: 0 });
  const [hoveredElement] = useState<CanvasElement | null>(null);
  // const [connectionStyle, setConnectionStyle] = useState<'straight' | 'curved' | 'orthogonal'>('curved');
  const [connectionStyle] = useState<'straight' | 'curved' | 'orthogonal'>('curved');



  /**
   * 计算连接点位置（元素边缘的最近点）
   */
  const getConnectionPoint = useCallback((element: CanvasElement, targetX: number, targetY: number) => {
    const centerX = element.position.x + element.size.width / 2;
    const centerY = element.position.y + element.size.height / 2;

    // 计算角度
    const angle = Math.atan2(targetY - centerY, targetX - centerX);

    // 计算边缘点
    const halfWidth = element.size.width / 2;
    const halfHeight = element.size.height / 2;

    // 根据角度确定在哪条边上
    const absAngle = Math.abs(angle);
    const topBottomThreshold = Math.atan2(halfHeight, halfWidth);

    let x, y;

    if (absAngle < topBottomThreshold) {
      // 右边
      x = element.position.x + element.size.width;
      y = centerY + Math.tan(angle) * halfWidth;
    } else if (absAngle > Math.PI - topBottomThreshold) {
      // 左边
      x = element.position.x;
      y = centerY - Math.tan(angle) * halfWidth;
    } else if (angle > 0) {
      // 下边
      y = element.position.y + element.size.height;
      x = centerX + halfHeight / Math.tan(angle);
    } else {
      // 上边
      y = element.position.y;
      x = centerX - halfHeight / Math.tan(angle);
    }

    return { x, y };
  }, []);

  /**
   * 生成连接线路径
   */
  const generatePath = useCallback((start: { x: number; y: number }, end: { x: number; y: number }, style: 'straight' | 'curved' | 'orthogonal') => {
    switch (style) {
      case 'straight':
        return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;

      case 'curved': {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const controlOffset = Math.min(distance / 2, 100);

        const cp1x = start.x + controlOffset;
        const cp1y = start.y;
        const cp2x = end.x - controlOffset;
        const cp2y = end.y;

        return `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`;
      }

      case 'orthogonal': {
        const midX = (start.x + end.x) / 2;
        return `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`;
      }

      default:
        return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
    }
  }, []);

  // 如果没有在绘制，不渲染任何内容
  if (!isDrawing || !sourceElement) {
    return null;
  }

  // 计算起点（源元素的边缘）
  const startPoint = getConnectionPoint(sourceElement, currentPosition.x, currentPosition.y);

  // 计算终点（如果悬停在元素上，使用元素边缘；否则使用鼠标位置）
  const endPoint = hoveredElement
    ? getConnectionPoint(hoveredElement, startPoint.x, startPoint.y)
    : currentPosition;

  // 生成路径
  const path = generatePath(startPoint, endPoint, connectionStyle);

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 999,
      }}
    >
      {/* 连接线 */}
      <path
        d={path}
        stroke="#f97316"
        strokeWidth={2 / zoom}
        fill="none"
        strokeDasharray={`${4 / zoom} ${4 / zoom}`}
      />

      {/* 起点标记 */}
      <circle
        cx={startPoint.x}
        cy={startPoint.y}
        r={4 / zoom}
        fill="#f97316"
      />

      {/* 终点标记 */}
      <circle
        cx={endPoint.x}
        cy={endPoint.y}
        r={4 / zoom}
        fill={hoveredElement ? '#10b981' : '#f97316'}
      />

      {/* 箭头 */}
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3, 0 6"
            fill="#f97316"
          />
        </marker>
      </defs>
      <path
        d={path}
        stroke="transparent"
        strokeWidth={2 / zoom}
        fill="none"
        markerEnd="url(#arrowhead)"
      />

      {/* 提示文本 */}
      <text
        x={currentPosition.x}
        y={currentPosition.y - 20 / zoom}
        fill="#f97316"
        fontSize={12 / zoom}
        textAnchor="middle"
      >
        {hoveredElement ? '释放以创建连接' : '拖拽到目标元素'}
      </text>
    </svg>
  );
};

// 导出辅助函数供外部使用


