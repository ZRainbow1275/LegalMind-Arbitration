import React, { useRef, useState, useCallback } from 'react';
import { Button } from '../ui/button';

interface Point {
  x: number;
  y: number;
}

interface CanvasNode {
  id: string;
  type: 'case' | 'person' | 'document' | 'hearing' | 'mediation' | 'timeline';
  position: Point;
  size: { width: number; height: number };
  title: string;
  content: string;
  status?: string;
  metadata?: any;
  selected?: boolean;
}

interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'related' | 'depends' | 'conflicts' | 'supports';
  label?: string;
}

interface InfiniteCanvasProps {
  nodes: CanvasNode[];
  connections: Connection[];
  onNodesChange: (nodes: CanvasNode[]) => void;
  onNodeEdit: (node: CanvasNode) => void;
  onNodeSelect: (nodeIds: string[]) => void;
}

export const InfiniteCanvas: React.FC<InfiniteCanvasProps> = ({
  nodes,
  connections,
  onNodesChange,
  onNodeEdit,
  onNodeSelect
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ start: Point; end: Point } | null>(null);


  // 画布拖拽
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
      setIsSelecting(true);
      setSelectionBox({
        start: { x: e.clientX, y: e.clientY },
        end: { x: e.clientX, y: e.clientY }
      });
    }
  }, [viewport]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && !draggedNode) {
      setViewport(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      }));
    }

    if (isSelecting && selectionBox) {
      setSelectionBox(prev => prev ? {
        ...prev,
        end: { x: e.clientX, y: e.clientY }
      } : null);
    }
  }, [isDragging, dragStart, draggedNode, isSelecting, selectionBox]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsDragging(false);
    setDraggedNode(null);

    if (isSelecting && selectionBox) {
      // 计算选择框内的节点
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const selectedIds = nodes.filter(node => {
          const nodeScreenPos = {
            x: rect.left + viewport.x + node.position.x * viewport.scale,
            y: rect.top + viewport.y + node.position.y * viewport.scale
          };

          const minX = Math.min(selectionBox.start.x, selectionBox.end.x);
          const maxX = Math.max(selectionBox.start.x, selectionBox.end.x);
          const minY = Math.min(selectionBox.start.y, selectionBox.end.y);
          const maxY = Math.max(selectionBox.start.y, selectionBox.end.y);

          return nodeScreenPos.x >= minX && nodeScreenPos.x <= maxX &&
            nodeScreenPos.y >= minY && nodeScreenPos.y <= maxY;
        }).map(node => node.id);

        setSelectedNodes(selectedIds);
        onNodeSelect(selectedIds);
      }
    }

    setIsSelecting(false);
    setSelectionBox(null);
  }, [isSelecting, selectionBox, nodes, viewport, onNodeSelect]);

  // 节点拖拽
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setDraggedNode(nodeId);
    setDragStart({ x: e.clientX, y: e.clientY });

    if (!selectedNodes.includes(nodeId)) {
      setSelectedNodes([nodeId]);
      onNodeSelect([nodeId]);
    }
  }, [selectedNodes, onNodeSelect]);

  const handleNodeMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggedNode) {
      const deltaX = (e.clientX - dragStart.x) / viewport.scale;
      const deltaY = (e.clientY - dragStart.y) / viewport.scale;

      const updatedNodes = nodes.map(node => {
        if (selectedNodes.includes(node.id)) {
          return {
            ...node,
            position: {
              x: node.position.x + deltaX,
              y: node.position.y + deltaY
            }
          };
        }
        return node;
      });

      onNodesChange(updatedNodes);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [draggedNode, dragStart, viewport.scale, nodes, selectedNodes, onNodesChange]);

  // 缩放
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(3, viewport.scale * delta));

    setViewport(prev => ({
      ...prev,
      scale: newScale
    }));
  }, [viewport.scale]);

  // 双击编辑
  const handleNodeDoubleClick = useCallback((node: CanvasNode) => {
    onNodeEdit(node);
  }, [onNodeEdit]);

  // 获取节点样式
  const getNodeStyle = (node: CanvasNode) => {
    const isSelected = selectedNodes.includes(node.id);

    return {
      position: 'absolute' as const,
      left: viewport.x + node.position.x * viewport.scale,
      top: viewport.y + node.position.y * viewport.scale,
      width: node.size.width * viewport.scale,
      height: node.size.height * viewport.scale,
      transform: `scale(${viewport.scale})`,
      transformOrigin: 'top left',
      cursor: 'move',
      zIndex: isSelected ? 1000 : 1,
      border: isSelected ? '2px solid #f97316' : '1px solid #e5e7eb',
      borderRadius: node.type === 'person' ? '50%' : '12px',
      backgroundColor: getNodeColor(node.type),
      boxShadow: isSelected ? '0 8px 32px rgba(249, 115, 22, 0.3)' : '0 4px 16px rgba(0, 0, 0, 0.1)',
      transition: 'all 0.2s ease'
    };
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'case': return '#dbeafe';
      case 'person': return '#dcfce7';
      case 'document': return '#fef3c7';
      case 'hearing': return '#f3e8ff';
      case 'mediation': return '#ecfdf5';
      case 'timeline': return '#fef7cd';
      default: return '#f9fafb';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'SCHEDULED': return '#10b981';
      case 'IN_PROGRESS': return '#f59e0b';
      case 'COMPLETED': return '#3b82f6';
      case 'CANCELLED': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // 渲染连接线
  const renderConnections = () => {
    return connections.map(connection => {
      const sourceNode = nodes.find(n => n.id === connection.sourceId);
      const targetNode = nodes.find(n => n.id === connection.targetId);

      if (!sourceNode || !targetNode) return null;

      const sourceCenter = {
        x: viewport.x + (sourceNode.position.x + sourceNode.size.width / 2) * viewport.scale,
        y: viewport.y + (sourceNode.position.y + sourceNode.size.height / 2) * viewport.scale
      };

      const targetCenter = {
        x: viewport.x + (targetNode.position.x + targetNode.size.width / 2) * viewport.scale,
        y: viewport.y + (targetNode.position.y + targetNode.size.height / 2) * viewport.scale
      };

      return (
        <svg
          key={connection.id}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 0
          }}
        >
          <defs>
            <marker
              id={`arrowhead-${connection.id}`}
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#f97316"
              />
            </marker>
          </defs>
          <path
            d={`M ${sourceCenter.x} ${sourceCenter.y} Q ${(sourceCenter.x + targetCenter.x) / 2} ${sourceCenter.y - 50} ${targetCenter.x} ${targetCenter.y}`}
            stroke="#f97316"
            strokeWidth="2"
            fill="none"
            markerEnd={`url(#arrowhead-${connection.id})`}
          />
          {connection.label && (
            <text
              x={(sourceCenter.x + targetCenter.x) / 2}
              y={(sourceCenter.y + targetCenter.y) / 2 - 25}
              textAnchor="middle"
              fill="#f97316"
              fontSize="12"
              fontWeight="500"
            >
              {connection.label}
            </text>
          )}
        </svg>
      );
    });
  };

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full overflow-hidden bg-gray-50"
      style={{
        backgroundImage: `
          radial-gradient(circle, #d1d5db 1px, transparent 1px)
        `,
        backgroundSize: `${20 * viewport.scale}px ${20 * viewport.scale}px`,
        backgroundPosition: `${viewport.x}px ${viewport.y}px`
      }}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onWheel={handleWheel}
    >
      {/* 网格背景已通过CSS实现 */}

      {/* 连接线 */}
      {renderConnections()}

      {/* 节点 */}
      {nodes.map(node => (
        <div
          key={node.id}
          style={getNodeStyle(node)}
          onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
          onMouseMove={handleNodeMouseMove}
          onDoubleClick={() => handleNodeDoubleClick(node)}
          className="flex flex-col items-center justify-center p-3 hover:shadow-lg transition-all duration-200"
        >
          {/* 状态指示器 */}
          {node.status && (
            <div
              className="absolute -top-2 -right-2 w-4 h-4 rounded-full border-2 border-white"
              style={{ backgroundColor: getStatusColor(node.status) }}
            />
          )}

          {/* 节点内容 */}
          <div className="text-center">
            <div className="font-semibold text-sm mb-1 text-gray-800">
              {node.title}
            </div>
            <div className="text-xs text-gray-600">
              {node.content}
            </div>
          </div>
        </div>
      ))}

      {/* 选择框 */}
      {selectionBox && (
        <div
          className="absolute border-2 border-orange-500 bg-orange-100 bg-opacity-20 pointer-events-none"
          style={{
            left: Math.min(selectionBox.start.x, selectionBox.end.x),
            top: Math.min(selectionBox.start.y, selectionBox.end.y),
            width: Math.abs(selectionBox.end.x - selectionBox.start.x),
            height: Math.abs(selectionBox.end.y - selectionBox.start.y)
          }}
        />
      )}

      {/* 控制面板 */}
      <div className="absolute bottom-4 left-4 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setViewport(prev => ({ ...prev, scale: Math.min(3, prev.scale * 1.2) }))}
          className="bg-white shadow-lg"
        >
          放大
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setViewport(prev => ({ ...prev, scale: Math.max(0.1, prev.scale * 0.8) }))}
          className="bg-white shadow-lg"
        >
          缩小
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setViewport({ x: 0, y: 0, scale: 1 })}
          className="bg-white shadow-lg"
        >
          重置
        </Button>
      </div>

      {/* 状态信息 */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg px-3 py-2 text-sm text-gray-600">
        节点: {nodes.length} | 缩放: {Math.round(viewport.scale * 100)}% | 选中: {selectedNodes.length}
      </div>
    </div>
  );
};
