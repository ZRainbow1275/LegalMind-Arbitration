/**
 * 数据验证工具
 * 
 * 使用Zod进行数据验证，确保数据类型安全
 */

import { z } from 'zod';

// ==================== 基础验证 ====================

/** 位置验证 */
export const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

/** 尺寸验证 */
export const sizeSchema = z.object({
  width: z.number().positive('宽度必须大于0'),
  height: z.number().positive('高度必须大于0'),
});

/** 节点元数据验证 */
export const nodeMetadataSchema = z.object({
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string().min(1, '创建者不能为空'),
  version: z.number().int().positive('版本号必须为正整数'),
});

// ==================== 法律节点数据验证 ====================

/** 案件节点数据验证 */
export const caseNodeDataSchema = z.object({
  caseNumber: z.string().min(1, '案件编号不能为空').max(100, '案件编号过长'),
  caseName: z.string().min(1, '案件名称不能为空').max(200, '案件名称过长'),
  applicant: z.string().min(1, '申请人不能为空').max(100, '申请人名称过长'),
  respondent: z.string().min(1, '被申请人不能为空').max(100, '被申请人名称过长'),
  status: z.enum(['pending', 'in-progress', 'completed', 'archived'] as [string, ...string[]]),
  filingDate: z.string().optional(),
  hearingDate: z.string().optional(),
  description: z.string().max(1000, '描述过长').optional(),
  tags: z.array(z.string()).max(10, '标签数量不能超过10个').optional(),
});

/** 人物节点数据验证 */
export const personNodeDataSchema = z.object({
  name: z.string().min(1, '姓名不能为空').max(100, '姓名过长'),
  role: z.enum(['applicant', 'respondent', 'witness', 'expert', 'arbitrator', 'other'] as [string, ...string[]]),
  organization: z.string().max(200, '组织名称过长').optional(),
  contact: z.object({
    phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式错误').optional(),
    email: z.string().email('邮箱格式错误').optional(),
    address: z.string().max(500, '地址过长').optional(),
  }).optional(),
  description: z.string().max(1000, '描述过长').optional(),
  tags: z.array(z.string()).max(10, '标签数量不能超过10个').optional(),
});

/** 文档节点数据验证 */
export const documentNodeDataSchema = z.object({
  documentId: z.string().min(1, '文档ID不能为空'),
  documentName: z.string().min(1, '文档名称不能为空').max(200, '文档名称过长'),
  documentType: z.enum(['evidence', 'contract', 'ruling', 'other'] as [string, ...string[]]),
  fileUrl: z.string().url('文件URL格式错误').optional(),
  fileSize: z.number().positive('文件大小必须大于0').optional(),
  uploadDate: z.string().optional(),
  description: z.string().max(1000, '描述过长').optional(),
  tags: z.array(z.string()).max(10, '标签数量不能超过10个').optional(),
});

/** 庭审节点数据验证 */
export const hearingNodeDataSchema = z.object({
  hearingId: z.string().min(1, '庭审ID不能为空'),
  hearingDate: z.string().min(1, '庭审日期不能为空'),
  hearingType: z.enum(['preliminary', 'main', 'final', 'other'] as [string, ...string[]]),
  location: z.string().max(200, '地点过长').optional(),
  participants: z.array(z.string()).optional(),
  summary: z.string().max(2000, '摘要过长').optional(),
  recordingUrl: z.string().url('录音URL格式错误').optional(),
  transcriptUrl: z.string().url('笔录URL格式错误').optional(),
  tags: z.array(z.string()).max(10, '标签数量不能超过10个').optional(),
});

/** 调解节点数据验证 */
export const mediationNodeDataSchema = z.object({
  mediationId: z.string().min(1, '调解ID不能为空'),
  mediationDate: z.string().min(1, '调解日期不能为空'),
  mediator: z.string().max(100, '调解员名称过长').optional(),
  outcome: z.enum(['success', 'failed', 'pending'] as [string, ...string[]]),
  agreementUrl: z.string().url('协议URL格式错误').optional(),
  summary: z.string().max(2000, '摘要过长').optional(),
  tags: z.array(z.string()).max(10, '标签数量不能超过10个').optional(),
});

/** 时间轴节点数据验证 */
export const timelineNodeDataSchema = z.object({
  eventDate: z.string().min(1, '事件日期不能为空'),
  eventType: z.string().min(1, '事件类型不能为空').max(50, '事件类型过长'),
  eventTitle: z.string().min(1, '事件标题不能为空').max(200, '事件标题过长'),
  eventDescription: z.string().max(1000, '事件描述过长').optional(),
  relatedDocuments: z.array(z.string()).optional(),
  tags: z.array(z.string()).max(10, '标签数量不能超过10个').optional(),
});

// ==================== 法律节点验证 ====================

/** 法律节点验证 */
export const legalNodeSchema = z.object({
  id: z.string().uuid('节点ID格式错误'),
  type: z.enum([
    'legal-case',
    'legal-person',
    'legal-document',
    'legal-hearing',
    'legal-mediation',
    'legal-timeline',
  ] as [string, ...string[]]),
  position: positionSchema,
  size: sizeSchema.optional(),
  metadata: nodeMetadataSchema,
  data: z.any(), // 根据type动态验证
});

// ==================== 连接验证 ====================

/** 连接验证 */
export const connectionSchema = z.object({
  id: z.string().uuid('连接ID格式错误'),
  type: z.enum([
    'workflow',
    'relationship',
    'reference',
    'dependency',
    'collaboration',
  ] as [string, ...string[]]),
  sourceNodeId: z.string().uuid('源节点ID格式错误'),
  targetNodeId: z.string().uuid('目标节点ID格式错误'),
  sourcePosition: positionSchema.optional(),
  targetPosition: positionSchema.optional(),
  metadata: z.object({
    createdAt: z.string(),
    updatedAt: z.string(),
    createdBy: z.string().min(1, '创建者不能为空'),
  }),
});

// ==================== 画布验证 ====================

/** 视口验证 */
export const viewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number().min(0.1, '缩放比例不能小于0.1').max(5, '缩放比例不能大于5'),
});

/** 画布数据验证 */
export const canvasDataSchema = z.object({
  id: z.string().uuid('画布ID格式错误'),
  caseId: z.string().uuid('案件ID格式错误'),
  name: z.string().min(1, '画布名称不能为空').max(200, '画布名称过长'),
  description: z.string().max(1000, '描述过长').optional(),
  nodes: z.array(legalNodeSchema),
  connections: z.array(connectionSchema),
  viewport: viewportSchema,
  metadata: z.object({
    createdAt: z.string(),
    updatedAt: z.string(),
    createdBy: z.string().min(1, '创建者不能为空'),
    version: z.number().int().positive('版本号必须为正整数'),
  }),
});

// ==================== 验证函数 ====================

/** 验证画布数据 */
export function validateCanvasData(data: unknown) {
  return canvasDataSchema.parse(data);
}

/** 验证法律节点 */
export function validateLegalNode(node: unknown) {
  return legalNodeSchema.parse(node);
}

/** 验证连接 */
export function validateConnection(connection: unknown) {
  return connectionSchema.parse(connection);
}

/** 安全验证（不抛出错误） */
export function safeValidateCanvasData(data: unknown) {
  const result = canvasDataSchema.safeParse(data);
  return result.success ? result.data : null;
}

export function safeValidateLegalNode(node: unknown) {
  const result = legalNodeSchema.safeParse(node);
  return result.success ? result.data : null;
}

export function safeValidateConnection(connection: unknown) {
  const result = connectionSchema.safeParse(connection);
  return result.success ? result.data : null;
}

