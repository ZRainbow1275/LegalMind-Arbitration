// dev/src/lib/api-response.ts
// API响应格式标准化工具

import { NextResponse } from 'next/server';

/**
 * 标准API响应接口
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

/**
 * 分页参数接口
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * 分页信息接口
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function safeJsonStringify(value: unknown): string {
  return JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? v.toString() : v));
}

function jsonResponse<T>(data: T, init?: { status?: number; headers?: HeadersInit }): NextResponse<T> {
  return new NextResponse(safeJsonStringify(data), {
    status: init?.status ?? 200,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  }) as NextResponse<T>;
}

/**
 * 创建成功响应
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  meta?: Partial<ApiResponse['meta']>
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };

  return jsonResponse(response);
}

/**
 * 创建错误响应
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: unknown,
  status: number = 400
): NextResponse<ApiResponse> {
  const isProduction = process.env.NODE_ENV === 'production';
  const shouldHideDetails = isProduction && status >= 500;
  const safeMessage = shouldHideDetails ? '服务器内部错误' : message;
  const safeDetails = shouldHideDetails ? undefined : details;

  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message: safeMessage,
      details: safeDetails,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  return jsonResponse(response, { status });
}

/**
 * 创建分页响应
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginationInfo,
  message?: string
): NextResponse<ApiResponse<T[]>> {
  const response: ApiResponse<T[]> = {
    success: true,
    data,
    message,
    meta: {
      timestamp: new Date().toISOString(),
      pagination,
    },
  };

  return jsonResponse(response);
}

/**
 * 解析分页参数
 */
export function parsePaginationParams(searchParams: URLSearchParams): {
  page: number;
  limit: number;
} {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
  
  return { page, limit };
}

/**
 * 计算分页信息
 */
export function calculatePagination(
  total: number,
  page: number,
  limit: number
): PaginationInfo {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
  };
}

/**
 * 常用错误响应
 */
export const ErrorResponses = {
  // 认证相关错误
  UNAUTHORIZED: () => createErrorResponse('UNAUTHORIZED', '未授权访问', null, 401),
  UNAUTHORIZED_MESSAGE: (message: string, details?: unknown) =>
    createErrorResponse('UNAUTHORIZED', message, details, 401),
  FORBIDDEN: () => createErrorResponse('FORBIDDEN', '权限不足', null, 403),
  FORBIDDEN_MESSAGE: (message: string, details?: unknown) =>
    createErrorResponse('FORBIDDEN', message, details, 403),
  TOKEN_EXPIRED: () => createErrorResponse('TOKEN_EXPIRED', 'Token已过期', null, 401),
  INVALID_TOKEN: () => createErrorResponse('INVALID_TOKEN', '无效的Token', null, 401),
  CSRF_INVALID: () => createErrorResponse('CSRF_INVALID', 'CSRF验证失败', null, 403),
  MFA_REQUIRED: (details?: unknown) =>
    createErrorResponse('MFA_REQUIRED', '需要多因素认证验证码', details, 401),
  MFA_SETUP_REQUIRED: (details?: unknown) =>
    createErrorResponse('MFA_SETUP_REQUIRED', '需要先启用多因素认证', details, 403),
  MFA_INVALID: (details?: unknown) =>
    createErrorResponse('MFA_INVALID', '多因素认证验证码无效', details, 401),

  // 兼容：允许传入自定义消息的 500（历史代码使用）
  INTERNAL_SERVER_ERROR: (message?: string) =>
    createErrorResponse('INTERNAL_ERROR', message || '服务器内部错误', null, 500),

  // 服务可用性相关
  SERVICE_NOT_CONFIGURED: (service?: string) =>
    createErrorResponse(
      'SERVICE_NOT_CONFIGURED',
      `${service || '服务'}未配置或不可用`,
      null,
      503
    ),

  // 请求相关错误
  BAD_REQUEST: (details?: unknown) =>
    createErrorResponse('BAD_REQUEST', '请求参数错误', details, 400),
  BAD_REQUEST_MESSAGE: (message: string, details?: unknown) =>
    createErrorResponse('BAD_REQUEST', message, details, 400),
  NOT_FOUND: (resource?: string) => createErrorResponse('NOT_FOUND', `${resource || '资源'}不存在`, null, 404),
  METHOD_NOT_ALLOWED: () => createErrorResponse('METHOD_NOT_ALLOWED', '请求方法不被允许', null, 405),
  VALIDATION_ERROR: (details: unknown) =>
    createErrorResponse('VALIDATION_ERROR', '数据验证失败', details, 422),

  // 服务器错误
  INTERNAL_ERROR: () => createErrorResponse('INTERNAL_ERROR', '服务器内部错误', null, 500),
  DATABASE_ERROR: () => createErrorResponse('DATABASE_ERROR', '数据库操作失败', null, 500),
  
  // 业务逻辑错误
  DUPLICATE_RESOURCE: (resource?: string) => createErrorResponse('DUPLICATE_RESOURCE', `${resource || '资源'}已存在`, null, 409),
  RESOURCE_CONFLICT: (message: string) => createErrorResponse('RESOURCE_CONFLICT', message, null, 409),
  OPERATION_FAILED: (message: string) => createErrorResponse('OPERATION_FAILED', message, null, 400),
};

/**
 * 常用成功响应
 */
export const SuccessResponses = {
  CREATED: <T>(data: T, message?: string) => createSuccessResponse(data, message || '创建成功'),
  UPDATED: <T>(data: T, message?: string) => createSuccessResponse(data, message || '更新成功'),
  DELETED: (message?: string) => createSuccessResponse(null, message || '删除成功'),
  RETRIEVED: <T>(data: T, message?: string) => createSuccessResponse(data, message || '获取成功'),
};
