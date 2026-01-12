/**
 * LegalMind 法律工作台 - 节点系统核心架构
 *
 * 【技术说明】⭐ 核心自定义功能
 * 本文件定义了法律业务专用的6种节点类型，这是项目的核心价值所在。
 *
 * 【与Plait的关系】
 * - Plait提供：基础的PlaitElement接口、节点渲染框架
 * - 本系统提供：法律业务的节点类型定义、元数据结构、业务逻辑
 * - 集成方式：通过withLegalNodes插件将这些节点注册到Plait
 *
 * 【6种法律专用节点】
 * 1. 案件信息节点 (case-info) - 案件号、当事人、争议金额、案件类型
 * 2. 人物关系节点 (person) - 律师、当事人、证人、关系网络
 * 3. 文档管理节点 (document) - 证据、合同、文书、版本管理
 * 4. 时间轴节点 (timeline) - 重要节点、截止日期、进度跟踪
 * 5. 流程模板节点 (process) - 标准化庭审流程、步骤管理
 * 6. AI助手节点 (ai-assistant) - 智能分析、建议生成、文书辅助
 *
 * 【设计原则】
 * - 每种节点都有独特的功能和交互方式
 * - 支持动态属性和继承关系
 * - 可插件化扩展新的节点类型
 * - 与Plait框架无缝集成
 *
 * 【数据结构】
 * - NodeData: 节点的完整数据定义（包含通用字段和特定元数据）
 * - BaseNode: 抽象基类，提供通用的节点行为
 * - NodeFactory: 工厂模式，用于创建不同类型的节点实例
 *
 * @see src/plugins/legal-nodes/with-legal-nodes.ts - Plait插件集成
 * @see src/lib/node-implementations.ts - 节点的具体渲染实现
 * @see docs/TECHNICAL_STACK.md - 技术栈说明
 */

import { EventEmitter } from 'events'
import { Point, Size, Rect, RenderObject, RenderLayer } from './canvas-engine'

// ==================== 基础节点类型定义 ====================

export type NodeStatus = 'pending' | 'active' | 'in-progress' | 'completed' | 'error' | 'cancelled'
export type NodePriority = 'low' | 'medium' | 'high' | 'urgent'

export interface BaseNodeData {
  id: string
  type: string
  title: string
  description?: string
  status: NodeStatus
  priority: NodePriority
  position: Point
  size: Size
  createdAt: Date
  updatedAt: Date
  metadata: any // Will be refined in specific interfaces
  tags: string[]
  assignedTo?: string
  dueDate?: Date
  connections?: string[]
}

export interface NodeStyle {
  backgroundColor: string
  borderColor: string
  borderWidth: number
  borderRadius: number
  textColor: string
  fontSize: number
  fontWeight: string
  opacity: number
  shadow: {
    enabled: boolean
    color: string
    blur: number
    offsetX: number
    offsetY: number
  }
}

// ==================== 具体节点类型定义 ====================

/**
 * 案件信息节点
 * 包含案件的基本信息、状态跟踪、关键时间点等
 */
export interface CaseInfoNodeData extends BaseNodeData {
  type: 'case-info'
  metadata: {
    caseNumber: string
    caseTitle?: string
    parties: {
      applicant: string
      respondent: string
      thirdParties?: string[]
    }
    arbitrators: string[]
    caseType: 'commercial' | 'labor' | 'construction' | 'intellectual-property' | 'other'
    disputeAmount?: number | string
    filingDate: Date | string
    currentStage?: string
    nextDeadline?: Date | string
    relatedCases?: string[]
    jurisdiction?: string
    urgencyLevel?: string
    legalBasis?: string
    caseBackground?: string
    disputeFocus?: string
    evidenceSummary?: string
    riskAssessment?: string
    hearingDate?: string
    citedArticles?: string[]
  }
}

/**
 * 人物关系节点
 * 支持当事人、仲裁员、律师、证人等角色
 */
export interface PersonNodeData extends BaseNodeData {
  type: 'person'
  metadata: {
    personType: 'applicant' | 'respondent' | 'arbitrator' | 'lawyer' | 'witness' | 'expert' | 'other'
    name?: string
    fullName?: string
    organization?: string
    role: string
    contactInfo: Array<{
      type: 'phone' | 'email' | 'address' | 'fax'
      value: string
      label: string
    }>
    avatar?: string
    idNumber?: string
    companyName?: string
    registrationNumber?: string
    legalRepresentative?: string
    address?: string
    interests?: string
    claims?: string
    defenses?: string
    citedArticles?: string[]
    relationships?: Array<{
      targetPersonId: string
      relationshipType: 'represents' | 'opposes' | 'collaborates' | 'reports-to' | 'custom'
      description?: string
    }>
  }
}

/**
 * 文档管理节点
 * 支持证据、合同、文书等文档类型
 */
export interface DocumentNodeData extends BaseNodeData {
  type: 'document'
  metadata: {
    documentType: 'evidence' | 'contract' | 'petition' | 'response' | 'ruling' | 'agreement' | 'other'
    fileName: string
    fileSize?: number | string
    mimeType?: string
    fileUrl?: string
    version?: number | string
    isConfidential?: boolean
    ocrText?: string
    keyPoints?: string[]
    relatedDocuments?: string[]
    reviewStatus?: 'pending' | 'reviewed' | 'approved' | 'rejected'
    reviewers?: Array<{
      userId: string
      status: 'pending' | 'approved' | 'rejected'
      comments?: string
      reviewedAt?: Date
    }>
    author?: string
    source?: string
    confidentialityLevel?: string
    evidenceType?: string
    relevanceScore?: number
    authenticity?: string
    legalSignificance?: string
    summary?: string
    relatedClauses?: string
    versions?: any[]
    tags?: any[]
    citedArticles?: string[]
  }
}

/**
 * 时间轴节点
 * 支持关键时间点标注、截止日期提醒、时间线可视化
 */
export interface TimelineNodeData extends BaseNodeData {
  type: 'timeline'
  metadata: {
    eventType: 'milestone' | 'deadline' | 'hearing' | 'filing' | 'notification' | 'other'
    eventDate: Date | string
    endDate?: Date | string
    isCompleted?: boolean
    importance: 'low' | 'medium' | 'high' | 'critical'
    relatedNodes?: string[]
    reminders?: Array<{
      type: 'email' | 'sms' | 'notification'
      beforeDays: number
      sent: boolean
    }>
    recurrence?: {
      type: 'daily' | 'weekly' | 'monthly' | 'yearly'
      interval: number
      endDate?: Date
    }
    startDate?: string
    totalEvents?: number
    completedEvents?: number
    upcomingEvents?: number
    criticalPath?: boolean
    milestones?: string[]
    tags?: string[]
    events?: any[]
    citedArticles?: string[]
  }
}

/**
 * 流程模板节点
 * 支持庭审准备、开庭、裁决等流程步骤
 */
export interface ProcessNodeData extends BaseNodeData {
  type: 'process'
  metadata: {
    processName?: string
    processType: 'hearing-prep' | 'hearing' | 'deliberation' | 'ruling' | 'execution' | 'custom'
    steps: Array<{
      id: string
      title: string
      description?: string
      status: NodeStatus
      estimatedDuration?: number
      actualDuration?: number
      dependencies?: string[]
      assignedTo?: string
      dueDate?: Date
      completedAt?: Date
    }>
    template?: {
      id: string
      name: string
      isCustom: boolean
    }
    progress?: {
      completedSteps: number
      totalSteps: number
      percentage: number
    }
    status?: 'not-started' | 'in-progress' | 'completed' | 'blocked'
    citedArticles?: string[]
  }
}

/**
 * AI助手节点
 * 集成智能分析、文书生成、法条推荐等AI功能
 */
export interface AIAssistantNodeData extends BaseNodeData {
  type: 'ai-assistant'
  metadata: {
    aiType?: 'legal-analysis' | 'document-generation' | 'case-research' | 'strategy-advice' | 'general'
    assistantType?: 'general' | 'legal-research' | 'document-review'
    conversationHistory?: Array<{
      id: string
      role: 'user' | 'assistant'
      content: string
      timestamp: Date
      attachments?: Array<{
        type: 'document' | 'image' | 'link'
        url: string
        name: string
      }>
    }>
    context?: {
      caseId?: string
      relatedNodes: string[]
      focusArea?: string
    }
    capabilities: string[]
    lastInteraction?: Date
    confidence?: number
    citedArticles?: string[]
    suggestedActions?: string[]
    lastUpdate?: string
  }
}

// 联合类型
export type NodeData =
  | CaseInfoNodeData
  | PersonNodeData
  | DocumentNodeData
  | TimelineNodeData
  | ProcessNodeData
  | AIAssistantNodeData

// ==================== 节点基类 ====================

/**
 * 节点基类
 * 提供所有节点的通用功能和接口
 */
export abstract class BaseNode extends EventEmitter implements RenderObject {
  public readonly id: string
  public readonly layer = RenderLayer.NODES
  public zIndex = 0
  public visible = true

  protected data: NodeData
  protected style: NodeStyle
  protected isSelected = false
  protected isHovered = false
  protected isDragging = false

  constructor(data: NodeData) {
    super()
    this.id = data.id
    this.data = data
    this.style = this.getDefaultStyle()
  }

  // ==================== 抽象方法 ====================

  /**
   * 渲染节点
   */
  abstract render(ctx: CanvasRenderingContext2D, viewport: any): void

  /**
   * 获取默认样式
   */
  abstract getDefaultStyle(): NodeStyle

  /**
   * 获取节点特定的上下文菜单项
   */
  abstract getContextMenuItems(): Array<{
    label: string
    action: string
    icon?: string
    disabled?: boolean
  }>

  // ==================== 通用方法 ====================

  /**
   * 获取节点数据
   */
  getData(): NodeData {
    return { ...this.data }
  }

  /**
   * 更新节点数据
   */
  updateData(updates: Partial<NodeData>) {
    const oldData = { ...this.data }
    this.data = { ...this.data, ...updates, updatedAt: new Date() } as NodeData
    this.emit('data:updated', { oldData, newData: this.data })
  }

  /**
   * 获取节点边界
   */
  get bounds(): Rect {
    return {
      x: this.data.position.x,
      y: this.data.position.y,
      width: this.data.size.width,
      height: this.data.size.height
    }
  }

  /**
   * 设置位置
   */
  setPosition(position: Point) {
    const oldPosition = this.data.position
    this.data.position = position
    this.data.updatedAt = new Date()
    this.emit('position:changed', { oldPosition, newPosition: position })
  }

  /**
   * 设置大小
   */
  setSize(size: Size) {
    const oldSize = this.data.size
    this.data.size = size
    this.data.updatedAt = new Date()
    this.emit('size:changed', { oldSize, newSize: size })
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
   * 设置拖拽状态
   */
  setDragging(dragging: boolean) {
    if (this.isDragging !== dragging) {
      this.isDragging = dragging
      this.emit('drag:changed', { dragging })
    }
  }

  /**
   * 点击测试
   */
  hitTest(point: Point): boolean {
    const bounds = this.bounds
    return point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.height
  }

  /**
   * 获取连接点
   * 返回节点边缘的连接点位置
   */
  getConnectionPoints(): Point[] {
    const bounds = this.bounds
    const centerX = bounds.x + bounds.width / 2
    const centerY = bounds.y + bounds.height / 2

    return [
      { x: centerX, y: bounds.y }, // 顶部
      { x: bounds.x + bounds.width, y: centerY }, // 右侧
      { x: centerX, y: bounds.y + bounds.height }, // 底部
      { x: bounds.x, y: centerY } // 左侧
    ]
  }

  /**
   * 获取最近的连接点
   */
  getNearestConnectionPoint(point: Point): Point {
    const connectionPoints = this.getConnectionPoints()
    let nearestPoint = connectionPoints[0]
    let minDistance = this.distance(point, nearestPoint)

    for (let i = 1; i < connectionPoints.length; i++) {
      const distance = this.distance(point, connectionPoints[i])
      if (distance < minDistance) {
        minDistance = distance
        nearestPoint = connectionPoints[i]
      }
    }

    return nearestPoint
  }

  /**
   * 计算两点距离
   */
  private distance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * 克隆节点
   */
  clone(): BaseNode {
    const clonedData = {
      ...this.data,
      id: `${this.data.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: `${this.data.title} (副本)`,
      position: { x: this.data.position.x + 20, y: this.data.position.y + 20 },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    return NodeFactory.createNode(clonedData)
  }

  /**
   * 序列化节点数据
   */
  serialize(): string {
    return JSON.stringify({
      data: this.data,
      style: this.style
    })
  }

  /**
   * 销毁节点
   */
  destroy() {
    this.removeAllListeners()
    this.emit('destroyed')
  }
}

// ==================== 节点工厂 ====================

/**
 * 节点工厂
 * 负责创建不同类型的节点实例
 */
export class NodeFactory {
  private static nodeClasses: Map<string, typeof BaseNode> = new Map()

  /**
   * 注册节点类
   */
  static registerNodeClass(type: string, nodeClass: typeof BaseNode) {
    this.nodeClasses.set(type, nodeClass)
  }

  /**
   * 创建节点
   */
  static createNode(data: NodeData): BaseNode {
    // Define a type for the concrete node class constructor
    type ConcreteNodeConstructor = new (data: NodeData) => BaseNode;
    const NodeClass = this.nodeClasses.get(data.type) as ConcreteNodeConstructor | undefined;

    if (!NodeClass) {
      throw new Error(`未知的节点类型: ${data.type}`)
    }

    return new NodeClass(data)
  }

  /**
   * 获取支持的节点类型
   */
  static getSupportedTypes(): string[] {
    return Array.from(this.nodeClasses.keys())
  }
}
