/**
 * 连接线类型定义
 * 
 * 定义了LegalMind法律工作台中所有连接线类型的TypeScript接口
 */

import { Position } from './legal-node';

/** 连接类型枚举 */
export type ConnectionType =
  | 'workflow'      // 工作流连接
  | 'relationship'  // 关系连接
  | 'reference'     // 引用连接
  | 'dependency'    // 依赖连接
  | 'collaboration';// 协作连接

/** 连接样式 */
export interface ConnectionStyle {
  color?: string;
  width?: number;
  dashArray?: string;
  animated?: boolean;
}

/** 连接标签 */
export interface ConnectionLabel {
  text: string;
  position?: 'start' | 'middle' | 'end';
  style?: {
    fontSize?: number;
    color?: string;
    backgroundColor?: string;
  };
}

/** 连接元数据 */
export interface ConnectionMetadata {
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/** 连接基础接口 */
export interface Connection {
  id: string;
  type: ConnectionType;
  sourceNodeId: string;
  targetNodeId: string;
  sourcePosition?: Position;
  targetPosition?: Position;
  style?: ConnectionStyle;
  label?: ConnectionLabel;
  metadata: ConnectionMetadata;
}

/** 连接更新事件 */
export interface ConnectionUpdateEvent {
  connectionId: string;
  updates: Partial<Connection>;
  timestamp: string;
  userId: string;
}

/** 连接删除事件 */
export interface ConnectionDeleteEvent {
  connectionId: string;
  timestamp: string;
  userId: string;
}

/** 类型守卫：检查是否为工作流连接 */
export function isWorkflowConnection(connection: Connection): boolean {
  return connection.type === 'workflow';
}

/** 类型守卫：检查是否为关系连接 */
export function isRelationshipConnection(connection: Connection): boolean {
  return connection.type === 'relationship';
}

/** 类型守卫：检查是否为引用连接 */
export function isReferenceConnection(connection: Connection): boolean {
  return connection.type === 'reference';
}

/** 类型守卫：检查是否为依赖连接 */
export function isDependencyConnection(connection: Connection): boolean {
  return connection.type === 'dependency';
}

/** 类型守卫：检查是否为协作连接 */
export function isCollaborationConnection(connection: Connection): boolean {
  return connection.type === 'collaboration';
}

