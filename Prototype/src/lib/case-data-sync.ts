/**
 * 案件数据同步服务
 * 
 * 负责画布节点与案件数据的双向同步
 */

import { LegalNode } from '../components/workspace/types';

/**
 * 节点数据转换器
 */
export class NodeDataConverter {
  /**
   * 将案件数据转换为案件节点
   */
  static caseToNode(caseData: any, position: { x: number; y: number }): LegalNode {
    return {
      id: `case-${caseData.id}`,
      type: 'legal-case',
      points: [[position.x, position.y], [position.x + 200, position.y + 100]] as any, // Plait requirement
      children: [],
      data: {
        title: caseData.title,
        description: caseData.description,
        status: caseData.status,
        position,
        connections: [],
        createdAt: caseData.createdAt,
        metadata: {
          caseNumber: caseData.caseNumber,
          caseType: '商事仲裁',
          filingDate: caseData.createdAt,
          disputeAmount: caseData.disputeAmount,
          // Store original ID if needed, maybe in a custom field or rely on node ID parsing
        } as any, // Cast to any to avoid strict metadata check if fields missing
      },
    };
  }

  /**
   * 将当事人数据转换为当事人节点
   */
  static participantToNode(
    participant: any,
    role: '申请人' | '被申请人',
    position: { x: number; y: number }
  ): LegalNode {
    return {
      id: `person-${participant.id}`,
      type: 'legal-person',
      points: [[position.x, position.y], [position.x + 150, position.y + 80]] as any,
      children: [],
      data: {
        title: participant.profile?.realName || participant.profile?.companyName || role,
        description: role,
        status: 'active', // Mapped from '进行中'
        position,
        connections: [],
        metadata: {
          role,
          companyName: participant.profile?.companyName,
          legalRepresentative: participant.profile?.realName,
          contactInfo: [
            { type: 'email', value: participant.email, label: 'Email' },
            { type: 'phone', value: participant.phone, label: 'Phone' }
          ],
        } as any,
      },
    };
  }

  /**
   * 将节点数据转换回案件数据
   */
  static nodeToCase(node: LegalNode): any {
    if (node.type !== 'legal-case') {
      throw new Error('节点类型不是案件节点');
    }

    const metadata = node.data.metadata as any;
    return {
      id: node.id.replace('case-', ''),
      caseNumber: metadata.caseNumber,
      title: node.data.title,
      description: node.data.description,
      status: node.data.status,
      disputeAmount: metadata.disputeAmount,
      createdAt: node.data.createdAt,
    };
  }

  /**
   * 将节点数据转换回当事人数据
   */
  static nodeToParticipant(node: LegalNode): any {
    if (node.type !== 'legal-person') {
      throw new Error('节点类型不是当事人节点');
    }

    const metadata = node.data.metadata as any;
    const email = metadata.contactInfo?.find((c: any) => c.type === 'email')?.value;
    const phone = metadata.contactInfo?.find((c: any) => c.type === 'phone')?.value;

    return {
      id: node.id.replace('person-', ''),
      email,
      phone,
      profile: {
        realName: metadata.legalRepresentative,
        companyName: metadata.companyName,
      },
    };
  }
}

/**
 * 案件数据同步服务
 */
export class CaseDataSync {
  private eventListeners: ((event: CaseSyncEvent) => void)[] = [];

  /**
   * 同步案件数据到画布
   */
  async syncCaseToCanvas(caseId: string): Promise<LegalNode[]> {
    try {
      console.log(`[CaseDataSync] 同步案件数据到画布: ${caseId}`);

      // 从API获取案件数据
      const response = await fetch(`/api/cases/${caseId}`);
      if (!response.ok) {
        throw new Error(`获取案件数据失败: ${response.statusText}`);
      }

      const caseData = await response.json();
      const nodes: LegalNode[] = [];

      // 创建案件节点
      nodes.push(NodeDataConverter.caseToNode(caseData, { x: 400, y: 100 }));

      // 创建申请人节点
      if (caseData.applicant) {
        nodes.push(
          NodeDataConverter.participantToNode(
            caseData.applicant,
            '申请人',
            { x: 100, y: 300 }
          )
        );
      }

      // 创建被申请人节点
      if (caseData.respondent) {
        nodes.push(
          NodeDataConverter.participantToNode(
            caseData.respondent,
            '被申请人',
            { x: 700, y: 300 }
          )
        );
      }

      this.emitEvent({
        type: 'sync-to-canvas',
        caseId,
        timestamp: new Date(),
        data: nodes,
      });

      console.log(`[CaseDataSync] 已同步 ${nodes.length} 个节点到画布`);
      return nodes;
    } catch (error) {
      console.error('[CaseDataSync] 同步到画布失败:', error);
      this.emitEvent({
        type: 'error',
        caseId,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : '未知错误',
      });
      throw error;
    }
  }

  /**
   * 同步画布数据到案件
   */
  async syncCanvasToCase(caseId: string, nodes: LegalNode[]): Promise<void> {
    try {
      console.log(`[CaseDataSync] 同步画布数据到案件: ${caseId}`);

      // 提取案件节点
      const caseNode = nodes.find(n => n.type === 'legal-case');
      if (!caseNode) {
        throw new Error('未找到案件节点');
      }

      // 转换为案件数据
      const caseData = NodeDataConverter.nodeToCase(caseNode);

      // 提取当事人节点
      const participantNodes = nodes.filter(n => n.type === 'legal-person');
      const participants = participantNodes.map(n =>
        NodeDataConverter.nodeToParticipant(n)
      );

      // 发送到API（模拟）
      console.log('[CaseDataSync] 案件数据:', caseData);
      console.log('[CaseDataSync] 当事人数据:', participants);

      this.emitEvent({
        type: 'sync-to-case',
        caseId,
        timestamp: new Date(),
        data: { caseData, participants },
      });

      console.log('[CaseDataSync] 同步到案件完成');
    } catch (error) {
      console.error('[CaseDataSync] 同步到案件失败:', error);
      this.emitEvent({
        type: 'error',
        caseId,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : '未知错误',
      });
      throw error;
    }
  }

  /**
   * 更新案件节点
   */
  async updateCaseNode(caseId: string, updates: Partial<any>): Promise<void> {
    try {
      console.log(`[CaseDataSync] 更新案件节点: ${caseId}`, updates);

      // 发送到API（模拟）
      this.emitEvent({
        type: 'update',
        caseId,
        timestamp: new Date(),
        data: updates,
      });

      console.log('[CaseDataSync] 更新案件节点完成');
    } catch (error) {
      console.error('[CaseDataSync] 更新案件节点失败:', error);
      throw error;
    }
  }

  /**
   * 监听同步事件
   */
  addEventListener(listener: (event: CaseSyncEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(listener: (event: CaseSyncEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * 触发事件
   */
  private emitEvent(event: CaseSyncEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[CaseDataSync] 事件监听器错误:', error);
      }
    });
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.eventListeners = [];
  }
}

/**
 * 案件同步事件
 */
export interface CaseSyncEvent {
  type: 'sync-to-canvas' | 'sync-to-case' | 'update' | 'error';
  caseId: string;
  timestamp: Date;
  data?: any;
  error?: string;
}

/**
 * 全局案件数据同步实例
 */
export const caseDataSync = new CaseDataSync();

