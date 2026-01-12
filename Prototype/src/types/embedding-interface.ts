/**
 * 嵌入接口类型定义
 * 
 * 定义工作台如何嵌入到不同业务模块中
 */

import type { CanvasData } from './canvas-elements';

// ==================== 业务模式 ====================

/**
 * 业务模式类型
 */
export type BusinessMode = 'hearing' | 'mediation' | 'document' | 'custom';

/**
 * 业务模式配置
 */
export interface BusinessModeConfig {
  mode: BusinessMode;
  title: string;
  description: string;
  icon: string;
  defaultTemplate?: string;
  enabledFeatures: {
    collaboration: boolean;
    comments: boolean;
    aiAssistant: boolean;
    export: boolean;
    import: boolean;
    templates: boolean;
  };
  customToolbar?: ToolbarConfig;
  customElements?: string[]; // 自定义元素类型
}

// ==================== 工具栏配置 ====================

export interface ToolbarConfig {
  position: 'top' | 'left' | 'right' | 'bottom';
  items: ToolbarItem[];
}

export interface ToolbarItem {
  id: string;
  type: 'button' | 'dropdown' | 'separator';
  label?: string;
  icon?: string;
  action?: string;
  items?: ToolbarItem[]; // 用于dropdown
  disabled?: boolean;
}

// ==================== 数据接口 ====================

/**
 * 业务数据接口
 * 所有业务数据都需要实现这个接口
 */
export interface BusinessData {
  id: string;
  type: BusinessMode;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/**
 * 庭审数据
 */
export interface HearingData extends BusinessData {
  type: 'hearing';
  caseId: string;
  hearingDate: string;
  participants: HearingParticipant[];
  evidences: Evidence[];
  timeline: TimelineEvent[];
  decisions: Decision[];
}

export interface HearingParticipant {
  id: string;
  name: string;
  role: 'plaintiff' | 'defendant' | 'arbitrator' | 'witness' | 'lawyer';
  organization?: string;
}

export interface Evidence {
  id: string;
  type: 'document' | 'physical' | 'testimony' | 'expert';
  title: string;
  description: string;
  submittedBy: string;
  submittedAt: string;
  fileUrl?: string;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: 'statement' | 'evidence_submission' | 'objection' | 'ruling';
  description: string;
  relatedParticipants: string[];
  relatedEvidences: string[];
}

export interface Decision {
  id: string;
  type: 'interim' | 'final';
  content: string;
  madeBy: string;
  madeAt: string;
}

export interface Mediator {
  id: string;
  name: string;
  organization?: string;
  certification?: string;
}

/**
 * 调解案件数据
 */
export interface MediationData extends BusinessData {
  type: 'mediation';
  caseId: string;
  mediator: Mediator;
  parties: MediationParty[];
  disputes: Dispute[];
  proposals: Proposal[];
  agreements: Agreement[];
}

export interface MediationParty {
  id: string;
  name: string;
  type: 'individual' | 'organization';
  interests: string[];
  concerns: string[];
}

export interface Dispute {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high';
  relatedParties: string[];
}

export interface Proposal {
  id: string;
  title: string;
  content: string;
  proposedBy: string;
  proposedAt: string;
  status: 'pending' | 'accepted' | 'rejected' | 'modified';
  relatedDisputes: string[];
}

export interface Agreement {
  id: string;
  title: string;
  content: string;
  agreedBy: string[];
  agreedAt: string;
  terms: AgreementTerm[];
}

export interface AgreementTerm {
  id: string;
  content: string;
  responsible: string;
  deadline?: string;
}

/**
 * 文书生成数据
 */
export interface DocumentData extends BusinessData {
  type: 'document';
  documentType: 'award' | 'order' | 'notice' | 'agreement';
  title: string;
  sections: DocumentSection[];
  references: DocumentReference[];
}

export interface DocumentSection {
  id: string;
  title: string;
  content: string;
  order: number;
  subsections?: DocumentSection[];
}

export interface DocumentReference {
  id: string;
  type: 'law' | 'case' | 'evidence' | 'agreement';
  title: string;
  content: string;
  url?: string;
}

// ==================== 数据适配器接口 ====================

/**
 * 数据适配器接口
 * 负责在业务数据和画布数据之间转换
 */
export interface DataAdapter<T extends BusinessData> {
  /**
   * 将业务数据转换为画布数据
   */
  toCanvas(businessData: T): CanvasData;

  /**
   * 将画布数据转换为业务数据
   */
  fromCanvas(canvasData: CanvasData): T;

  /**
   * 验证业务数据
   */
  validate(businessData: T): ValidationResult;

  /**
   * 获取适配器元数据
   */
  getMetadata(): AdapterMetadata;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

export interface AdapterMetadata {
  name: string;
  version: string;
  supportedBusinessMode: BusinessMode;
  description: string;
}

// ==================== 嵌入组件Props ====================

/**
 * 工作台嵌入组件的Props
 */
export interface LegalWorkspaceEmbedProps<T extends BusinessData = BusinessData> {
  // 业务模式
  mode: BusinessMode;

  // 业务数据
  data?: T;

  // 数据适配器
  adapter?: DataAdapter<T>;

  // 模式配置
  config?: Partial<BusinessModeConfig>;

  // 事件回调
  onSave?: (data: T) => void | Promise<void>;
  onExport?: (format: 'json' | 'png' | 'svg' | 'pdf') => void | Promise<void>;
  onImport?: (file: File) => void | Promise<void>;
  onChange?: (data: T) => void;
  onError?: (error: Error) => void;

  // 样式
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;

  // 功能开关
  readOnly?: boolean;
  showToolbar?: boolean;
  showSidebar?: boolean;

  // 初始视图
  initialViewport?: {
    x: number;
    y: number;
    zoom: number;
  };
}

// ==================== 导出接口 ====================

export interface ExportOptions {
  format: 'json' | 'png' | 'svg' | 'pdf';
  quality?: number; // 用于图片导出
  scale?: number; // 用于图片导出
  includeMetadata?: boolean;
  includeComments?: boolean;
}

export interface ExportResult {
  success: boolean;
  data?: Blob | string;
  error?: string;
}

// ==================== 导入接口 ====================

export interface ImportOptions {
  format: 'json' | 'image';
  merge?: boolean; // 是否合并到现有画布
  position?: { x: number; y: number }; // 导入位置
}

export interface ImportResult {
  success: boolean;
  data?: CanvasData;
  error?: string;
}

