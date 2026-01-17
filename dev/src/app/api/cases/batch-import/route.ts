// dev/src/app/api/cases/batch-import/route.ts
// 批量案件导入API端点 - 支持Excel/CSV文件解析和进度跟踪

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { requireAuthenticatedUser, PermissionCheckers } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { z } from 'zod';
import * as XLSX from 'xlsx';

// 批量导入Schema
const batchImportSchema = z.object({
  operationName: z.string().min(1, '操作名称不能为空').max(200, '操作名称不能超过200个字符'),
  parameters: z.object({
    skipDuplicates: z.boolean().default(true),
    validateOnly: z.boolean().default(false),
    defaultPriority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
    defaultCaseType: z.string().default('合同纠纷'),
  }).default({
    skipDuplicates: true,
    validateOnly: false,
    defaultPriority: 'MEDIUM',
    defaultCaseType: '合同纠纷',
  }),
});

// 案件数据验证Schema
const caseDataSchema = z.object({
  title: z.string().min(5, '案件标题至少5个字符').max(200, '案件标题不能超过200个字符'),
  description: z.string().max(2000, '案件描述不能超过2000个字符').optional(),
  caseType: z.string().min(1, '案件类型不能为空').max(100, '案件类型不能超过100个字符'),
  disputeAmount: z.number().min(0, '争议金额不能为负数').optional(),
  currency: z.string().default('CNY'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  respondentInfo: z.object({
    name: z.string().min(1, '被申请人姓名不能为空'),
    contact: z.string().optional(),
    address: z.string().optional(),
  }),
  applicantEmail: z.string().email('申请人邮箱格式不正确').optional(),
});

/**
 * 批量导入案件
 * POST /api/cases/batch-import
 * 支持Excel和CSV文件格式
 */
export async function POST(request: NextRequest) {
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    // 检查批量导入权限
    if (!PermissionCheckers.canManageCase(authUser)) {
      return ErrorResponses.FORBIDDEN_MESSAGE('您没有批量导入案件的权限');
    }

    // 解析multipart/form-data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const operationName = formData.get('operationName') as string;
    const parametersStr = formData.get('parameters') as string;

    if (!file) {
      return ErrorResponses.BAD_REQUEST('请上传文件');
    }

    // 验证文件类型
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ];

    if (!allowedTypes.includes(file.type)) {
      return ErrorResponses.BAD_REQUEST('只支持Excel(.xlsx, .xls)和CSV文件格式');
    }

    // 验证文件大小 (最大10MB)
    if (file.size > 10 * 1024 * 1024) {
      return ErrorResponses.BAD_REQUEST('文件大小不能超过10MB');
    }

    // 验证请求参数
    const validation = batchImportSchema.safeParse({
      operationName,
      parameters: parametersStr ? JSON.parse(parametersStr) : {},
    });

    if (!validation.success) {
      const message = validation.error.issues[0]?.message ?? '参数校验失败';
      return ErrorResponses.BAD_REQUEST(message);
    }

    const { operationName: opName, parameters } = validation.data;

    // 创建批量操作记录
    const batchOperation = await prisma.batchOperation.create({
      data: {
        operationType: 'case_import',
        operationName: opName,
        status: 'processing',
        parameters: {
          ...parameters,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        },
        createdBy: authUser.id,
      },
    });

    // 异步处理文件导入
    processBatchImport(batchOperation.id, file, authUser.id, parameters);

    const responseData = {
      batchOperationId: batchOperation.id,
      status: 'processing',
      message: '批量导入任务已启动，请通过批量操作状态API查询进度',
      estimatedTime: '预计需要2-5分钟',
    };

    return createSuccessResponse(responseData, '批量导入任务创建成功');

  } catch (error) {
    logger.error({ err: error }, '批量导入案件失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

type BatchImportParameters = z.infer<typeof batchImportSchema>['parameters'];

/**
 * 异步处理批量导入
 */
async function processBatchImport(
  batchOperationId: string,
  file: File,
  userId: string,
  parameters: BatchImportParameters
) {
  try {
    // 更新状态为处理中
    await prisma.batchOperation.update({
      where: { id: batchOperationId },
      data: {
        status: 'processing',
        startedAt: new Date(),
      },
    });

    // 读取文件内容
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // 转换为JSON数据
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
    
    if (rawData.length < 2) {
      throw new Error('文件内容为空或格式不正确');
    }

    // 解析表头
    const headers = rawData[0] as string[];
    const dataRows = rawData.slice(1);

    // 验证必需的列
    const requiredColumns = ['案件标题', '案件类型', '被申请人姓名'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
      throw new Error(`缺少必需的列: ${missingColumns.join(', ')}`);
    }

    // 更新总数
    await prisma.batchOperation.update({
      where: { id: batchOperationId },
      data: { totalItems: dataRows.length },
    });

      type BatchImportResult =
        | { row: number; status: 'valid'; data: z.infer<typeof caseDataSchema> }
        | { row: number; status: 'skipped'; reason: string; existingCaseId: string }
        | { row: number; status: 'success'; caseId: string; caseNumber: string }
        | { row: number; status: 'failed'; error: string };

      const results: BatchImportResult[] = [];
      let successCount = 0;
      let failedCount = 0;

    // 逐行处理数据
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowData: Record<string, unknown> = {};
      
      // 将行数据转换为对象
      headers.forEach((header, index) => {
        rowData[header] = row[index];
      });

      try {
        const disputeAmountRaw = rowData['争议金额'];
        const disputeAmountParsed =
          typeof disputeAmountRaw === 'number'
            ? disputeAmountRaw
            : typeof disputeAmountRaw === 'string'
              ? Number.parseFloat(disputeAmountRaw)
              : Number.NaN;

        // 转换为标准格式
        const caseData = {
          title: rowData['案件标题'],
          description: rowData['案件描述'] || '',
          caseType: rowData['案件类型'] || parameters.defaultCaseType,
          disputeAmount: Number.isFinite(disputeAmountParsed) ? disputeAmountParsed : 0,
          currency: rowData['币种'] || 'CNY',
          priority: rowData['优先级'] || parameters.defaultPriority,
          respondentInfo: {
            name: rowData['被申请人姓名'],
            contact: rowData['被申请人联系方式'] || '',
            address: rowData['被申请人地址'] || '',
          },
          applicantEmail: rowData['申请人邮箱'],
        };

        // 验证数据
        const validation = caseDataSchema.safeParse(caseData);
        if (!validation.success) {
          const issueMessage = validation.error.issues[0]?.message ?? '数据验证失败';
          throw new Error(`第${i + 2}行数据验证失败: ${issueMessage}`);
        }

        // 如果只是验证模式，跳过实际创建
        if (parameters.validateOnly) {
          results.push({
            row: i + 2,
            status: 'valid',
            data: validation.data,
          });
          successCount++;
          continue;
        }

        // 检查重复案件
        if (parameters.skipDuplicates) {
          const existingCase = await prisma.arbitrationCase.findFirst({
            where: {
              title: validation.data.title,
              applicantId: userId,
            },
          });

          if (existingCase) {
            results.push({
              row: i + 2,
              status: 'skipped',
              reason: '案件标题重复',
              existingCaseId: existingCase.id,
            });
            continue;
          }
        }

        // 生成案件编号
        const caseNumber = `BATCH${Date.now().toString(36).toUpperCase()}${(i + 1).toString().padStart(3, '0')}`;

          const newCase = await prisma.$transaction(async (tx) => {
            // 创建案件
            const createdCase = await tx.arbitrationCase.create({
              data: {
                caseNumber,
                title: validation.data.title,
                description: validation.data.description,
                caseType: validation.data.caseType,
                disputeAmount: validation.data.disputeAmount,
                currency: validation.data.currency,
                priority: validation.data.priority,
                status: 'DRAFT',
                applicantId: userId,
                respondentInfo: validation.data.respondentInfo,
                metadata: {
                  importSource: 'batch_import',
                  batchOperationId,
                  importedAt: new Date().toISOString(),
                  rowNumber: i + 2,
                },
              },
            });

            // 创建仲裁程序（与案件创建必须原子化）
            await tx.arbitrationProcess.create({
              data: {
                caseId: createdCase.id,
                currentStage: 'CASE_FILING',
                stages: {
                  stages: [
                    {
                      name: 'CASE_FILING',
                      status: 'current',
                      startedAt: new Date().toISOString(),
                    },
                    { name: 'CASE_ACCEPTANCE', status: 'pending' },
                    { name: 'ARBITRATOR_APPOINTMENT', status: 'pending' },
                    { name: 'EVIDENCE_EXCHANGE', status: 'pending' },
                    { name: 'HEARING_PREPARATION', status: 'pending' },
                    { name: 'HEARING_CONDUCT', status: 'pending' },
                    { name: 'DELIBERATION', status: 'pending' },
                    { name: 'AWARD_DRAFTING', status: 'pending' },
                    { name: 'AWARD_ISSUANCE', status: 'pending' },
                    { name: 'CASE_CLOSURE', status: 'pending' },
                  ],
                },
                totalStages: 10,
                completedStages: 1,
                progressPercent: 10,
              },
            });

            return createdCase;
          });

        results.push({
          row: i + 2,
          status: 'success',
          caseId: newCase.id,
          caseNumber: newCase.caseNumber,
        });

        successCount++;

      } catch (error) {
        results.push({
          row: i + 2,
          status: 'failed',
          error: error instanceof Error ? error.message : '未知错误',
        });
        failedCount++;
      }

      // 更新进度
      const processedItems = i + 1;
      const progressPercent = Math.round((processedItems / dataRows.length) * 100);
      
      await prisma.batchOperation.update({
        where: { id: batchOperationId },
        data: {
          processedItems,
          successItems: successCount,
          failedItems: failedCount,
          progressPercent,
        },
      });
    }

    // 完成处理
    await prisma.batchOperation.update({
      where: { id: batchOperationId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        results: {
          summary: {
            totalItems: dataRows.length,
            successItems: successCount,
            failedItems: failedCount,
            skippedItems: results.filter(r => r.status === 'skipped').length,
          },
          details: results,
        },
      },
    });

  } catch (error) {
    // 处理失败
    await prisma.batchOperation.update({
      where: { id: batchOperationId },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errorLog: {
          error: error instanceof Error ? error.message : '未知错误',
          timestamp: new Date().toISOString(),
        },
      },
    });
  }
}

/**
 * 不支持的请求方法
 */
export async function GET() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}

export async function PUT() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}

export async function DELETE() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}
