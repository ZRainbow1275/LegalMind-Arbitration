import React, { useState, useRef } from 'react';

interface Node {
  id: string;
  type: 'case' | 'person' | 'document' | 'hearing' | 'mediation' | 'timeline';
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  content: string;
  color: string;
  borderColor: string;
  status?: string;
  metadata?: any;
}

interface SimpleCanvasProps {
  nodes: Node[];
  onNodesChange: (nodes: Node[]) => void;
}

export const SimpleCanvas: React.FC<SimpleCanvasProps> = ({ nodes, onNodesChange }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const offsetX = e.clientX - rect.left - (node.x + pan.x) * scale;
    const offsetY = e.clientY - rect.top - (node.y + pan.y) * scale;

    setDraggedNode(nodeId);
    setDragOffset({ x: offsetX, y: offsetY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedNode) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const newX = (e.clientX - rect.left - dragOffset.x) / scale - pan.x;
    const newY = (e.clientY - rect.top - dragOffset.y) / scale - pan.y;

    const updatedNodes = nodes.map(node =>
      node.id === draggedNode
        ? { ...node, x: newX, y: newY }
        : node
    );

    onNodesChange(updatedNodes);
  };

  const handleMouseUp = () => {
    setDraggedNode(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(3, scale * delta));
    setScale(newScale);
  };

  const renderNode = (node: Node) => {
    const style: React.CSSProperties = {
      position: 'absolute',
      left: (node.x + pan.x) * scale,
      top: (node.y + pan.y) * scale,
      width: node.width * scale,
      height: node.height * scale,
      backgroundColor: node.color,
      border: `2px solid ${node.borderColor}`,
      borderRadius: node.type === 'person' ? '50%' :
        node.type === 'timeline' ? '16px' : '8px',
      cursor: 'move',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '8px',
      boxSizing: 'border-box',
      fontSize: `${12 * scale}px`,
      fontWeight: '500',
      color: '#333',
      textAlign: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      transition: draggedNode === node.id ? 'none' : 'all 0.2s ease',
      zIndex: draggedNode === node.id ? 1000 : 1
    };

    const getStatusColor = (status?: string) => {
      switch (status) {
        case 'SCHEDULED': return '#4caf50';
        case 'IN_PROGRESS': return '#ff9800';
        case 'COMPLETED': return '#2196f3';
        case 'CANCELLED': return '#f44336';
        case 'DRAFT': return '#9e9e9e';
        default: return '#9e9e9e';
      }
    };

    return (
      <div
        key={node.id}
        style={style}
        onMouseDown={(e) => handleMouseDown(e, node.id)}
        onDoubleClick={() => {
          if (node.type === 'hearing') {
            // 庭审节点的特殊编辑逻辑
            const action = confirm('是否要进入庭审管理？');
            if (action) {
              alert('正在跳转到庭审管理界面...');
            }
          } else {
            const newTitle = prompt('编辑标题:', node.title);
            if (newTitle !== null) {
              const updatedNodes = nodes.map(n =>
                n.id === node.id ? { ...n, title: newTitle } : n
              );
              onNodesChange(updatedNodes);
            }
          }
        }}
      >
        {/* 状态指示器 */}
        {node.status && (
          <div style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: getStatusColor(node.status),
            border: '2px solid white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
          }} />
        )}

        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
          {node.title}
        </div>
        <div style={{ fontSize: `${10 * scale}px`, opacity: 0.8 }}>
          {node.content}
        </div>

        {/* 庭审节点的参与者信息 */}
        {node.type === 'hearing' && node.metadata?.participants && (
          <div style={{
            fontSize: `${8 * scale}px`,
            opacity: 0.6,
            marginTop: '2px',
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            参与者: {node.metadata.participants.length}人
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#f8f9fa',
        backgroundImage: `
          radial-gradient(circle, #ddd 1px, transparent 1px)
        `,
        backgroundSize: `${20 * scale}px ${20 * scale}px`,
        backgroundPosition: `${pan.x * scale}px ${pan.y * scale}px`,
        cursor: draggedNode ? 'grabbing' : 'grab'
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {nodes.map(renderNode)}

      {/* 缩放控制 */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        display: 'flex',
        gap: '8px',
        backgroundColor: 'white',
        padding: '8px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <button
          onClick={() => setScale(s => Math.max(0.1, s * 0.9))}
          style={{
            padding: '4px 8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            backgroundColor: 'white',
            cursor: 'pointer'
          }}
        >
          −
        </button>
        <span style={{ padding: '4px 8px', fontSize: '12px' }}>
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale(s => Math.min(3, s * 1.1))}
          style={{
            padding: '4px 8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            backgroundColor: 'white',
            cursor: 'pointer'
          }}
        >
          +
        </button>
        <button
          onClick={() => {
            setScale(1);
            setPan({ x: 0, y: 0 });
          }}
          style={{
            padding: '4px 8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            backgroundColor: 'white',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          重置
        </button>
      </div>

      {/* 状态信息 */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        backgroundColor: 'white',
        padding: '8px 12px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        fontSize: '12px',
        color: '#666'
      }}>
        节点: {nodes.length} | 缩放: {Math.round(scale * 100)}%
      </div>
    </div>
  );
};
