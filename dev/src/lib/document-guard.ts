// dev/src/lib/document-guard.ts
// API 路由共用的文档访问控制：统一 ABAC/RBAC 判断，避免重复实现与越权风险
import { prisma } from '@/lib/prisma';
import { ErrorResponses } from '@/lib/api-response';
import { PermissionCheckers, type AuthenticatedUser } from '@/lib/auth';
import { CaseStatus, Role } from '@/generated/prisma';
import { requireCaseAccess, type CaseGuardMode } from '@/lib/case-guard';

export type DocumentGuardMode = 'view' | 'manage';

export type GuardedDocument = {
  id: string;
  caseId: string;
  uploadedBy: string;
  isPublic: boolean;
  accessLevel: string;
  fileHash: string | null;
  filePath: string;
  metadata: unknown;
  originalName: string;
  fileType: string;
  fileSize: bigint;
};

export type DocumentGuardResult =
  | {
      ok: true;
      document: GuardedDocument;
      arbitrationCase: { id: string; applicantId: string; respondentId: string | null; status: CaseStatus };
    }
  | { ok: false; response: Response };

function hasTribunalRole(user: AuthenticatedUser): boolean {
  return user.roles.includes(Role.ARBITRATOR) || user.roles.includes(Role.ADMIN);
}

function canAccessByLevel(params: {
  user: AuthenticatedUser;
  document: Pick<GuardedDocument, 'uploadedBy' | 'isPublic' | 'accessLevel'>;
  hasCaseAccess: boolean;
  canManageDocuments: boolean;
}): boolean {
  const { user, document, hasCaseAccess, canManageDocuments } = params;
  if (canManageDocuments) return true;
  if (document.isPublic) return true;
  if (document.uploadedBy === user.id) return true;

  const accessLevel = document.accessLevel || 'case_participants';
  if (accessLevel === 'case_participants') return hasCaseAccess;
  if (accessLevel === 'uploader_only') return document.uploadedBy === user.id;
  if (accessLevel === 'tribunal_only') return hasTribunalRole(user);

  return false;
}

export async function requireDocumentAccess(params: {
  documentId: string;
  authUser: AuthenticatedUser;
  mode: DocumentGuardMode;
}): Promise<DocumentGuardResult> {
  const { documentId, authUser, mode } = params;

  const document = await prisma.caseDocument.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      caseId: true,
      uploadedBy: true,
      isPublic: true,
      accessLevel: true,
      fileHash: true,
      filePath: true,
      metadata: true,
      originalName: true,
      fileType: true,
      fileSize: true,
    },
  });

  if (!document) return { ok: false, response: ErrorResponses.NOT_FOUND('文档') };

  const caseMode: CaseGuardMode = mode === 'manage' ? 'manage' : 'view';
  const caseAccess = await requireCaseAccess({ caseId: document.caseId, authUser, mode: caseMode });
  if (!caseAccess.ok) return caseAccess;

  const canManageDocuments = PermissionCheckers.canManageDocuments(authUser);
  const canAccess = canAccessByLevel({
    user: authUser,
    document,
    hasCaseAccess: true,
    canManageDocuments,
  });

  if (!canAccess) return { ok: false, response: ErrorResponses.FORBIDDEN() };

  if (mode === 'manage' && !canManageDocuments && document.uploadedBy !== authUser.id) {
    return { ok: false, response: ErrorResponses.FORBIDDEN_MESSAGE('仅文档上传者或管理员可执行该操作') };
  }

  return { ok: true, document, arbitrationCase: caseAccess.arbitrationCase };
}
