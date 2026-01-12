/**
 * 法律节点类型定义
 * 
 * 定义了LegalMind法律工作台中所有节点类型的TypeScript接口
 */

/** 法律节点类型枚举 */
export type LegalNodeType =
  | 'legal-case'      // 案件信息节点
  | 'legal-person'    // 人物关系节点
  | 'legal-document'  // 文档管理节点
  | 'legal-hearing'   // 庭审记录节点
  | 'legal-mediation' // 调解记录节点
  | 'legal-timeline'  // 时间轴节点
  | 'legal-evidence'  // 证据节点
  | 'legal-issue'     // 争议焦点节点
  | 'legal-process'   // 流程节点
  | 'legal-ai-assistant'; // AI助手节点

/** 位置坐标 */
export interface Position {
  x: number;
  y: number;
}

/** 尺寸 */
export interface Size {
  width: number;
  height: number;
}

/** 节点元数据 */
export interface NodeMetadata {
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  version: number;
}

/** 法律节点基础接口 */
export interface LegalNodeBase {
  id: string;
  type: LegalNodeType;
  position: Position;
  size?: Size;
  metadata: NodeMetadata;
}

/** 案件信息节点数据 */
export interface CaseNodeData {
  caseNumber: string;
  caseName: string;
  applicant: string;
  respondent: string;
  status: 'pending' | 'in-progress' | 'completed' | 'archived';
  filingDate?: string;
  hearingDate?: string;
  description?: string;
  tags?: string[];
}

/** 人物关系节点数据 */
export interface PersonNodeData {
  name: string;
  role: 'applicant' | 'respondent' | 'witness' | 'expert' | 'arbitrator' | 'other';
  organization?: string;
  contact?: {
    phone?: string;
    email?: string;
    address?: string;
  };
  description?: string;
  tags?: string[];
}

/** 文档管理节点数据 */
export interface DocumentNodeData {
  documentId: string;
  documentName: string;
  documentType: 'evidence' | 'contract' | 'ruling' | 'other';
  fileUrl?: string;
  fileSize?: number;
  uploadDate?: string;
  description?: string;
  tags?: string[];
}

/** 庭审记录节点数据 */
export interface HearingNodeData {
  hearingId: string;
  hearingDate: string;
  hearingType: 'preliminary' | 'main' | 'final' | 'other';
  location?: string;
  participants?: string[];
  summary?: string;
  recordingUrl?: string;
  transcriptUrl?: string;
  tags?: string[];
}

/** 调解记录节点数据 */
export interface MediationNodeData {
  mediationId: string;
  mediationDate: string;
  mediator?: string;
  outcome: 'success' | 'failed' | 'pending';
  agreementUrl?: string;
  summary?: string;
  tags?: string[];
}

/** 时间轴节点数据 */
export interface TimelineNodeData {
  eventDate: string;
  eventType: string;
  eventTitle: string;
  eventDescription?: string;
  relatedDocuments?: string[];
  tags?: string[];
}

/** 法律节点数据联合类型 */
export type LegalNodeData =
  | CaseNodeData
  | PersonNodeData
  | DocumentNodeData
  | HearingNodeData
  | MediationNodeData
  | TimelineNodeData;

/** 法律节点完整接口 */
export interface LegalNode extends LegalNodeBase {
  data: LegalNodeData;
}

/** 案件信息节点 */
export interface CaseNode extends LegalNodeBase {
  type: 'legal-case';
  data: CaseNodeData;
}

/** 人物关系节点 */
export interface PersonNode extends LegalNodeBase {
  type: 'legal-person';
  data: PersonNodeData;
}

/** 文档管理节点 */
export interface DocumentNode extends LegalNodeBase {
  type: 'legal-document';
  data: DocumentNodeData;
}

/** 庭审记录节点 */
export interface HearingNode extends LegalNodeBase {
  type: 'legal-hearing';
  data: HearingNodeData;
}

/** 调解记录节点 */
export interface MediationNode extends LegalNodeBase {
  type: 'legal-mediation';
  data: MediationNodeData;
}

/** 时间轴节点 */
export interface TimelineNode extends LegalNodeBase {
  type: 'legal-timeline';
  data: TimelineNodeData;
}

/** 节点更新事件 */
export interface NodeUpdateEvent {
  nodeId: string;
  updates: Partial<LegalNode>;
  timestamp: string;
  userId: string;
}

/** 节点删除事件 */
export interface NodeDeleteEvent {
  nodeId: string;
  timestamp: string;
  userId: string;
}

/** 类型守卫：检查是否为案件节点 */
export function isCaseNode(node: LegalNode): node is CaseNode {
  return node.type === 'legal-case';
}

/** 类型守卫：检查是否为人物节点 */
export function isPersonNode(node: LegalNode): node is PersonNode {
  return node.type === 'legal-person';
}

/** 类型守卫：检查是否为文档节点 */
export function isDocumentNode(node: LegalNode): node is DocumentNode {
  return node.type === 'legal-document';
}

/** 类型守卫：检查是否为庭审节点 */
export function isHearingNode(node: LegalNode): node is HearingNode {
  return node.type === 'legal-hearing';
}

/** 类型守卫：检查是否为调解节点 */
export function isMediationNode(node: LegalNode): node is MediationNode {
  return node.type === 'legal-mediation';
}

/** 类型守卫：检查是否为时间轴节点 */
export function isTimelineNode(node: LegalNode): node is TimelineNode {
  return node.type === 'legal-timeline';
}

