/**
 * LegalMind 法律工作台 - 画布引擎核心架构
 *
 * 【技术说明】
 * 本文件包含自研的画布引擎代码，设计用于补充Plait框架的能力。
 *
 * 【当前状态】⚠️
 * - 本引擎代码处于"设计完成，部分集成"状态
 * - 主要功能由Plait框架提供（画布渲染、事件处理、视口管理）
 * - 本文件中的部分功能（如坐标转换、分层渲染）可作为Plait的补充
 *
 * 【与Plait的关系】
 * - Plait提供：Canvas渲染、事件系统、协作功能
 * - 本引擎提供：法律业务特定的坐标转换、自定义渲染逻辑
 * - 集成方式：通过Plait插件机制扩展
 *
 * 【核心功能】
 * - 坐标转换系统：屏幕坐标 ↔ 画布坐标
 * - 分层渲染管理：背景、网格、连接、节点、选择、UI、光标
 * - 事件管理器：统一的鼠标/键盘事件处理
 * - 性能优化：视口裁剪、FPS监控
 *
 * 【设计理念】
 * - 参考 Figma 的画布交互体验
 * - 借鉴 Flowith 的自由布局理念
 * - 融合 Drawnix 的白板交互方式
 *
 * @see docs/TECHNICAL_STACK.md - 技术栈说明
 * @see https://github.com/plait-board/drawnix - Plait/Drawnix框架
 */

import { EventEmitter } from 'events'

// ==================== 核心类型定义 ====================

export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Transform {
  x: number
  y: number
  scale: number
  rotation?: number
}

export interface ViewportState {
  transform: Transform
  bounds: Rect
  zoom: number
  center: Point
}

// ==================== 坐标系统 ====================

/**
 * 坐标转换管理器
 * 负责屏幕坐标与画布坐标之间的精确转换
 */
export class CoordinateSystem {
  private viewport: ViewportState
  private canvasSize: Size

  constructor(canvasSize: Size) {
    this.canvasSize = canvasSize
    this.viewport = {
      transform: { x: 0, y: 0, scale: 1 },
      bounds: { x: 0, y: 0, width: canvasSize.width, height: canvasSize.height },
      zoom: 1,
      center: { x: canvasSize.width / 2, y: canvasSize.height / 2 }
    }
  }

  /**
   * 屏幕坐标转画布坐标
   */
  screenToCanvas(screenPoint: Point): Point {
    const { transform } = this.viewport
    return {
      x: (screenPoint.x - transform.x) / transform.scale,
      y: (screenPoint.y - transform.y) / transform.scale
    }
  }

  /**
   * 画布坐标转屏幕坐标
   */
  canvasToScreen(canvasPoint: Point): Point {
    const { transform } = this.viewport
    return {
      x: canvasPoint.x * transform.scale + transform.x,
      y: canvasPoint.y * transform.scale + transform.y
    }
  }

  /**
   * 设置视口变换
   */
  setTransform(transform: Partial<Transform>) {
    this.viewport.transform = { ...this.viewport.transform, ...transform }
    this.viewport.zoom = transform.scale || this.viewport.zoom
  }

  /**
   * 获取当前视口状态
   */
  getViewport(): ViewportState {
    return { ...this.viewport }
  }

  /**
   * 缩放到指定点
   */
  zoomToPoint(point: Point, scale: number) {
    const currentScale = this.viewport.transform.scale
    const scaleRatio = scale / currentScale

    this.viewport.transform.scale = scale
    this.viewport.transform.x = point.x - (point.x - this.viewport.transform.x) * scaleRatio
    this.viewport.transform.y = point.y - (point.y - this.viewport.transform.y) * scaleRatio
    this.viewport.zoom = scale
  }

  /**
   * 平移视口
   */
  pan(delta: Point) {
    this.viewport.transform.x += delta.x
    this.viewport.transform.y += delta.y
  }

  /**
   * 适应窗口大小
   */
  fitToView(bounds: Rect, padding: number = 50) {
    const viewWidth = this.canvasSize.width - padding * 2
    const viewHeight = this.canvasSize.height - padding * 2

    const scaleX = viewWidth / bounds.width
    const scaleY = viewHeight / bounds.height
    const scale = Math.min(scaleX, scaleY, 1) // 不超过100%缩放

    const centerX = bounds.x + bounds.width / 2
    const centerY = bounds.y + bounds.height / 2

    this.viewport.transform.scale = scale
    this.viewport.transform.x = this.canvasSize.width / 2 - centerX * scale
    this.viewport.transform.y = this.canvasSize.height / 2 - centerY * scale
    this.viewport.zoom = scale
  }
}

// ==================== 渲染层管理 ====================

export enum RenderLayer {
  BACKGROUND = 0,
  GRID = 1,
  CONNECTIONS = 2,
  NODES = 3,
  SELECTION = 4,
  UI_OVERLAY = 5,
  CURSOR = 6
}

export interface RenderObject {
  id: string
  layer: RenderLayer
  bounds: Rect
  visible: boolean
  zIndex: number
  render: (ctx: CanvasRenderingContext2D, viewport: ViewportState) => void
  hitTest?: (point: Point) => boolean
}

/**
 * 渲染管理器
 * 负责分层渲染和性能优化
 */
export class RenderManager {
  private objects: Map<string, RenderObject> = new Map()
  private layers: Map<RenderLayer, RenderObject[]> = new Map()
  private dirtyRegions: Rect[] = []
  private needsFullRedraw = true

  /**
   * 添加渲染对象
   */
  addObject(object: RenderObject) {
    this.objects.set(object.id, object)

    if (!this.layers.has(object.layer)) {
      this.layers.set(object.layer, [])
    }

    const layerObjects = this.layers.get(object.layer)!
    layerObjects.push(object)
    layerObjects.sort((a, b) => a.zIndex - b.zIndex)

    this.markDirty(object.bounds)
  }

  /**
   * 移除渲染对象
   */
  removeObject(id: string) {
    const object = this.objects.get(id)
    if (!object) return

    this.objects.delete(id)

    const layerObjects = this.layers.get(object.layer)
    if (layerObjects) {
      const index = layerObjects.findIndex(obj => obj.id === id)
      if (index >= 0) {
        layerObjects.splice(index, 1)
      }
    }

    this.markDirty(object.bounds)
  }

  /**
   * 更新渲染对象
   */
  updateObject(id: string, updates: Partial<RenderObject>) {
    const object = this.objects.get(id)
    if (!object) return

    const oldBounds = object.bounds
    Object.assign(object, updates)

    this.markDirty(oldBounds)
    this.markDirty(object.bounds)
  }

  /**
   * 标记脏区域
   */
  markDirty(bounds: Rect) {
    this.dirtyRegions.push(bounds)
  }

  /**
   * 执行渲染
   */
  render(ctx: CanvasRenderingContext2D, viewport: ViewportState) {
    if (this.needsFullRedraw) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
      this.needsFullRedraw = false
    }

    // 按层级顺序渲染
    const sortedLayers = Array.from(this.layers.keys()).sort((a, b) => a - b)

    for (const layer of sortedLayers) {
      const objects = this.layers.get(layer) || []

      for (const object of objects) {
        if (!object.visible) continue

        // 视口裁剪优化
        if (!this.isInViewport(object.bounds, viewport)) continue

        ctx.save()
        object.render(ctx, viewport)
        ctx.restore()
      }
    }

    this.dirtyRegions = []
  }

  /**
   * 检查对象是否在视口内
   */
  private isInViewport(bounds: Rect, viewport: ViewportState): boolean {
    const viewBounds = viewport.bounds
    return !(
      bounds.x + bounds.width < viewBounds.x ||
      bounds.x > viewBounds.x + viewBounds.width ||
      bounds.y + bounds.height < viewBounds.y ||
      bounds.y > viewBounds.y + viewBounds.height
    )
  }

  /**
   * 点击测试
   */
  hitTest(point: Point): RenderObject | undefined {
    // 从顶层开始测试
    const sortedLayers = Array.from(this.layers.keys()).sort((a, b) => b - a)

    for (const layer of sortedLayers) {
      const objects = this.layers.get(layer) || []

      // 按z-index倒序测试
      for (let i = objects.length - 1; i >= 0; i--) {
        const object = objects[i]
        if (!object.visible) continue

        if (object.hitTest && object.hitTest(point)) {
          return object
        }

        // 默认边界框测试
        if (this.pointInRect(point, object.bounds)) {
          return object
        }
      }
    }

    return undefined
  }

  private pointInRect(point: Point, rect: Rect): boolean {
    return point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
  }

  /**
   * 强制全量重绘
   */
  forceRedraw() {
    this.needsFullRedraw = true
  }
}

// ==================== 事件系统 ====================

export interface CanvasEvent {
  type: string
  point: Point
  canvasPoint: Point
  target?: RenderObject
  originalEvent?: Event
  preventDefault?: () => void
  stopPropagation?: () => void
}

/**
 * 画布事件管理器
 */
export class EventManager extends EventEmitter {
  private coordinateSystem: CoordinateSystem
  private renderManager: RenderManager
  private canvas: HTMLCanvasElement
  private isListening = false

  constructor(
    canvas: HTMLCanvasElement,
    coordinateSystem: CoordinateSystem,
    renderManager: RenderManager
  ) {
    super()
    this.canvas = canvas
    this.coordinateSystem = coordinateSystem
    this.renderManager = renderManager
  }

  /**
   * 开始监听事件
   */
  startListening() {
    if (this.isListening) return

    this.canvas.addEventListener('mousedown', this.handleMouseDown)
    this.canvas.addEventListener('mousemove', this.handleMouseMove)
    this.canvas.addEventListener('mouseup', this.handleMouseUp)
    this.canvas.addEventListener('wheel', this.handleWheel)
    this.canvas.addEventListener('contextmenu', this.handleContextMenu)

    this.isListening = true
  }

  /**
   * 停止监听事件
   */
  stopListening() {
    if (!this.isListening) return

    this.canvas.removeEventListener('mousedown', this.handleMouseDown)
    this.canvas.removeEventListener('mousemove', this.handleMouseMove)
    this.canvas.removeEventListener('mouseup', this.handleMouseUp)
    this.canvas.removeEventListener('wheel', this.handleWheel)
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu)

    this.isListening = false
  }

  private handleMouseDown = (e: MouseEvent) => {
    const point = this.getEventPoint(e)
    const canvasPoint = this.coordinateSystem.screenToCanvas(point)
    const target = this.renderManager.hitTest(canvasPoint)

    const canvasEvent: CanvasEvent = {
      type: 'mousedown',
      point,
      canvasPoint,
      target,
      originalEvent: e
    }

    this.emit('mousedown', canvasEvent)
    if (target) {
      this.emit(`mousedown:${target.id}`, canvasEvent)
    }
  }

  private handleMouseMove = (e: MouseEvent) => {
    const point = this.getEventPoint(e)
    const canvasPoint = this.coordinateSystem.screenToCanvas(point)
    const target = this.renderManager.hitTest(canvasPoint)

    const canvasEvent: CanvasEvent = {
      type: 'mousemove',
      point,
      canvasPoint,
      target,
      originalEvent: e
    }

    this.emit('mousemove', canvasEvent)
    if (target) {
      this.emit(`mousemove:${target.id}`, canvasEvent)
    }
  }

  private handleMouseUp = (e: MouseEvent) => {
    const point = this.getEventPoint(e)
    const canvasPoint = this.coordinateSystem.screenToCanvas(point)
    const target = this.renderManager.hitTest(canvasPoint)

    const canvasEvent: CanvasEvent = {
      type: 'mouseup',
      point,
      canvasPoint,
      target,
      originalEvent: e
    }

    this.emit('mouseup', canvasEvent)
    if (target) {
      this.emit(`mouseup:${target.id}`, canvasEvent)
    }
  }

  private handleWheel = (e: WheelEvent) => {
    e.preventDefault()

    const point = this.getEventPoint(e)
    const canvasPoint = this.coordinateSystem.screenToCanvas(point)

    const canvasEvent: CanvasEvent = {
      type: 'wheel',
      point,
      canvasPoint,
      originalEvent: e
    }

    this.emit('wheel', canvasEvent)
  }

  private handleContextMenu = (e: MouseEvent) => {
    e.preventDefault()

    const point = this.getEventPoint(e)
    const canvasPoint = this.coordinateSystem.screenToCanvas(point)
    const target = this.renderManager.hitTest(canvasPoint)

    const canvasEvent: CanvasEvent = {
      type: 'contextmenu',
      point,
      canvasPoint,
      target,
      originalEvent: e
    }

    this.emit('contextmenu', canvasEvent)
    if (target) {
      this.emit(`contextmenu:${target.id}`, canvasEvent)
    }
  }

  private getEventPoint(e: MouseEvent): Point {
    const rect = this.canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }
}

// ==================== 画布引擎主类 ====================

/**
 * 法律工作台画布引擎
 * 整合坐标系统、渲染管理和事件系统的核心引擎
 */
export class CanvasEngine extends EventEmitter {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private coordinateSystem: CoordinateSystem
  private renderManager: RenderManager
  private eventManager: EventManager
  private animationId?: number
  private isRunning = false

  // 性能监控
  private frameCount = 0
  private lastFrameTime = 0
  private fps = 0

  constructor(canvas: HTMLCanvasElement) {
    super()

    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('无法获取 Canvas 2D 上下文')
    }
    this.ctx = ctx

    // 初始化各个子系统
    const canvasSize = { width: canvas.width, height: canvas.height }
    this.coordinateSystem = new CoordinateSystem(canvasSize)
    this.renderManager = new RenderManager()
    this.eventManager = new EventManager(canvas, this.coordinateSystem, this.renderManager)

    // 绑定事件
    this.setupEventHandlers()
  }

  /**
   * 启动画布引擎
   */
  start() {
    if (this.isRunning) return

    this.isRunning = true
    this.eventManager.startListening()
    this.startRenderLoop()

    this.emit('engine:start')
  }

  /**
   * 停止画布引擎
   */
  stop() {
    if (!this.isRunning) return

    this.isRunning = false
    this.eventManager.stopListening()

    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = undefined
    }

    this.emit('engine:stop')
  }

  /**
   * 调整画布大小
   */
  resize(width: number, height: number) {
    this.canvas.width = width
    this.canvas.height = height

    const canvasSize = { width, height }
    this.coordinateSystem = new CoordinateSystem(canvasSize)
    this.renderManager.forceRedraw()

    this.emit('engine:resize', { width, height })
  }

  /**
   * 获取坐标系统
   */
  getCoordinateSystem(): CoordinateSystem {
    return this.coordinateSystem
  }

  /**
   * 获取渲染管理器
   */
  getRenderManager(): RenderManager {
    return this.renderManager
  }

  /**
   * 获取事件管理器
   */
  getEventManager(): EventManager {
    return this.eventManager
  }

  /**
   * 添加渲染对象
   */
  addRenderObject(object: RenderObject) {
    this.renderManager.addObject(object)
  }

  /**
   * 移除渲染对象
   */
  removeRenderObject(id: string) {
    this.renderManager.removeObject(id)
  }

  /**
   * 更新渲染对象
   */
  updateRenderObject(id: string, updates: Partial<RenderObject>) {
    this.renderManager.updateObject(id, updates)
  }

  /**
   * 缩放到指定点
   */
  zoomToPoint(point: Point, scale: number) {
    this.coordinateSystem.zoomToPoint(point, scale)
    this.emit('viewport:zoom', { point, scale })
  }

  /**
   * 平移视口
   */
  pan(delta: Point) {
    this.coordinateSystem.pan(delta)
    this.emit('viewport:pan', { delta })
  }

  /**
   * 适应视图
   */
  fitToView(bounds: Rect, padding?: number) {
    this.coordinateSystem.fitToView(bounds, padding)
    this.emit('viewport:fit', { bounds, padding })
  }

  /**
   * 重置视图
   */
  resetView() {
    this.coordinateSystem.setTransform({ x: 0, y: 0, scale: 1 })
    this.emit('viewport:reset')
  }

  /**
   * 获取当前视口状态
   */
  getViewport(): ViewportState {
    return this.coordinateSystem.getViewport()
  }

  /**
   * 获取性能信息
   */
  getPerformanceInfo() {
    return {
      fps: this.fps,
      frameCount: this.frameCount,
      objectCount: this.renderManager['objects'].size
    }
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers() {
    // 转发事件管理器的事件
    this.eventManager.on('mousedown', (e) => this.emit('canvas:mousedown', e))
    this.eventManager.on('mousemove', (e) => this.emit('canvas:mousemove', e))
    this.eventManager.on('mouseup', (e) => this.emit('canvas:mouseup', e))
    this.eventManager.on('wheel', (e) => this.emit('canvas:wheel', e))
    this.eventManager.on('contextmenu', (e) => this.emit('canvas:contextmenu', e))
  }

  /**
   * 启动渲染循环
   */
  private startRenderLoop() {
    const render = (currentTime: number) => {
      if (!this.isRunning) return

      // 计算FPS
      if (currentTime - this.lastFrameTime >= 1000) {
        this.fps = this.frameCount
        this.frameCount = 0
        this.lastFrameTime = currentTime
      }
      this.frameCount++

      // 执行渲染
      const viewport = this.coordinateSystem.getViewport()
      this.renderManager.render(this.ctx, viewport)

      // 继续下一帧
      this.animationId = requestAnimationFrame(render)
    }

    this.animationId = requestAnimationFrame(render)
  }
}

// ==================== 工具函数 ====================

/**
 * 计算两点之间的距离
 */
export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * 计算两点之间的角度（弧度）
 */
export function angle(p1: Point, p2: Point): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x)
}

/**
 * 点是否在矩形内
 */
export function pointInRect(point: Point, rect: Rect): boolean {
  return point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
}

/**
 * 两个矩形是否相交
 */
export function rectsIntersect(rect1: Rect, rect2: Rect): boolean {
  return !(rect1.x + rect1.width < rect2.x ||
    rect2.x + rect2.width < rect1.x ||
    rect1.y + rect1.height < rect2.y ||
    rect2.y + rect2.height < rect1.y)
}

/**
 * 限制数值在指定范围内
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
