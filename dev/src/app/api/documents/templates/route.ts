// dev/src/app/api/documents/templates/route.ts
// 文书模板管理API端点 - 支持模板创建、查询和管理

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, PermissionCheckers } from '@/lib/auth';
import { validateRequestBody } from '@/lib/validation';
import { createSuccessResponse, createPaginatedResponse, ErrorResponses, parsePaginationParams, calculatePagination } from '@/lib/api-response';
import type { Prisma } from '@/generated/prisma';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// 文书模板创建Schema
const templateCreationSchema = z.object({
  name: z.string().min(1, '模板名称不能为空').max(200, '模板名称不能超过200个字符'),
  category: z.string().min(1, '模板分类不能为空').max(100, '模板分类不能超过100个字符'),
  description: z.string().max(1000, '模板描述不能超过1000个字符').optional(),
  templateType: z.enum(['arbitration_application', 'response', 'award', 'mediation_agreement', 'notice', 'other'], { message: '无效的模板类型' }),
  templateContent: z.string().min(10, '模板内容至少10个字符'),
  variables: z.array(z.object({
    name: z.string().min(1, '变量名不能为空'),
    key: z.string().min(1, '变量键不能为空'),
    type: z.enum(['text', 'number', 'date', 'boolean', 'select']),
    required: z.boolean().default(false),
    defaultValue: z.unknown().optional(),
    options: z.array(z.string()).optional(),
    description: z.string().optional(),
  })).min(1, '至少需要一个模板变量'),
  styles: z.object({
    fontSize: z.number().min(8).max(72).default(12),
    fontFamily: z.string().default('SimSun'),
    lineHeight: z.number().min(1).max(3).default(1.5),
    margin: z.object({
      top: z.number().default(20),
      bottom: z.number().default(20),
      left: z.number().default(20),
      right: z.number().default(20),
    }).optional(),
    pageSize: z.enum(['A4', 'A3', 'Letter']).default('A4'),
  }).optional(),
});

type TemplateVariable = z.infer<typeof templateCreationSchema.shape.variables.element>;

/**
 * 创建文书模板
 * POST /api/documents/templates
 * 需要认证和权限验证
 */
export async function POST(request: NextRequest) {
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    // 检查模板管理权限
    if (!PermissionCheckers.canManageCase(authUser)) {
      return ErrorResponses.FORBIDDEN_MESSAGE('您没有创建文书模板的权限');
    }

    // 验证请求体
    const validation = await validateRequestBody(request, templateCreationSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { 
      name, 
      category, 
      description, 
      templateType, 
      templateContent, 
      variables, 
      styles 
    } = validation.data;

    // 检查模板名称是否重复
    const existingTemplate = await prisma.documentTemplate.findFirst({
      where: {
        name,
        category,
        isActive: true,
      },
    });

    if (existingTemplate) {
      return ErrorResponses.BAD_REQUEST('该分类下已存在同名模板');
    }

    const stylesValue = styles || {
      fontSize: 12,
      fontFamily: 'SimSun',
      lineHeight: 1.5,
      pageSize: 'A4',
    };

    let variablesJson: Prisma.InputJsonValue;
    let stylesJson: Prisma.InputJsonValue;
    try {
      variablesJson = JSON.parse(JSON.stringify(variables)) as Prisma.InputJsonValue;
      stylesJson = JSON.parse(JSON.stringify(stylesValue)) as Prisma.InputJsonValue;
    } catch (error) {
      logger.error({ err: error }, '模板 variables/styles 序列化失败');
      return ErrorResponses.BAD_REQUEST('模板变量或样式不可序列化');
    }

    // 创建文书模板
    const template = await prisma.documentTemplate.create({
      data: {
        name,
        category,
        description,
        templateType,
        templateContent,
        variables: variablesJson,
        styles: stylesJson,
        createdBy: authUser.id,
      },
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

    // AI智能分析模板
    const aiAnalysis = {
      templateComplexity: calculateTemplateComplexity(variables),
      estimatedGenerationTime: estimateGenerationTime(templateContent, variables),
      variableAnalysis: {
        totalVariables: variables.length,
        requiredVariables: variables.filter(v => v.required).length,
        variableTypes: variables.reduce((acc, v) => {
          acc[v.type] = (acc[v.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
      recommendations: generateTemplateRecommendations(templateContent, variables),
    };

    const responseData = {
      template,
      aiAnalysis,
      // 使用建议
      usageGuidance: {
        suitableFor: getSuitableScenarios(templateType),
        requiredData: variables.filter(v => v.required).map(v => v.name),
        estimatedTime: aiAnalysis.estimatedGenerationTime,
      },
    };

    return createSuccessResponse(responseData, '文书模板创建成功');

  } catch (error) {
    logger.error({ err: error }, '创建文书模板失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

/**
 * 获取文书模板列表
 * GET /api/documents/templates
 * 需要认证，支持分页和筛选
 */
export async function GET(request: NextRequest) {
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: false });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);
    const category = searchParams.get('category');
    const templateType = searchParams.get('templateType');
    const search = searchParams.get('search');
    const isActive = searchParams.get('isActive') !== 'false';

    // 构建查询条件
    const where: Prisma.DocumentTemplateWhereInput = { isActive };

    if (category) {
      where.category = category;
    }

    if (templateType) {
      where.templateType = templateType;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 查询模板列表
    const [templates, total] = await Promise.all([
      prisma.documentTemplate.findMany({
        where,
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
          _count: {
            select: {
              generatedDocuments: true,
            },
          },
        },
        orderBy: [
          { usageCount: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.documentTemplate.count({ where }),
    ]);

    // 添加模板统计信息
    const templatesWithStats = templates.map(template => ({
      ...template,
      stats: {
        totalUsage: template.usageCount,
        recentUsage: template._count.generatedDocuments,
        averageRating: null,
        lastUsed: template.updatedAt,
      },
      // 移除敏感信息
      templateContent: undefined,
    }));

    const pagination = calculatePagination(total, page, limit);

    // 获取分类统计
    const categoryStats = await prisma.documentTemplate.groupBy({
      by: ['category'],
      where: { isActive: true },
      _count: { category: true },
    });

    const responseData = {
      templates: templatesWithStats,
      categoryStats: categoryStats.map(stat => ({
        category: stat.category,
        count: stat._count.category,
      })),
      totalTemplates: total,
    };

    return createPaginatedResponse(responseData.templates, pagination, '获取文书模板列表成功');

  } catch (error) {
    logger.error({ err: error }, '获取文书模板列表失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

// 辅助函数

/**
 * 计算模板复杂度
 */
function calculateTemplateComplexity(variables: TemplateVariable[]): 'simple' | 'medium' | 'complex' {
  const variableCount = variables.length;
  const complexTypes = variables.filter(v => ['select', 'date'].includes(v.type)).length;
  
  if (variableCount <= 5 && complexTypes <= 1) return 'simple';
  if (variableCount <= 15 && complexTypes <= 5) return 'medium';
  return 'complex';
}

/**
 * 估算生成时间
 */
function estimateGenerationTime(content: string, variables: TemplateVariable[]): string {
  const contentLength = content.length;
  const variableCount = variables.length;
  
  // 基于内容长度和变量数量估算
  const baseTime = Math.ceil(contentLength / 1000) + variableCount * 0.5;
  
  if (baseTime <= 2) return '1-2秒';
  if (baseTime <= 5) return '2-5秒';
  if (baseTime <= 10) return '5-10秒';
  return '10秒以上';
}

/**
 * 生成模板建议
 */
function generateTemplateRecommendations(content: string, variables: TemplateVariable[]): string[] {
  const recommendations: string[] = [];
  
  // 检查常见问题
  if (content.length < 100) {
    recommendations.push('模板内容较短，建议添加更多标准条款');
  }
  
  if (variables.filter(v => v.required).length === 0) {
    recommendations.push('建议设置一些必填变量以确保文书完整性');
  }
  
  if (!content.includes('{{')) {
    recommendations.push('模板中未发现变量占位符，请确认变量使用方式');
  }
  
  recommendations.push('建议定期更新模板以符合最新法律要求');
  
  return recommendations;
}

/**
 * 获取适用场景
 */
function getSuitableScenarios(templateType: string): string[] {
  const scenarios = {
    arbitration_application: ['仲裁申请', '争议解决', '合同纠纷'],
    response: ['答辩回应', '反驳申请', '证据提交'],
    award: ['仲裁裁决', '争议裁定', '最终决定'],
    mediation_agreement: ['调解协议', '和解方案', '协商结果'],
    notice: ['程序通知', '时间提醒', '状态更新'],
    other: ['其他法律文书', '自定义文档'],
  };
  
  return scenarios[templateType as keyof typeof scenarios] || ['通用场景'];
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
