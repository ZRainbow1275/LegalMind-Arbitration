// src/types/index.ts

// User related types
export interface User {
  id: string;
  email: string;
  phone?: string | null;
  userType: 'individual' | 'enterprise';
  status: 'active' | 'inactive' | 'suspended';
  roles?: string[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface IndividualProfile {
  userId: string;
  realName?: string | null;
  idNumber?: string | null;
  idCardImages?: string[];
  faceVerificationData?: string | null;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  verifiedAt?: Date | string | null;
  phone?: string | null;
  address?: string | null;
}

export interface EnterpriseProfile {
  userId: string;
  companyName?: string | null;
  businessLicense?: string | null;
  legalRepresentative?: string | null;
  legalRepIdNumber?: string | null;
  verificationDocuments?: string[];
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  verifiedAt?: Date | string | null;
  phone?: string | null;
  address?: string | null;
}

// Case related types
export const CASE_STATUS_VALUES = [
  'draft',
  'submitted',
  'accepted',
  'payment_pending',
  'tribunal_formation',
  'pre_hearing',
  'hearing_scheduled',
  'hearing_in_progress',
  'deliberation',
  'award_issued',
  'completed',
  'terminated',
] as const;

export type CaseStatus = (typeof CASE_STATUS_VALUES)[number];

export interface ArbitrationCase {
  id: string;
  caseNumber: string;
  applicantId: string;
  respondentId: string;
  caseType: string;
  disputeAmount: number;
  status: CaseStatus;
  arbitrationAgreement: string;
  applicationForm: string;
  evidenceList: Evidence[];
  createdAt: Date | string;
  updatedAt: Date | string;
  title: string;
  description: string;
  deadline?: Date | string;
  lastActivity?: Date | string;
}

export interface Evidence {
  id: string;
  caseId: string;
  uploaderId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  description: string;
  category: 'contract' | 'correspondence' | 'financial' | 'other';
  uploadedAt: Date;
}

// Arbitrator related types
export interface Arbitrator {
  id: string;
  name: string;
  title: string;
  specialties: string[];
  experience: number;
  qualifications: string[];
  availability: boolean;
  rating: number;
  profileImage: string;
  biography: string;
}

export interface ArbitrationTribunal {
  id: string;
  caseId: string;
  presiding: string;
  arbitrators: string[];
  status: 'forming' | 'confirmed' | 'active' | 'dissolved';
  formedAt: Date;
}

// Hearing related types
export interface HearingSession {
  id: string;
  caseId: string;
  sessionNumber: number;
  scheduledAt: Date;
  startedAt?: Date;
  endedAt?: Date;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  participants: HearingParticipant[];
  recordingUrl?: string;
  transcriptUrl?: string;
}

export interface HearingParticipant {
  id: string;
  sessionId: string;
  userId: string;
  role: 'applicant' | 'respondent' | 'arbitrator' | 'witness' | 'observer';
  joinedAt?: Date;
  leftAt?: Date;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
}

// Dashboard related types
export interface ActionItem {
  id: string;
  type: 'deadline' | 'task' | 'notification' | 'reminder';
  category?: 'identity' | 'training' | 'case' | 'system';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  deadline?: Date;
  caseId?: string;
  completed: boolean;
  createdAt: Date;
}

export interface CaseProgress {
  caseId: string;
  currentStage: number;
  totalStages: number;
  stages: {
    name: string;
    status: 'completed' | 'current' | 'pending';
    completedAt?: Date;
  }[];
}

// UI related types
export interface NavigationItem {
  name: string;
  href: string;
  icon: string;
  badge?: number;
  children?: NavigationItem[];
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
}
