// dev/src/app/api/auth/me/route.ts
// 获取当前用户信息API端点

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { computeUserCapabilities, type PlatformRoleKey } from '@/lib/capabilities';
import { logger } from '@/lib/logger';
import { Role } from '@/generated/prisma';

/**
 * 获取当前用户信息
 * GET /api/auth/me
 * 需要认证
 */
export async function GET(request: NextRequest) {
  try {
    // 获取认证用户
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return ErrorResponses.UNAUTHORIZED();
    }

    // 查询用户完整信息
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: {
        roles: true,
        profile: true,
        mfa: true,
        applicantCases: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5, // 最近5个案件
        },
        respondentCases: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5, // 最近5个案件
        },
      },
    });

    if (!user) {
      return ErrorResponses.NOT_FOUND('用户');
    }

    // 平台角色（仅 active）与能力点下发（UI 以此决定可见入口）
    const activeRoles = user.roles.filter((r) => r.isActive).map((r) => r.role);
    const platformRoles = activeRoles as unknown as PlatformRoleKey[];
    const capabilities = computeUserCapabilities(platformRoles);

    const mfaEnabled = Boolean(user.mfa?.enabled);
    const mfaRequired = activeRoles.includes(Role.ADMIN) || activeRoles.includes(Role.OPS_ADMIN);

    // 获取用户权限配置（历史字段：用于旧逻辑兼容；严禁作为唯一授权事实）
    const permissions = user.roles.reduce<Record<string, unknown>>((acc, role) => {
      if (role.permissions && typeof role.permissions === 'object' && !Array.isArray(role.permissions)) {
        return { ...acc, ...(role.permissions as Record<string, unknown>) };
      }
      return acc;
    }, {});

    // 统计用户案件数量
    const caseStats = {
      totalAsApplicant: user.applicantCases.length,
      totalAsRespondent: user.respondentCases.length,
      recentCases: [
        ...user.applicantCases.map(c => ({ ...c, userRole: 'applicant' })),
        ...user.respondentCases.map(c => ({ ...c, userRole: 'respondent' })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
    };

    // 返回用户信息
    const responseData = {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        userType: user.userType,
        status: user.status,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        roles: user.roles.map(r => ({
          role: r.role,
          isActive: r.isActive,
          assignedAt: r.assignedAt,
        })),
        profile: user.profile ? {
          id: user.profile.id,
          profileType: user.profile.profileType,
          realName: user.profile.realName,
          idNumber: user.profile.idNumber ? '***********' + user.profile.idNumber.slice(-4) : null, // 脱敏处理
          companyName: user.profile.companyName,
          businessLicense: user.profile.businessLicense,
          legalRepresentative: user.profile.legalRepresentative,
          companyAddress: user.profile.companyAddress,
          verificationStatus: user.profile.verificationStatus,
          verifiedAt: user.profile.verifiedAt,
        } : null,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        mfaEnabled,
        mfaRequired,
      },
      // 案件统计
      caseStats,
      platformRoles,
      capabilities,
      // AI系统集成信息
      integrations: {
        aiAssistantEnabled: permissions['aiAssistant'] === true,
        availableServices: [
          ...(permissions['documentOCR'] === true ? ['OCR'] : []),
          ...(permissions['voiceRecognition'] === true ? ['VOICE_RECOGNITION'] : []),
          ...(permissions['smartRecommendation'] === true ? ['SMART_RECOMMENDATION'] : []),
        ],
        // 外部系统集成状态
        externalSystems: {
          courtSystem: {
            enabled: permissions['courtSystemAccess'] === true,
            status: permissions['courtSystemAccess'] === true ? 'active' : 'pending_approval'
          },
          notarySystem: {
            enabled: permissions['notarySystemAccess'] === true,
            status: permissions['notarySystemAccess'] === true ? 'active' : 'pending_approval'
          },
          legalDatabase: {
            enabled: permissions['legalDatabaseAccess'] === true,
            status: permissions['legalDatabaseAccess'] === true ? 'active' : 'pending_approval'
          },
        },
      },
      // 用户权限详情
      permissions,
    };

    return createSuccessResponse(responseData, '获取用户信息成功');

  } catch (error) {
    logger.error({ err: error }, '获取用户信息失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
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

export async function DELETE() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}

export async function PATCH() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}
