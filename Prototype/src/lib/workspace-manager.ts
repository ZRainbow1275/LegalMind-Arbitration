/**
 * LegalMind 法律工作台 - 工作台管理器
 * 
 * 这是整个工作台系统的核心管理器，负责：
 * - 整合画布引擎、节点系统和连接系统
 * - 管理节点和连接的生命周期
 * - 处理用户交互和事件分发
 * - 提供统一的API接口
 * - 实现协作功能和实时同步
 * 
 * 这个管理器是连接React组件和底层引擎的桥梁
 */

import { EventEmitter } from 'events'
import { CanvasEngine, Point, Rect } from './canvas-engine'
import { BaseNode, NodeData, NodeFactory } from './node-system'
import { Connection, ConnectionData, PathCalculator } from './connection-system'

// ==================== 工作台状态接口 ====================

export interface WorkspaceState {
  nodes: Map<string, BaseNode>
  connections: Map<string, Connection>
  selectedNodeIds: Set<string>
  selectedConnectionIds: Set<string>
  clipboard: {
    nodes: NodeData[]
    connections: ConnectionData[]
  }
  isReadOnly: boolean
  collaborators: Array<{
    id: string
    name: string
    cursor?: Point
    selectedNodeId?: string
  }>
}

export interface WorkspaceConfig {
  enableCollaboration: boolean
  enableAutoSave: boolean
  autoSaveInterval: number
  maxHistorySteps: number
  gridSize: number
  snapToGrid: boolean
}

// ==================== 工作台管理器 ====================

export class WorkspaceManager extends EventEmitter {
  private canvasEngine: CanvasEngine
  private pathCalculator: PathCalculator
  private state: WorkspaceState
  private config: WorkspaceConfig
  private history: Array<{
    action: string
    timestamp: Date
    data: any
  }> = []
  private historyIndex = -1
  private isDragging = false
  private dragStartPoint?: Point
  private draggedNodes: Set<string> = new Set()

  private lastClickedNodeId?: string
  private lastClickTime = 0;
  constructor(canvas: HTMLCanvasElement, config: Partial<WorkspaceConfig> = {}) {
    super()

    this.canvasEngine = new CanvasEngine(canvas)
    this.pathCalculator = new PathCalculator()

    this.config = {
      enableCollaboration: false,
      enableAutoSave: true,
      autoSaveInterval: 30000, // 30秒
      maxHistorySteps: 50,
      gridSize: 20,
      snapToGrid: true,
      ...config
    }

    this.state = {
      nodes: new Map(),
      connections: new Map(),
      selectedNodeIds: new Set(),
      selectedConnectionIds: new Set(),
      clipboard: { nodes: [], connections: [] },
      isReadOnly: false,
      collaborators: []
    }

    this.setupEventHandlers()
    this.canvasEngine.start()
  }

  // ==================== 节点管理 ====================

  /**
   * 添加节点
   */
  addNode(nodeData: NodeData, position?: Point): BaseNode {
    if (position) {
      nodeData.position = position
    }

    const node = NodeFactory.createNode(nodeData)
    this.state.nodes.set(node.id, node)
    this.canvasEngine.addRenderObject(node)

    // 设置节点事件监听
    this.setupNodeEventHandlers(node)

    // 记录历史
    this.addToHistory('ADD_NODE', { nodeData })

    this.emit('node:added', { node })
    return node
  }

  /**
   * 删除节点
   */
  removeNode(nodeId: string): boolean {
    const node = this.state.nodes.get(nodeId)
    if (!node) return false

    // 删除相关连接
    const relatedConnections = Array.from(this.state.connections.values())
      .filter(conn =>
        conn.getData().sourceNodeId === nodeId ||
        conn.getData().targetNodeId === nodeId
      )

    relatedConnections.forEach(conn => this.removeConnection(conn.id))

    // 删除节点
    this.state.nodes.delete(nodeId)
    this.canvasEngine.removeRenderObject(nodeId)
    this.state.selectedNodeIds.delete(nodeId)

    // 记录历史
    this.addToHistory('REMOVE_NODE', { nodeId, nodeData: node.getData() })

    node.destroy()
    this.emit('node:removed', { nodeId })
    return true
  }

  /**
   * 更新节点
   */
  updateNode(nodeId: string, updates: Partial<NodeData>): boolean {
    const node = this.state.nodes.get(nodeId)
    if (!node) return false

    const oldData = node.getData()
    node.updateData(updates)

    // 如果位置改变，更新相关连接
    if (updates.position) {
      this.updateNodeConnections(nodeId)
    }

    // 记录历史
    this.addToHistory('UPDATE_NODE', { nodeId, oldData, newData: node.getData() })

    this.emit('node:updated', { nodeId, oldData, newData: node.getData() })
    return true
  }

  /**
   * 获取节点
   */
  getNode(nodeId: string): BaseNode | undefined {
    return this.state.nodes.get(nodeId)
  }

  /**
   * 获取所有节点
   */
  getAllNodes(): BaseNode[] {
    return Array.from(this.state.nodes.values())
  }

  // ==================== 连接管理 ====================

  /**
   * 添加连接
   */
  addConnection(connectionData: ConnectionData): Connection {
    const connection = new Connection(connectionData, this.pathCalculator)
    this.state.connections.set(connection.id, connection)
    this.canvasEngine.addRenderObject(connection)

    // 更新连接路径
    this.updateConnectionPath(connection.id)

    // 设置连接事件监听
    this.setupConnectionEventHandlers(connection)

    // 记录历史
    this.addToHistory('ADD_CONNECTION', { connectionData })

    this.emit('connection:added', { connection })
    return connection
  }

  /**
   * 删除连接
   */
  removeConnection(connectionId: string): boolean {
    const connection = this.state.connections.get(connectionId)
    if (!connection) return false

    this.state.connections.delete(connectionId)
    this.canvasEngine.removeRenderObject(connectionId)
    this.state.selectedConnectionIds.delete(connectionId)

    // 记录历史
    this.addToHistory('REMOVE_CONNECTION', {
      connectionId,
      connectionData: connection.getData()
    })

    connection.destroy()
    this.emit('connection:removed', { connectionId })
    return true
  }

  /**
   * 更新连接路径
   */
  private updateConnectionPath(connectionId: string) {
    const connection = this.state.connections.get(connectionId)
    if (!connection) return

    const data = connection.getData()
    const sourceNode = this.state.nodes.get(data.sourceNodeId)
    const targetNode = this.state.nodes.get(data.targetNodeId)

    if (sourceNode && targetNode) {
      // 设置障碍物（其他节点）



      connection.updatePath(sourceNode, targetNode)
    }
  }

  /**
   * 更新节点的所有连接
   */
  private updateNodeConnections(nodeId: string) {
    const relatedConnections = Array.from(this.state.connections.values())
      .filter(conn => {
        const data = conn.getData()
        return data.sourceNodeId === nodeId || data.targetNodeId === nodeId
      })

    relatedConnections.forEach(conn => this.updateConnectionPath(conn.id))
  }

  // ==================== 选择管理 ====================

  /**
   * 选择节点
   */
  selectNode(nodeId: string, addToSelection = false) {
    if (!addToSelection) {
      this.clearSelection()
    }

    const node = this.state.nodes.get(nodeId)
    if (node) {
      this.state.selectedNodeIds.add(nodeId)
      node.setSelected(true)
      this.emit('selection:changed', {
        selectedNodeIds: Array.from(this.state.selectedNodeIds),
        selectedConnectionIds: Array.from(this.state.selectedConnectionIds)
      })
    }
  }

  /**
   * 取消选择节点
   */
  deselectNode(nodeId: string) {
    const node = this.state.nodes.get(nodeId)
    if (node) {
      this.state.selectedNodeIds.delete(nodeId)
      node.setSelected(false)
      this.emit('selection:changed', {
        selectedNodeIds: Array.from(this.state.selectedNodeIds),
        selectedConnectionIds: Array.from(this.state.selectedConnectionIds)
      })
    }
  }

  /**
   * 选择连接
   */
  selectConnection(connectionId: string, addToSelection = false) {
    if (!addToSelection) {
      this.clearSelection()
    }

    const connection = this.state.connections.get(connectionId)
    if (connection) {
      this.state.selectedConnectionIds.add(connectionId)
      connection.setSelected(true)
      this.emit('selection:changed', {
        selectedNodeIds: Array.from(this.state.selectedNodeIds),
        selectedConnectionIds: Array.from(this.state.selectedConnectionIds)
      })
    }
  }

  /**
   * 清除所有选择
   */
  clearSelection() {
    // 清除节点选择
    this.state.selectedNodeIds.forEach(nodeId => {
      const node = this.state.nodes.get(nodeId)
      if (node) node.setSelected(false)
    })
    this.state.selectedNodeIds.clear()

    // 清除连接选择
    this.state.selectedConnectionIds.forEach(connectionId => {
      const connection = this.state.connections.get(connectionId)
      if (connection) connection.setSelected(false)
    })
    this.state.selectedConnectionIds.clear()

    this.emit('selection:changed', {
      selectedNodeIds: [],
      selectedConnectionIds: []
    })
  }

  /**
   * 选择区域内的所有节点
   */
  selectNodesInRect(rect: Rect) {
    this.state.nodes.forEach(node => {
      const nodeBounds = node.bounds
      if (this.rectsIntersect(rect, nodeBounds)) {
        this.selectNode(node.id, true)
      }
    })
  }

  // ==================== 事件处理 ====================

  private setupEventHandlers() {
    // 画布事件
    this.canvasEngine.on('canvas:mousedown', this.handleCanvasMouseDown.bind(this))
    this.canvasEngine.on('canvas:mousemove', this.handleCanvasMouseMove.bind(this))
    this.canvasEngine.on('canvas:mouseup', this.handleCanvasMouseUp.bind(this))
    this.canvasEngine.on('canvas:wheel', this.handleCanvasWheel.bind(this))
    this.canvasEngine.on('canvas:contextmenu', this.handleCanvasContextMenu.bind(this))
  }

  private setupNodeEventHandlers(node: BaseNode) {
    node.on('position:changed', ({ oldPosition, newPosition }) => {
      this.updateNodeConnections(node.id)
      this.emit('node:moved', { nodeId: node.id, oldPosition, newPosition })
    })

    node.on('data:updated', ({ oldData, newData }) => {
      this.emit('node:updated', { nodeId: node.id, oldData, newData })
    })
  }

  private setupConnectionEventHandlers(connection: Connection) {
    connection.on('data:updated', ({ oldData, newData }) => {
      this.emit('connection:updated', { connectionId: connection.id, oldData, newData })
    })

    connection.on('path:updated', ({ path }) => {
      this.emit('connection:path:updated', { connectionId: connection.id, path })
    })
  }

  private handleCanvasMouseDown(event: any) {
    const { canvasPoint, target } = event
    const currentTime = Date.now()

    if (target) {
      // 点击了节点或连接
      if (target instanceof BaseNode) {
        // 检测双击
        if (this.lastClickedNodeId === target.id && currentTime - this.lastClickTime < 300) {
          // 双击事件
          this.emit('node:doubleclick', { nodeId: target.id })
          this.lastClickTime = 0
          this.lastClickedNodeId = undefined
          return
        }

        // 单击事件
        this.lastClickTime = currentTime
        this.lastClickedNodeId = target.id
        this.selectNode(target.id, event.originalEvent.ctrlKey)
        this.startNodeDrag(target.id, canvasPoint)
      } else if (target instanceof Connection) {
        this.selectConnection(target.id, event.originalEvent.ctrlKey)
      }
    } else {
      // 点击了空白区域
      this.lastClickTime = 0
      this.lastClickedNodeId = undefined
      if (!event.originalEvent.ctrlKey) {
        this.clearSelection()
      }
      this.startCanvasPan(canvasPoint)
    }
  }

  private handleCanvasMouseMove(event: any) {
    const { canvasPoint } = event

    if (this.isDragging && this.dragStartPoint) {
      if (this.draggedNodes.size > 0) {
        // 拖拽节点
        this.updateNodeDrag(canvasPoint)
      } else {
        // 平移画布
        this.updateCanvasPan(canvasPoint)
      }
    }
  }

  private handleCanvasMouseUp() {
    this.endDrag()
  }

  private handleCanvasWheel(event: any) {
    const { canvasPoint, originalEvent } = event
    const delta = originalEvent.deltaY
    const zoomFactor = delta > 0 ? 0.9 : 1.1

    const currentViewport = this.canvasEngine.getViewport()
    const newScale = currentViewport.transform.scale * zoomFactor

    this.canvasEngine.zoomToPoint(canvasPoint, newScale)
  }

  private handleCanvasContextMenu(event: any) {
    const { canvasPoint, target } = event

    if (target instanceof BaseNode) {
      const menuItems = target.getContextMenuItems()
      this.emit('context:menu', {
        type: 'node',
        nodeId: target.id,
        position: canvasPoint,
        items: menuItems
      })
    } else if (target instanceof Connection) {
      this.emit('context:menu', {
        type: 'connection',
        connectionId: target.id,
        position: canvasPoint,
        items: [
          { label: '删除连接', action: 'delete-connection', icon: '🗑️' },
          { label: '编辑标签', action: 'edit-label', icon: '✏️' }
        ]
      })
    } else {
      this.emit('context:menu', {
        type: 'canvas',
        position: canvasPoint,
        items: [
          { label: '添加节点', action: 'add-node', icon: '➕' },
          { label: '粘贴', action: 'paste', icon: '📋', disabled: this.state.clipboard.nodes.length === 0 },
          { label: '全选', action: 'select-all', icon: '🔘' },
          { label: '适应窗口', action: 'fit-view', icon: '🔍' }
        ]
      })
    }
  }

  // ==================== 拖拽处理 ====================

  private startNodeDrag(nodeId: string, startPoint: Point) {
    this.isDragging = true
    this.dragStartPoint = startPoint
    this.draggedNodes.clear()

    // 如果节点已选中，拖拽所有选中的节点
    if (this.state.selectedNodeIds.has(nodeId)) {
      this.draggedNodes = new Set(this.state.selectedNodeIds)
    } else {
      this.draggedNodes.add(nodeId)
    }

    // 设置拖拽状态
    this.draggedNodes.forEach(id => {
      const node = this.state.nodes.get(id)
      if (node) node.setDragging(true)
    })
  }

  private updateNodeDrag(currentPoint: Point) {
    if (!this.dragStartPoint) return

    const deltaX = currentPoint.x - this.dragStartPoint.x
    const deltaY = currentPoint.y - this.dragStartPoint.y

    // 网格对齐
    let alignedDeltaX = deltaX
    let alignedDeltaY = deltaY

    if (this.config.snapToGrid) {
      alignedDeltaX = Math.round(deltaX / this.config.gridSize) * this.config.gridSize
      alignedDeltaY = Math.round(deltaY / this.config.gridSize) * this.config.gridSize
    }

    // 更新节点位置
    this.draggedNodes.forEach(nodeId => {
      const node = this.state.nodes.get(nodeId)
      if (node) {
        const currentPos = node.getData().position
        const newPosition = {
          x: currentPos.x + alignedDeltaX,
          y: currentPos.y + alignedDeltaY
        }
        node.setPosition(newPosition)
      }
    })

    this.dragStartPoint = currentPoint
  }

  private startCanvasPan(startPoint: Point) {
    this.isDragging = true
    this.dragStartPoint = startPoint
  }

  private updateCanvasPan(currentPoint: Point) {
    if (!this.dragStartPoint) return

    const deltaX = currentPoint.x - this.dragStartPoint.x
    const deltaY = currentPoint.y - this.dragStartPoint.y

    this.canvasEngine.pan({ x: deltaX, y: deltaY })
    this.dragStartPoint = currentPoint
  }

  private endDrag() {
    this.isDragging = false
    this.dragStartPoint = undefined

    // 清除拖拽状态
    this.draggedNodes.forEach(nodeId => {
      const node = this.state.nodes.get(nodeId)
      if (node) node.setDragging(false)
    })
    this.draggedNodes.clear()
  }

  // ==================== 工具方法 ====================

  private rectsIntersect(rect1: Rect, rect2: Rect): boolean {
    return !(rect1.x + rect1.width < rect2.x ||
      rect2.x + rect2.width < rect1.x ||
      rect1.y + rect1.height < rect2.y ||
      rect2.y + rect2.height < rect1.y)
  }

  private addToHistory(action: string, data: any) {
    // 清除当前位置之后的历史
    this.history = this.history.slice(0, this.historyIndex + 1)

    // 添加新的历史记录
    this.history.push({
      action,
      timestamp: new Date(),
      data
    })

    // 限制历史记录数量
    if (this.history.length > this.config.maxHistorySteps) {
      this.history.shift()
    } else {
      this.historyIndex++
    }
  }

  // ==================== 公共API ====================

  /**
   * 获取工作台状态
   */
  getState(): WorkspaceState {
    return { ...this.state }
  }

  /**
   * 获取画布引擎
   */
  getCanvasEngine(): CanvasEngine {
    return this.canvasEngine
  }

  /**
   * 适应窗口
   */
  fitToView() {
    if (this.state.nodes.size === 0) return

    const bounds = this.calculateBounds()
    this.canvasEngine.fitToView(bounds, 50)
  }

  /**
   * 重置视图
   */
  resetView() {
    this.canvasEngine.resetView()
  }

  /**
   * 计算所有节点的边界
   */
  private calculateBounds(): Rect {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    this.state.nodes.forEach(node => {
      const bounds = node.bounds
      minX = Math.min(minX, bounds.x)
      minY = Math.min(minY, bounds.y)
      maxX = Math.max(maxX, bounds.x + bounds.width)
      maxY = Math.max(maxY, bounds.y + bounds.height)
    })

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }
  }

  /**
   * 销毁工作台
   */
  destroy() {
    this.canvasEngine.stop()
    this.state.nodes.forEach(node => node.destroy())
    this.state.connections.forEach(connection => connection.destroy())
    this.removeAllListeners()
  }
}
