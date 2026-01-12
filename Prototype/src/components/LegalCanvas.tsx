import React, { useRef, useEffect, useState, useCallback } from 'react'
import { LegalNodeData, NodeConnection, LegalNodeType } from '../types/legal-nodes'
import LegalNode from './LegalNode'

interface LegalCanvasProps {
  nodes: LegalNodeData[]
  connections: NodeConnection[]
  selectedNodeId?: string
  onNodeClick: (nodeId: string) => void
  onNodeDoubleClick: (nodeId: string) => void
  onCreateNode: (type: LegalNodeType, position: { x: number; y: number }) => void
  onConnectNodes: (sourceId: string, targetId: string) => void
  zoomLevel: number
  panOffset: { x: number; y: number }
}

const LegalCanvas: React.FC<LegalCanvasProps> = ({
  nodes,
  connections,
  selectedNodeId,
  onNodeClick,
  onNodeDoubleClick,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({})

  // 初始化节点位置
  useEffect(() => {
    const initialPositions: Record<string, { x: number; y: number }> = {}
    nodes.forEach((node, index) => {
      if (!nodePositions[node.id]) {
        // 简单的网格布局
        const col = index % 4
        const row = Math.floor(index / 4)
        initialPositions[node.id] = {
          x: 100 + col * 250,
          y: 100 + row * 150
        }
      }
    })

    if (Object.keys(initialPositions).length > 0) {
      setNodePositions(prev => ({ ...prev, ...initialPositions }))
    }
  }, [nodes, nodePositions])

  // 处理画布拖拽
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setIsDragging(true)
    }
  }, [])

  const handleCanvasMouseMove = useCallback(() => {
    if (isDragging) {
      // TODO: 实现画布平移
      console.log('画布拖拽中...')
    }
  }, [isDragging])

  const handleCanvasMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // 处理节点拖拽
  const handleNodeDrag = useCallback((nodeId: string, newPosition: { x: number; y: number }) => {
    setNodePositions(prev => ({
      ...prev,
      [nodeId]: newPosition
    }))
  }, [])

  // 渲染连接线
  const renderConnections = () => {
    return connections.map(connection => {
      const sourcePos = nodePositions[connection.sourceNodeId]
      const targetPos = nodePositions[connection.targetNodeId]

      if (!sourcePos || !targetPos) return null

      const sourceX = sourcePos.x + 100 // 节点宽度的一半
      const sourceY = sourcePos.y + 40  // 节点高度的一半
      const targetX = targetPos.x + 100
      const targetY = targetPos.y + 40

      return (
        <g key={connection.id}>
          <line
            x1={sourceX}
            y1={sourceY}
            x2={targetX}
            y2={targetY}
            stroke="#94a3b8"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
          />
          {connection.label && (
            <text
              x={(sourceX + targetX) / 2}
              y={(sourceY + targetY) / 2}
              textAnchor="middle"
              fontSize="12"
              fill="#64748b"
              className="connection-label"
            >
              {connection.label}
            </text>
          )}
        </g>
      )
    })
  }

  return (
    <div
      ref={canvasRef}
      className="legal-canvas"
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#f8fafc',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
    >
      {/* SVG 层用于绘制连接线 */}
      <svg
        ref={svgRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1
        }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#94a3b8"
            />
          </marker>
        </defs>
        {renderConnections()}
      </svg>

      {/* 节点层 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 2
        }}
      >
        {nodes.map(node => {
          const position = nodePositions[node.id] || { x: 0, y: 0 }
          return (
            <LegalNode
              key={node.id}
              node={node}
              position={position}
              isSelected={selectedNodeId === node.id}
              onClick={() => onNodeClick(node.id)}
              onDoubleClick={() => onNodeDoubleClick(node.id)}
              onDrag={(newPosition) => handleNodeDrag(node.id, newPosition)}
            />
          )
        })}
      </div>

      {/* 画布网格背景 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: `
            linear-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
          zIndex: 0
        }}
      />
    </div>
  )
}

export default LegalCanvas
