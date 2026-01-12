/**
 * 法律元素类型定义
 * 
 * 这个文件定义了所有法律专用的Plait元素类型
 * 遵循Plait的元素接口规范
 */

import { PlaitElement, Point } from '@plait/core';
import { PlaitCommonGeometry } from '@plait/draw';

// ==================== 基础类型 ====================

/**
 * 法律节点的基础形状类型
 */
export enum LegalNodeShapes {
  case = 'legal-case',           // 案件信息
  person = 'legal-person',       // 当事人
  document = 'legal-document',   // 文档证据
  hearing = 'legal-hearing',     // 庭审安排
  mediation = 'legal-mediation', // 调解记录
  timeline = 'legal-timeline',   // 时间轴
}

/**
 * 节点状态
 */
export type NodeStatus = 'pending' | 'active' | 'completed' | 'cancelled';

/**
 * 连接类型
 */
export type ConnectionType = 'related-to' | 'depends-on' | 'conflicts-with' | 'supports' | 'references';

/**
 * 连接
 */
export interface Connection {
  id: string;
  source: string;      // 源节点ID
  target: string;      // 目标节点ID
  type: ConnectionType;
  label?: string;
}

/**
 * 视口
 */
export interface Viewport {
  zoom: number;
  x: number;
  y: number;
  origination?: [number, number];  // Plait格式的origination
}

// ==================== 元数据类型 ====================

/**
 * 案件信息元数据
 */
export interface CaseInfoMetadata {
  caseNumber: string;
  caseType: string;
  filingDate: string;
  amount?: string;
  court?: string;
}

/**
 * 当事人元数据
 */
export interface PersonMetadata {
  role: string;
  company?: string;
  representative?: string;
  contact?: string;
}

/**
 * 文档证据元数据
 */
export interface DocumentMetadata {
  // 基本信息
  documentId: string;           // 文档ID
  fileName: string;             // 文件名
  originalName: string;         // 原始文件名
  fileSize: number;             // 文件大小（字节）
  fileType: string;             // 文件类型（pdf, doc, docx等）
  mimeType?: string;            // MIME类型

  // 文档分类
  documentType: string;         // 文档类型（申请书、证据、答辩书等）
  category?: string;            // 分类
  tags: string[];               // 标签

  // 上传信息
  uploadedBy: string;           // 上传者ID
  uploadedByName?: string;      // 上传者姓名
  uploadDate: string;           // 上传日期

  // 访问控制
  isPublic: boolean;            // 是否公开
  accessLevel: string;          // 访问级别

  // 文件URL
  fileUrl?: string;             // 文件URL
  previewUrl?: string;          // 预览URL
  downloadUrl?: string;         // 下载URL
  thumbnailUrl?: string;        // 缩略图URL

  // 版本控制
  version?: number;             // 版本号
  parentDocumentId?: string;    // 父文档ID

  // 其他
  description?: string;         // 描述
}

/**
 * 庭审安排元数据
 */
export interface HearingMetadata {
  hearingDate: string;
  hearingTime: string;
  location: string;
  arbitrators?: string[];
}

/**
 * 调解记录元数据
 */
export interface MediationMetadata {
  mediationDate: string;
  mediator: string;
  result: string;
  agreement?: string;
}

/**
 * 时间轴元数据
 */
export interface TimelineMetadata {
  eventDate: string;
  eventType: string;
  description: string;
}

// ==================== Plait元素类型 ====================

/**
 * 法律节点的基础接口
 * 继承自PlaitCommonGeometry，添加法律业务字段
 */
export interface LegalNodeBase extends Omit<PlaitCommonGeometry, 'shape'> {
  id: string;
  shape: LegalNodeShapes;
  // 法律业务数据
  title: string;
  description: string;
  status: NodeStatus;
  metadata: CaseInfoMetadata | PersonMetadata | DocumentMetadata | HearingMetadata | MediationMetadata | TimelineMetadata;
  connections: string[]; // 连接的其他节点ID
}

/**
 * 案件信息节点
 */
export interface LegalCaseNode extends LegalNodeBase {
  shape: LegalNodeShapes.case;
  metadata: CaseInfoMetadata;
}

/**
 * 当事人节点
 */
export interface LegalPersonNode extends LegalNodeBase {
  shape: LegalNodeShapes.person;
  metadata: PersonMetadata;
}

/**
 * 文档证据节点
 */
export interface LegalDocumentNode extends LegalNodeBase {
  shape: LegalNodeShapes.document;
  metadata: DocumentMetadata;
}

/**
 * 庭审安排节点
 */
export interface LegalHearingNode extends LegalNodeBase {
  shape: LegalNodeShapes.hearing;
  metadata: HearingMetadata;
}

/**
 * 调解记录节点
 */
export interface LegalMediationNode extends LegalNodeBase {
  shape: LegalNodeShapes.mediation;
  metadata: MediationMetadata;
}

/**
 * 时间轴节点
 */
export interface LegalTimelineNode extends LegalNodeBase {
  shape: LegalNodeShapes.timeline;
  metadata: TimelineMetadata;
}

/**
 * 所有法律节点的联合类型
 */
export type LegalNode =
  | LegalCaseNode
  | LegalPersonNode
  | LegalDocumentNode
  | LegalHearingNode
  | LegalMediationNode
  | LegalTimelineNode;

// ==================== 类型守卫 ====================

/**
 * 检查是否为法律节点
 */
export function isLegalNode(element: PlaitElement): element is LegalNode {
  return element.type === 'geometry' &&
    Object.values(LegalNodeShapes).includes((element as any).shape);
}

/**
 * 检查是否为案件信息节点
 */
export function isLegalCaseNode(element: PlaitElement): element is LegalCaseNode {
  return isLegalNode(element) && element.shape === LegalNodeShapes.case;
}

/**
 * 检查是否为当事人节点
 */
export function isLegalPersonNode(element: PlaitElement): element is LegalPersonNode {
  return isLegalNode(element) && element.shape === LegalNodeShapes.person;
}

/**
 * 检查是否为文档证据节点
 */
export function isLegalDocumentNode(element: PlaitElement): element is LegalDocumentNode {
  return isLegalNode(element) && element.shape === LegalNodeShapes.document;
}

/**
 * 检查是否为庭审安排节点
 */
export function isLegalHearingNode(element: PlaitElement): element is LegalHearingNode {
  return isLegalNode(element) && element.shape === LegalNodeShapes.hearing;
}

/**
 * 检查是否为调解记录节点
 */
export function isLegalMediationNode(element: PlaitElement): element is LegalMediationNode {
  return isLegalNode(element) && element.shape === LegalNodeShapes.mediation;
}

/**
 * 检查是否为时间轴节点
 */
export function isLegalTimelineNode(element: PlaitElement): element is LegalTimelineNode {
  return isLegalNode(element) && element.shape === LegalNodeShapes.timeline;
}

// ==================== 工厂函数 ====================

/**
 * 创建案件信息节点
 */
export function createLegalCaseNode(
  points: [Point, Point],
  data: {
    title: string;
    description: string;
    metadata: CaseInfoMetadata;
  }
): LegalCaseNode {
  return {
    id: `case-${Date.now()}`,
    type: 'geometry',
    shape: LegalNodeShapes.case,
    points,
    angle: 0,
    opacity: 1,
    strokeColor: '#FF6B35',
    strokeWidth: 2,
    fill: '#FFF5F2',
    title: data.title,
    description: data.description,
    status: 'active',
    metadata: data.metadata,
    connections: [],
  };
}

/**
 * 创建当事人节点
 */
export function createLegalPersonNode(
  points: [Point, Point],
  data: {
    title: string;
    description: string;
    metadata: PersonMetadata;
  }
): LegalPersonNode {
  return {
    id: `person-${Date.now()}`,
    type: 'geometry',
    shape: LegalNodeShapes.person,
    points,
    angle: 0,
    opacity: 1,
    strokeColor: '#FF6B35',
    strokeWidth: 2,
    fill: '#FFF5F2',
    title: data.title,
    description: data.description,
    status: 'active',
    metadata: data.metadata,
    connections: [],
  };
}

/**
 * 创建文档证据节点
 */
export function createLegalDocumentNode(
  points: [Point, Point],
  data: {
    title: string;
    description: string;
    metadata: DocumentMetadata;
  }
): LegalDocumentNode {
  return {
    id: `document-${Date.now()}`,
    type: 'geometry',
    shape: LegalNodeShapes.document,
    points,
    angle: 0,
    opacity: 1,
    strokeColor: '#FF6B35',
    strokeWidth: 2,
    fill: '#FFF5F2',
    title: data.title,
    description: data.description,
    status: 'active',
    metadata: data.metadata,
    connections: [],
  };
}

/**
 * 创建庭审安排节点
 */
export function createLegalHearingNode(
  points: [Point, Point],
  data: {
    title: string;
    description: string;
    metadata: HearingMetadata;
  }
): LegalHearingNode {
  return {
    id: `hearing-${Date.now()}`,
    type: 'geometry',
    shape: LegalNodeShapes.hearing,
    points,
    angle: 0,
    opacity: 1,
    strokeColor: '#FF6B35',
    strokeWidth: 2,
    fill: '#FFF5F2',
    title: data.title,
    description: data.description,
    status: 'active',
    metadata: data.metadata,
    connections: [],
  };
}

/**
 * 创建调解记录节点
 */
export function createLegalMediationNode(
  points: [Point, Point],
  data: {
    title: string;
    description: string;
    metadata: MediationMetadata;
  }
): LegalMediationNode {
  return {
    id: `mediation-${Date.now()}`,
    type: 'geometry',
    shape: LegalNodeShapes.mediation,
    points,
    angle: 0,
    opacity: 1,
    strokeColor: '#FF6B35',
    strokeWidth: 2,
    fill: '#FFF5F2',
    title: data.title,
    description: data.description,
    status: 'active',
    metadata: data.metadata,
    connections: [],
  };
}

/**
 * 创建时间轴节点
 */
export function createLegalTimelineNode(
  points: [Point, Point],
  data: {
    title: string;
    description: string;
    metadata: TimelineMetadata;
  }
): LegalTimelineNode {
  return {
    id: `timeline-${Date.now()}`,
    type: 'geometry',
    shape: LegalNodeShapes.timeline,
    points,
    angle: 0,
    opacity: 1,
    strokeColor: '#FF6B35',
    strokeWidth: 2,
    fill: '#FFF5F2',
    title: data.title,
    description: data.description,
    status: 'active',
    metadata: data.metadata,
    connections: [],
  };
}

