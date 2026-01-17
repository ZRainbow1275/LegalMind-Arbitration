import {
  MediationStatus,
  type Mediation,
  type MediationAgreement,
} from '@/generated/prisma';

export type MediationStatusSlug =
  | 'pending_approval'
  | 'approved'
  | 'in_progress'
  | 'agreement_draft'
  | 'agreement_signed'
  | 'judicial_confirmation_pending'
  | 'judicial_confirmed'
  | 'completed'
  | 'failed';

export function toMediationStatus(value: MediationStatusSlug): MediationStatus {
  switch (value) {
    case 'pending_approval':
      return MediationStatus.PENDING_APPROVAL;
    case 'approved':
      return MediationStatus.APPROVED;
    case 'in_progress':
      return MediationStatus.IN_PROGRESS;
    case 'agreement_draft':
      return MediationStatus.AGREEMENT_DRAFT;
    case 'agreement_signed':
      return MediationStatus.AGREEMENT_SIGNED;
    case 'judicial_confirmation_pending':
      return MediationStatus.JUDICIAL_CONFIRMATION_PENDING;
    case 'judicial_confirmed':
      return MediationStatus.JUDICIAL_CONFIRMED;
    case 'completed':
      return MediationStatus.COMPLETED;
    case 'failed':
      return MediationStatus.FAILED;
  }
}

export function fromMediationStatus(value: MediationStatus): MediationStatusSlug {
  switch (value) {
    case MediationStatus.PENDING_APPROVAL:
      return 'pending_approval';
    case MediationStatus.APPROVED:
      return 'approved';
    case MediationStatus.IN_PROGRESS:
      return 'in_progress';
    case MediationStatus.AGREEMENT_DRAFT:
      return 'agreement_draft';
    case MediationStatus.AGREEMENT_SIGNED:
      return 'agreement_signed';
    case MediationStatus.JUDICIAL_CONFIRMATION_PENDING:
      return 'judicial_confirmation_pending';
    case MediationStatus.JUDICIAL_CONFIRMED:
      return 'judicial_confirmed';
    case MediationStatus.COMPLETED:
      return 'completed';
    case MediationStatus.FAILED:
      return 'failed';
  }
}

export type MediationResponse = {
  id: string;
  mediationNumber: string;
  caseId: string;
  applicationType: string;
  reason: string;
  status: MediationStatusSlug;
  proposedMediator: string | null;
  preferredSchedule: unknown | null;
  mediationTerms: unknown | null;
  participantConsent: unknown | null;
  aiAnalysis: unknown | null;
  applicantId: string;
  createdAt: string;
  updatedAt: string;
};

export function serializeMediation(mediation: Mediation): MediationResponse {
  return {
    id: mediation.id,
    mediationNumber: mediation.mediationNumber,
    caseId: mediation.caseId,
    applicationType: mediation.applicationType,
    reason: mediation.reason,
    status: fromMediationStatus(mediation.status),
    proposedMediator: mediation.proposedMediator,
    preferredSchedule: mediation.preferredSchedule ?? null,
    mediationTerms: mediation.mediationTerms ?? null,
    participantConsent: mediation.participantConsent ?? null,
    aiAnalysis: mediation.aiAnalysis ?? null,
    applicantId: mediation.applicantId,
    createdAt: mediation.createdAt.toISOString(),
    updatedAt: mediation.updatedAt.toISOString(),
  };
}

export type MediationAgreementResponse = {
  id: string;
  mediationId: string;
  agreementNumber: string;
  agreementType: string;
  status: string;
  terms: unknown;
  financialTerms: unknown | null;
  implementationPlan: unknown | null;
  judicialConfirmation: unknown | null;
  aiAnalysis: unknown | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  signedAt: string | null;
};

export function serializeMediationAgreement(
  agreement: MediationAgreement
): MediationAgreementResponse {
  return {
    id: agreement.id,
    mediationId: agreement.mediationId,
    agreementNumber: agreement.agreementNumber,
    agreementType: agreement.agreementType,
    status: agreement.status,
    terms: agreement.terms,
    financialTerms: agreement.financialTerms ?? null,
    implementationPlan: agreement.implementationPlan ?? null,
    judicialConfirmation: agreement.judicialConfirmation ?? null,
    aiAnalysis: agreement.aiAnalysis ?? null,
    createdBy: agreement.createdBy,
    createdAt: agreement.createdAt.toISOString(),
    updatedAt: agreement.updatedAt.toISOString(),
    signedAt: agreement.signedAt ? agreement.signedAt.toISOString() : null,
  };
}

