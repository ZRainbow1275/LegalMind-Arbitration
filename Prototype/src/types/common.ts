/**
 * 通用类型定义
 * 
 * 定义了LegalMind法律工作台中通用的TypeScript接口和类型
 */

/** 用户信息 */
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'arbitrator' | 'lawyer' | 'assistant' | 'viewer';
}

/** 案件信息 */
export interface Case {
  id: string;
  caseNumber: string;
  caseName: string;
  applicant: string;
  respondent: string;
  status: 'pending' | 'in-progress' | 'completed' | 'archived';
  filingDate: string;
  hearingDate?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

/** API响应 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

/** 分页参数 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 文件信息 */
export interface FileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
}

/** 权限 */
export type Permission = 'read' | 'write' | 'delete' | 'admin';

/** 权限配置 */
export interface PermissionConfig {
  userId: string;
  permissions: Permission[];
}

/** 通知 */
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

/** 加载状态 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/** 异步数据状态 */
export interface AsyncDataState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

