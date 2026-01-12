/**
 * LegalMind 法律工作台 - 主画布组件
 *
 * 简化版本的画布组件，用于快速展示节点和连接
 */

import React, { useState, useCallback, useEffect } from 'react'
import { NodeData } from '../lib/node-system'
import { ConnectionData } from '../lib/connection-system'
import { FileText, Users, Clock, Settings, Bot, Briefcase } from 'lucide-react'

// ==================== 组件属性接口 ====================

export interface LegalWorkspaceCanvasProps {
  width?: number
  height?: number
  initialNodes?: NodeData[]
  initialConnections?: ConnectionData[]
  onNodeAdded?: (node: any) => void
  onNodeUpdated?: (nodeId: string, oldData: NodeData, newData: NodeData) => void
  onNodeRemoved?: (nodeId: string) => void
  onConnectionAdded?: (connection: ConnectionData) => void
  onConnectionRemoved?: (connectionId: string) => void
  onSelectionChanged?: (selectedNodeIds: string[], selectedConnectionIds: string[]) => void
  readOnly?: boolean
  className?: string
}

// ==================== 节点渲染组件 ====================

const NodeComponent: React.FC<{ node: NodeData; onEdit: (node: NodeData) => void }> = ({ node, onEdit }) => {
  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'case-info': return <Briefcase className="w-4 h-4 text-blue-600" />
      case 'person': return <Users className="w-4 h-4 text-green-600" />
      case 'document': return <FileText className="w-4 h-4 text-orange-600" />
      case 'timeline': return <Clock className="w-4 h-4 text-purple-600" />
      case 'process': return <Settings className="w-4 h-4 text-red-600" />
      case 'ai-assistant': return <Bot className="w-4 h-4 text-orange-600" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  const getNodeStyle = (type: string) => {
    switch (type) {
      case 'case-info':
        return 'border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100 shadow-blue-100'
      case 'person':
        return 'border-green-300 bg-gradient-to-br from-green-50 to-green-100 shadow-green-100 rounded-full'
      case 'document':
        return 'border-orange-300 bg-gradient-to-br from-orange-50 to-orange-100 shadow-orange-100'
      case 'timeline':
        return 'border-purple-300 bg-gradient-to-br from-purple-50 to-purple-100 shadow-purple-100'
      case 'process':
        return 'border-red-300 bg-gradient-to-br from-red-50 to-red-100 shadow-red-100'
      case 'ai-assistant':
        return 'border-orange-400 bg-gradient-to-br from-orange-100 to-orange-200 shadow-orange-200'
      default:
        return 'border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 shadow-gray-100'
    }
  }

  const isCircular = node.type === 'person'

  return (
    <div
      className={`absolute border-2 p-3 cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 ${getNodeStyle(node.type)} ${isCircular ? 'rounded-full flex items-center justify-center' : 'rounded-xl'
        }`}
      style={{
        left: node.position.x,
        top: node.position.y,
        width: node.size?.width || (isCircular ? 100 : 200),
        height: node.size?.height || (isCircular ? 100 : 100)
      }}
      onDoubleClick={() => onEdit(node)}
    >
      {isCircular ? (
        <div className="text-center">
          {getNodeIcon(node.type)}
          <div className="text-xs font-medium mt-1 text-green-700">{node.title}</div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            {getNodeIcon(node.type)}
            <span className="font-semibold text-sm truncate text-gray-800">{node.title}</span>
          </div>
          <div className="text-xs text-gray-600 line-clamp-2">
            {node.description}
          </div>
          <div className="absolute top-2 right-2">
            <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${node.status === 'completed' ? 'bg-green-500' :
              node.status === 'in-progress' ? 'bg-yellow-500' :
                'bg-gray-400'
              }`} />
          </div>
        </>
      )}
    </div>
  )
}

// ==================== 连接线渲染组件 ====================

const ConnectionComponent: React.FC<{ connection: ConnectionData; nodes: NodeData[] }> = ({ connection, nodes }) => {
  const sourceNode = nodes.find(n => n.id === connection.sourceNodeId)
  const targetNode = nodes.find(n => n.id === connection.targetNodeId)

  if (!sourceNode || !targetNode) return null

  const sourceX = sourceNode.position.x + (sourceNode.size?.width || 200) / 2
  const sourceY = sourceNode.position.y + (sourceNode.size?.height || 100) / 2
  const targetX = targetNode.position.x + (targetNode.size?.width || 200) / 2
  const targetY = targetNode.position.y + (targetNode.size?.height || 100) / 2

  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
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
            fill="#ff6b35"
          />
        </marker>
      </defs>
      <path
        d={`M ${sourceX} ${sourceY} Q ${(sourceX + targetX) / 2} ${(sourceY + targetY) / 2 - 50} ${targetX} ${targetY}`}
        stroke="#ff6b35"
        strokeWidth="3"
        fill="none"
        markerEnd={`url(#arrowhead-${connection.id})`}
        opacity="0.8"
      />
      {connection.label && (
        <text
          x={(sourceX + targetX) / 2}
          y={(sourceY + targetY) / 2 - 25}
          textAnchor="middle"
          className="text-xs fill-orange-600 font-medium"
          dy="-5"
        >
          {connection.label}
        </text>
      )}
    </svg>
  )
}

// ==================== 主画布组件 ====================

const LegalWorkspaceCanvas: React.FC<LegalWorkspaceCanvasProps> = ({
  width = 800,
  height = 600,
  initialNodes = [],
  initialConnections = [],
  onNodeUpdated,
  className = ''
}) => {
  const [nodes, setNodes] = useState<NodeData[]>(initialNodes)
  const [connections, setConnections] = useState<ConnectionData[]>(initialConnections)
  const [editingNode, setEditingNode] = useState<NodeData | null>(null)

  // 更新节点数据
  useEffect(() => {
    setNodes(initialNodes)
  }, [initialNodes])

  useEffect(() => {
    setConnections(initialConnections)
  }, [initialConnections])

  const handleNodeEdit = useCallback((node: NodeData) => {
    setEditingNode(node)
  }, [])

  const handleNodeEditSave = useCallback((nodeId: string, updates: Partial<NodeData>) => {
    const updatedNodes = nodes.map(node =>
      node.id === nodeId ? { ...node, ...updates } as NodeData : node
    )
    setNodes(updatedNodes)

    const oldNode = nodes.find(n => n.id === nodeId)
    const newNode = updatedNodes.find(n => n.id === nodeId)

    if (oldNode && newNode) {
      onNodeUpdated?.(nodeId, oldNode, newNode)
    }

    setEditingNode(null)
  }, [nodes, onNodeUpdated])

  const handleNodeEditClose = useCallback(() => {
    setEditingNode(null)
  }, [])

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ width, height }}>
      {/* 背景网格 */}
      <div className="absolute inset-0 bg-gray-50" style={{
        backgroundImage: `
          linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px'
      }} />

      {/* 连接线 */}
      {connections.map(connection => (
        <ConnectionComponent
          key={connection.id}
          connection={connection}
          nodes={nodes}
        />
      ))}

      {/* 节点 */}
      {nodes.map(node => (
        <NodeComponent
          key={node.id}
          node={node}
          onEdit={handleNodeEdit}
        />
      ))}

      {/* 节点编辑对话框 */}
      {editingNode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">编辑节点</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">标题</label>
                <input
                  type="text"
                  value={editingNode.title}
                  onChange={(e) => setEditingNode({ ...editingNode, title: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">描述</label>
                <textarea
                  value={editingNode.description}
                  onChange={(e) => setEditingNode({ ...editingNode, description: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 h-20"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleNodeEditClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  取消
                </button>
                <button
                  onClick={() => handleNodeEditSave(editingNode.id, editingNode)}
                  className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 状态信息 */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-sm">
        <div className="text-gray-600">
          节点: {nodes.length} | 连接: {connections.length}
        </div>
      </div>
    </div>
  )
}

export default LegalWorkspaceCanvas
