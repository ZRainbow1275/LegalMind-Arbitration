// dev/src/app/api/cases/batch-import/[id]/route.ts
// 批量导入状态查询API端点

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { requireAuthenticatedUser, PermissionCheckers } from '@/lib/auth';
import { validatePathParams } from '@/lib/validation';
import { uuidSchema } from '@/lib/validation';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import type { BatchOperation } from '@/generated/prisma';

/**
 * 获取批量导入状态
 * GET /api/cases/batch-import/[id]
 * 需要认证和权限验证
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: false });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    // 验证路径参数
    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, { id: uuidSchema });
    if (!pathValidation.success) {
      return pathValidation.error;
    }

    const { id } = pathValidation.data;

    // 查询批量操作记录
    const batchOperation = await prisma.batchOperation.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                realName: true,
                companyName: true,
              },
            },
          },
        },
      },
    });

    if (!batchOperation) {
      return ErrorResponses.NOT_FOUND('批量操作记录');
    }

    // 检查访问权限
    if (batchOperation.createdBy !== authUser.id && !PermissionCheckers.isAdmin(authUser)) {
      return ErrorResponses.FORBIDDEN_MESSAGE('您没有查看此批量操作的权限');
    }

    // 计算执行时间
    const executionTime = batchOperation.completedAt && batchOperation.startedAt
      ? Math.round((batchOperation.completedAt.getTime() - batchOperation.startedAt.getTime()) / 1000)
      : batchOperation.startedAt
        ? Math.round((Date.now() - batchOperation.startedAt.getTime()) / 1000)
        : 0;

    // 构建响应数据
    const responseData = {
      batchOperation: {
        id: batchOperation.id,
        operationType: batchOperation.operationType,
        operationName: batchOperation.operationName,
        status: batchOperation.status,
        parameters: batchOperation.parameters,
        
        // 进度信息
        progress: {
          totalItems: batchOperation.totalItems,
          processedItems: batchOperation.processedItems,
          successItems: batchOperation.successItems,
          failedItems: batchOperation.failedItems,
          progressPercent: batchOperation.progressPercent,
        },
        
        // 时间信息
        timing: {
          createdAt: batchOperation.createdAt,
          startedAt: batchOperation.startedAt,
          completedAt: batchOperation.completedAt,
          executionTime: `${executionTime}秒`,
        },
        
        // 创建者信息
        creator: batchOperation.creator,
      },
      
      // 结果详情（仅在完成时返回）
      results: batchOperation.status === 'completed' ? batchOperation.results : null,
      
      // 错误日志（仅在失败时返回）
      errorLog: batchOperation.status === 'failed' ? batchOperation.errorLog : null,
      
      // 状态描述
      statusDescription: getStatusDescription(batchOperation.status),
      
      // 下一步操作建议
      nextActions: getNextActions(batchOperation),
    };

    return createSuccessResponse(responseData, '获取批量操作状态成功');

    } catch (error) {
      logger.error({ err: error }, '获取批量操作状态失败');
      return ErrorResponses.INTERNAL_ERROR();
    }
}

/**
 * 取消批量操作
 * DELETE /api/cases/batch-import/[id]
 * 需要认证和权限验证
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    // 验证路径参数
    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, { id: uuidSchema });
    if (!pathValidation.success) {
      return pathValidation.error;
    }

    const { id } = pathValidation.data;

    // 查询批量操作记录
    const batchOperation = await prisma.batchOperation.findUnique({
      where: { id },
    });

    if (!batchOperation) {
      return ErrorResponses.NOT_FOUND('批量操作记录');
    }

    // 检查权限
    if (batchOperation.createdBy !== authUser.id && !PermissionCheckers.isAdmin(authUser)) {
      return ErrorResponses.FORBIDDEN_MESSAGE('您没有取消此批量操作的权限');
    }

    // 检查状态是否可以取消
    if (!['pending', 'processing'].includes(batchOperation.status)) {
      return ErrorResponses.BAD_REQUEST('只能取消待处理或处理中的批量操作');
    }

    // 更新状态为已取消
    const updatedOperation = await prisma.batchOperation.update({
      where: { id },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
        errorLog: {
          reason: 'cancelled_by_user',
          cancelledBy: authUser.id,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return createSuccessResponse(
      { 
        batchOperationId: updatedOperation.id,
        status: updatedOperation.status,
      },
      '批量操作已取消'
    );

    } catch (error) {
      logger.error({ err: error }, '取消批量操作失败');
      return ErrorResponses.INTERNAL_ERROR();
    }
}

/**
 * 获取状态描述
 */
function getStatusDescription(status: string): string {
  const descriptions = {
    pending: '等待处理中...',
    processing: '正在处理文件，请稍候...',
    completed: '批量导入已完成',
    failed: '批量导入失败',
    cancelled: '批量导入已取消',
  };
  
  return descriptions[status as keyof typeof descriptions] || '未知状态';
}

/**
 * 获取下一步操作建议
 */
function getNextActions(batchOperation: Pick<BatchOperation, 'status' | 'failedItems'>): string[] {
  const actions: string[] = [];
  
  switch (batchOperation.status) {
    case 'pending':
      actions.push('请等待系统处理');
      break;
      
    case 'processing':
      actions.push('正在处理中，可以取消操作');
      actions.push('建议不要关闭浏览器');
      break;
      
    case 'completed':
      if (batchOperation.failedItems > 0) {
        actions.push('查看失败记录并修正数据');
        actions.push('可以重新导入失败的记录');
      }
      actions.push('查看导入的案件列表');
      actions.push('可以下载导入报告');
      break;
      
    case 'failed':
      actions.push('查看错误日志');
      actions.push('修正文件格式后重新导入');
      actions.push('联系技术支持');
      break;
      
    case 'cancelled':
      actions.push('可以重新开始导入');
      break;
  }
  
  return actions;
}

/**
 * 不支持的请求方法
 */
export async function POST() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}

export async function PUT() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}

export async function PATCH() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}
