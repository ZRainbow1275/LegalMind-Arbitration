/**
 * 画布-案件映射接口
 * 
 * 定义画布与案件之间的映射关系和数据结构
 */

import { LegalNode, Connection, Viewport } from './legal-elements';

/**
 * 画布-案件映射
 */
export interface CaseCanvasMapping {
  /** 案件ID */
  caseId: string;
  
  /** 画布ID（通常与案件ID相同） */
  canvasId: string;
  
  /** 画布状态 */
  canvasState: CanvasState;
  
  /** 最后同步时间 */
  lastSyncedAt: Date;
  
  /** 创建时间 */
  createdAt: Date;
  
  /** 更新时间 */
  updatedAt: Date;
}

/**
 * 画布状态
 */
export interface CanvasState {
  /** 节点列表 */
  nodes: LegalNode[];
  
  /** 连接列表 */
  connections: Connection[];
  
  /** 视口状态 */
  viewport: Viewport;
  
  /** 元数据 */
  metadata: CanvasMetadata;
}

/**
 * 画布元数据
 */
export interface CanvasMetadata {
  /** 画布版本 */
  version: string;
  
  /** 最后编辑者 */
  lastEditedBy?: string;
  
  /** 编辑次数 */
  editCount: number;
  
  /** 自定义数据 */
  custom?: Record<string, any>;
}

/**
 * 画布保存选项
 */
export interface CanvasSaveOptions {
  /** 是否立即保存（否则使用防抖） */
  immediate?: boolean;
  
  /** 是否创建版本快照 */
  createSnapshot?: boolean;
  
  /** 保存描述 */
  description?: string;
}

/**
 * 画布加载选项
 */
export interface CanvasLoadOptions {
  /** 是否加载特定版本 */
  version?: string;
  
  /** 是否只加载元数据 */
  metadataOnly?: boolean;
}

/**
 * 画布同步状态
 */
export enum CanvasSyncStatus {
  /** 已同步 */
  SYNCED = 'synced',
  
  /** 同步中 */
  SYNCING = 'syncing',
  
  /** 有未保存的更改 */
  DIRTY = 'dirty',
  
  /** 同步失败 */
  ERROR = 'error',
  
  /** 离线 */
  OFFLINE = 'offline',
}

/**
 * 画布同步事件
 */
export interface CanvasSyncEvent {
  /** 事件类型 */
  type: 'save' | 'load' | 'sync' | 'error';
  
  /** 案件ID */
  caseId: string;
  
  /** 时间戳 */
  timestamp: Date;
  
  /** 状态 */
  status: CanvasSyncStatus;
  
  /** 错误信息 */
  error?: string;
  
  /** 额外数据 */
  data?: any;
}

