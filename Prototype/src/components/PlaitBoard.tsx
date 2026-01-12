import React, { useEffect, useRef, useState } from 'react'
import { cn } from '../lib/utils'
import { useWorkspaceStore } from '../stores/workspaceStore'
import LegalWorkflowNode from './LegalWorkflowNode'
import DataFlowConnection from './DataFlowConnection'
import SettingsPanel from './SettingsPanel'
import NodeEditDialog from './NodeEditDialog'
import { NodeConnection, LegalNodeData } from '../types/legal-nodes'
import { RotateCcw, Maximize2, Settings } from 'lucide-react'

import { LegalNode } from '../utils/legalNodeUtils'

// 简化的白板实现，暂时不使用复杂的 Plait 插件系统
// 我们先创建一个基础的可拖拽节点系统



// 主要的法律白板组件
export const LegalPlaitBoard: React.FC<{
  className?: string
  onNodeCreate?: (node: LegalNode) => void
  onNodeUpdate?: (node: LegalNode) => void
  onNodeDelete?: (nodeId: string) => void
  onNodeDoubleClick?: (node: any) => void
}> = ({
  className,
  onNodeDelete,
  onNodeDoubleClick
}) => {
    const boardRef = useRef<HTMLDivElement>(null)
    const [draggedNode, setDraggedNode] = useState<string | null>(null)

    const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({})
    const [activeNodes, setActiveNodes] = useState<Set<string>>(new Set())
    const [hoveredConnection, setHoveredConnection] = useState<NodeConnection | null>(null)
    const [activeConnections, setActiveConnections] = useState<Set<string>>(new Set())
    const [connectionUpdateTrigger, setConnectionUpdateTrigger] = useState(0)

    // 画布缩放和平移状态
    const [canvasTransform, setCanvasTransform] = useState({
      scale: 1,
      translateX: 0,
      translateY: 0
    })
    const [isPanning, setIsPanning] = useState(false)
    const [panStart, setPanStart] = useState({ x: 0, y: 0 })

    useEffect(() => {
      //   wheel  passive : 
      const el = boardRef.current
      if (!el) return
      const preventDefaultWheel = (e: WheelEvent) => {
        e.preventDefault()
      }
      el.addEventListener('wheel', preventDefaultWheel, { passive: false })
      return () => {
        el.removeEventListener('wheel', preventDefaultWheel as any)
      }
    }, [])

    // 连接系统状态
    const [isConnecting, setIsConnecting] = useState(false)
    const [connectionStart, setConnectionStart] = useState<{
      nodeId: string
      point: 'input' | 'output'
    } | null>(null)
    const [connectionPreview, setConnectionPreview] = useState<{
      from: string
      to?: string
      point?: 'input' | 'output'
      mousePos?: { x: number; y: number }
    } | null>(null)

    // 设置面板状态
    const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false)

    // 节点编辑状态
    const [editingNode, setEditingNode] = useState<LegalNodeData | null>(null)

    // 从Zustand获取节点数据和操作
    const {
      nodes,
      connections,
      selectedNodeId,
      setSelectedNode,
      updateNode,
      addNode,
      addConnection
    } = useWorkspaceStore()

    // 初始化节点位置 - 优先使用metadata中的位置
    useEffect(() => {
      const positions: Record<string, { x: number; y: number }> = {}
      nodes.forEach((node, index) => {
        if (!nodePositions[node.id]) {
          // 优先使用metadata中的位置，如果没有则使用默认布局
          if (node.metadata?.position) {
            positions[node.id] = {
              x: node.metadata.position.x,
              y: node.metadata.position.y
            }
          } else {
            positions[node.id] = {
              x: 100 + (index % 3) * 400,
              y: 100 + Math.floor(index / 3) * 250
            }
          }
        }
      })
      if (Object.keys(positions).length > 0) {
        setNodePositions(prev => ({ ...prev, ...positions }))
      }
    }, [nodes, nodePositions])

    // 模拟节点活跃状态
    useEffect(() => {
      const interval = setInterval(() => {
        if (nodes.length > 0) {
          const randomNode = nodes[Math.floor(Math.random() * nodes.length)]
          setActiveNodes(prev => {
            const newSet = new Set(prev)
            if (newSet.has(randomNode.id)) {
              newSet.delete(randomNode.id)
            } else {
              newSet.add(randomNode.id)
            }
            return newSet
          })

          // 激活相关连接
          const relatedConnections = connections.filter(
            conn => conn.sourceNodeId === randomNode.id || conn.targetNodeId === randomNode.id
          )
          setActiveConnections(new Set(relatedConnections.map(conn => conn.id)))
        }
      }, 5000)

      return () => clearInterval(interval)
    }, [nodes, connections])

    // 删除节点
    const deleteNode = (nodeId: string) => {
      onNodeDelete?.(nodeId)
    }

    // 处理节点双击事件 - 打开编辑对话框
    const handleNodeDoubleClick = (nodeId: string) => {
      const node = nodes.find(n => n.id === nodeId)
      if (node) {
        setEditingNode(node)
        onNodeDoubleClick?.(node)
      }
    }

    // 处理节点编辑保存
    const handleNodeEditSave = (nodeId: string, updates: Partial<LegalNodeData>) => {
      updateNode(nodeId, updates)
      setEditingNode(null)
    }

    const handleGenerateContent = (content: { type: string; title: string; description: string }) => {
      // 在画布上生成新节点
      const newNode: LegalNodeData = {
        id: `node-${Date.now()}`,
        type: content.type as any,
        title: content.title,
        description: content.description,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // 在当前编辑节点附近生成新节点
      const currentNodePos = editingNode ? nodePositions[editingNode.id] || { x: 0, y: 0 } : { x: 0, y: 0 }
      const newPosition = {
        x: currentNodePos.x + 320, // 在右侧生成
        y: currentNodePos.y + Math.random() * 100 - 50 // 稍微偏移避免重叠
      }

      addNode(newNode)
      setNodePositions(prev => ({
        ...prev,
        [newNode.id]: newPosition
      }))

      // 如果有当前编辑的节点，创建连接
      if (editingNode) {
        const connection = {
          id: `conn-${Date.now()}`,
          sourceNodeId: editingNode.id,
          targetNodeId: newNode.id,
          connectionType: 'workflow' as const,
          label: 'AI生成'
        }
        addConnection(connection)
      }
    }

    // 修复的拖拽处理 - 消除滑动效果
    const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
      // 只在节点头部区域允许拖拽
      const target = e.target as HTMLElement
      if (target.closest('button') || target.closest('[role="button"]')) {
        return // 如果点击的是按钮，不启动拖拽
      }

      e.preventDefault()
      e.stopPropagation()

      const boardRect = boardRef.current?.getBoundingClientRect()
      if (!boardRect) return

      const currentPos = nodePositions[nodeId] || { x: 0, y: 0 }

      setDraggedNode(nodeId)

      // 计算鼠标在画布坐标系中的位置
      const canvasMouseX = (e.clientX - boardRect.left - canvasTransform.translateX) / canvasTransform.scale
      const canvasMouseY = (e.clientY - boardRect.top - canvasTransform.translateY) / canvasTransform.scale

      // 计算鼠标相对于节点左上角的偏移（固定偏移，避免滑动）
      const dragOffset = {
        x: canvasMouseX - currentPos.x,
        y: canvasMouseY - currentPos.y
      }

      // 添加全局鼠标事件监听
      const handleNodeMouseMove = (e: MouseEvent) => {
        if (boardRef.current) {
          const rect = boardRef.current.getBoundingClientRect()

          // 计算当前鼠标在画布坐标系中的位置
          const currentCanvasMouseX = (e.clientX - rect.left - canvasTransform.translateX) / canvasTransform.scale
          const currentCanvasMouseY = (e.clientY - rect.top - canvasTransform.translateY) / canvasTransform.scale

          // 计算新的节点位置（减去固定偏移）
          let newX = currentCanvasMouseX - dragOffset.x
          let newY = currentCanvasMouseY - dragOffset.y

          // 网格吸附
          const gridSize = 20
          newX = Math.round(newX / gridSize) * gridSize
          newY = Math.round(newY / gridSize) * gridSize

          // 边界限制
          const nodeWidth = 280
          const nodeHeight = 160
          const canvasWidth = rect.width / canvasTransform.scale
          const canvasHeight = rect.height / canvasTransform.scale

          newX = Math.max(0, Math.min(newX, canvasWidth - nodeWidth))
          newY = Math.max(0, Math.min(newY, canvasHeight - nodeHeight))

          setNodePositions(prev => ({
            ...prev,
            [nodeId]: { x: newX, y: newY }
          }))

          // 触发连接线更新
          setConnectionUpdateTrigger(prev => prev + 1)
        }
      }

      const handleNodeMouseUp = () => {
        // 拖拽结束：持久化保存当前节点位置到节点 metadata，确保刷新/重渲染后连线依然准确
        setDraggedNode(null)

        // 将最终位置写回节点元数据，便于跨会话/模板复用
        const finalPos = nodePositions[nodeId]
        if (finalPos) {
          const existing = nodes.find(n => n.id === nodeId)
          const prevMeta = existing?.metadata || {}
          updateNode(nodeId, {
            metadata: { ...prevMeta, position: { x: finalPos.x, y: finalPos.y } },
            updatedAt: new Date()
          })
        }

        document.removeEventListener('mousemove', handleNodeMouseMove)
        document.removeEventListener('mouseup', handleNodeMouseUp)
      }

      document.addEventListener('mousemove', handleNodeMouseMove)
      document.addEventListener('mouseup', handleNodeMouseUp)
    }

    // 画布缩放处理
    const handleWheel = (e: React.WheelEvent) => {
      e.preventDefault()

      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newScale = Math.max(0.1, Math.min(3, canvasTransform.scale * delta))

      if (boardRef.current) {
        const rect = boardRef.current.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top

        // 计算缩放中心点
        const scaleRatio = newScale / canvasTransform.scale
        const newTranslateX = mouseX - (mouseX - canvasTransform.translateX) * scaleRatio
        const newTranslateY = mouseY - (mouseY - canvasTransform.translateY) * scaleRatio

        setCanvasTransform({
          scale: newScale,
          translateX: newTranslateX,
          translateY: newTranslateY
        })
      }
    }

    // 画布平移处理
    const handleCanvasMouseDown = (e: React.MouseEvent) => {
      if (e.target === e.currentTarget || (e.target as Element).closest('.canvas-background')) {
        setIsPanning(true)
        setPanStart({ x: e.clientX, y: e.clientY })
      }
    }

    const handleMouseUp = () => {
      setIsPanning(false)
    }

    // 重置画布视图
    const resetCanvasView = () => {
      setCanvasTransform({
        scale: 1,
        translateX: 0,
        translateY: 0
      })
    }

    // 适应窗口
    const fitToWindow = () => {
      if (!boardRef.current || nodes.length === 0) return

      const rect = boardRef.current.getBoundingClientRect()
      const padding = 50

      // 计算所有节点的边界
      const positions = Object.values(nodePositions)
      if (positions.length === 0) return

      const minX = Math.min(...positions.map(p => p.x))
      const maxX = Math.max(...positions.map(p => p.x + 280)) // 节点宽度
      const minY = Math.min(...positions.map(p => p.y))
      const maxY = Math.max(...positions.map(p => p.y + 160)) // 节点高度

      const contentWidth = maxX - minX
      const contentHeight = maxY - minY

      const scaleX = (rect.width - padding * 2) / contentWidth
      const scaleY = (rect.height - padding * 2) / contentHeight
      const scale = Math.min(scaleX, scaleY, 1) // 不放大，只缩小

      const centerX = (minX + maxX) / 2
      const centerY = (minY + maxY) / 2

      setCanvasTransform({
        scale,
        translateX: rect.width / 2 - centerX * scale,
        translateY: rect.height / 2 - centerY * scale
      })
    }

    // 连接处理函数
    const handleConnectionStart = (nodeId: string, point: 'input' | 'output') => {
      setIsConnecting(true)
      setConnectionStart({ nodeId, point })
      setConnectionPreview({ from: nodeId, point })
    }

    const handleConnectionEnd = (nodeId: string, point: 'input' | 'output') => {
      if (!connectionStart || !isConnecting) return

      // 不能连接到自己
      if (connectionStart.nodeId === nodeId) {
        resetConnection()
        return
      }

      // 输出只能连接到输入，输入只能连接到输出
      if (connectionStart.point === point) {
        resetConnection()
        return
      }

      // 创建新连接
      const sourceNodeId = connectionStart.point === 'output' ? connectionStart.nodeId : nodeId
      const targetNodeId = connectionStart.point === 'output' ? nodeId : connectionStart.nodeId

      const newConnection: NodeConnection = {
        id: `${sourceNodeId}-${targetNodeId}-${Date.now()}`,
        sourceNodeId,
        targetNodeId,
        connectionType: 'workflow',
      }

      // 添加连接到store
      addConnection(newConnection)
      resetConnection()
    }

    const resetConnection = () => {
      setIsConnecting(false)
      setConnectionStart(null)
      setConnectionPreview(null)
    }

    // 更新鼠标移动处理，添加连接预览
    const handleMouseMoveWithConnection = (e: React.MouseEvent) => {
      if (isPanning) {
        const deltaX = e.clientX - panStart.x
        const deltaY = e.clientY - panStart.y

        setCanvasTransform(prev => ({
          ...prev,
          translateX: prev.translateX + deltaX,
          translateY: prev.translateY + deltaY
        }))

        setPanStart({ x: e.clientX, y: e.clientY })
      }

      // 更新连接预览的鼠标位置
      if (isConnecting && boardRef.current) {
        const rect = boardRef.current.getBoundingClientRect()
        const mouseX = (e.clientX - rect.left - canvasTransform.translateX) / canvasTransform.scale
        const mouseY = (e.clientY - rect.top - canvasTransform.translateY) / canvasTransform.scale

        setConnectionPreview(prev => prev ? {
          ...prev,
          mousePos: { x: mouseX, y: mouseY }
        } : null)
      }
    }

    return (
      <div className={cn("relative w-full h-full overflow-hidden", className)}>
        {/* 画布控制工具栏 */}
        <div className="absolute top-4 right-4 z-50 flex gap-2">
          <button
            onClick={resetCanvasView}
            className="p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-border hover:bg-white transition-colors"
            title="重置视图"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={fitToWindow}
            className="p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-border hover:bg-white transition-colors"
            title="适应窗口"
          >
            <Maximize2 size={16} />
          </button>
          <button
            onClick={() => setIsSettingsPanelOpen(true)}
            className="p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-border hover:bg-white transition-colors"
            title="设置"
          >
            <Settings size={16} />
          </button>
        </div>

        <div
          ref={boardRef}
          className="w-full h-full bg-muted/30 relative canvas-background"
          style={{
            backgroundImage: `
            linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)
          `,
            backgroundSize: `${20 * canvasTransform.scale}px ${20 * canvasTransform.scale}px`,
            backgroundPosition: `${canvasTransform.translateX}px ${canvasTransform.translateY}px`,
            cursor: isPanning ? 'grabbing' : 'grab',
            // 禁止浏览器默认滚动，修复 wheel passive 警告
            touchAction: 'none',
            overscrollBehavior: 'none'
          }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMoveWithConnection}
          onMouseUp={() => {
            handleMouseUp()
            if (isConnecting) resetConnection()
          }}
          onMouseLeave={() => {
            handleMouseUp()
            if (isConnecting) resetConnection()
          }}
          onWheel={handleWheel}
        >
          {/* 智能数据流连接线 - 独立的SVG层 */}
          <svg
            className="absolute inset-0 pointer-events-none z-10"
            width="100%"
            height="100%"
            viewBox="0 0 2000 2000"
            preserveAspectRatio="xMidYMid meet"
          >
            <g
              style={{
                transform: `translate(${canvasTransform.translateX}px, ${canvasTransform.translateY}px) scale(${canvasTransform.scale})`
              }}
            >
              {connections.map(connection => {
                const sourcePos = nodePositions[connection.sourceNodeId]
                const targetPos = nodePositions[connection.targetNodeId]

                if (!sourcePos || !targetPos) {
                  console.log('连接线缺少位置信息:', {
                    connectionId: connection.id,
                    sourceNodeId: connection.sourceNodeId,
                    targetNodeId: connection.targetNodeId,
                    sourcePos,
                    targetPos,
                    allPositions: nodePositions
                  })
                  return null
                }

                // 强制重新渲染连接线，确保跟随节点移动
                const connectionKey = `${connection.id}-${sourcePos.x}-${sourcePos.y}-${targetPos.x}-${targetPos.y}-${connectionUpdateTrigger}`

                return (
                  <DataFlowConnection
                    key={connectionKey}
                    connection={connection}
                    sourcePosition={sourcePos}
                    targetPosition={targetPos}
                    isActive={activeConnections.has(connection.id)}
                    onHover={setHoveredConnection}
                    onClick={(conn) => console.log('连接被点击:', conn)}
                  />
                )
              })}

              {/* 现代化连接预览线 - 修复坐标计算 */}
              {isConnecting && connectionPreview && connectionPreview.mousePos && (
                (() => {
                  const startPos = nodePositions[connectionPreview.from]
                  if (!startPos) return null

                  const startX = startPos.x + (connectionPreview.point === 'output' ? 280 : 0)
                  const startY = startPos.y + 80 // 节点中心

                  // 鼠标位置直接使用，因为已经在正确的坐标系中
                  const mouseX = connectionPreview.mousePos.x
                  const mouseY = connectionPreview.mousePos.y

                  // 优化的贝塞尔曲线控制点
                  const deltaX = mouseX - startX
                  const deltaY = mouseY - startY
                  const minOffset = 80
                  const maxOffset = 200
                  const controlOffset = Math.min(maxOffset, Math.max(minOffset, Math.abs(deltaX) * 0.6))
                  const verticalInfluence = Math.min(50, Math.abs(deltaY) * 0.2)

                  const controlX1 = startX + controlOffset
                  const controlY1 = startY + (deltaY > 0 ? verticalInfluence : -verticalInfluence) * 0.3
                  const controlX2 = mouseX - controlOffset
                  const controlY2 = mouseY + (deltaY > 0 ? -verticalInfluence : verticalInfluence) * 0.3

                  return (
                    <g>
                      <defs>
                        <linearGradient id="preview-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.6" />
                        </linearGradient>
                      </defs>
                      {/* 预览线阴影 */}
                      <path
                        d={`M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${mouseX} ${mouseY}`}
                        stroke="rgba(0,0,0,0.1)"
                        strokeWidth="3"
                        fill="none"
                        strokeDasharray="8,4"
                        opacity="0.5"
                        transform="translate(0, 1)"
                      />
                      {/* 主预览线 */}
                      <path
                        d={`M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${mouseX} ${mouseY}`}
                        stroke="url(#preview-gradient)"
                        strokeWidth="2.5"
                        fill="none"
                        strokeDasharray="8,4"
                        opacity="0.8"
                        className="animate-pulse"
                        style={{
                          filter: 'drop-shadow(0 0 8px rgb(16 185 129 / 0.4))'
                        }}
                      />
                    </g>
                  )
                })()
              )}
            </g>
          </svg>

          {/* 变换容器 */}
          <div
            className="absolute inset-0 origin-top-left"
            style={{
              transform: `translate(${canvasTransform.translateX}px, ${canvasTransform.translateY}px) scale(${canvasTransform.scale})`
            }}
          >
            {/* 渲染流式节点 */}
            {nodes.map(node => {
              const position = nodePositions[node.id] || { x: 0, y: 0 }

              // Viewport Culling
              // Calculate visible area in canvas coordinates
              const boardRect = boardRef.current?.getBoundingClientRect();
              if (boardRect) {
                const visibleX = -canvasTransform.translateX / canvasTransform.scale;
                const visibleY = -canvasTransform.translateY / canvasTransform.scale;
                const visibleWidth = boardRect.width / canvasTransform.scale;
                const visibleHeight = boardRect.height / canvasTransform.scale;

                // Node bounds (approximate)
                const nodeWidth = 280;
                const nodeHeight = 160;
                const buffer = 100; // Buffer to prevent popping

                // Check intersection
                if (
                  position.x + nodeWidth + buffer < visibleX ||
                  position.x - buffer > visibleX + visibleWidth ||
                  position.y + nodeHeight + buffer < visibleY ||
                  position.y - buffer > visibleY + visibleHeight
                ) {
                  return null; // Cull invisible nodes
                }
              }

              return (
                <div
                  key={node.id}
                  className="absolute cursor-move"
                  style={{
                    left: position.x,
                    top: position.y,
                    transform: draggedNode === node.id ? 'scale(1.05)' : 'scale(1)',
                    zIndex: draggedNode === node.id ? 30 : 10,
                    transition: draggedNode === node.id ? 'none' : 'transform 0.2s ease'
                  }}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                >
                  <LegalWorkflowNode
                    node={node}
                    position={position}
                    scale={canvasTransform.scale} // Pass scale for LOD
                    isSelected={selectedNodeId === node.id}
                    isActive={activeNodes.has(node.id)}
                    onSelect={() => setSelectedNode(node.id)}
                    onDoubleClick={() => handleNodeDoubleClick(node.id)}
                    onDelete={() => deleteNode(node.id)}
                    onUpdateNode={(updates) => updateNode(node.id, updates)}
                    onConnectionStart={handleConnectionStart}
                    onConnectionEnd={handleConnectionEnd}
                    isConnecting={isConnecting}
                    connectionPreview={connectionPreview}
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* 智能工作台信息面板 */}
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-xl border border-border max-w-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <h3 className="font-semibold text-sm text-foreground">AI智能工作台</h3>
          </div>

          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>活跃节点:</span>
              <span className="font-medium text-green-600">{activeNodes.size}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>数据流:</span>
              <span className="font-medium text-blue-600">{activeConnections.size}</span>
            </div>
            {hoveredConnection && (
              <div className="pt-2 border-t border-border">
                <div className="text-xs font-medium text-foreground mb-1">连接信息:</div>
                <div className="text-xs text-muted-foreground">
                  {hoveredConnection.connectionType === 'workflow' && '🔄 工作流数据传递'}
                  {hoveredConnection.connectionType === 'collaboration' && '👥 协作信息同步'}
                  {hoveredConnection.connectionType === 'dependency' && '🔗 依赖关系'}
                  {hoveredConnection.connectionType === 'reference' && '📎 引用关联'}
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
            💡 参照 Flowith & Lovart 设计的流式AI工作台
          </div>
        </div>

        {/* 设置面板 */}
        <SettingsPanel
          isOpen={isSettingsPanelOpen}
          onClose={() => setIsSettingsPanelOpen(false)}
          canvasTransform={canvasTransform}
          onCanvasTransformChange={setCanvasTransform}
          onResetView={resetCanvasView}
          onFitToWindow={fitToWindow}
        />

        {/* 节点编辑对话框 */}
        <NodeEditDialog
          node={editingNode}
          isOpen={!!editingNode}
          onClose={() => setEditingNode(null)}
          onSave={handleNodeEditSave}
          onGenerateContent={handleGenerateContent}
        />
      </div>
    )
  }

export default LegalPlaitBoard
