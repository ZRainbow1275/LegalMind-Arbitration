/**
 * LegalMind法律工作台 - 类型定义
 * 
 * 本文件包含工作台组件使用的所有类型定义
 */

import { PlaitElement } from '@plait/core';
import { Viewport } from '@plait/core';
import { ViewMode } from '../ViewSwitcher';

// ==================== 辅助接口定义 ====================

export interface MediationSession {
  id: string;
  date: string;
  time: string;
  duration: number;
  mediator: string;
  participants: string[];
  topics: string[];
  outcome: 'agreement' | 'partial' | 'failed' | 'pending';
  notes: string;
}

export interface ContactInfo {
  type: 'phone' | 'email' | 'address' | 'fax';
  value: string;
  label: string;
}

export interface DocumentVersion {
  version: string;
  date: string;
  author: string;
  changes: string;
}

export interface DocumentTag {
  name: string;
  color: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  time: string;
  title: string;
  description: string;
  type: 'filing' | 'hearing' | 'evidence' | 'decision' | 'other';
  importance: 'high' | 'medium' | 'low';
  relatedDocuments: string[];
}

// ==================== 法律节点元数据类型 ====================

/**
 * 案件信息节点元数据
 */
export interface CaseInfoMetadata {
  caseNumber: string;      // 案件编号
  caseType: string;        // 案件类型
  amount?: number;          // 标的额 (Legacy)
  disputeAmount?: string | number; // 争议金额 (Aligned with node-system)
  filingDate: string | Date;      // 立案日期
  hearingDate?: string | Date;
  jurisdiction?: string;
  urgencyLevel?: string;
  legalBasis?: string;
  caseBackground?: string;
  disputeFocus?: string;
  evidenceSummary?: string;
  riskAssessment?: string;
  citedArticles?: string[]; // 引用法条
  parties?: {
    applicant: string;
    respondent: string;
    thirdParties?: string[];
  };
  arbitrators?: string[];
  currentStage?: string;
  nextDeadline?: string | Date;
  relatedCases?: string[];
}

/**
 * 人物关系节点元数据
 */
export interface PersonMetadata {
  role: string;  // 角色
  personType?: 'applicant' | 'respondent' | 'arbitrator' | 'lawyer' | 'witness' | 'expert' | 'other' | string;
  entityType?: string;
  fullName?: string;
  name?: string; // Alias for fullName
  idNumber?: string;
  companyName?: string;
  registrationNumber?: string;
  legalRepresentative?: string;
  contactInfo?: ContactInfo[];
  address?: string;
  interests?: string;
  claims?: string;
  defenses?: string;
  citedArticles?: string[]; // 引用法条
  relationships?: Array<{
    targetPersonId: string;
    relationshipType: 'represents' | 'opposes' | 'collaborates' | 'reports-to' | 'custom';
    description?: string;
  }>;
  organization?: string;
  avatar?: string;
}

/**
 * 文档管理节点元数据
 */
export interface DocumentMetadata {
  documentType: string;    // 文档类型
  uploadDate?: string;      // 上传日期
  fileSize?: string | number;        // 文件大小
  isEvidence?: boolean;     // 是否为证据
  fileName?: string;
  author?: string;
  source?: string;
  confidentialityLevel?: string;
  evidenceType?: string;
  relevanceScore?: number;
  authenticity?: string;
  legalSignificance?: string;
  summary?: string;
  keyPoints?: string[] | string;
  relatedClauses?: string;
  versions?: DocumentVersion[];
  tags?: DocumentTag[];
  // {{ AURA: Add - 文件上传相关字段 }}
  fileUrl?: string;
  thumbnailUrl?: string;
  uploadStatus?: 'uploading' | 'uploaded' | 'error';
  uploadProgress?: number;
  errorMessage?: string;
  file?: File; // 临时存储文件对象
  citedArticles?: string[]; // 引用法条
  mimeType?: string;
  isConfidential?: boolean;
  ocrText?: string;
  relatedDocuments?: string[];
  reviewStatus?: 'pending' | 'reviewed' | 'approved' | 'rejected';
  reviewers?: Array<{
    userId: string;
    status: 'pending' | 'approved' | 'rejected';
    comments?: string;
    reviewedAt?: Date;
  }>;
}

/**
 * 庭审记录节点元数据
 */
export interface HearingMetadata {
  hearingDate: string | Date;     // 庭审日期 (ISO format)
  hearingType: string;     // 庭审类型
  location: string;        // 庭审地点
  participants: any[];     // 参与人员 (Detailed objects)

  // Extended fields for HearingEditor
  scheduledDate?: string;
  scheduledTime?: string;
  duration?: string;
  venue?: string;
  isVirtual?: boolean;
  virtualPlatform?: string;
  meetingLink?: string;
  arbitrator?: string;
  secretary?: string;
  agenda?: string;
  preparationNotes?: string;
  technicalRequirements?: string;
  documents?: any[];
  recordingEnabled?: boolean;
  interpreterNeeded?: boolean;
  interpreterLanguage?: string;

  citedArticles?: string[]; // 引用法条
}

/**
 * 调解记录节点元数据
 */
export interface MediationMetadata {
  mediationDate?: string;   // 调解日期
  mediator?: string;        // 调解员
  result?: 'success' | 'failed' | 'pending';  // 调解结果

  mediationType?: string;
  mediationStage?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  mediatorOrganization?: string;
  venue?: string;
  isVirtual?: boolean;
  virtualPlatform?: string;
  meetingLink?: string;
  disputeAmount?: string;
  settlementAmount?: string;
  settlementTerms?: string;
  confidentialityAgreement?: boolean;
  legalBinding?: boolean;
  followUpRequired?: boolean;
  followUpDate?: string;
  successRate?: number;
  notes?: string;
  sessions?: MediationSession[];
  totalSessions?: number;
  successfulSessions?: number;

  citedArticles?: string[]; // 引用法条
}

/**
 * 时间轴节点元数据
 */
export interface TimelineMetadata {
  eventDate?: string | Date;       // 事件日期
  eventType?: string;       // 事件类型
  importance?: 'low' | 'medium' | 'high' | 'critical';  // 重要程度

  startDate?: string | Date;
  endDate?: string | Date;
  totalEvents?: number;
  completedEvents?: number;
  upcomingEvents?: number;
  criticalPath?: boolean;
  milestones?: string[];
  tags?: string[];
  events?: TimelineEvent[];

  citedArticles?: string[]; // 引用法条
  isCompleted?: boolean;
  relatedNodes?: string[];
  reminders?: Array<{
    type: 'email' | 'sms' | 'notification';
    beforeDays: number;
    sent: boolean;
  }>;
  recurrence?: {
    type: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: Date;
  };
}

/**
 * 流程节点元数据
 */
export interface ProcessMetadata {
  processName?: string;     // 流程名称
  processType: string;     // 流程类型
  status?: 'not-started' | 'in-progress' | 'completed' | 'blocked'; // 状态
  steps: any[];         // 步骤列表
  citedArticles?: string[]; // 引用法条
  template?: {
    id: string;
    name: string;
    isCustom: boolean;
  };
  progress?: {
    completedSteps: number;
    totalSteps: number;
    percentage: number;
  };
}

/**
 * 争议焦点节点元数据
 */
export interface IssueMetadata {
  issueType: 'fact' | 'law' | 'procedure';
  description: string;
  status: 'open' | 'resolved' | 'disputed';
  citedArticles?: string[];
}

/**
 * 证据节点元数据 (扩展文档元数据)
 */
export interface EvidenceMetadata extends DocumentMetadata {
  evidenceType: any;
  authenticity: any;
  relevance: any;
  linkedIssues?: string[]; // IDs of IssueNodes
}

/**
 * AI助手节点元数据
 */
export interface AIAssistantMetadata {
  assistantType?: 'general' | 'legal-research' | 'document-review'; // 助手类型
  aiType?: 'legal-analysis' | 'document-generation' | 'case-research' | 'strategy-advice' | 'general';
  capabilities: string[];  // 能力列表
  citedArticles?: string[]; // 引用法条
  conversationHistory?: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    attachments?: Array<{
      type: 'document' | 'image' | 'link';
      url: string;
      name: string;
    }>;
  }>;
  context?: {
    caseId?: string;
    relatedNodes: string[];
    focusArea?: string;
  };
  lastInteraction?: Date;
  confidence?: number;
  suggestedActions?: string[];
  lastUpdate?: string;
}

/**
 * 法律节点类型（兼容Plait框架）
 */
export interface LegalNode extends PlaitElement {
  type: 'legal-case' | 'legal-person' | 'legal-document' | 'legal-hearing' | 'legal-mediation' | 'legal-timeline' | 'legal-process' | 'legal-ai-assistant' | 'legal-issue' | 'legal-evidence';
  data: {
    title: string;
    description: string;
    status: 'pending' | 'active' | 'completed' | 'cancelled';
    metadata: CaseInfoMetadata | PersonMetadata | DocumentMetadata | HearingMetadata | MediationMetadata | TimelineMetadata | ProcessMetadata | AIAssistantMetadata | IssueMetadata | EvidenceMetadata;
    position: { x: number; y: number };
    connections: string[];
    createdAt?: string;
    updatedAt?: string;
    tags?: string[];
  };
}

// ==================== 工作台状态类型 ====================

/**
 * 连接类型
 */
export type ConnectionType = 'related-to' | 'depends-on' | 'conflicts-with' | 'supports' | 'references';

/**
 * 连接对象
 */
export interface Connection {
  id: string;
  source: string;
  target: string;
  type: string;
  label?: string;
}

/**
 * AI建议
 */
export interface AISuggestion {
  id: string;
  type: string;
  confidence: number;
  suggestion: string;
}

/**
 * 右键菜单状态
 */
export interface ContextMenuState {
  show: boolean;
  x: number;
  y: number;
  nodeId: string | null;
  menuType?: 'canvas' | 'node'; // {{ AURA: Add - 菜单类型：画布或节点 }}
  position?: { x: number; y: number }; // {{ AURA: Add - 画布坐标位置（用于创建节点） }}
  selectedNodeIds?: string[]; // {{ AURA: Add - 选中的节点ID列表（用于多选操作） }}
}

/**
 * 工作台状态接口
 */
export interface WorkspaceState {
  // 选择状态
  selectedNodes: string[];

  // 视口状态
  viewport: Viewport;

  // AI分析状态
  isAIAnalyzing: boolean;
  aiSuggestions: AISuggestion[];

  // {{ AURA: Fix - 支持同时打开多个节点详情 }}
  // 编辑状态
  editingNode: LegalNode | null; // 保留向后兼容
  editingNodes: LegalNode[]; // 新增：支持同时编辑多个节点

  // 仲裁功能状态
  activeArbitrationFunction: string | null;
  showArbitrationPanel: boolean;

  // AI面板状态
  showAIAnalysisPanel: boolean;
  showEvidenceRelationPanel: boolean;
  showRecommendationPanel: boolean;

  // 协作面板状态
  showPermissionPanel: boolean;
  showCollaborationPanel: boolean;

  // 连接功能状态
  isConnecting: boolean;
  connectionStart: string | null;
  connectionType: ConnectionType;
  connections: Connection[];

  // 右键菜单状态
  contextMenu: ContextMenuState | null;

  // UI状态
  showShortcutsHelp: boolean;
  isFullscreen: boolean;
  viewMode: ViewMode;

  // 可视化状态
  showRelationshipGraph: boolean;
  showEvidenceChain: boolean;
  showLegalArticleCitation: boolean;

  // {{ AURA: Add - 性能监控面板状态 }}
  showPerformanceMonitor: boolean;

  // {{ AURA: Add - 画布浮动工具栏状态 }}
  floatingToolbar: {
    visible: boolean;
    position: { x: number; y: number } | null;
    canvasPosition: { x: number; y: number } | null;
  } | null;

  // {{ AURA: Add - 节点类型选择器状态 }}
  nodeTypeSelector: {
    visible: boolean;
    position: { x: number; y: number } | null;
    canvasPosition: { x: number; y: number } | null;
  } | null;
}

// ==================== AI分析结果类型 ====================

/**
 * 风险等级
 */
export type RiskLevel = 'low' | 'medium' | 'high';

/**
 * 优先级
 */
export type Priority = 'low' | 'medium' | 'high';

/**
 * 风险项
 */
export interface Risk {
  level: RiskLevel;
  description: string;
}

/**
 * 推荐项
 */
export interface Recommendation {
  action: string;
  priority: Priority;
  reasoning: string;
}

/**
 * AI分析结果
 */
export interface AIAnalysisResult {
  suggestions: string[];
  risks: Risk[];
  recommendations: Recommendation[];
}

// ==================== 组件Props类型 ====================

/**
 * 法律工作台组件Props
 */
export interface DrawnixLegalWorkspaceProps {
  // 节点操作回调
  initialNodes?: LegalNode[];
  onNodeCreate?: (node: LegalNode) => void;
  onNodeUpdate?: (nodeId: string, updates: Partial<LegalNode>) => void;
  onNodeDelete?: (nodeId: string) => void;
  onAIAnalysis?: (nodes: LegalNode[]) => Promise<AIAnalysisResult>;

  // 案件集成相关props
  caseId?: string;                    // 案件ID
  caseData?: any;                     // 案件数据
  initialState?: import('../../interfaces/case-canvas-mapping').CanvasState;  // 初始画布状态
  onStateChange?: (state: import('../../interfaces/case-canvas-mapping').CanvasState) => void;  // 状态变化回调
}

// ==================== 节点类型配置 ====================

/**
 * 节点类型配置
 */
export interface NodeTypeConfig {
  'legal-case': { icon: any; label: string; color: string };
  'legal-person': { icon: any; label: string; color: string };
  'legal-document': { icon: any; label: string; color: string };
  'legal-hearing': { icon: any; label: string; color: string };
  'legal-mediation': { icon: any; label: string; color: string };
  'legal-timeline': { icon: any; label: string; color: string };
  'legal-process': { icon: any; label: string; color: string };
  'legal-ai-assistant': { icon: any; label: string; color: string };
}
