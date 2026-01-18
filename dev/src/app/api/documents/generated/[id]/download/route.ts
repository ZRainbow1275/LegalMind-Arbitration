// dev/src/app/api/documents/generated/[id]/download/route.ts
// 生成文书下载：按 GeneratedDocument.fileFormat 返回 html/pdf/docx（pdf/docx 在下载时转换）
import fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, PermissionCheckers, type AuthenticatedUser } from '@/lib/auth';
import { ErrorResponses } from '@/lib/api-response';
import { validatePathParams, uuidSchema } from '@/lib/validation';
import { getTraceId, appendCaseEvent } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { logger } from '@/lib/logger';

function buildContentDispositionAttachment(filename: string): string {
  const fallback = filename.replace(/[^\x20-\x7E]/g, '_');
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

function resolveChromeExecutablePath(): string | null {
  const candidates = [
    process.env.CHROME_EXECUTABLE_PATH,
    'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
    'C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
    'C:\\\\Program Files\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe',
    'C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      // ignore
    }
  }
  return null;
}

async function renderPdfFromHtml(html: string): Promise<Buffer> {
  const executablePath = resolveChromeExecutablePath();
  if (!executablePath) throw new Error('SERVICE_NOT_CONFIGURED');

  const puppeteer = (await import('puppeteer-core')).default;
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });
    return Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf);
  } finally {
    await browser.close().catch(() => undefined);
  }
}

function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  const copy = new Uint8Array(buffer.byteLength);
  copy.set(buffer);
  return copy.buffer;
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6])\s*>/gi, '\n\n')
    .replace(/<li\b[^>]*>/gi, '• ')
    .replace(/<\/li\s*>/gi, '\n')
    .replace(/<\/tr\s*>/gi, '\n')
    .replace(/<\/t[dh]\s*>/gi, '\t')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function renderDocxFromHtml(params: { html: string; title: string }): Promise<Buffer> {
  const { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } = await import('docx');

  const plainText = htmlToPlainText(params.html);
  const lines = plainText.split('\n');

  const children: Array<InstanceType<typeof Paragraph>> = [];
  const title = params.title.trim();
  if (title) {
    children.push(
      new Paragraph({
        text: title,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
      })
    );
  }

  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (!trimmed.trim()) {
      children.push(new Paragraph({}));
      continue;
    }
    children.push(
      new Paragraph({
        children: [new TextRun({ text: trimmed })],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}

function canAccessGeneratedDocument(
  authUser: AuthenticatedUser,
  doc: {
    generatedBy: string;
    case: null | {
      applicantId: string;
      respondentId: string | null;
      participants: Array<{ userId: string | null }>;
    };
  }
) {
  if (doc.generatedBy === authUser.id) return true;
  if (!doc.case) return PermissionCheckers.canManageDocuments(authUser);

  return (
    PermissionCheckers.canViewAllCases(authUser)
    || doc.case.applicantId === authUser.id
    || doc.case.respondentId === authUser.id
    || doc.case.participants.some((p) => p.userId === authUser.id)
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = getTraceId(request.headers);
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: false });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, { id: uuidSchema });
    if (!pathValidation.success) return pathValidation.error;
    const { id } = pathValidation.data;

    const doc = await prisma.generatedDocument.findUnique({
      where: { id },
      include: {
        case: {
          select: {
            id: true,
            applicantId: true,
            respondentId: true,
            participants: {
              where: { userId: authUser.id, isActive: true },
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!doc) return ErrorResponses.NOT_FOUND('生成文书');

    if (!canAccessGeneratedDocument(authUser, doc)) {
      return ErrorResponses.FORBIDDEN();
    }

    const ext = (doc.fileFormat || 'html').toLowerCase();
    const filename = `${doc.title || doc.documentNumber}.${ext}`;
    const nowIso = new Date().toISOString();

    let body: string | ArrayBuffer;
    let contentType: string;
    if (ext === 'html') {
      body = doc.generatedContent;
      contentType = 'text/html; charset=utf-8';
    } else if (ext === 'pdf') {
      try {
        const pdf = await renderPdfFromHtml(doc.generatedContent);
        body = bufferToArrayBuffer(pdf);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === 'SERVICE_NOT_CONFIGURED') {
          return ErrorResponses.SERVICE_NOT_CONFIGURED('PDF 渲染器（Chrome/Edge）');
        }
        logger.error({ err: error, traceId }, '生成文书 PDF 转换失败');
        return ErrorResponses.OPERATION_FAILED('生成 PDF 失败');
      }
      contentType = 'application/pdf';
    } else if (ext === 'docx') {
      try {
        const docx = await renderDocxFromHtml({
          html: doc.generatedContent,
          title: doc.title || doc.documentNumber,
        });
        body = bufferToArrayBuffer(docx);
      } catch (error) {
        logger.error({ err: error, traceId }, '生成文书 DOCX 转换失败');
        return ErrorResponses.OPERATION_FAILED('生成 DOCX 失败');
      }
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else {
      return ErrorResponses.BAD_REQUEST_MESSAGE('不支持的文件格式', { fileFormat: doc.fileFormat });
    }

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.DOCUMENT_DOWNLOADED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'generated_documents',
      action: 'download',
      details: { traceId, generatedDocumentId: doc.id, caseId: doc.caseId ?? null, format: ext, at: nowIso },
      result: 'SUCCESS',
    });

    if (doc.caseId) {
      await appendCaseEvent({
        caseId: doc.caseId,
        eventType: 'GENERATED_DOCUMENT_DOWNLOADED',
        actorUserId: authUser.id,
        traceId,
        payload: { generatedDocumentId: doc.id, documentNumber: doc.documentNumber, format: ext, at: nowIso },
      });
    }

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': buildContentDispositionAttachment(filename),     
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    logger.error({ err: error, traceId }, '生成文书下载失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

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
