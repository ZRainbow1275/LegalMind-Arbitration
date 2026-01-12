// 法律工作台节点类型定义

export type NodeStatus = 'pending' | 'in-progress' | 'completed' | 'error' | 'cancelled'

export type LegalNodeType =
  | 'hearing-preparation'  // 庭审准备
  | 'ai-assistant'        // AI法律助手
  | 'hearing-process'     // 庭审进行
  | 'evidence-analysis'   // 证据分析
  | 'decision-draft'      // 裁决起草
  | 'document'            // 文书
  | 'ai-chat'             // AI对话
  | 'hearing'             // 庭审
  | 'timeline'            // 时间线
  | 'collaboration'       // 协作
  | 'evidence'            // 证据
  | 'template'            // 模板
  | 'review'              // 审查
  | 'case-info'           // 案件信息
  | 'person'              // 人员
  | 'arbitrator'          // 仲裁员
  | 'fact'                // 事实
  | 'issue'               // 争议焦点
  | 'law'                 // 法律
  | 'analysis'            // 分析
  | 'conclusion'          // 结论

export interface LegalNodeData {
  id: string
  type: LegalNodeType
  title: string
  description?: string
  status: NodeStatus
  caseId?: string
  createdAt: Date
  updatedAt: Date
  metadata?: Record<string, any>
}

// 文书节点特定数据
export interface DocumentNodeData extends LegalNodeData {
  type: 'document'
  documentType: 'petition' | 'response' | 'evidence-list' | 'ruling' | 'agreement'
  templateId?: string
  content?: string
  version?: number
  reviewers?: string[]
}

// AI对话节点特定数据
export interface AIChatNodeData extends LegalNodeData {
  type: 'ai-chat'
  chatType: 'legal-advice' | 'case-analysis' | 'document-review' | 'procedure-guide'
  messages?: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
  }>
  context?: string
}

// 庭审节点特定数据
export interface HearingNodeData extends LegalNodeData {
  type: 'hearing'
  hearingType: 'preparation' | 'live' | 'record' | 'summary'
  scheduledTime?: Date
  participants?: string[]
  recordingUrl?: string
  transcript?: string
}

// 时间线节点特定数据
export interface TimelineNodeData extends LegalNodeData {
  type: 'timeline'
  eventType: 'milestone' | 'deadline' | 'reminder' | 'notification'
  eventDate: Date
  isCompleted: boolean
  relatedNodes?: string[]
}

// 协作节点特定数据
export interface CollaborationNodeData extends LegalNodeData {
  type: 'collaboration'
  collaborationType: 'comment' | 'review' | 'approval' | 'discussion'
  participants: string[]
  permissions: Record<string, 'read' | 'write' | 'admin'>
}

// 节点连接关系
export interface NodeConnection {
  id: string
  sourceNodeId: string
  targetNodeId: string
  connectionType: 'workflow' | 'reference' | 'dependency' | 'collaboration'
  label?: string
  metadata?: Record<string, any>
}

// 工作台状态
export interface WorkspaceState {
  nodes: LegalNodeData[]
  connections: NodeConnection[]
  selectedNodeId?: string
  viewMode: 'canvas' | 'timeline' | 'list'
  zoomLevel: number
  panOffset: { x: number; y: number }
}

// 节点操作
export interface NodeAction {
  type: 'create' | 'update' | 'delete' | 'connect' | 'disconnect'
  nodeId?: string
  data?: Partial<LegalNodeData>
  connectionId?: string
}

// 案件上下文
export interface CaseContext {
  caseId: string
  caseNumber: string
  title: string
  parties: {
    applicant: string
    respondent: string
  }
  arbitrators: string[]
  status: 'active' | 'suspended' | 'closed'
  createdAt: Date
}
