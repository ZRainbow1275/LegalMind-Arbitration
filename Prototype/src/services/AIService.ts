/**
 * AI服务接口定义
 * 
 * 【设计目标】
 * 1. 定义统一的AI服务接口，支持多种AI提供商
 * 2. 使用策略模式，便于切换不同的AI实现
 * 3. 当前提供MockAIService模拟实现，未来可集成真实AI服务
 * 
 * 【支持的AI提供商】
 * - Mock: 模拟AI服务（当前实现）
 * - OpenAI: OpenAI GPT系列模型（待实现）
 * - Claude: Anthropic Claude系列模型（待实现）
 * - Local: 本地部署的AI模型（待实现）
 * 
 * @see docs/PROTOTYPE_TECHNICAL_REVIEW_2025_10_09.md - 技术审查报告
 */

// ==================== 类型定义 ====================

/**
 * AI响应类型
 */
export interface AIResponse {
  /** 响应ID */
  id: string
  /** 响应内容 */
  content: string
  /** 响应类型 */
  type: 'text' | 'node-suggestion' | 'connection-suggestion' | 'document' | 'analysis'
  /** 置信度 (0-1) */
  confidence: number
  /** 元数据 */
  metadata?: Record<string, any>
  /** 创建时间 */
  timestamp: Date
}

/**
 * 节点建议
 */
export interface NodeSuggestion {
  /** 节点类型 */
  type: 'legal-case' | 'legal-person' | 'legal-document' | 'legal-hearing' | 'legal-mediation' | 'legal-timeline'
  /** 节点标题 */
  title: string
  /** 节点描述 */
  description: string
  /** 建议的位置 */
  position?: { x: number; y: number }
  /** 元数据 */
  metadata?: Record<string, any>
  /** 置信度 */
  confidence: number
}

/**
 * 连接建议
 */
export interface ConnectionSuggestion {
  /** 源节点ID */
  fromNodeId: string
  /** 目标节点ID */
  toNodeId: string
  /** 连接类型 */
  type: 'workflow' | 'relationship' | 'reference' | 'dependency' | 'collaboration'
  /** 连接描述 */
  description: string
  /** 置信度 */
  confidence: number
}

/**
 * 案件分析结果
 */
export interface CaseAnalysis {
  /** 案件摘要 */
  summary: string
  /** 关键要素 */
  keyElements: Array<{
    type: string
    content: string
    importance: number
  }>
  /** 风险评估 */
  risks: Array<{
    type: string
    description: string
    severity: 'low' | 'medium' | 'high'
    mitigation: string
  }>
  /** 建议 */
  recommendations: string[]
  /** 置信度 */
  confidence: number
}

/**
 * 文档生成请求
 */
export interface DocumentGenerationRequest {
  /** 文档模板类型 */
  templateType: 'complaint' | 'answer' | 'evidence-list' | 'hearing-record' | 'award'
  /** 案件数据 */
  caseData: Record<string, any>
  /** 自定义参数 */
  customParams?: Record<string, any>
}

// ==================== AI服务接口 ====================

/**
 * AI服务接口
 * 
 * 所有AI服务实现都必须实现此接口
 */
export interface AIService {
  /**
   * 分析用户意图
   * @param input 用户输入
   * @param context 上下文信息（节点、连接等）
   * @returns AI响应
   */
  analyzeUserIntent(input: string, context: any): Promise<AIResponse>

  /**
   * 生成节点建议
   * @param input 用户输入
   * @param existingNodes 现有节点
   * @returns 节点建议列表
   */
  suggestNodes(input: string, existingNodes: any[]): Promise<NodeSuggestion[]>

  /**
   * 生成连接建议
   * @param nodes 节点列表
   * @returns 连接建议列表
   */
  suggestConnections(nodes: any[]): Promise<ConnectionSuggestion[]>

  /**
   * 分析案件关系
   * @param nodes 节点列表
   * @returns 案件分析结果
   */
  analyzeCaseRelationships(nodes: any[]): Promise<CaseAnalysis>

  /**
   * 生成法律文书
   * @param request 文档生成请求
   * @returns 生成的文档内容
   */
  generateLegalDocument(request: DocumentGenerationRequest): Promise<string>

  /**
   * 检查服务是否可用
   * @returns 是否可用
   */
  isAvailable(): Promise<boolean>
}

// ==================== Mock AI服务实现 ====================

/**
 * Mock AI服务
 * 
 * 使用硬编码的规则模拟AI响应，用于原型开发和测试
 */
export class MockAIService implements AIService {
  async analyzeUserIntent(input: string, _context: any): Promise<AIResponse> {
    const lowerInput = input.toLowerCase()

    // 模拟意图识别
    if (lowerInput.includes('创建') || lowerInput.includes('添加') || lowerInput.includes('新建')) {
      if (lowerInput.includes('案件')) {
        return {
          id: `mock-${Date.now()}`,
          content: '我理解您想创建一个新的案件节点。我可以帮您创建一个案件信息节点，包含案件号、当事人、争议金额等信息。',
          type: 'node-suggestion',
          confidence: 0.9,
          metadata: {
            suggestedNodeType: 'legal-case'
          },
          timestamp: new Date()
        }
      } else if (lowerInput.includes('人物') || lowerInput.includes('当事人')) {
        return {
          id: `mock-${Date.now()}`,
          content: '我理解您想添加人物关系节点。我可以帮您创建当事人、律师或证人的节点。',
          type: 'node-suggestion',
          confidence: 0.85,
          metadata: {
            suggestedNodeType: 'legal-person'
          },
          timestamp: new Date()
        }
      }
    }

    if (lowerInput.includes('分析') || lowerInput.includes('关系')) {
      return {
        id: `mock-${Date.now()}`,
        content: '我可以帮您分析案件中的人物关系、证据链和时间线。请告诉我您想分析哪个方面？',
        type: 'analysis',
        confidence: 0.8,
        timestamp: new Date()
      }
    }

    // 默认响应
    return {
      id: `mock-${Date.now()}`,
      content: '我是LegalMind AI助手，可以帮您创建节点、分析案件关系、生成法律文书。请告诉我您需要什么帮助？',
      type: 'text',
      confidence: 0.7,
      timestamp: new Date()
    }
  }

  async suggestNodes(input: string, _existingNodes: any[]): Promise<NodeSuggestion[]> {
    const suggestions: NodeSuggestion[] = []
    const lowerInput = input.toLowerCase()

    if (lowerInput.includes('案件')) {
      suggestions.push({
        type: 'legal-case',
        title: '新案件',
        description: '商事仲裁案件',
        position: { x: 400, y: 200 },
        confidence: 0.9
      })
    }

    if (lowerInput.includes('人物') || lowerInput.includes('当事人')) {
      suggestions.push({
        type: 'legal-person',
        title: '当事人',
        description: '案件相关人物',
        position: { x: 200, y: 300 },
        confidence: 0.85
      })
    }

    if (lowerInput.includes('文档') || lowerInput.includes('证据')) {
      suggestions.push({
        type: 'legal-document',
        title: '证据文档',
        description: '案件相关文档',
        position: { x: 600, y: 300 },
        confidence: 0.8
      })
    }

    return suggestions
  }

  async suggestConnections(nodes: any[]): Promise<ConnectionSuggestion[]> {
    const suggestions: ConnectionSuggestion[] = []

    // 简单的规则：案件节点和人物节点之间建议创建关系连接
    const caseNodes = nodes.filter(n => n.type === 'legal-case')
    const personNodes = nodes.filter(n => n.type === 'legal-person')

    caseNodes.forEach(caseNode => {
      personNodes.forEach(personNode => {
        suggestions.push({
          fromNodeId: caseNode.id,
          toNodeId: personNode.id,
          type: 'relationship',
          description: '案件当事人关系',
          confidence: 0.75
        })
      })
    })

    return suggestions
  }

  async analyzeCaseRelationships(nodes: any[]): Promise<CaseAnalysis> {
    return {
      summary: `当前案件包含 ${nodes.length} 个节点，涉及多个当事人和证据文档。`,
      keyElements: [
        {
          type: '当事人',
          content: '申请人、被申请人',
          importance: 0.9
        },
        {
          type: '争议焦点',
          content: '合同履行争议',
          importance: 0.85
        }
      ],
      risks: [
        {
          type: '证据不足',
          description: '部分关键证据缺失',
          severity: 'medium',
          mitigation: '建议补充相关证据材料'
        }
      ],
      recommendations: [
        '建议完善证据链',
        '建议明确争议焦点',
        '建议准备庭审材料'
      ],
      confidence: 0.7
    }
  }

  async generateLegalDocument(request: DocumentGenerationRequest): Promise<string> {
    const { templateType, caseData } = request

    // 模拟文档生成
    switch (templateType) {
      case 'complaint':
        return `仲裁申请书\n\n申请人：${caseData.applicant || '张三'}\n被申请人：${caseData.respondent || '李四'}\n\n请求事项：\n1. ...\n2. ...\n\n事实与理由：\n...`

      case 'answer':
        return `答辩书\n\n被申请人：${caseData.respondent || '李四'}\n\n答辩意见：\n1. ...\n2. ...\n\n事实与理由：\n...`

      default:
        return `文档内容（模拟生成）\n\n案件号：${caseData.caseNumber || 'ARB-2024-001'}\n...`
    }
  }

  async isAvailable(): Promise<boolean> {
    return true // Mock服务始终可用
  }
}

// ==================== AI服务工厂 ====================

/**
 * AI服务提供商类型
 */
export type AIProvider = 'mock' | 'openai' | 'claude' | 'local'

/**
 * AI服务工厂
 * 
 * 使用工厂模式创建不同的AI服务实例
 */
export class AIServiceFactory {
  /**
   * 创建AI服务实例
   * @param provider AI提供商
   * @param config 配置参数
   * @returns AI服务实例
   */
  static create(provider: AIProvider = 'mock', _config?: Record<string, any>): AIService {
    switch (provider) {
      case 'mock':
        return new MockAIService()

      case 'openai':
        // TODO: 实现OpenAI服务
        throw new Error('OpenAI服务尚未实现，请使用mock模式')

      case 'claude':
        // TODO: 实现Claude服务
        throw new Error('Claude服务尚未实现，请使用mock模式')

      case 'local':
        // TODO: 实现本地AI服务
        throw new Error('本地AI服务尚未实现，请使用mock模式')

      default:
        throw new Error(`不支持的AI提供商: ${provider}`)
    }
  }

  /**
   * 获取默认AI服务（Mock）
   * @returns Mock AI服务实例
   */
  static getDefault(): AIService {
    return new MockAIService()
  }
}

