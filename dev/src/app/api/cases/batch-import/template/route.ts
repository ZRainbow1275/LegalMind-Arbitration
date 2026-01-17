// dev/src/app/api/cases/batch-import/template/route.ts
// 批量导入模板下载API端点

import { NextRequest } from 'next/server';
import { requireAuthenticatedUser, PermissionCheckers } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import * as XLSX from 'xlsx';

/**
 * 获取批量导入模板
 * GET /api/cases/batch-import/template
 * 支持Excel和CSV格式下载
 */
export async function GET(request: NextRequest) {
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: false });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    // 检查权限
    if (!PermissionCheckers.canManageCase(authUser)) {
      return ErrorResponses.FORBIDDEN_MESSAGE('您没有下载导入模板的权限');
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'xlsx';
    const includeExample = searchParams.get('includeExample') === 'true';

    // 验证格式
    if (!['xlsx', 'csv'].includes(format)) {
      return ErrorResponses.BAD_REQUEST('不支持的文件格式，只支持xlsx和csv');
    }

    // 定义模板列
    const templateColumns = [
      '案件标题',
      '案件描述',
      '案件类型',
      '争议金额',
      '币种',
      '优先级',
      '被申请人姓名',
      '被申请人联系方式',
      '被申请人地址',
      '申请人邮箱',
    ];

    // 示例数据
    const exampleData = [
      [
        '合同纠纷案件示例',
        '关于货物交付延迟的争议',
        '合同纠纷',
        100000,
        'CNY',
        'MEDIUM',
        '示例公司有限公司',
        '13800138000',
        '北京市朝阳区示例街道123号',
        'applicant@example.com',
      ],
      [
        '服务合同争议',
        '关于服务质量不符合约定的争议',
        '服务合同纠纷',
        50000,
        'CNY',
        'HIGH',
        '张三',
        '13900139000',
        '上海市浦东新区示例路456号',
        'zhang.san@example.com',
      ],
    ];

    // 构建数据
    const data: Array<Array<string | number>> = [templateColumns];
    if (includeExample) {
      data.push(...exampleData);
    }

    if (format === 'xlsx') {
      // 生成Excel文件
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(data);

      // 设置列宽
      const columnWidths = [
        { wch: 30 }, // 案件标题
        { wch: 40 }, // 案件描述
        { wch: 15 }, // 案件类型
        { wch: 12 }, // 争议金额
        { wch: 8 },  // 币种
        { wch: 10 }, // 优先级
        { wch: 20 }, // 被申请人姓名
        { wch: 15 }, // 被申请人联系方式
        { wch: 30 }, // 被申请人地址
        { wch: 25 }, // 申请人邮箱
      ];
      worksheet['!cols'] = columnWidths;

      // 设置表头样式
      const headerStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: 'FF6B35' } }, // 橙色背景
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } },
        },
      };

      // 应用表头样式
      templateColumns.forEach((_, index) => {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: index });
        if (!worksheet[cellAddress]) worksheet[cellAddress] = {};
        worksheet[cellAddress].s = headerStyle;
      });

      // 添加数据验证和说明
      const instructionSheet = XLSX.utils.aoa_to_sheet([
        ['LegalMind 仲裁平台 - 批量导入模板说明'],
        [''],
        ['使用说明：'],
        ['1. 请按照模板格式填写案件信息'],
        ['2. 必填字段：案件标题、案件类型、被申请人姓名'],
        ['3. 案件标题长度：5-200个字符'],
        ['4. 争议金额：请填写数字，不要包含货币符号'],
        ['5. 优先级：LOW、MEDIUM、HIGH、URGENT'],
        ['6. 币种：CNY、USD、EUR等'],
        ['7. 文件大小限制：最大10MB'],
        ['8. 支持格式：.xlsx、.xls、.csv'],
        [''],
        ['字段说明：'],
        ['案件标题：案件的简要描述，用于标识案件'],
        ['案件描述：案件的详细说明（可选）'],
        ['案件类型：如合同纠纷、侵权纠纷等'],
        ['争议金额：争议涉及的金额（可选）'],
        ['币种：货币类型，默认CNY'],
        ['优先级：案件处理优先级，默认MEDIUM'],
        ['被申请人姓名：被申请人的姓名或公司名称'],
        ['被申请人联系方式：电话或其他联系方式（可选）'],
        ['被申请人地址：被申请人的地址（可选）'],
        ['申请人邮箱：申请人的邮箱地址（可选）'],
      ]);

      XLSX.utils.book_append_sheet(workbook, worksheet, '导入模板');
      XLSX.utils.book_append_sheet(workbook, instructionSheet, '使用说明');

      // 生成文件
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const fileName = includeExample 
        ? 'LegalMind_案件批量导入模板_含示例.xlsx'
        : 'LegalMind_案件批量导入模板.xlsx';

      return new Response(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
          'Content-Length': buffer.length.toString(),
        },
      });

    } else {
      // 生成CSV文件
      const csvContent = data.map(row => 
        row.map(cell => `"${cell}"`).join(',')
      ).join('\n');

      // 添加BOM以支持中文
      const bom = '\uFEFF';
      const csvWithBom = bom + csvContent;

      const fileName = includeExample 
        ? 'LegalMind_案件批量导入模板_含示例.csv'
        : 'LegalMind_案件批量导入模板.csv';

      return new Response(csvWithBom, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
          'Content-Length': Buffer.byteLength(csvWithBom, 'utf8').toString(),
        },
      });
    }

    } catch (error) {
      logger.error({ err: error }, '生成导入模板失败');
      return ErrorResponses.INTERNAL_ERROR();
    }
}

/**
 * 获取模板信息
 * POST /api/cases/batch-import/template
 * 返回模板字段说明和验证规则
 */
export async function POST(request: NextRequest) {
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    // 检查权限
    if (!PermissionCheckers.canManageCase(authUser)) {
      return ErrorResponses.FORBIDDEN_MESSAGE('您没有查看模板信息的权限');
    }

    const templateInfo = {
      templateVersion: '1.0',
      supportedFormats: ['xlsx', 'xls', 'csv'],
      maxFileSize: '10MB',
      maxRows: 1000,
      
      fields: [
        {
          name: '案件标题',
          key: 'title',
          type: 'string',
          required: true,
          minLength: 5,
          maxLength: 200,
          description: '案件的简要描述，用于标识案件',
          example: '合同纠纷案件示例',
        },
        {
          name: '案件描述',
          key: 'description',
          type: 'string',
          required: false,
          maxLength: 2000,
          description: '案件的详细说明',
          example: '关于货物交付延迟的争议',
        },
        {
          name: '案件类型',
          key: 'caseType',
          type: 'string',
          required: true,
          maxLength: 100,
          description: '案件的分类类型',
          example: '合同纠纷',
          suggestions: ['合同纠纷', '侵权纠纷', '劳动争议', '知识产权纠纷', '建设工程纠纷'],
        },
        {
          name: '争议金额',
          key: 'disputeAmount',
          type: 'number',
          required: false,
          min: 0,
          description: '争议涉及的金额',
          example: 100000,
        },
        {
          name: '币种',
          key: 'currency',
          type: 'string',
          required: false,
          default: 'CNY',
          description: '货币类型',
          example: 'CNY',
          options: ['CNY', 'USD', 'EUR', 'JPY', 'GBP'],
        },
        {
          name: '优先级',
          key: 'priority',
          type: 'enum',
          required: false,
          default: 'MEDIUM',
          description: '案件处理优先级',
          example: 'MEDIUM',
          options: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
        },
        {
          name: '被申请人姓名',
          key: 'respondentName',
          type: 'string',
          required: true,
          description: '被申请人的姓名或公司名称',
          example: '示例公司有限公司',
        },
        {
          name: '被申请人联系方式',
          key: 'respondentContact',
          type: 'string',
          required: false,
          description: '电话或其他联系方式',
          example: '13800138000',
        },
        {
          name: '被申请人地址',
          key: 'respondentAddress',
          type: 'string',
          required: false,
          description: '被申请人的地址',
          example: '北京市朝阳区示例街道123号',
        },
        {
          name: '申请人邮箱',
          key: 'applicantEmail',
          type: 'email',
          required: false,
          description: '申请人的邮箱地址',
          example: 'applicant@example.com',
        },
      ],
      
      validationRules: {
        duplicateCheck: '系统会检查相同标题的案件，可选择跳过重复项',
        dataValidation: '所有数据会进行格式验证，不符合要求的行会被标记为失败',
        batchSize: '建议单次导入不超过500个案件',
      },
      
      tips: [
        '建议先下载模板并查看示例数据',
        '可以先使用验证模式检查数据格式',
        '导入过程中请不要关闭浏览器',
        '大批量数据建议分批导入',
      ],
    };

    return createSuccessResponse(templateInfo, '获取模板信息成功');

    } catch (error) {
      logger.error({ err: error }, '获取模板信息失败');
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
