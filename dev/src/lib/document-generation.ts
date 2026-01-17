import { z } from 'zod';
import type { AuthenticatedUser } from '@/lib/auth';

export const templateVariableSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  required: z.boolean().optional().default(false),
});

export type TemplateVariable = z.infer<typeof templateVariableSchema>;

export const templateStylesSchema = z
  .object({
    fontFamily: z.string().optional(),
    fontSize: z.number().optional(),
    lineHeight: z.number().optional(),
    margin: z
      .object({
        top: z.number().optional(),
        right: z.number().optional(),
        bottom: z.number().optional(),
        left: z.number().optional(),
      })
      .optional(),
  })
  .passthrough();

export type TemplateStyles = z.infer<typeof templateStylesSchema>;

export type CaseInfoLike = {
  caseNumber?: string;
  title?: string;
  disputeAmount?: number;
  currency?: string;
  applicant?: {
    email?: string;
    profile?: { realName?: string | null; companyName?: string | null } | null;
  } | null;
  respondent?: {
    email?: string;
    profile?: { realName?: string | null; companyName?: string | null } | null;
  } | null;
};

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function extractTemplatePlaceholders(content: string): string[] {
  const keys = new Set<string>();
  const matches = content.matchAll(/{{\s*([^}]+?)\s*}}/g);
  for (const match of matches) {
    const key = match[1]?.trim();
    if (key) keys.add(key);
  }
  return Array.from(keys);
}

export function hasNonEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

export function toTemplateValueString(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'bigint') return value.toString();
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * 处理模板内容（替换变量 + 系统变量）
 */
export async function processTemplateContent(params: {
  templateContent: string;
  variables: Record<string, unknown>;
  caseInfo: CaseInfoLike | null;
  authUser: AuthenticatedUser;
}): Promise<string> {
  let content = params.templateContent;

  // 替换用户提供的变量
  for (const [key, value] of Object.entries(params.variables)) {
    const regex = new RegExp(`{{\\s*${escapeRegExp(key)}\\s*}}`, 'g');
    content = content.replace(regex, toTemplateValueString(value));
  }

  // 替换系统变量
  const systemVariables: Record<string, unknown> = {
    currentDate: new Date().toLocaleDateString('zh-CN'),
    currentTime: new Date().toLocaleString('zh-CN'),
    currentYear: new Date().getFullYear(),
    generatorName: params.authUser.email,
    generatorCompany: '',
  };

  // 如果有案件信息，添加案件相关变量
  if (params.caseInfo) {
    Object.assign(systemVariables, {
      caseNumber: params.caseInfo.caseNumber,
      caseTitle: params.caseInfo.title,
      applicantName:
        params.caseInfo.applicant?.profile?.realName
        || params.caseInfo.applicant?.profile?.companyName
        || params.caseInfo.applicant?.email,
      respondentName:
        params.caseInfo.respondent?.profile?.realName
        || params.caseInfo.respondent?.profile?.companyName
        || params.caseInfo.respondent?.email,
      disputeAmount: params.caseInfo.disputeAmount ?? 0,
      currency: params.caseInfo.currency || 'CNY',
    });
  }

  for (const [key, value] of Object.entries(systemVariables)) {
    const regex = new RegExp(`{{\\s*${escapeRegExp(key)}\\s*}}`, 'g');
    content = content.replace(regex, toTemplateValueString(value));
  }

  return content;
}

/**
 * 应用样式（返回 HTML）
 */
export function applyStyles(params: {
  content: string;
  templateStyles: TemplateStyles;
  customStyles?: TemplateStyles;
}): string {
  const styles: TemplateStyles = {
    ...params.templateStyles,
    ...(params.customStyles ?? {}),
  };

  return `
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: ${styles.fontFamily || 'SimSun'};
          font-size: ${styles.fontSize || 12}pt;
          line-height: ${styles.lineHeight || 1.5};
          margin: ${styles.margin?.top || 20}mm ${styles.margin?.right || 20}mm ${styles.margin?.bottom || 20}mm ${styles.margin?.left || 20}mm;
        }
        .header { text-align: center; font-weight: bold; margin-bottom: 20px; }
        .content { text-align: justify; }
        .footer { margin-top: 30px; text-align: right; }
      </style>
    </head>
    <body>
      <div class="content">${params.content}</div>
      <div class="footer">
        <p>生成时间: ${new Date().toLocaleString('zh-CN')}</p>
      </div>
    </body>
    </html>
  `;
}

