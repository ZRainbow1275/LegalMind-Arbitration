// dev/src/app/api/integrations/external-systems/route.ts
// 外部系统集成API端点 - 公证系统/法院数据系统/法律数据库（禁止 Mock，未配置/未实现显式失败）

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser } from '@/lib/auth';
import { validateRequestBody } from '@/lib/validation';
import { createErrorResponse, createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import {
  externalSystemInvocationContextSchema,
  getExternalSystemManager,
  type ExternalSystemInvocationContext,
  type ExternalSystemKey,
  type ExternalSystemResponse,
} from '@/lib/external-systems';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { appendCaseEvent, getTraceId } from '@/lib/case-events';
import { Role } from '@/generated/prisma';

// 外部系统集成请求Schema
const externalSystemRequestSchema = z.object({
  system: z.enum(['courtSystem', 'notarySystem', 'legalDatabase']),
  action: z.string().min(1).max(100),
  context: externalSystemInvocationContextSchema,
  credentials: z.object({
    apiKey: z.string().min(1).max(2000).optional(),
    token: z.string().min(1).max(4000).optional(),
    certificateId: z.string().min(1).max(200).optional(),
  }).strict().optional(),
}).strict();

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function getSystemPermissionKey(system: ExternalSystemKey): string {
  return `${system}Access`;
}

function hasPermissionFlag(permissions: unknown, key: string): boolean {
  if (!isPlainObject(permissions)) return false;
  return permissions[key] === true;
}

function mergePermissionFlags(
  userRoles: Array<{ permissions: unknown }>
): Record<string, boolean> {
  const merged: Record<string, boolean> = {};
  for (const role of userRoles) {
    if (!isPlainObject(role.permissions)) continue;
    for (const [key, value] of Object.entries(role.permissions)) {
      if (typeof value === 'boolean') merged[key] = value;
    }
  }
  return merged;
}

function summarizeParameters(parameters: unknown): Record<string, unknown> | null {
  if (typeof parameters === 'undefined') return null;
  if (parameters === null) return { type: 'null' };
  if (typeof parameters === 'string') return { type: 'string', length: parameters.length };
  if (typeof parameters === 'number') return { type: 'number' };
  if (typeof parameters === 'boolean') return { type: 'boolean' };
  if (Array.isArray(parameters)) return { type: 'array', length: parameters.length };
  if (isPlainObject(parameters)) {
    const keys = Object.keys(parameters);
    return {
      type: 'object',
      keyCount: keys.length,
      keys: keys.slice(0, 50),
      truncated: keys.length > 50,
    };
  }
  return { type: typeof parameters };
}

function summarizeContext(context: ExternalSystemInvocationContext) {
  return {
    caseId: context.caseId ?? null,
    documentId: context.documentId ?? null,
    targetSystem: context.targetSystem ?? null,
    parameters: summarizeParameters(context.parameters),
  };
}

function mapExternalSystemError(
  response: ExternalSystemResponse<unknown>,
  traceId: string,
  system: ExternalSystemKey,
  action: string
) {
  const details = {
    traceId,
    system,
    action,
    errorCode: response.errorCode ?? null,
    systemInfo: response.systemInfo ?? null,
  };

  switch (response.errorCode) {
    case 'SERVICE_NOT_CONFIGURED':
      return createErrorResponse(
        'SERVICE_NOT_CONFIGURED',
        response.error || '外部系统未配置或未启用',
        details,
        503
      );
    case 'INVALID_REQUEST':
      return createErrorResponse(
        'BAD_REQUEST',
        response.error || '外部系统请求参数错误',
        details,
        400
      );
    case 'UPSTREAM_ERROR':
      return createErrorResponse(
        'UPSTREAM_ERROR',
        response.error || '外部系统调用失败',
        details,
        502
      );
    default:
      return createErrorResponse(
        'OPERATION_FAILED',
        response.error || '外部系统调用失败',
        details,
        500
      );
  }
}

async function resolveDocumentCaseId(documentId: string) {
  return prisma.caseDocument.findUnique({
    where: { id: documentId },
    select: { id: true, caseId: true },
  });
}

function canBypassCaseAccess(user: { roles: Role[] }): boolean {
  return (
    user.roles.includes(Role.ADMIN)
    || user.roles.includes(Role.ARBITRATOR)
    || user.roles.includes(Role.MEDIATOR)
  );
}

async function enforceContextAccess(
  authUser: { id: string; roles: Role[] },
  context: ExternalSystemInvocationContext
): Promise<
  | { ok: true; caseId: string | null }
  | {
      ok: false;
      response:
        | ReturnType<typeof ErrorResponses.BAD_REQUEST_MESSAGE>
        | ReturnType<typeof ErrorResponses.FORBIDDEN_MESSAGE>
        | ReturnType<typeof ErrorResponses.NOT_FOUND>;
    }
> {
  if (!context.caseId && !context.documentId) return { ok: true, caseId: null };

  if (context.caseId && context.documentId) {
    const doc = await resolveDocumentCaseId(context.documentId);
    if (!doc) return { ok: false, response: ErrorResponses.NOT_FOUND('文档') };
    if (doc.caseId !== context.caseId) {
      return {
        ok: false,
        response: ErrorResponses.BAD_REQUEST_MESSAGE('documentId 不属于指定 caseId'),
      };
    }
  }

  let caseId = context.caseId ?? null;
  if (!caseId && context.documentId) {
    const doc = await resolveDocumentCaseId(context.documentId);
    if (!doc) return { ok: false, response: ErrorResponses.NOT_FOUND('文档') };
    caseId = doc.caseId;
  }

  if (!caseId) return { ok: true, caseId: null };
  if (canBypassCaseAccess(authUser)) return { ok: true, caseId };

  const membership = await prisma.caseParticipant.findFirst({
    where: { caseId, userId: authUser.id, isActive: true },
    select: { id: true },
  });
  if (membership) return { ok: true, caseId };

  const arbitrationCase = await prisma.arbitrationCase.findUnique({
    where: { id: caseId },
    select: { id: true, applicantId: true, respondentId: true },
  });
  if (!arbitrationCase) return { ok: false, response: ErrorResponses.NOT_FOUND('案件') };

  const isParty =
    arbitrationCase.applicantId === authUser.id
    || arbitrationCase.respondentId === authUser.id;

  if (!isParty) {
    return { ok: false, response: ErrorResponses.FORBIDDEN_MESSAGE('无权访问该案件') };
  }

  return { ok: true, caseId };
}

/**
 * 外部系统集成服务
 * POST /api/integrations/external-systems
 * 为公证系统和法院数据系统接入提供统一接口
 */
export async function POST(request: NextRequest) {
  const traceId = getTraceId(request.headers);
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || undefined;

  let actorUserId: string | null = null;
  let actorEmail: string | null = null;
  let systemKey: ExternalSystemKey | null = null;
  let actionKey: string | null = null;
  let caseId: string | null = null;

  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;
    actorUserId = authUser.id;
    actorEmail = authUser.email;

    const validation = await validateRequestBody(request, externalSystemRequestSchema);
    if (!validation.success) return validation.error;

    const { system, action, context } = validation.data;
    systemKey = system;
    actionKey = action;

    const userRoles = await prisma.userRole.findMany({
      where: { userId: authUser.id, isActive: true },
      select: { permissions: true },
    });

    const systemPermissionKey = getSystemPermissionKey(system);
    const hasSystemAccess = userRoles.some((role) =>
      hasPermissionFlag(role.permissions, systemPermissionKey)
    );

    if (!hasSystemAccess) {
      await AuditLogger.log({
        level: AuditLevel.WARNING,
        eventType: AuditEventType.PERMISSION_DENIED,
        userId: authUser.id,
        userName: authUser.email,
        ipAddress,
        userAgent,
        resource: 'integrations/external-systems',
        action: `${system}:${action}`,
        details: {
          traceId,
          system,
          action,
          reason: 'missing_system_permission',
          requiredPermissionKey: systemPermissionKey,
        },
        result: 'FAILURE',
        errorMessage: `Missing permission: ${systemPermissionKey}`,
      });

      return ErrorResponses.FORBIDDEN_MESSAGE(`您没有${system}访问权限`);
    }

    const accessCheck = await enforceContextAccess(authUser, context);
    if (!accessCheck.ok) {
      await AuditLogger.log({
        level: AuditLevel.WARNING,
        eventType: AuditEventType.PERMISSION_DENIED,
        userId: authUser.id,
        userName: authUser.email,
        ipAddress,
        userAgent,
        resource: 'integrations/external-systems',
        action: `${system}:${action}`,
        details: {
          traceId,
          system,
          action,
          reason: 'context_access_denied',
          context: summarizeContext(context),
        },
        result: 'FAILURE',
      });
      return accessCheck.response;
    }
    caseId = accessCheck.caseId;

    const externalSystemManager = getExternalSystemManager();

    let integrationResponse: ExternalSystemResponse<unknown>;
    switch (system) {
      case 'courtSystem':
        integrationResponse = await externalSystemManager.integrateCourtSystem(action, context);
        break;
      case 'notarySystem':
        integrationResponse = await externalSystemManager.integrateNotarySystem(action, context);
        break;
      case 'legalDatabase':
        integrationResponse = await externalSystemManager.integrateLegalDatabase(action, context);
        break;
      default:
        return ErrorResponses.BAD_REQUEST_MESSAGE('不支持的外部系统');
    }

    await AuditLogger.log({
      level: integrationResponse.success ? AuditLevel.INFO : AuditLevel.ERROR,
      eventType: AuditEventType.EXTERNAL_SYSTEM_INVOCATION,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress,
      userAgent,
      resource: 'integrations/external-systems',
      action: `${system}:${action}`,
      details: {
        traceId,
        system,
        action,
        context: summarizeContext(context),
        errorCode: integrationResponse.errorCode ?? null,
        systemInfo: integrationResponse.systemInfo ?? null,
      },
      result: integrationResponse.success ? 'SUCCESS' : 'FAILURE',
      errorMessage: integrationResponse.success ? undefined : integrationResponse.error,
    });

    if (caseId) {
      await appendCaseEvent({
        caseId,
        eventType: integrationResponse.success
          ? 'EXTERNAL_SYSTEM_INVOKED'
          : 'EXTERNAL_SYSTEM_INVOKE_FAILED',
        actorUserId: authUser.id,
        traceId,
        payload: {
          system,
          action,
          errorCode: integrationResponse.errorCode ?? null,
          systemRequestId: integrationResponse.systemInfo?.requestId ?? null,
        },
      });
    }

    if (!integrationResponse.success) {
      return mapExternalSystemError(integrationResponse, traceId, system, action);
    }

    return createSuccessResponse(
      {
        system,
        action,
        data: integrationResponse.data ?? null,
        systemInfo: integrationResponse.systemInfo ?? null,
        traceId,
      },
      '外部系统集成成功'
    );

  } catch (error) {
    logger.error({ err: error, traceId }, '外部系统集成失败');

    if (actorUserId && systemKey && actionKey) {
      await AuditLogger.log({
        level: AuditLevel.ERROR,
        eventType: AuditEventType.EXTERNAL_SYSTEM_INVOCATION,
        userId: actorUserId,
        userName: actorEmail ?? undefined,
        ipAddress,
        userAgent,
        resource: 'integrations/external-systems',
        action: `${systemKey}:${actionKey}`,
        details: {
          traceId,
          system: systemKey,
          action: actionKey,
          caseId,
          error: error instanceof Error ? error.message : String(error),
        },
        result: 'FAILURE',
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }

    return ErrorResponses.INTERNAL_ERROR();
  }
}

/**
 * 获取系统集成状态
 * GET /api/integrations/external-systems
 */
export async function GET(request: NextRequest) {
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: false });     
    if (!guard.ok) return guard.response;
    const authUser = guard.user;
    const traceId = getTraceId(request.headers);
    const checkedAt = new Date().toISOString();
    const includeEndpoint = authUser.roles.includes(Role.OPS_ADMIN);

    // 获取外部系统管理器
    const externalSystemManager = getExternalSystemManager();

    // 获取系统状态
    const systemStatus = externalSystemManager.getSystemStatus();

    // 测试系统连接
    const connectionTests = await externalSystemManager.testConnections();      

    // 获取用户的外部系统权限
    const userRoles = await prisma.userRole.findMany({
      where: { userId: authUser.id, isActive: true },
      select: { permissions: true },
    });

    const permissions = mergePermissionFlags(userRoles);

    // 构建响应数据
    const systemsStatus = {
      courtSystem: {
        enabled: systemStatus.courtSystem.enabled && (permissions.courtSystemAccess || false),
        configured: systemStatus.courtSystem.configured,
        connected: connectionTests.courtSystem || false,
        name: systemStatus.courtSystem.name,
        endpoint: includeEndpoint ? systemStatus.courtSystem.endpoint ?? null : null,
        checkedAt,
        availableActions: ['notify_court', 'query_case', 'submit_documents', 'check_status'],
      },
      notarySystem: {
        enabled: systemStatus.notarySystem.enabled && (permissions.notarySystemAccess || false),
        configured: systemStatus.notarySystem.configured,
        connected: connectionTests.notarySystem || false,
        name: systemStatus.notarySystem.name,
        endpoint: includeEndpoint ? systemStatus.notarySystem.endpoint ?? null : null,
        checkedAt,
        availableActions: ['apply_notarization', 'check_notary_status', 'download_certificate'],
      },
      legalDatabase: {
        enabled: systemStatus.legalDatabase.enabled && (permissions.legalDatabaseAccess || false),
        configured: systemStatus.legalDatabase.configured,
        connected: connectionTests.legalDatabase || false,
        name: systemStatus.legalDatabase.name,
        endpoint: includeEndpoint ? systemStatus.legalDatabase.endpoint ?? null : null,
        checkedAt,
        availableActions: ['search_laws', 'search_precedents', 'search_regulations', 'comprehensive_search'],
      },
    };

    // 添加总体统计
    const totalSystems = Object.keys(systemsStatus).length;
    const enabledSystems = Object.values(systemsStatus).filter(s => s.enabled).length;
    const connectedSystems = Object.values(systemsStatus).filter(s => s.connected).length;

    const responseData = {
      systems: systemsStatus,
      summary: {
        totalSystems,
        enabledSystems,
        connectedSystems,
        healthScore: Math.round((connectedSystems / totalSystems) * 100),
      },
      lastUpdated: checkedAt,
      traceId,
    };

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.EXTERNAL_SYSTEM_STATUS_VIEWED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'integrations/external-systems',
      action: 'status',
      details: {
        traceId,
        systems: {
          courtSystem: {
            enabled: systemsStatus.courtSystem.enabled,
            configured: systemsStatus.courtSystem.configured,
            connected: systemsStatus.courtSystem.connected,
          },
          notarySystem: {
            enabled: systemsStatus.notarySystem.enabled,
            configured: systemsStatus.notarySystem.configured,
            connected: systemsStatus.notarySystem.connected,
          },
          legalDatabase: {
            enabled: systemsStatus.legalDatabase.enabled,
            configured: systemsStatus.legalDatabase.configured,
            connected: systemsStatus.legalDatabase.connected,
          },
        },
      },
      result: 'SUCCESS',
    });

    return createSuccessResponse(responseData, '获取外部系统状态成功');

  } catch (error) {
    logger.error({ err: error }, '获取外部系统状态失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

/**
 * 不支持的请求方法
 */
export async function PUT() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}

export async function DELETE() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}

export async function PATCH() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}
