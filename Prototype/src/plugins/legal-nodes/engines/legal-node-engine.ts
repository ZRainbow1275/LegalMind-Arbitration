import { PlaitBoard, Point, RectangleClient } from '@plait/core';
import { LegalNode, LegalNodeTypes, CaseInfoMetadata, PersonMetadata, DocumentMetadata, TimelineMetadata, HearingMetadata, MediationMetadata } from '../types';

// 法律节点渲染引擎
export class LegalNodeEngine {
  static getNodeBounds(node: LegalNode): RectangleClient {
    // LegalNode from workspace/types extends PlaitElement which has points
    // But PlaitElement points might be different from what we had.
    // Assuming PlaitElement has points: Point[]
    const [start, end] = node.points || [[0, 0], [0, 0]];
    return {
      x: Math.min(start[0], end[0]),
      y: Math.min(start[1], end[1]),
      width: Math.abs(end[0] - start[0]),
      height: Math.abs(end[1] - start[1])
    };
  }

  static getNodeCenter(node: LegalNode): Point {
    const bounds = this.getNodeBounds(node);
    return [
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2
    ];
  }

  static getDefaultSize(nodeType: LegalNodeTypes): { width: number; height: number } {
    switch (nodeType) {
      case LegalNodeTypes.case:
        return { width: 160, height: 90 }; // Reduced from 200x120
      case LegalNodeTypes.person:
        return { width: 80, height: 80 }; // Reduced from 100x100
      case LegalNodeTypes.document:
        return { width: 120, height: 150 }; // Reduced from 160x200
      case LegalNodeTypes.timeline:
        return { width: 100, height: 60 }; // Reduced from 120x80
      case LegalNodeTypes.process:
        return { width: 140, height: 100 }; // Reduced from 180x140
      case LegalNodeTypes.aiAssistant:
        return { width: 100, height: 100 }; // Reduced from 140x140
      default:
        return { width: 120, height: 80 }; // Reduced from 150x100
    }
  }

  static getDefaultColors(nodeType: LegalNodeTypes): { fill: string; stroke: string } {
    switch (nodeType) {
      case LegalNodeTypes.case:
        return {
          fill: '#e3f2fd',
          stroke: '#1976d2'
        };
      case LegalNodeTypes.person:
        return {
          fill: '#e8f5e8',
          stroke: '#4caf50'
        };
      case LegalNodeTypes.document:
        return {
          fill: '#fff3e0',
          stroke: '#ff9800'
        };
      case LegalNodeTypes.timeline:
        return {
          fill: '#f3e5f5',
          stroke: '#9c27b0'
        };
      case LegalNodeTypes.process:
        return {
          fill: '#ffebee',
          stroke: '#f44336'
        };
      case LegalNodeTypes.aiAssistant:
        return {
          fill: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          stroke: '#5e72e4'
        };
      default:
        return {
          fill: '#f5f5f5',
          stroke: '#666666'
        };
    }
  }

  static getNodeIcon(nodeType: LegalNodeTypes): string {
    switch (nodeType) {
      case LegalNodeTypes.case:
        return '📋';
      case LegalNodeTypes.person:
        return '👤';
      case LegalNodeTypes.document:
        return '📄';
      case LegalNodeTypes.timeline:
        return '⏰';
      case LegalNodeTypes.process:
        return '⚙️';
      case LegalNodeTypes.aiAssistant:
        return '🤖';
      default:
        return '📌';
    }
  }

  static getNodeTitle(node: LegalNode): string {
    if (!node.data) return '未知节点';

    // If title is directly available in data
    if (node.data.title) return node.data.title;

    // Fallback to metadata if title is empty (though title should be populated)
    const metadata = node.data.metadata;
    if (!metadata) return '未知节点';

    switch (node.type) {
      case LegalNodeTypes.case:
        return (metadata as CaseInfoMetadata).caseNumber || '新案件';
      case LegalNodeTypes.person:
        // PersonMetadata doesn't have name? Let's check workspace/types.ts
        // It has role, company, representative. Maybe name is title?
        // In workspace/types.ts, PersonMetadata has role, company, representative.
        // But LegalNode.data has title. So we should use node.data.title.
        return node.data.title || '新人物';
      case LegalNodeTypes.document:
        return node.data.title || '新文档';
      case LegalNodeTypes.timeline:
        return node.data.title || '新事件';
      default:
        return node.data.title || '未知节点';
    }
  }

  static getNodeSubtitle(node: LegalNode): string {
    if (!node.data || !node.data.metadata) return '';
    const metadata = node.data.metadata;

    switch (node.type) {
      case LegalNodeTypes.case: {
        const caseMeta = metadata as CaseInfoMetadata;
        return `${caseMeta.caseType} | ${node.data.status}`;
      }
      case LegalNodeTypes.person: {
        const personMeta = metadata as PersonMetadata;
        return personMeta.role;
      }
      case LegalNodeTypes.document: {
        const docMeta = metadata as DocumentMetadata;
        return `${docMeta.documentType} | ${node.data.status}`;
      }
      case LegalNodeTypes.timeline: {
        const timelineMeta = metadata as TimelineMetadata;
        return `${timelineMeta.eventType} | ${timelineMeta.eventDate}`;
      }
      case LegalNodeTypes.process:
        return `${node.data.status}`;
      case LegalNodeTypes.aiAssistant:
        return 'AI Assistant';
      default:
        return '';
    }
  }

  static createNode(
    nodeType: LegalNodeTypes,
    position: Point,
    _board: PlaitBoard
  ): LegalNode {
    const size = this.getDefaultSize(nodeType);
    const points: [Point, Point] = [
      position,
      [position[0] + size.width, position[1] + size.height]
    ];

    const baseData = {
      title: 'New Node',
      description: '',
      status: 'active' as const,
      position: { x: position[0], y: position[1] },
      connections: []
    };

    let metadata: any = {};

    switch (nodeType) {
      case LegalNodeTypes.case:
        baseData.title = '新案件';
        metadata = {
          caseNumber: `CASE-${Date.now()}`,
          caseType: '合同纠纷',
          amount: 0,
          filingDate: new Date().toISOString().split('T')[0]
        } as CaseInfoMetadata;
        break;

      case LegalNodeTypes.person:
        baseData.title = '新人物';
        metadata = {
          role: '申请人',
          contactInfo: []
        } as PersonMetadata;
        break;

      case LegalNodeTypes.document:
        baseData.title = '新文档';
        metadata = {
          documentType: '证据',
          uploadDate: new Date().toISOString(),
          fileSize: 0,
          isEvidence: false
        } as DocumentMetadata;
        break;

      case LegalNodeTypes.timeline:
        baseData.title = '新事件';
        metadata = {
          eventDate: new Date().toISOString().split('T')[0],
          eventType: '事件',
          importance: 'medium'
        } as TimelineMetadata;
        break;

      case LegalNodeTypes.hearing:
        baseData.title = '新庭审';
        metadata = {
          hearingDate: new Date().toISOString(),
          hearingType: '现场庭审',
          location: '第一仲裁庭',
          participants: []
        } as HearingMetadata;
        break;

      case LegalNodeTypes.mediation:
        baseData.title = '新调解';
        metadata = {
          mediationDate: new Date().toISOString(),
          mediator: '未指定',
          result: 'pending'
        } as MediationMetadata;
        break;

      // For other types not fully defined in workspace/types, we use a generic object or cast carefully
      // Process and AI Assistant are in LegalNodeTypes but maybe not in LegalNode union in workspace/types?
      // workspace/types.ts has: 'legal-case' | 'legal-person' | 'legal-document' | 'legal-hearing' | 'legal-mediation' | 'legal-timeline'
      // It MISSES 'legal-process' and 'legal-ai-assistant'.
      // We should probably add them to workspace/types.ts or just handle them gracefully here.
      // For now, we'll treat them as generic nodes or map to one of the existing ones if we must,
      // but better to just return a valid LegalNode.
      // If the type is not in the union, TS will complain.
      // Let's assume we only create supported types for now, or cast to any to bypass if needed for prototype.
    }

    return {
      id: `legal-${nodeType}-${Date.now()}`,
      type: nodeType as any, // Cast to any to avoid strict union check if types are missing
      points,
      children: [], // PlaitElement needs children usually? Or maybe not for void nodes.
      data: {
        ...baseData,
        metadata
      }
    } as LegalNode;
  }



  static isLegalNode(element: any): element is LegalNode {
    return element &&
      element.type &&
      Object.values(LegalNodeTypes).includes(element.type) &&
      element.data !== undefined;
  }

  static getStatusColor(status: string): string {
    switch (status) {
      case 'pending':
      case 'not-started':
      case 'draft':
        return '#ffa726'; // 橙色
      case 'active':
      case 'in-progress':
      case 'review':
        return '#42a5f5'; // 蓝色
      case 'completed':
      case 'closed':
      case 'approved':
        return '#66bb6a'; // 绿色
      case 'on-hold':
      case 'skipped':
      case 'cancelled':
        return '#ef5350'; // 红色
      default:
        return '#9e9e9e'; // 灰色
    }
  }

  static getPriorityColor(priority: string): string {
    switch (priority) {
      case 'low':
        return '#81c784'; // 浅绿色
      case 'medium':
        return '#ffb74d'; // 橙色
      case 'high':
        return '#e57373'; // 浅红色
      case 'critical':
        return '#f44336'; // 深红色
      default:
        return '#9e9e9e'; // 灰色
    }
  }
}
