/**
 * LegalMind 法律工作台 - 连接线系统
 *
 * 【技术说明】⭐ 核心自定义功能
 * 本文件定义了法律业务专用的5种连接类型和智能路径计算算法。
 *
 * 【与Plait的关系】
 * - Plait提供：基础的连接线渲染、拖拽创建连接
 * - 本系统提供：法律业务的连接类型定义、智能路径算法、避障逻辑
 * - 集成方式：通过Plait的连接线API扩展自定义连接类型
 *
 * 【5种法律专用连接类型】
 * 1. workflow（工作流连接）- 正交路径，表示流程顺序，有向箭头
 * 2. relationship（关系连接）- 曲线路径，表示人物关系，无向
 * 3. reference（引用连接）- 虚线路径，表示文档引用，有向
 * 4. dependency（依赖连接）- 粗直线，表示依赖关系，有向
 * 5. collaboration（协作连接）- 双向曲线，表示协作关系，双向箭头
 *
 * 【核心功能】
 * - 智能路径计算：根据连接类型选择最优路径算法
 * - 自动避障：检测并避开中间节点（部分实现）
 * - 节点绑定：连接线自动跟随节点移动
 * - 连接点选择：自动选择最近的连接点
 * - 碰撞检测：支持连接线的点击和悬停检测
 *
 * 【当前状态】⚠️
 * - 基础连接功能：✅ 已实现
 * - 智能路径计算：⚠️ 部分实现（简单路径算法）
 * - 自动避障：❌ 待完善
 * - 连接点自动选择：❌ 待实现
 *
 * @see src/components/ConnectionLines.tsx - React组件封装
 * @see docs/TECHNICAL_STACK.md - 技术栈说明
 */

import { EventEmitter } from 'events'
import { Point, Rect, RenderObject, RenderLayer, ViewportState } from './canvas-engine'
import { BaseNode } from './node-system'

// ==================== 连接类型定义 ====================

export type ConnectionType =
  | 'workflow' | 'relationship' | 'reference' | 'dependency' | 'collaboration'
  | 'related-to' | 'depends-on' | 'conflicts-with' | 'supports' | 'references'
  | 'represents' | 'timeline'

export interface ConnectionStyle {
  strokeColor: string
  strokeWidth: number
  strokeDashArray?: number[]
  opacity: number
  animated: boolean
  showArrow: boolean
  arrowSize: number
  shadowEnabled: boolean
  shadowColor: string
  shadowBlur: number
}

export interface ConnectionData {
  id: string
  type: ConnectionType
  sourceNodeId: string
  targetNodeId: string
  sourcePoint?: Point
  targetPoint?: Point
  label?: string
  bidirectional: boolean
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

// ==================== 路径计算 ====================

export interface PathPoint extends Point {
  type: 'start' | 'control' | 'end'
  tangent?: Point
}

/**
 * 路径计算器
 * 负责计算连接线的最优路径，支持避障和美观的曲线
 */
export class PathCalculator {


  /**
   * 计算两点之间的最优路径
   */
  calculatePath(
    start: Point,
    end: Point,
    connectionType: ConnectionType,
    avoidObstacles = true
  ): PathPoint[] {
    switch (connectionType) {
      case 'workflow':
      case 'timeline':
        return this.calculateWorkflowPath(start, end, avoidObstacles)
      case 'relationship':
      case 'related-to':
      case 'represents':
      case 'conflicts-with':
      case 'supports':
        return this.calculateRelationshipPath(start, end, avoidObstacles)
      case 'reference':
      case 'references':
        return this.calculateReferencePath(start, end, avoidObstacles)
      case 'dependency':
      case 'depends-on':
        return this.calculateDependencyPath(start, end, avoidObstacles)
      case 'collaboration':
        return this.calculateCollaborationPath(start, end, avoidObstacles)
      default:
        return this.calculateStraightPath(start, end)
    }
  }

  /**
   * 工作流路径：直角连接，适合表示流程顺序
   */
  private calculateWorkflowPath(start: Point, end: Point, _avoidObstacles: boolean): PathPoint[] {
    const path: PathPoint[] = [
      { ...start, type: 'start' }
    ]

    const dx = end.x - start.x
    const dy = end.y - start.y
    const midX = start.x + dx * 0.5
    const midY = start.y + dy * 0.5

    // 如果距离较短，使用直线
    if (Math.abs(dx) < 100 && Math.abs(dy) < 100) {
      path.push({ ...end, type: 'end' })
      return path
    }

    // 使用贝塞尔曲线创建平滑的直角连接
    if (Math.abs(dx) > Math.abs(dy)) {
      // 水平优先
      path.push({ x: midX, y: start.y, type: 'control' })
      path.push({ x: midX, y: end.y, type: 'control' })
    } else {
      // 垂直优先
      path.push({ x: start.x, y: midY, type: 'control' })
      path.push({ x: end.x, y: midY, type: 'control' })
    }

    path.push({ ...end, type: 'end' })
    return path
  }

  /**
   * 关系路径：平滑曲线，适合表示人物关系
   */
  private calculateRelationshipPath(start: Point, end: Point, _avoidObstacles: boolean): PathPoint[] {
    const path: PathPoint[] = [
      { ...start, type: 'start' }
    ]

    const dx = end.x - start.x
    const dy = end.y - start.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    // 控制点偏移量，创建自然的曲线
    const controlOffset = Math.min(distance * 0.3, 100)
    const angle = Math.atan2(dy, dx)
    const perpAngle = angle + Math.PI / 2

    // 添加控制点创建平滑曲线
    const control1: PathPoint = {
      x: start.x + Math.cos(perpAngle) * controlOffset * 0.5,
      y: start.y + Math.sin(perpAngle) * controlOffset * 0.5,
      type: 'control'
    }

    const control2: PathPoint = {
      x: end.x - Math.cos(perpAngle) * controlOffset * 0.5,
      y: end.y - Math.sin(perpAngle) * controlOffset * 0.5,
      type: 'control'
    }

    path.push(control1, control2)
    path.push({ ...end, type: 'end' })
    return path
  }

  /**
   * 引用路径：虚线直线，简洁明了
   */
  private calculateReferencePath(start: Point, end: Point, _avoidObstacles: boolean): PathPoint[] {
    return this.calculateStraightPath(start, end)
  }

  /**
   * 依赖路径：粗直线，表示强依赖关系
   */
  private calculateDependencyPath(start: Point, end: Point, _avoidObstacles: boolean): PathPoint[] {
    return this.calculateStraightPath(start, end)
  }

  /**
   * 协作路径：双向箭头的平滑曲线
   */
  private calculateCollaborationPath(start: Point, end: Point, avoidObstacles: boolean): PathPoint[] {
    return this.calculateRelationshipPath(start, end, avoidObstacles)
  }

  /**
   * 直线路径
   */
  private calculateStraightPath(start: Point, end: Point): PathPoint[] {
    return [
      { ...start, type: 'start' },
      { ...end, type: 'end' }
    ]
  }

  /**
   * 检查路径是否与障碍物相交
   */


  /**
   * 检查线段是否与矩形相交
   */





}

// ==================== 连接线类 ====================

/**
 * 连接线类
 * 表示两个节点之间的连接关系
 */
export class Connection extends EventEmitter implements RenderObject {
  public readonly id: string
  public readonly layer = RenderLayer.CONNECTIONS
  public zIndex = 0
  public visible = true

  private data: ConnectionData
  private style: ConnectionStyle
  private path: PathPoint[] = []
  private pathCalculator: PathCalculator
  private isSelected = false
  private isHovered = false
  // private animationOffset = 0

  constructor(data: ConnectionData, pathCalculator: PathCalculator) {
    super()
    this.id = data.id
    this.data = data
    this.pathCalculator = pathCalculator
    this.style = this.getDefaultStyle(data.type)
  }

  /**
   * 获取连接数据
   */
  getData(): ConnectionData {
    return { ...this.data }
  }

  /**
   * 更新连接数据
   */
  updateData(updates: Partial<ConnectionData>) {
    const oldData = { ...this.data }
    this.data = { ...this.data, ...updates, updatedAt: new Date() }
    this.emit('data:updated', { oldData, newData: this.data })
  }

  /**
   * 更新路径
   */
  updatePath(sourceNode: BaseNode, targetNode: BaseNode) {
    if (!sourceNode || !targetNode) return

    const sourcePoint = this.data.sourcePoint || sourceNode.getNearestConnectionPoint(targetNode.getData().position)
    const targetPoint = this.data.targetPoint || targetNode.getNearestConnectionPoint(sourceNode.getData().position)

    this.path = this.pathCalculator.calculatePath(
      sourcePoint,
      targetPoint,
      this.data.type
    )

    this.emit('path:updated', { path: this.path })
  }

  /**
   * 获取边界框
   */
  get bounds(): Rect {
    if (this.path.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 }
    }

    let minX = this.path[0].x
    let minY = this.path[0].y
    let maxX = this.path[0].x
    let maxY = this.path[0].y

    for (const point of this.path) {
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
      maxX = Math.max(maxX, point.x)
      maxY = Math.max(maxY, point.y)
    }

    const padding = this.style.strokeWidth + 10
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2
    }
  }

  /**
   * 渲染连接线
   */
  render(ctx: CanvasRenderingContext2D, viewport: ViewportState) {
    if (this.path.length < 2) return

    ctx.save()

    // 应用视口变换
    const transform = viewport.transform
    ctx.setTransform(transform.scale, 0, 0, transform.scale, transform.x, transform.y)

    // 设置样式
    ctx.strokeStyle = this.style.strokeColor
    ctx.lineWidth = this.style.strokeWidth
    ctx.globalAlpha = this.style.opacity

    if (this.style.strokeDashArray) {
      ctx.setLineDash(this.style.strokeDashArray)
    }

    // 绘制阴影
    if (this.style.shadowEnabled) {
      ctx.shadowColor = this.style.shadowColor
      ctx.shadowBlur = this.style.shadowBlur
    }

    // 绘制路径
    this.drawPath(ctx)

    // 绘制箭头
    if (this.style.showArrow) {
      this.drawArrow(ctx)
    }

    // 绘制标签
    if (this.data.label) {
      this.drawLabel(ctx)
    }

    // 绘制选中状态
    if (this.isSelected) {
      this.drawSelection(ctx)
    }

    ctx.restore()
  }

  /**
   * 绘制路径
   */
  private drawPath(ctx: CanvasRenderingContext2D) {
    if (this.path.length < 2) return

    ctx.beginPath()
    ctx.moveTo(this.path[0].x, this.path[0].y)

    if (this.path.length === 2) {
      // 直线
      ctx.lineTo(this.path[1].x, this.path[1].y)
    } else {
      // 贝塞尔曲线
      for (let i = 1; i < this.path.length; i += 3) {
        if (i + 2 < this.path.length) {
          ctx.bezierCurveTo(
            this.path[i].x, this.path[i].y,
            this.path[i + 1].x, this.path[i + 1].y,
            this.path[i + 2].x, this.path[i + 2].y
          )
        } else {
          ctx.lineTo(this.path[i].x, this.path[i].y)
        }
      }
    }

    ctx.stroke()
  }

  /**
   * 绘制箭头
   */
  private drawArrow(ctx: CanvasRenderingContext2D) {
    if (this.path.length < 2) return

    const end = this.path[this.path.length - 1]
    const beforeEnd = this.path[this.path.length - 2]

    const angle = Math.atan2(end.y - beforeEnd.y, end.x - beforeEnd.x)
    const arrowSize = this.style.arrowSize

    ctx.save()
    ctx.translate(end.x, end.y)
    ctx.rotate(angle)

    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(-arrowSize, -arrowSize / 2)
    ctx.lineTo(-arrowSize, arrowSize / 2)
    ctx.closePath()
    ctx.fillStyle = this.style.strokeColor
    ctx.fill()

    ctx.restore()
  }

  /**
   * 绘制标签
   */
  private drawLabel(ctx: CanvasRenderingContext2D) {
    if (!this.data.label || this.path.length < 2) return

    // 计算标签位置（路径中点）
    const midIndex = Math.floor(this.path.length / 2)
    const labelPos = this.path[midIndex]

    ctx.save()
    ctx.fillStyle = this.style.strokeColor
    ctx.font = '12px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // 绘制背景
    const metrics = ctx.measureText(this.data.label)
    const padding = 4
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.fillRect(
      labelPos.x - metrics.width / 2 - padding,
      labelPos.y - 6 - padding,
      metrics.width + padding * 2,
      12 + padding * 2
    )

    // 绘制文字
    ctx.fillStyle = this.style.strokeColor
    ctx.fillText(this.data.label, labelPos.x, labelPos.y)

    ctx.restore()
  }

  /**
   * 绘制选中状态
   */
  private drawSelection(ctx: CanvasRenderingContext2D) {
    ctx.save()
    ctx.strokeStyle = '#007AFF'
    ctx.lineWidth = this.style.strokeWidth + 2
    ctx.globalAlpha = 0.5
    ctx.setLineDash([5, 5])

    this.drawPath(ctx)

    ctx.restore()
  }

  /**
   * 点击测试
   */
  hitTest(point: Point): boolean {
    const tolerance = Math.max(this.style.strokeWidth / 2, 5)

    for (let i = 0; i < this.path.length - 1; i++) {
      const start = this.path[i]
      const end = this.path[i + 1]

      if (this.distanceToLineSegment(point, start, end) <= tolerance) {
        return true
      }
    }

    return false
  }

  /**
   * 计算点到线段的距离
   */
  private distanceToLineSegment(point: Point, start: Point, end: Point): number {
    const dx = end.x - start.x
    const dy = end.y - start.y
    const length = Math.sqrt(dx * dx + dy * dy)

    if (length === 0) {
      return Math.sqrt((point.x - start.x) ** 2 + (point.y - start.y) ** 2)
    }

    const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (length * length)))
    const projection = {
      x: start.x + t * dx,
      y: start.y + t * dy
    }

    return Math.sqrt((point.x - projection.x) ** 2 + (point.y - projection.y) ** 2)
  }

  /**
   * 设置选中状态
   */
  setSelected(selected: boolean) {
    if (this.isSelected !== selected) {
      this.isSelected = selected
      this.emit('selection:changed', { selected })
    }
  }

  /**
   * 设置悬停状态
   */
  setHovered(hovered: boolean) {
    if (this.isHovered !== hovered) {
      this.isHovered = hovered
      this.emit('hover:changed', { hovered })
    }
  }

  /**
   * 获取默认样式
   */
  private getDefaultStyle(type: ConnectionType): ConnectionStyle {
    const baseStyle: ConnectionStyle = {
      strokeColor: '#FF6B35',
      strokeWidth: 2,
      opacity: 1,
      animated: false,
      showArrow: true,
      arrowSize: 8,
      shadowEnabled: true,
      shadowColor: 'rgba(0, 0, 0, 0.1)',
      shadowBlur: 2
    }

    switch (type) {
      case 'workflow':
      case 'timeline':
        return { ...baseStyle, strokeWidth: 3, showArrow: true }
      case 'relationship':
      case 'related-to':
      case 'represents':
      case 'conflicts-with':
      case 'supports':
        return { ...baseStyle, strokeColor: '#10B981', showArrow: false }
      case 'reference':
      case 'references':
        return { ...baseStyle, strokeColor: '#6B7280', strokeDashArray: [5, 5], showArrow: false }
      case 'dependency':
      case 'depends-on':
        return { ...baseStyle, strokeColor: '#EF4444', strokeWidth: 4 }
      case 'collaboration':
        return { ...baseStyle, strokeColor: '#8B5CF6', showArrow: false, animated: true }
      default:
        return baseStyle
    }
  }

  /**
   * 销毁连接
   */
  destroy() {
    this.removeAllListeners()
    this.emit('destroyed')
  }
}
