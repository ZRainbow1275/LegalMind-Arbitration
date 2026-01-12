/**
 * 庭审数据适配器
 * 
 * 将庭审业务数据转换为画布数据，反之亦然
 */

import type {
  DataAdapter,
  HearingData,
  ValidationResult,
  AdapterMetadata,
} from '../types/embedding-interface';
import type { CanvasData, CanvasElement } from '../types/canvas-elements';
import { ElementFactory } from '../lib/element-factory';

export class HearingDataAdapter implements DataAdapter<HearingData> {
  // ==================== 元数据 ====================

  getMetadata(): AdapterMetadata {
    return {
      name: 'HearingDataAdapter',
      version: '1.0.0',
      supportedBusinessMode: 'hearing',
      description: '庭审数据适配器 - 将庭审数据转换为可视化画布',
    };
  }

  // ==================== 业务数据 → 画布数据 ====================

  toCanvas(hearingData: HearingData): CanvasData {
    const elements: Record<string, CanvasElement> = {};
    const rootElements: string[] = [];

    // 布局配置
    const layout = {
      participantY: 100,
      evidenceY: 300,
      timelineY: 500,
      decisionY: 700,
      spacing: 200,
    };

    // 1. 创建案件节点（中心）
    const caseNode = ElementFactory.createLegalNode(
      { x: 400, y: 50 },
      'case',
      `案件: ${hearingData.caseId}`,
      {
        metadata: {
          caseId: hearingData.caseId,
          hearingDate: hearingData.hearingDate,
        },
      }
    );
    elements[caseNode.id] = caseNode;
    rootElements.push(caseNode.id);

    // 2. 创建参与人节点
    hearingData.participants.forEach((participant, index) => {
      const x = 100 + index * layout.spacing;
      const y = layout.participantY;

      const participantNode = ElementFactory.createLegalNode(
        { x, y },
        'party',
        participant.name,
        {
          metadata: {
            participantId: participant.id,
            role: participant.role,
            organization: participant.organization,
          },
        }
      );

      elements[participantNode.id] = participantNode;
      rootElements.push(participantNode.id);

      // 创建连接线到案件节点
      const connection = ElementFactory.createConnection(
        participantNode.id,
        caseNode.id,
        {
          relationshipType: 'belongs_to',
          label: this.getRoleLabel(participant.role),
        }
      );
      elements[connection.id] = connection;
      rootElements.push(connection.id);
    });

    // 3. 创建证据节点
    hearingData.evidences.forEach((evidence, index) => {
      const x = 100 + index * layout.spacing;
      const y = layout.evidenceY;

      const evidenceNode = ElementFactory.createLegalNode(
        { x, y },
        'evidence',
        evidence.title,
        {
          metadata: {
            evidenceId: evidence.id,
            type: evidence.type,
            submittedBy: evidence.submittedBy,
            submittedAt: evidence.submittedAt,
            fileUrl: evidence.fileUrl,
          },
        }
      );

      elements[evidenceNode.id] = evidenceNode;
      rootElements.push(evidenceNode.id);

      // 查找提交人节点并创建连接
      const submitterNode = Object.values(elements).find(
        el => el.type === 'party' && el.metadata?.participantId === evidence.submittedBy
      );

      if (submitterNode) {
        const connection = ElementFactory.createConnection(
          submitterNode.id,
          evidenceNode.id,
          {
            relationshipType: 'references',
            label: '提交',
          }
        );
        elements[connection.id] = connection;
        rootElements.push(connection.id);
      }
    });

    // 4. 创建时间线节点
    hearingData.timeline.forEach((event, index) => {
      const x = 100 + index * layout.spacing;
      const y = layout.timelineY;

      const timelineNode = ElementFactory.createLegalNode(
        { x, y },
        'timeline',
        this.getEventTypeLabel(event.type),
        {
          metadata: {
            eventId: event.id,
            timestamp: event.timestamp,
            type: event.type,
            description: event.description,
          },
        }
      );

      elements[timelineNode.id] = timelineNode;
      rootElements.push(timelineNode.id);

      // 创建与相关证据的连接（如果存在）
      event.relatedEvidences?.forEach(evidenceId => {
        const evidenceNode = Object.values(elements).find(
          el => el.type === 'evidence' && el.metadata?.evidenceId === evidenceId
        );

        if (evidenceNode) {
          const connection = ElementFactory.createConnection(
            timelineNode.id,
            evidenceNode.id,
            {
              relationshipType: 'references',
              label: '涉及',
            }
          );
          elements[connection.id] = connection;
          rootElements.push(connection.id);
        }
      });
    });

    // 5. 创建裁决节点
    hearingData.decisions.forEach((decision, index) => {
      const x = 100 + index * layout.spacing;
      const y = layout.decisionY;

      const decisionNode = ElementFactory.createLegalNode(
        { x, y },
        'claim',
        `${decision.type === 'final' ? '最终裁决' : '临时裁决'}`,
        {
          metadata: {
            decisionId: decision.id,
            type: decision.type,
            content: decision.content,
            madeBy: decision.madeBy,
            madeAt: decision.madeAt,
          },
        }
      );

      elements[decisionNode.id] = decisionNode;
      rootElements.push(decisionNode.id);

      // 创建连接到案件节点
      const connection = ElementFactory.createConnection(
        decisionNode.id,
        caseNode.id,
        {
          relationshipType: 'supports',
          label: '裁决',
        }
      );
      elements[connection.id] = connection;
      rootElements.push(connection.id);
    });

    // 构建画布数据
    const canvasData: CanvasData = {
      id: `hearing-canvas-${hearingData.id}`,
      name: `庭审可视化 - ${hearingData.caseId}`,
      elements,
      rootElements,
      viewport: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      background: {
        color: '#ffffff',
        grid: {
          enabled: true,
          size: 20,
          color: '#e5e7eb',
        },
      },
      metadata: {
        createdAt: hearingData.createdAt,
        updatedAt: hearingData.updatedAt,
        version: '1.0.0',
        tags: ['hearing', 'legal', hearingData.caseId],
      },
    };

    return canvasData;
  }

  // ==================== 画布数据 → 业务数据 ====================

  fromCanvas(canvasData: CanvasData): HearingData {
    // 从画布元素中提取业务数据
    const elements = Object.values(canvasData.elements);

    // 提取案件信息
    const caseNode = elements.find(el => el.type === 'case');
    const caseId = caseNode?.metadata?.caseId || 'unknown';
    const hearingDate = caseNode?.metadata?.hearingDate || new Date().toISOString();

    // 提取参与人
    const participants = elements
      .filter(el => el.type === 'party')
      .map(el => ({
        id: el.metadata?.participantId || el.id,
        name: (el as any).label || 'Unknown',
        role: el.metadata?.role || 'witness',
        organization: el.metadata?.organization,
      }));

    // 提取证据
    const evidences = elements
      .filter(el => el.type === 'evidence')
      .map(el => ({
        id: el.metadata?.evidenceId || el.id,
        type: el.metadata?.type || 'document',
        title: (el as any).label || 'Unknown',
        description: el.metadata?.description || '',
        submittedBy: el.metadata?.submittedBy || '',
        submittedAt: el.metadata?.submittedAt || new Date().toISOString(),
        fileUrl: el.metadata?.fileUrl,
      }));

    // 提取时间线
    const timeline = elements
      .filter(el => el.type === 'timeline')
      .map(el => ({
        id: el.metadata?.eventId || el.id,
        timestamp: el.metadata?.timestamp || new Date().toISOString(),
        type: el.metadata?.type || 'statement',
        description: el.metadata?.description || '',
        relatedParticipants: el.metadata?.relatedParticipants || [],
        relatedEvidences: el.metadata?.relatedEvidences || [],
      }));

    // 提取裁决
    const decisions = elements
      .filter(el => el.type === 'claim')
      .map(el => ({
        id: el.metadata?.decisionId || el.id,
        type: el.metadata?.type || 'interim',
        content: el.metadata?.content || '',
        madeBy: el.metadata?.madeBy || '',
        madeAt: el.metadata?.madeAt || new Date().toISOString(),
      }));

    const hearingData: HearingData = {
      id: canvasData.id.replace('hearing-canvas-', ''),
      type: 'hearing',
      caseId,
      hearingDate,
      participants,
      evidences,
      timeline,
      decisions,
      metadata: canvasData.metadata || {},
      createdAt: canvasData.metadata?.createdAt || new Date().toISOString(),
      updatedAt: canvasData.metadata?.updatedAt || new Date().toISOString(),
    };

    return hearingData;
  }

  // ==================== 验证 ====================

  validate(hearingData: HearingData): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    // 验证必填字段
    if (!hearingData.id) {
      errors.push({
        field: 'id',
        message: '庭审ID不能为空',
        code: 'REQUIRED_FIELD',
      });
    }

    if (!hearingData.caseId) {
      errors.push({
        field: 'caseId',
        message: '案件ID不能为空',
        code: 'REQUIRED_FIELD',
      });
    }

    if (!hearingData.hearingDate) {
      errors.push({
        field: 'hearingDate',
        message: '庭审日期不能为空',
        code: 'REQUIRED_FIELD',
      });
    }

    // 验证参与人
    if (hearingData.participants.length === 0) {
      warnings.push({
        field: 'participants',
        message: '建议至少添加一个参与人',
        code: 'RECOMMENDED_FIELD',
      });
    }

    // 验证每个参与人的必填字段
    hearingData.participants.forEach((participant, index) => {
      if (!participant.name) {
        errors.push({
          field: `participants[${index}].name`,
          message: '参与人姓名不能为空',
          code: 'REQUIRED_FIELD',
        });
      }
      if (!participant.role) {
        errors.push({
          field: `participants[${index}].role`,
          message: '参与人角色不能为空',
          code: 'REQUIRED_FIELD',
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ==================== 模板 ====================

  getTemplate(): CanvasData {
    // 创建一个空的庭审模板
    const elements: Record<string, CanvasElement> = {};
    const rootElements: string[] = [];

    // 创建标题
    const titleNode = ElementFactory.createText(
      { x: 400, y: 50 },
      '庭审可视化模板',
      {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#f97316',
      }
    );
    elements[titleNode.id] = titleNode;
    rootElements.push(titleNode.id);

    // 创建案件节点示例
    const caseNode = ElementFactory.createLegalNode(
      { x: 400, y: 150 },
      'case',
      '案件信息'
    );
    elements[caseNode.id] = caseNode;
    rootElements.push(caseNode.id);

    // 创建参与人节点示例
    const participantNode = ElementFactory.createLegalNode(
      { x: 200, y: 300 },
      'party',
      '参与人'
    );
    elements[participantNode.id] = participantNode;
    rootElements.push(participantNode.id);

    // 创建证据节点示例
    const evidenceNode = ElementFactory.createLegalNode(
      { x: 600, y: 300 },
      'evidence',
      '证据材料'
    );
    elements[evidenceNode.id] = evidenceNode;
    rootElements.push(evidenceNode.id);

    return {
      id: 'template-hearing',
      name: '庭审模板',
      elements,
      rootElements,
      viewport: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      background: {
        color: '#ffffff',
        grid: {
          enabled: true,
          size: 20,
          color: '#f3f4f6',
        },
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0.0',
      },
    };
  }

  // ==================== 辅助方法 ====================

  private getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      plaintiff: '原告',
      defendant: '被告',
      arbitrator: '仲裁员',
      witness: '证人',
      lawyer: '律师',
    };
    return labels[role] || role;
  }

  private getEventTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      statement: '陈述',
      evidence_submission: '提交证据',
      objection: '异议',
      ruling: '裁决',
    };
    return labels[type] || type;
  }
}

