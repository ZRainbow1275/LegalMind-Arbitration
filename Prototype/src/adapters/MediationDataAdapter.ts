/**
 * 调解数据适配器
 * 
 * 将调解案件数据转换为画布数据，反之亦然
 */

import type {
  DataAdapter,
  MediationData,
  ValidationResult,
  AdapterMetadata,
} from '../types/embedding-interface';
import type { CanvasData, CanvasElement } from '../types/canvas-elements';
import { ElementFactory } from '../lib/element-factory';

export class MediationDataAdapter implements DataAdapter<MediationData> {
  // ==================== 元数据 ====================

  getMetadata(): AdapterMetadata {
    return {
      name: 'MediationDataAdapter',
      version: '1.0.0',
      supportedBusinessMode: 'mediation',
      description: '调解数据适配器 - 将调解案件数据转换为可视化画布',
    };
  }

  // ==================== 业务数据 → 画布数据 ====================

  toCanvas(mediationData: MediationData): CanvasData {
    const elements: Record<string, CanvasElement> = {};
    const rootElements: string[] = [];

    // 布局配置
    const layout = {
      caseY: 50,
      partyY: 200,
      disputeY: 400,
      proposalY: 600,
      agreementY: 800,
      spacing: 250,
    };

    // 1. 创建案件节点（中心）
    const caseNode = ElementFactory.createLegalNode(
      { x: 500, y: layout.caseY },
      'case',
      `调解案件: ${mediationData.caseId}`,
      {
        metadata: {
          caseId: mediationData.caseId,
          type: 'mediation',
        },
      }
    );
    elements[caseNode.id] = caseNode;
    rootElements.push(caseNode.id);

    // 2. 创建调解员节点
    const mediatorNode = ElementFactory.createLegalNode(
      { x: 500, y: layout.caseY + 100 },
      'person',
      mediationData.mediator.name,
      {
        metadata: {
          mediatorId: mediationData.mediator.id,
          organization: mediationData.mediator.organization,
          certification: mediationData.mediator.certification,
        },
      }
    );
    elements[mediatorNode.id] = mediatorNode;
    rootElements.push(mediatorNode.id);

    // 创建连接到案件节点
    const mediatorConnection = ElementFactory.createConnection(
      mediatorNode.id,
      caseNode.id,
      {
        relationshipType: 'supports', // 'manages' is not valid, using 'supports' as placeholder or need to add 'manages' to type
        label: '调解员',
      }
    );
    elements[mediatorConnection.id] = mediatorConnection;
    rootElements.push(mediatorConnection.id);

    // 3. 创建当事方节点
    mediationData.parties.forEach((party, index) => {
      const x = 200 + index * layout.spacing;
      const y = layout.partyY;

      const partyNode = ElementFactory.createLegalNode(
        { x, y },
        'party',
        party.name,
        {
          metadata: {
            partyId: party.id,
            type: party.type,
            interests: party.interests,
            concerns: party.concerns,
          },
        }
      );

      elements[partyNode.id] = partyNode;
      rootElements.push(partyNode.id);

      // 创建连接到案件节点
      const connection = ElementFactory.createConnection(
        partyNode.id,
        caseNode.id,
        {
          relationshipType: 'belongs_to',
          label: '当事方',
        }
      );
      elements[connection.id] = connection;
      rootElements.push(connection.id);
    });

    // 3. 创建争议焦点节点
    mediationData.disputes.forEach((dispute, index) => {
      const x = 200 + index * layout.spacing;
      const y = layout.disputeY;

      const disputeNode = ElementFactory.createLegalNode(
        { x, y },
        'claim',
        dispute.title,
        {
          metadata: {
            disputeId: dispute.id,
            category: dispute.category,
            severity: dispute.severity,
            description: dispute.description,
          },
        }
      );

      elements[disputeNode.id] = disputeNode;
      rootElements.push(disputeNode.id);

      // 创建与相关当事方的连接
      dispute.relatedParties?.forEach(partyId => {
        const partyNode = Object.values(elements).find(
          el => el.type === 'party' && el.metadata?.partyId === partyId
        );

        if (partyNode) {
          const connection = ElementFactory.createConnection(
            disputeNode.id,
            partyNode.id,
            {
              relationshipType: 'opposes',
              label: '涉及',
              strength: this.getSeverityStrength(dispute.severity),
            }
          );
          elements[connection.id] = connection;
          rootElements.push(connection.id);
        }
      });
    });

    // 4. 创建调解方案节点
    mediationData.proposals.forEach((proposal, index) => {
      const x = 200 + index * layout.spacing;
      const y = layout.proposalY;

      const proposalNode = ElementFactory.createLegalNode(
        { x, y },
        'evidence',
        proposal.title,
        {
          metadata: {
            proposalId: proposal.id,
            content: proposal.content,
            proposedBy: proposal.proposedBy,
            proposedAt: proposal.proposedAt,
            status: proposal.status,
          },
        }
      );

      elements[proposalNode.id] = proposalNode;
      rootElements.push(proposalNode.id);

      // 创建与相关争议的连接
      proposal.relatedDisputes?.forEach(disputeId => {
        const disputeNode = Object.values(elements).find(
          el => el.type === 'claim' && el.metadata?.disputeId === disputeId
        );

        if (disputeNode) {
          const connection = ElementFactory.createConnection(
            proposalNode.id,
            disputeNode.id,
            {
              relationshipType: 'supports',
              label: '解决方案',
            }
          );
          elements[connection.id] = connection;
          rootElements.push(connection.id);
        }
      });
    });

    // 5. 创建调解协议节点
    mediationData.agreements.forEach((agreement, index) => {
      const x = 200 + index * layout.spacing;
      const y = layout.agreementY;

      const agreementNode = ElementFactory.createLegalNode(
        { x, y },
        'law',
        agreement.title,
        {
          metadata: {
            agreementId: agreement.id,
            content: agreement.content,
            agreedBy: agreement.agreedBy,
            agreedAt: agreement.agreedAt,
            terms: agreement.terms,
          },
        }
      );

      elements[agreementNode.id] = agreementNode;
      rootElements.push(agreementNode.id);

      // 创建连接到案件节点
      const connection = ElementFactory.createConnection(
        agreementNode.id,
        caseNode.id,
        {
          relationshipType: 'supports',
          label: '调解协议',
        }
      );
      elements[connection.id] = connection;
      rootElements.push(connection.id);
    });

    // 构建画布数据
    const canvasData: CanvasData = {
      id: `mediation-canvas-${mediationData.id}`,
      name: `调解案件可视化 - ${mediationData.caseId}`,
      elements,
      rootElements,
      viewport: {
        x: 0,
        y: 0,
        zoom: 0.8,
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
        createdAt: mediationData.createdAt,
        updatedAt: mediationData.updatedAt,
        version: '1.0.0',
        tags: ['mediation', 'legal', mediationData.caseId],
      },
    };

    return canvasData;
  }

  // ==================== 画布数据 → 业务数据 ====================

  fromCanvas(canvasData: CanvasData): MediationData {
    const elements = Object.values(canvasData.elements);

    // 提取案件信息
    const caseNode = elements.find(el => el.type === 'case');
    const caseId = caseNode?.metadata?.caseId || 'unknown';

    // 提取调解员
    const mediatorNode = elements.find(el => el.type === 'person');
    const mediator = mediatorNode ? {
      id: mediatorNode.metadata?.mediatorId || mediatorNode.id,
      name: (mediatorNode as any).label || 'Unknown',
      organization: mediatorNode.metadata?.organization,
      certification: mediatorNode.metadata?.certification,
    } : {
      id: 'unknown',
      name: 'Unknown',
    };

    // 提取当事方
    const parties = elements
      .filter(el => el.type === 'party')
      .map(el => ({
        id: el.metadata?.partyId || el.id,
        name: (el as any).label || 'Unknown',
        type: el.metadata?.type || 'individual',
        interests: el.metadata?.interests || [],
        concerns: el.metadata?.concerns || [],
      }));

    // 提取争议焦点
    const disputes = elements
      .filter(el => el.type === 'claim')
      .map(el => ({
        id: el.metadata?.disputeId || el.id,
        title: (el as any).label || 'Unknown',
        description: el.metadata?.description || '',
        category: el.metadata?.category || 'general',
        severity: el.metadata?.severity || 'medium',
        relatedParties: el.metadata?.relatedParties || [],
      }));

    // 提取调解方案
    const proposals = elements
      .filter(el => el.type === 'evidence' && el.metadata?.proposalId)
      .map(el => ({
        id: el.metadata?.proposalId || el.id,
        title: (el as any).label || 'Unknown',
        content: el.metadata?.content || '',
        proposedBy: el.metadata?.proposedBy || '',
        proposedAt: el.metadata?.proposedAt || new Date().toISOString(),
        status: el.metadata?.status || 'pending',
        relatedDisputes: el.metadata?.relatedDisputes || [],
      }));

    // 提取调解协议
    const agreements = elements
      .filter(el => el.type === 'law')
      .map(el => ({
        id: el.metadata?.agreementId || el.id,
        title: (el as any).label || 'Unknown',
        content: el.metadata?.content || '',
        agreedBy: el.metadata?.agreedBy || [],
        agreedAt: el.metadata?.agreedAt || new Date().toISOString(),
        terms: el.metadata?.terms || [],
      }));

    const mediationData: MediationData = {
      id: canvasData.id.replace('mediation-canvas-', ''),
      type: 'mediation',
      caseId,
      mediator,
      parties,
      disputes,
      proposals,
      agreements,
      metadata: canvasData.metadata || {},
      createdAt: canvasData.metadata?.createdAt || new Date().toISOString(),
      updatedAt: canvasData.metadata?.updatedAt || new Date().toISOString(),
    };

    return mediationData;
  }

  // ==================== 验证 ====================

  validate(mediationData: MediationData): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    if (!mediationData.caseId) {
      errors.push({
        field: 'caseId',
        message: '案件ID不能为空',
        code: 'REQUIRED_FIELD',
      });
    }

    if (mediationData.parties.length < 2) {
      errors.push({
        field: 'parties',
        message: '调解案件至少需要两个当事方',
        code: 'INSUFFICIENT_PARTIES',
      });
    }

    if (mediationData.disputes.length === 0) {
      warnings.push({
        field: 'disputes',
        message: '建议至少添加一个争议焦点',
        code: 'RECOMMENDED_FIELD',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ==================== 辅助方法 ====================

  private getSeverityStrength(severity: string): number {
    const strengths: Record<string, number> = {
      low: 0.3,
      medium: 0.6,
      high: 1.0,
    };
    return strengths[severity] || 0.5;
  }

  // ==================== 模板 ====================

  getTemplate(): CanvasData {
    // 创建一个空的调解模板
    const elements: Record<string, CanvasElement> = {};
    const rootElements: string[] = [];

    // 创建标题
    const titleNode = ElementFactory.createText(
      { x: 400, y: 50 },
      '调解可视化模板',
      {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#f97316',
      }
    );
    elements[titleNode.id] = titleNode;
    rootElements.push(titleNode.id);

    // 创建调解员节点示例
    const mediatorNode = ElementFactory.createLegalNode(
      { x: 400, y: 150 },
      'person',
      '调解员'
    );
    elements[mediatorNode.id] = mediatorNode;
    rootElements.push(mediatorNode.id);

    // 创建当事人节点示例
    const party1Node = ElementFactory.createLegalNode(
      { x: 200, y: 300 },
      'party',
      '甲方'
    );
    elements[party1Node.id] = party1Node;
    rootElements.push(party1Node.id);

    const party2Node = ElementFactory.createLegalNode(
      { x: 600, y: 300 },
      'party',
      '乙方'
    );
    elements[party2Node.id] = party2Node;
    rootElements.push(party2Node.id);

    // 创建争议节点示例
    const disputeNode = ElementFactory.createLegalNode(
      { x: 400, y: 450 },
      'claim',
      '争议焦点'
    );
    elements[disputeNode.id] = disputeNode;
    rootElements.push(disputeNode.id);

    return {
      id: 'template-mediation',
      name: '调解模板',
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
}

