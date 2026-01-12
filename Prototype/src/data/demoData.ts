/**
 * LegalMind 法律工作台 - 演示数据
 * 
 * 提供完整的演示数据，展示所有工作台功能
 */

import { NodeData } from '../lib/node-system'
import { ConnectionData } from '../lib/connection-system'

// ==================== 节点演示数据 ====================

export const demoNodes: NodeData[] = [
  {
    id: 'case-001',
    type: 'case-info',
    title: '商事仲裁案件 - 合同纠纷',
    description: '甲公司与乙公司之间的供货合同纠纷案件',
    position: { x: 400, y: 200 },
    size: { width: 200, height: 120 },
    status: 'in-progress',
    priority: 'high',
    tags: ['商事仲裁', '合同纠纷', '供货合同'],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
    metadata: {
      caseNumber: 'BJZC2024001',
      caseTitle: '甲公司诉乙公司供货合同纠纷案',
      parties: {
        applicant: '甲公司',
        respondent: '乙公司'
      },
      caseType: 'commercial',
      disputeAmount: '5000000',
      filingDate: '2024-01-15',
      hearingDate: '2024-02-15',
      jurisdiction: '北京仲裁委员会',
      urgencyLevel: 'high',
      legalBasis: '合同法',
      caseBackground: '甲公司与乙公司签订供货合同，乙公司未按期交货。',
      disputeFocus: '违约责任认定及赔偿金额计算',
      evidenceSummary: '供货合同、催款函、往来邮件',
      riskAssessment: 'medium',
      arbitrators: ['王仲裁员', '赵仲裁员', '钱仲裁员']
    }
  },
  {
    id: 'person-001',
    type: 'person',
    title: '张律师',
    description: '甲公司代理律师',
    position: { x: 150, y: 100 },
    size: { width: 120, height: 80 },
    status: 'active',
    priority: 'medium',
    tags: ['代理律师', '甲公司'],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-18'),
    metadata: {
      fullName: '张律师',
      personType: 'lawyer',

      idNumber: '110101198001011234',
      companyName: '北京某律师事务所',
      registrationNumber: '',
      legalRepresentative: '',
      role: '主办律师',
      contactInfo: [
        { type: 'phone', value: '138****1234', label: '手机' },
        { type: 'email', value: 'zhang@law.com', label: '邮箱' }
      ],
      address: '北京市朝阳区某大厦',
      interests: '商事仲裁',
      claims: '',
      defenses: ''
    }
  },
  {
    id: 'person-002',
    type: 'person',
    title: '李律师',
    description: '乙公司代理律师',
    position: { x: 650, y: 100 },
    size: { width: 120, height: 80 },
    status: 'active',
    priority: 'medium',
    tags: ['代理律师', '乙公司'],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-18'),
    metadata: {
      fullName: '李律师',
      personType: 'lawyer',

      idNumber: '310101198502025678',
      companyName: '上海某律师事务所',
      registrationNumber: '',
      legalRepresentative: '',
      role: '主办律师',
      contactInfo: [
        { type: 'phone', value: '139****5678', label: '手机' },
        { type: 'email', value: 'li@law.com', label: '邮箱' }
      ],
      address: '上海市浦东新区某大厦',
      interests: '合同纠纷',
      claims: '',
      defenses: ''
    }
  },
  {
    id: 'document-001',
    type: 'document',
    title: '供货合同',
    description: '甲乙双方签署的原始供货合同',
    position: { x: 200, y: 350 },
    size: { width: 150, height: 100 },
    status: 'completed',
    priority: 'high',
    tags: ['合同', '证据', '原始文件'],
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-15'),
    metadata: {
      fileName: '供货合同_甲乙公司_2023.pdf',
      documentType: 'contract',
      fileSize: '2MB',
      author: '张律师',
      source: '甲公司',
      confidentialityLevel: 'public',
      evidenceType: 'primary',
      relevanceScore: 5,
      authenticity: 'verified',
      legalSignificance: '核心证据',
      summary: '约定了供货数量、价格及违约责任',
      keyPoints: ['违约金条款'],
      relatedClauses: '第8条',
      versions: [],
      tags: []
    }
  },
  {
    id: 'document-002',
    type: 'document',
    title: '仲裁申请书',
    description: '甲公司提交的仲裁申请书',
    position: { x: 600, y: 350 },
    size: { width: 150, height: 100 },
    status: 'completed',
    priority: 'high',
    tags: ['申请书', '程序文件'],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-16'),
    metadata: {
      fileName: '仲裁申请书_甲公司_2024.pdf',
      documentType: 'petition',
      fileSize: '1MB',
      author: '张律师',
      source: '甲公司',
      confidentialityLevel: 'public',
      evidenceType: 'primary',
      relevanceScore: 5,
      authenticity: 'verified',
      legalSignificance: '启动程序',
      summary: '请求裁决乙公司支付货款及违约金',
      keyPoints: ['诉讼请求'],
      relatedClauses: '',
      versions: [],
      tags: []
    }
  },
  {
    id: 'timeline-001',
    type: 'timeline',
    title: '案件时间轴',
    description: '记录案件重要时间节点',
    position: { x: 400, y: 500 },
    size: { width: 180, height: 100 },
    status: 'in-progress',
    priority: 'medium',
    tags: ['时间轴', '进度跟踪'],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
    metadata: {
      startDate: '2024-01-15',
      endDate: '2024-06-30',
      eventType: 'milestone',
      eventDate: '2024-01-15',
      importance: 'high',
      totalEvents: 8,
      completedEvents: 5,
      upcomingEvents: 3,
      criticalPath: true,
      milestones: ['立案', '组庭', '开庭', '裁决'],
      tags: ['进度'],
      events: []
    }
  },
  {
    id: 'process-001',
    type: 'process',
    title: '庭审流程模板',
    description: '标准商事仲裁庭审流程',
    position: { x: 100, y: 300 },
    size: { width: 160, height: 100 },
    status: 'pending',
    priority: 'medium',
    tags: ['流程模板', '庭审'],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-18'),
    metadata: {
      processType: 'hearing',
      template: {
        id: 'template-001',
        name: '商事仲裁庭审标准流程',
        isCustom: false
      },
      progress: {
        totalSteps: 12,
        completedSteps: 0,
        percentage: 0
      },
      steps: []
    }
  },
  {
    id: 'ai-001',
    type: 'ai-assistant',
    title: 'AI法律助手',
    description: '智能法律分析和建议',
    position: { x: 700, y: 300 },
    size: { width: 140, height: 100 },
    status: 'active',
    priority: 'medium',
    tags: ['AI助手', '智能分析'],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
    metadata: {
      aiType: 'legal-analysis',
      capabilities: ['合同分析', '法条检索', '案例推荐', '风险评估'],
      confidence: 0.92,
      context: {
        caseId: 'case-001',
        focusArea: '商事合同纠纷',
        relatedNodes: ['case-001'],
        relatedCases: ['BJZC2023089', 'BJZC2023156']
      } as any, // Cast to any to avoid strict type checking on extra fields
      conversationHistory: [],
      suggestedActions: [],
      lastUpdate: '2024-01-20T10:00:00Z'
    }
  }
]

// ==================== 连接演示数据 ====================

export const demoConnections: ConnectionData[] = [
  {
    id: 'conn-001',
    type: 'represents',
    sourceNodeId: 'person-001',
    targetNodeId: 'case-001',
    bidirectional: false,
    metadata: {
      relationshipType: '代理关系',
      description: '张律师代理甲公司'
    },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    label: '代理'
  },
  {
    id: 'conn-002',
    type: 'represents',
    sourceNodeId: 'person-002',
    targetNodeId: 'case-001',
    bidirectional: false,
    metadata: {
      relationshipType: '代理关系',
      description: '李律师代理乙公司'
    },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    label: '代理'
  },
  {
    id: 'conn-003',
    type: 'reference',
    sourceNodeId: 'document-001',
    targetNodeId: 'case-001',
    bidirectional: false,
    metadata: {
      relationshipType: '证据关系',
      description: '供货合同是案件的核心证据'
    },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    label: '核心证据'
  },
  {
    id: 'conn-004',
    type: 'reference',
    sourceNodeId: 'document-002',
    targetNodeId: 'case-001',
    bidirectional: false,
    metadata: {
      relationshipType: '程序文件',
      description: '仲裁申请书启动案件程序'
    },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    label: '程序启动'
  },
  {
    id: 'conn-005',
    type: 'workflow',
    sourceNodeId: 'process-001',
    targetNodeId: 'case-001',
    bidirectional: false,
    metadata: {
      relationshipType: '流程关系',
      description: '庭审流程模板应用于案件'
    },
    createdAt: new Date('2024-01-18'),
    updatedAt: new Date('2024-01-18'),
    label: '流程应用'
  },
  {
    id: 'conn-006',
    type: 'timeline',
    sourceNodeId: 'timeline-001',
    targetNodeId: 'case-001',
    bidirectional: false,
    metadata: {
      relationshipType: '时间关系',
      description: '时间轴跟踪案件进度'
    },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
    label: '进度跟踪'
  },
  {
    id: 'conn-007',
    type: 'collaboration',
    sourceNodeId: 'ai-001',
    targetNodeId: 'case-001',
    bidirectional: true,
    metadata: {
      relationshipType: 'AI辅助',
      description: 'AI助手为案件提供智能分析'
    },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
    label: 'AI分析'
  }
]

// ==================== 时间轴演示数据 ====================

export const demoTimelineEvents = [
  {
    id: 'event-001',
    title: '案件立案',
    description: '甲公司向仲裁委员会提交仲裁申请',
    date: new Date('2024-01-15'),
    type: 'filing',
    status: 'completed',
    importance: 'high',
    participants: ['甲公司', '仲裁委员会'],
    documents: ['仲裁申请书', '证据材料清单']
  },
  {
    id: 'event-002',
    title: '仲裁庭组成',
    description: '确定仲裁庭成员，包括首席仲裁员和两名仲裁员',
    date: new Date('2024-01-20'),
    type: 'milestone',
    status: 'completed',
    importance: 'high',
    participants: ['王仲裁员', '赵仲裁员', '钱仲裁员']
  },
  {
    id: 'event-003',
    title: '答辩期限',
    description: '乙公司提交答辩书的截止日期',
    date: new Date('2024-02-05'),
    type: 'deadline',
    status: 'pending',
    importance: 'critical',
    participants: ['乙公司']
  },
  {
    id: 'event-004',
    title: '庭审准备会议',
    description: '仲裁庭与双方当事人召开庭审准备会议',
    date: new Date('2024-02-10'),
    type: 'hearing',
    status: 'pending',
    importance: 'medium',
    participants: ['仲裁庭', '甲公司', '乙公司']
  },
  {
    id: 'event-005',
    title: '正式庭审',
    description: '案件正式庭审，双方进行辩论和举证',
    date: new Date('2024-02-15'),
    type: 'hearing',
    status: 'pending',
    importance: 'critical',
    participants: ['仲裁庭', '甲公司', '乙公司', '证人']
  }
]

// ==================== 人物关系演示数据 ====================

export const demoPeople = [
  {
    id: 'person-001',
    name: '张律师',
    type: 'lawyer',
    organization: '北京某律师事务所',
    role: '主办律师',
    contactInfo: {
      phone: '138****1234',
      email: 'zhang@law.com'
    },
    status: 'active'
  },
  {
    id: 'person-002',
    name: '李律师',
    type: 'lawyer',
    organization: '上海某律师事务所',
    role: '主办律师',
    contactInfo: {
      phone: '139****5678',
      email: 'li@law.com'
    },
    status: 'active'
  },
  {
    id: 'person-003',
    name: '王总',
    type: 'applicant',
    organization: '甲公司',
    role: '法定代表人',
    contactInfo: {
      phone: '136****9999'
    },
    status: 'active'
  },
  {
    id: 'person-004',
    name: '赵总',
    type: 'respondent',
    organization: '乙公司',
    role: '法定代表人',
    contactInfo: {
      phone: '137****8888'
    },
    status: 'active'
  }
]

export const demoRelationships = [
  {
    id: 'rel-001',
    sourceId: 'person-001',
    targetId: 'person-003',
    type: 'represents',
    label: '代理',
    description: '张律师代理王总（甲公司）',
    strength: 'strong',
    bidirectional: false
  },
  {
    id: 'rel-002',
    sourceId: 'person-002',
    targetId: 'person-004',
    type: 'represents',
    label: '代理',
    description: '李律师代理赵总（乙公司）',
    strength: 'strong',
    bidirectional: false
  },
  {
    id: 'rel-003',
    sourceId: 'person-003',
    targetId: 'person-004',
    type: 'opposes',
    label: '对立',
    description: '甲公司与乙公司存在合同纠纷',
    strength: 'strong',
    bidirectional: true
  }
]

// ==================== 文档演示数据 ====================

export const demoDocuments = [
  {
    id: 'doc-001',
    name: '供货合同_甲乙公司_2023.pdf',
    type: 'contract',
    size: 2048000,
    format: 'pdf',
    version: 1,
    status: 'approved',
    isConfidential: false,
    isFavorite: true,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-15'),
    createdBy: '张律师',
    tags: ['合同', '证据', '核心文件'],
    description: '甲乙双方签署的原始供货合同，案件争议的核心文件'
  },
  {
    id: 'doc-002',
    name: '仲裁申请书_甲公司_2024.pdf',
    type: 'petition',
    size: 1024000,
    format: 'pdf',
    version: 2,
    status: 'approved',
    isConfidential: false,
    isFavorite: false,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-16'),
    createdBy: '张律师',
    tags: ['申请书', '程序文件'],
    description: '甲公司向仲裁委员会提交的仲裁申请书'
  },
  {
    id: 'doc-003',
    name: '证据清单_甲公司.xlsx',
    type: 'evidence',
    size: 512000,
    format: 'xlsx',
    version: 1,
    status: 'review',
    isConfidential: false,
    isFavorite: false,
    createdAt: new Date('2024-01-18'),
    updatedAt: new Date('2024-01-20'),
    createdBy: '张律师',
    tags: ['证据', '清单'],
    description: '甲公司整理的证据材料清单'
  }
]

// ==================== 流程模板演示数据 ====================

export const demoProcessTemplates = [
  {
    id: 'template-001',
    name: '商事仲裁庭审标准流程',
    description: '适用于商事合同纠纷的标准仲裁庭审流程',
    type: 'hearing',
    category: 'commercial',
    steps: [
      {
        id: 'step-001',
        title: '庭审准备',
        description: '检查设备、整理材料、确认参与人员',
        type: 'preparation',
        status: 'pending',
        estimatedDuration: 30,
        isOptional: false,
        isParallel: false
      },
      {
        id: 'step-002',
        title: '开庭宣布',
        description: '仲裁员宣布开庭，介绍仲裁庭组成',
        type: 'hearing',
        status: 'pending',
        estimatedDuration: 10,
        isOptional: false,
        isParallel: false
      },
      {
        id: 'step-003',
        title: '当事人陈述',
        description: '申请人和被申请人分别陈述案件事实和理由',
        type: 'hearing',
        status: 'pending',
        estimatedDuration: 60,
        isOptional: false,
        isParallel: false
      }
    ],
    totalEstimatedDuration: 180,
    isPublic: true,
    isActive: true,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-15'),
    createdBy: '系统管理员',
    usageCount: 15,
    tags: ['商事仲裁', '标准流程', '庭审']
  }
]

export const demoProcessExecutions = [
  {
    id: 'exec-001',
    templateId: 'template-001',
    templateName: '商事仲裁庭审标准流程',
    status: 'in-progress',
    currentStepId: 'step-002',
    startedAt: new Date('2024-01-20T09:00:00'),
    progress: {
      totalSteps: 3,
      completedSteps: 1,
      percentage: 33
    },
    stepStatuses: {
      'step-001': 'completed',
      'step-002': 'in-progress',
      'step-003': 'pending'
    },
    executedBy: '王仲裁员',
    notes: '庭审进行顺利，当事人配合度较高'
  }
]
