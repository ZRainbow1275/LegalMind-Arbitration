// dev/src/app/api/auth/verify-identity/route.ts
// 实名认证：对齐 docs/API_REFERENCE.md 的 /api/auth/verify-identity
//
// 说明：
// - 真实核验通常依赖第三方（OCR/人脸/工商）服务；未配置时返回 SERVICE_NOT_CONFIGURED，
//   但仍可将用户提交信息落库为 PENDING，进入人工/异步核验流程（不返回“模拟通过”）。
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser } from '@/lib/auth';
import { validateRequestBody } from '@/lib/validation';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { EncryptionUtil } from '@/lib/security/encryption';
import { ProfileType, VerificationStatus, type Prisma } from '@/generated/prisma';
import { logger } from '@/lib/logger';

const verifyIdentitySchema = z.object({
  idType: z.enum(['id_card', 'business_license']),
  idNumber: z.string().min(4).max(50),
  name: z.string().min(1).max(200),
  faceImage: z.string().max(500_000).optional(),
  idCardFrontUrl: z.string().url().optional(),
  idCardBackUrl: z.string().url().optional(),
  businessLicenseUrl: z.string().url().optional(),
  extra: z.record(z.string(), z.unknown()).optional(),
});

function maskIdentityNumber(value: string): string {
  return value.length > 6 ? `${value.slice(0, 3)}****${value.slice(-3)}` : value;
}

function buildVerificationDocuments(input: z.infer<typeof verifyIdentitySchema>): Prisma.InputJsonValue {
  const faceImageHash = input.faceImage
    ? crypto.createHash('sha256').update(input.faceImage).digest('hex')
    : null;

  const doc = {
    idType: input.idType,
    idNumberMasked: maskIdentityNumber(input.idNumber),
    encrypted: {
      idNumber: EncryptionUtil.encrypt(input.idNumber),
      name: EncryptionUtil.encrypt(input.name),
    },
    provided: {
      idCardFrontUrl: input.idCardFrontUrl ?? null,
      idCardBackUrl: input.idCardBackUrl ?? null,
      businessLicenseUrl: input.businessLicenseUrl ?? null,
      faceImageHash,
      faceImageBytes: input.faceImage ? Buffer.byteLength(input.faceImage, 'utf8') : 0,
    },
    extra: input.extra ?? null,
  };

  // Prisma Json 字段需要可 JSON 序列化的数据
  return JSON.parse(JSON.stringify(doc)) as Prisma.InputJsonValue;
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const validation = await validateRequestBody(request, verifyIdentitySchema);
    if (!validation.success) return validation.error;

    const profileType =
      validation.data.idType === 'business_license'
        ? ProfileType.ENTERPRISE
        : ProfileType.INDIVIDUAL;

    const verificationDocuments = buildVerificationDocuments(validation.data);

    const updateData: Prisma.UserProfileUncheckedUpdateInput = {
      profileType,
      verificationStatus: VerificationStatus.PENDING,
      verifiedAt: null,
      verificationDocuments,
      faceVerificationData: validation.data.faceImage
        ? `sha256:${crypto.createHash('sha256').update(validation.data.faceImage).digest('hex')}`
        : null,
      ...(profileType === ProfileType.INDIVIDUAL
        ? {
            realName: validation.data.name,
            idNumber: maskIdentityNumber(validation.data.idNumber),
            idCardFrontUrl: validation.data.idCardFrontUrl ?? null,
            idCardBackUrl: validation.data.idCardBackUrl ?? null,
          }
        : {
            companyName: validation.data.name,
            businessLicense: maskIdentityNumber(validation.data.idNumber),
          }),
    };

    const createData: Prisma.UserProfileUncheckedCreateInput = {
      userId: authUser.id,
      profileType,
      verificationStatus: VerificationStatus.PENDING,
      verifiedAt: null,
      verificationDocuments,
      faceVerificationData: updateData.faceVerificationData as string | null,
      ...(profileType === ProfileType.INDIVIDUAL
        ? {
            realName: validation.data.name,
            idNumber: maskIdentityNumber(validation.data.idNumber),
            idCardFrontUrl: validation.data.idCardFrontUrl ?? null,
            idCardBackUrl: validation.data.idCardBackUrl ?? null,
          }
        : {
            companyName: validation.data.name,
            businessLicense: maskIdentityNumber(validation.data.idNumber),
          }),
    };

    const createdOrUpdated = await prisma.userProfile.upsert({
      where: { userId: authUser.id },
      create: {
        ...createData,
      },
      update: updateData,
      select: { id: true, verificationStatus: true, updatedAt: true },
    });

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.USER_UPDATED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'identity_verification',
      action: 'verify_identity',
      details: { profileType, status: createdOrUpdated.verificationStatus },
      result: 'SUCCESS',
    });

    return createSuccessResponse(
      {
        verified: createdOrUpdated.verificationStatus === VerificationStatus.VERIFIED,
        verificationId: createdOrUpdated.id,
        status: createdOrUpdated.verificationStatus,
        submittedAt: createdOrUpdated.updatedAt.toISOString(),
      },
      '实名认证请求已提交'
    );
  } catch (error) {
    logger.error({ err: error }, '实名认证提交失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

export async function GET() {
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
