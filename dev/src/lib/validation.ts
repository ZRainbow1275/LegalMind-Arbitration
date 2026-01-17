// dev/src/lib/validation.ts
// 请求验证工具和中间件

import { z } from 'zod';
import { NextRequest, type NextResponse } from 'next/server';
import { ErrorResponses, type ApiResponse } from './api-response';

type ValidationFailure = { success: false; error: NextResponse<ApiResponse> };

/**
 * 验证请求体数据
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | ValidationFailure> {
  try {
    const body = await request.json();
    const validatedData = schema.parse(body);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: ErrorResponses.VALIDATION_ERROR({
          issues: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
          })),
        }),
      };
    }
    return {
      success: false,
      error: ErrorResponses.BAD_REQUEST('请求体格式错误'),
    };
  }
}

/**
 * 验证查询参数
 */
export function validateSearchParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { success: true; data: T } | ValidationFailure {
  try {
    const params = Object.fromEntries(searchParams.entries());
    const validatedData = schema.parse(params);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: ErrorResponses.VALIDATION_ERROR({
          issues: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
          })),
        }),
      };
    }
    return {
      success: false,
      error: ErrorResponses.BAD_REQUEST('查询参数格式错误'),
    };
  }
}

/**
 * 验证路径参数
 */
export function validatePathParams<T>(
  params: Record<string, string | string[]>,
  schema: z.ZodSchema<T>
): { success: true; data: T } | ValidationFailure;
export function validatePathParams<T extends z.ZodRawShape>(
  params: Record<string, string | string[]>,
  schema: T
): { success: true; data: z.infer<z.ZodObject<T>> } | ValidationFailure;
export function validatePathParams(
  params: Record<string, string | string[]>,
  schema: z.ZodSchema<unknown> | z.ZodRawShape
): { success: true; data: unknown } | ValidationFailure {
  try {
    const zodSchema =
      typeof (schema as z.ZodTypeAny).safeParse === 'function'
        ? (schema as z.ZodSchema<unknown>)
        : (z.object(schema as z.ZodRawShape) as z.ZodSchema<unknown>);

    const validatedData = zodSchema.parse(params);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: ErrorResponses.VALIDATION_ERROR({
          issues: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
          })),
        }),
      };
    }
    return {
      success: false,
      error: ErrorResponses.BAD_REQUEST('路径参数格式错误'),
    };
  }
}

// ============================================================================
// 通用验证Schema
// ============================================================================

/**
 * UUID验证Schema
 */
export const uuidSchema = z.string().uuid('无效的UUID格式');

/**
 * 分页参数验证Schema
 */
export const paginationSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
}).refine(data => data.page >= 1, {
  message: '页码必须大于等于1',
  path: ['page'],
}).refine(data => data.limit >= 1 && data.limit <= 100, {
  message: '每页数量必须在1-100之间',
  path: ['limit'],
});

/**
 * 邮箱验证Schema
 */
export const emailSchema = z.string().email('无效的邮箱格式');

/**
 * 手机号验证Schema（中国大陆）
 */
export const phoneSchema = z.string().regex(
  /^1[3-9]\d{9}$/,
  '无效的手机号格式'
);

/**
 * 密码验证Schema
 */
export const passwordSchema = z.string()
  .min(8, '密码长度至少8位')
  .max(128, '密码长度不能超过128位')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '密码必须包含大小写字母和数字');

/**
 * 身份证号验证Schema
 */
export const idNumberSchema = z.string().regex(
  /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/,
  '无效的身份证号格式'
);

/**
 * 统一社会信用代码验证Schema
 */
export const businessLicenseSchema = z.string().regex(
  /^[0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}$/,
  '无效的统一社会信用代码格式'
);

// ============================================================================
// 用户相关验证Schema
// ============================================================================

/**
 * 用户注册验证Schema
 */
  export const userRegistrationSchema = z.object({
    email: emailSchema,
    phone: phoneSchema.optional(),
    password: passwordSchema,
    userType: z.enum(['INDIVIDUAL', 'ENTERPRISE'], { message: '用户类型必须是个人或企业' }),
  });

/**
 * 用户登录验证Schema
 */
export const userLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, '密码不能为空'),
  mfaCode: z.string().trim().min(6, 'MFA验证码格式不正确').max(64, 'MFA验证码格式不正确').optional(),
});

/**
 * 用户资料更新验证Schema
 */
export const userProfileUpdateSchema = z.object({
  realName: z.string().min(2, '姓名至少2个字符').max(50, '姓名不能超过50个字符').optional(),
  idNumber: idNumberSchema.optional(),
  companyName: z.string().min(2, '公司名称至少2个字符').max(200, '公司名称不能超过200个字符').optional(),
  businessLicense: businessLicenseSchema.optional(),
  legalRepresentative: z.string().min(2, '法定代表人姓名至少2个字符').max(100, '法定代表人姓名不能超过100个字符').optional(),
  companyAddress: z.string().max(500, '公司地址不能超过500个字符').optional(),
});

// ============================================================================
// 案件相关验证Schema
// ============================================================================

/**
 * 案件创建验证Schema
 */
export const caseCreationSchema = z.object({
  title: z.string().min(5, '案件标题至少5个字符').max(500, '案件标题不能超过500个字符'),
  description: z.string().max(5000, '案件描述不能超过5000个字符').optional(),
  caseType: z.string().min(1, '案件类型不能为空').max(100, '案件类型不能超过100个字符'),
  disputeAmount: z.number().positive('争议金额必须为正数').optional(),
  currency: z.string().length(3, '货币代码必须为3位').default('CNY'),
  respondentInfo: z.object({
    name: z.string().min(2, '被申请人姓名至少2个字符'),
    contact: z.string().min(1, '联系方式不能为空'),
    address: z.string().optional(),
  }).optional(),
});

/**
 * 案件更新验证Schema
 */
export const caseUpdateSchema = caseCreationSchema.partial();

/**
 * 文档上传验证Schema
 */
export const documentUploadSchema = z.object({
  documentType: z.enum(
    ['APPLICATION', 'EVIDENCE', 'RESPONSE', 'DECISION', 'AGREEMENT', 'OTHER'],
    { message: '无效的文档类型' }
  ),
  category: z.string().max(100, '文档分类不能超过100个字符').optional(),
  description: z.string().max(1000, '文档描述不能超过1000个字符').optional(),
  isPublic: z.boolean().default(false),
});
