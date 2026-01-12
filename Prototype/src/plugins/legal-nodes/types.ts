import { PlaitElement } from '@plait/core';

import { LegalNode, CaseInfoMetadata, PersonMetadata, DocumentMetadata, HearingMetadata, MediationMetadata, TimelineMetadata, IssueMetadata, EvidenceMetadata } from '../../components/workspace/types';

// Re-export types from workspace/types
export type { LegalNode, CaseInfoMetadata, PersonMetadata, DocumentMetadata, HearingMetadata, MediationMetadata, TimelineMetadata, IssueMetadata, EvidenceMetadata };

// 法律节点类型枚举
export enum LegalNodeTypes {
  case = 'legal-case',
  person = 'legal-person',
  document = 'legal-document',
  evidence = 'legal-evidence',
  issue = 'legal-issue',
  hearing = 'legal-hearing',
  mediation = 'legal-mediation',
  timeline = 'legal-timeline',
  process = 'legal-process',
  aiAssistant = 'legal-ai-assistant'
}

// 法律节点形状枚举
export enum LegalNodeShapes {
  caseRectangle = 'case-rectangle',
  personCircle = 'person-circle',
  documentShape = 'document-shape',
  evidenceShape = 'evidence-shape',
  issueShape = 'issue-shape',
  hearingCourt = 'hearing-court',
  mediationHandshake = 'mediation-handshake',
  timelineDiamond = 'timeline-diamond',
  processHexagon = 'process-hexagon',
  aiStar = 'ai-star'
}

// Helper interfaces for specific node types (optional, but useful for type narrowing)
export interface LegalCaseNode extends LegalNode {
  type: 'legal-case';
  data: LegalNode['data'] & { metadata: CaseInfoMetadata };
}

export interface LegalPersonNode extends LegalNode {
  type: 'legal-person';
  data: LegalNode['data'] & { metadata: PersonMetadata };
}

export interface LegalDocumentNode extends LegalNode {
  type: 'legal-document';
  data: LegalNode['data'] & { metadata: DocumentMetadata };
}

export interface LegalEvidenceNode extends LegalNode {
  type: 'legal-evidence';
  data: LegalNode['data'] & { metadata: EvidenceMetadata };
}

export interface LegalIssueNode extends LegalNode {
  type: 'legal-issue';
  data: LegalNode['data'] & { metadata: IssueMetadata };
}

export interface LegalHearingNode extends LegalNode {
  type: 'legal-hearing';
  data: LegalNode['data'] & { metadata: HearingMetadata };
}

export interface LegalMediationNode extends LegalNode {
  type: 'legal-mediation';
  data: LegalNode['data'] & { metadata: MediationMetadata };
}

export interface LegalTimelineNode extends LegalNode {
  type: 'legal-timeline';
  data: LegalNode['data'] & { metadata: TimelineMetadata };
}

// 法律连接线类型 (Keeping this as it might not be in workspace/types or might be different)
export interface LegalConnection extends PlaitElement {
  type: 'legal-connection';
  sourceId: string;
  targetId: string;
  connectionType: 'related-to' | 'depends-on' | 'conflicts-with' | 'supports' | 'references' | 'assigned-to';
  label?: string;
  strength?: 'weak' | 'medium' | 'strong';
  bidirectional?: boolean;
  metadata?: {
    createdBy?: string;
    createdAt?: string;
    notes?: string;
  };
}


export interface LegalWorkspaceConfig {
  theme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
  };
  nodeDefaults: Record<string, {
    fill: string;
    strokeColor: string;
    strokeWidth: number;
    opacity: number;
  }>;
  connectionDefaults: {
    connectionType: string;
    strength: string;
    bidirectional: boolean;
  };
  aiSettings: {
    enabled: boolean;
    autoSuggestions: boolean;
    language: string;
  };
}
