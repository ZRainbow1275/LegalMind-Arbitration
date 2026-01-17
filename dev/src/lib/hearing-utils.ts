import {
  HearingStatus,
  HearingType,
  ParticipantType,
  type Hearing,
  type HearingParticipant,
} from '@/generated/prisma';

export type HearingStatusSlug =
  | 'scheduled'
  | 'preparing'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'cancelled';

export type HearingTypeSlug = 'initial' | 'evidence' | 'debate' | 'final';

export type HearingParticipantRoleSlug =
  | 'applicant'
  | 'respondent'
  | 'arbitrator'
  | 'witness'
  | 'observer';

export function toHearingType(value: HearingTypeSlug): HearingType {
  switch (value) {
    case 'initial':
      return HearingType.INITIAL;
    case 'evidence':
      return HearingType.EVIDENCE;
    case 'debate':
      return HearingType.DEBATE;
    case 'final':
      return HearingType.FINAL;
  }
}

export function fromHearingType(value: HearingType): HearingTypeSlug {
  switch (value) {
    case HearingType.INITIAL:
      return 'initial';
    case HearingType.EVIDENCE:
      return 'evidence';
    case HearingType.DEBATE:
      return 'debate';
    case HearingType.FINAL:
      return 'final';
  }
}

export function toHearingStatus(value: HearingStatusSlug): HearingStatus {
  switch (value) {
    case 'scheduled':
      return HearingStatus.SCHEDULED;
    case 'preparing':
      return HearingStatus.PREPARING;
    case 'in_progress':
      return HearingStatus.IN_PROGRESS;
    case 'paused':
      return HearingStatus.PAUSED;
    case 'completed':
      return HearingStatus.COMPLETED;
    case 'cancelled':
      return HearingStatus.CANCELLED;
  }
}

export function fromHearingStatus(value: HearingStatus): HearingStatusSlug {
  switch (value) {
    case HearingStatus.SCHEDULED:
      return 'scheduled';
    case HearingStatus.PREPARING:
      return 'preparing';
    case HearingStatus.IN_PROGRESS:
      return 'in_progress';
    case HearingStatus.PAUSED:
      return 'paused';
    case HearingStatus.COMPLETED:
      return 'completed';
    case HearingStatus.CANCELLED:
      return 'cancelled';
  }
}

export function toParticipantType(value: HearingParticipantRoleSlug): ParticipantType {
  switch (value) {
    case 'applicant':
      return ParticipantType.APPLICANT;
    case 'respondent':
      return ParticipantType.RESPONDENT;
    case 'arbitrator':
      return ParticipantType.ARBITRATOR;
    case 'witness':
      return ParticipantType.WITNESS;
    case 'observer':
      return ParticipantType.OBSERVER;
  }
}

export function fromParticipantType(value: ParticipantType): HearingParticipantRoleSlug {
  switch (value) {
    case ParticipantType.APPLICANT:
      return 'applicant';
    case ParticipantType.RESPONDENT:
      return 'respondent';
    case ParticipantType.ARBITRATOR:
      return 'arbitrator';
    case ParticipantType.WITNESS:
      return 'witness';
    case ParticipantType.OBSERVER:
      return 'observer';
    default:
      return 'observer';
  }
}

export type HearingParticipantResponse = {
  id: string;
  userId: string | null;
  role: HearingParticipantRoleSlug;
  name: string;
  email: string | null;
  phone: string | null;
  isRequired: boolean;
  connectionStatus: string;
  joinedAt: string | null;
  leftAt: string | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
  deviceInfo: unknown | null;
  networkQuality: string | null;
};

export type HearingResponse = {
  id: string;
  hearingNumber: string;
  caseId: string;
  title: string;
  description: string | null;
  hearingType: HearingTypeSlug;
  status: HearingStatusSlug;
  isOnline: boolean;
  scheduledAt: string;
  startedAt: string | null;
  endedAt: string | null;
  estimatedDuration: number;
  actualDuration: number | null;
  webrtcConfig: unknown | null;
  recordingEnabled: boolean;
  recordingUrl: string | null;
  transcriptUrl: string | null;
  aiFeatures: unknown | null;
  aiAnalysis: unknown | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  participants: HearingParticipantResponse[];
};

export function serializeHearingParticipant(
  participant: HearingParticipant
): HearingParticipantResponse {
  return {
    id: participant.id,
    userId: participant.userId,
    role: fromParticipantType(participant.role),
    name: participant.name,
    email: participant.email,
    phone: participant.phone,
    isRequired: participant.isRequired,
    connectionStatus: participant.connectionStatus,
    joinedAt: participant.joinedAt ? participant.joinedAt.toISOString() : null,
    leftAt: participant.leftAt ? participant.leftAt.toISOString() : null,
    audioEnabled: participant.audioEnabled,
    videoEnabled: participant.videoEnabled,
    deviceInfo: participant.deviceInfo ?? null,
    networkQuality: participant.networkQuality,
  };
}

export function serializeHearing(
  hearing: Hearing & { participants: HearingParticipant[] }
): HearingResponse {
  return {
    id: hearing.id,
    hearingNumber: hearing.hearingNumber,
    caseId: hearing.caseId,
    title: hearing.title,
    description: hearing.description,
    hearingType: fromHearingType(hearing.hearingType),
    status: fromHearingStatus(hearing.status),
    isOnline: hearing.isOnline,
    scheduledAt: hearing.scheduledAt.toISOString(),
    startedAt: hearing.startedAt ? hearing.startedAt.toISOString() : null,
    endedAt: hearing.endedAt ? hearing.endedAt.toISOString() : null,
    estimatedDuration: hearing.estimatedDuration,
    actualDuration: hearing.actualDuration,
    webrtcConfig: hearing.webrtcConfig ?? null,
    recordingEnabled: hearing.recordingEnabled,
    recordingUrl: hearing.recordingUrl,
    transcriptUrl: hearing.transcriptUrl,
    aiFeatures: hearing.aiFeatures ?? null,
    aiAnalysis: hearing.aiAnalysis ?? null,
    createdBy: hearing.createdBy,
    createdAt: hearing.createdAt.toISOString(),
    updatedAt: hearing.updatedAt.toISOString(),
    participants: hearing.participants.map(serializeHearingParticipant),
  };
}

