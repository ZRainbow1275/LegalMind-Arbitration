// dev/src/app/api/identity/verify/route.ts
// 身份核验提交接口：提交个人/企业认证材料，进入待审核状态
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getAuthenticatedUser } from '@/lib/auth';
import { validateRequestBody } from '@/lib/validation';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { CSRFProtection } from '@/lib/security/middleware';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { ProfileType, VerificationStatus, type Prisma } from '@/generated/prisma';

const verifyIdentitySchema = z
  .object({
    profileType: z.enum(['INDIVIDUAL', 'ENTERPRISE']),

    // 个人档案
    realName: z.string().min(1).max(100).optional(),
    idNumber: z.string().min(8).max(18).optional(),
    idCardFrontUrl: z.string().url().optional(),
    idCardBackUrl: z.string().url().optional(),
    faceVerificationData: z.string().max(10_000).optional(),

    // 企业档案
    companyName: z.string().min(1).max(200).optional(),
    businessLicense: z.string().min(1).max(50).optional(),
    legalRepresentative: z.string().min(1).max(100).optional(),
    legalRepIdNumber: z.string().min(8).max(18).optional(),
    companyAddress: z.string().max(500).optional(),

    // 额外材料：前端应存放为“已上传文件URL/元信息”，避免提交 base64 大文件
    verificationDocuments: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.profileType === 'INDIVIDUAL') {
      if (!value.realName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['realName'],
          message: '个人认证需要提供姓名',
        });
      }
      if (!value.idNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['idNumber'],
          message: '个人认证需要提供身份证号',
        });
      }
      if (!value.idCardFrontUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['idCardFrontUrl'],
          message: '个人认证需要提供身份证正面材料URL',
        });
      }
      if (!value.idCardBackUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['idCardBackUrl'],
          message: '个人认证需要提供身份证反面材料URL',
        });
      }
      return;
    }

    if (!value.companyName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['companyName'],
        message: '企业认证需要提供企业名称',
      });
    }
    if (!value.businessLicense) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['businessLicense'],
        message: '企业认证需要提供营业执照号',
      });
    }
    if (!value.legalRepresentative) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['legalRepresentative'],
        message: '企业认证需要提供法定代表人姓名',
      });
    }
    if (!value.legalRepIdNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['legalRepIdNumber'],
        message: '企业认证需要提供法定代表人身份证号',
      });
    }
  });

/**
 * 提交身份核验材料
 * POST /api/identity/verify
 *
 * 说明：
 * - 本接口用于“提交认证材料并进入审核队列”，不在此处进行第三方OCR/人脸比对。
 * - 第三方自动核验可在 worker 中异步完成，并回写 verificationStatus。
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) return ErrorResponses.UNAUTHORIZED();
    if (!authUser.tokenId) return ErrorResponses.UNAUTHORIZED();

    if (!CSRFProtection.protect(request, authUser.tokenId)) {
      await AuditLogger.log({
        level: AuditLevel.CRITICAL,
        eventType: AuditEventType.CSRF_ATTACK_DETECTED,
        userId: authUser.id,
        userName: authUser.email,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined,
        resource: 'identity_verification',
        action: 'submit',
        result: 'FAILURE',
      });
      return ErrorResponses.CSRF_INVALID();
    }

    const validation = await validateRequestBody(request, verifyIdentitySchema);
    if (!validation.success) return validation.error;

    const existingProfile = await prisma.userProfile.findUnique({
      where: { userId: authUser.id },
      select: { verificationStatus: true },
    });

    if (existingProfile?.verificationStatus === VerificationStatus.VERIFIED) {
      return ErrorResponses.RESOURCE_CONFLICT('账号已完成认证，若需变更请联系管理员');
    }

    let documentsJson: Prisma.InputJsonValue | undefined;
    if (validation.data.verificationDocuments) {
      try {
        documentsJson = JSON.parse(
          JSON.stringify(validation.data.verificationDocuments)
        ) as Prisma.InputJsonValue;
      } catch {
        return ErrorResponses.BAD_REQUEST_MESSAGE('verificationDocuments 不可序列化');
      }
    }

    const profileType =
      validation.data.profileType === 'INDIVIDUAL'
        ? ProfileType.INDIVIDUAL
        : ProfileType.ENTERPRISE;

    const baseData = {
      profileType,
      verificationStatus: VerificationStatus.PENDING,
      verifiedAt: null,
      verificationDocuments: documentsJson,
      faceVerificationData: validation.data.faceVerificationData,
    };

    const individualData = {
      realName: validation.data.realName,
      idNumber: validation.data.idNumber,
      idCardFrontUrl: validation.data.idCardFrontUrl,
      idCardBackUrl: validation.data.idCardBackUrl,
    };

    const enterpriseData = {
      companyName: validation.data.companyName,
      businessLicense: validation.data.businessLicense,
      legalRepresentative: validation.data.legalRepresentative,
      legalRepIdNumber: validation.data.legalRepIdNumber,
      companyAddress: validation.data.companyAddress,
    };

    const createData: Prisma.UserProfileUncheckedCreateInput = {
      userId: authUser.id,
      ...baseData,
      ...(profileType === ProfileType.INDIVIDUAL ? individualData : enterpriseData),
    };

    const updateData: Prisma.UserProfileUncheckedUpdateInput = {
      ...baseData,
      ...(profileType === ProfileType.INDIVIDUAL ? individualData : enterpriseData),
    };

    const createdOrUpdated = await prisma.userProfile.upsert({
      where: { userId: authUser.id },
      create: createData,
      update: updateData,
      select: {
        id: true,
        profileType: true,
        verificationStatus: true,
        verifiedAt: true,
        updatedAt: true,
      },
    });

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.USER_UPDATED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'identity_verification',
      action: 'submit',
      details: {
        profileType: createdOrUpdated.profileType,
        verificationStatus: createdOrUpdated.verificationStatus,
      },
      result: 'SUCCESS',
    });

    return createSuccessResponse(
      {
        profileId: createdOrUpdated.id,
        profileType: createdOrUpdated.profileType,
        verificationStatus: createdOrUpdated.verificationStatus,
        submittedAt: createdOrUpdated.updatedAt,
      },
      '认证材料已提交，等待审核'
    );
    } catch (error) {
      logger.error({ err: error }, '身份核验提交失败');
      return ErrorResponses.INTERNAL_ERROR();
    }
  }
