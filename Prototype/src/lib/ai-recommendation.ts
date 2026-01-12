/**
 * AI智能推荐服务
 *
 * 基于案件数据和画布状态提供智能推荐
 */

import { LegalNode } from '../interfaces/legal-elements';
import { CanvasState } from '../interfaces/case-canvas-mapping';
import { cacheManager } from './cache-manager';
import { performanceMonitor } from './performance-monitor';

/**
 * 推荐类型
 */
export type RecommendationType =
  | 'node'              // 节点推荐
  | 'connection'        // 连接推荐
  | 'layout'            // 布局推荐
  | 'document-tag'      // 文档标签推荐
  | 'timeline'          // 时间线推荐
  | 'relationship';     // 关系推荐

/**
 * 推荐项
 */
export interface Recommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  confidence: number; // 置信度 (0-1)
  action: () => void;
  metadata?: any;
}

/**
 * AI智能推荐服务
 */
export class AIRecommendation {
  /**
   * 获取所有推荐（带缓存）
   */
  async getRecommendations(
    caseId: string,
    state: CanvasState,
    caseData?: any
  ): Promise<Recommendation[]> {
    // 生成缓存键
    const cacheKey = `recommendations:${caseId}:${state.metadata.editCount}`;

    // 尝试从缓存获取
    return cacheManager.getOrSet(
      cacheKey,
      async () => {
        return performanceMonitor.measure(
          'AIRecommendation.getRecommendations',
          async () => {
            const recommendations: Recommendation[] = [];

            // 节点推荐
            const nodeRecommendations = await this.getNodeRecommendations(state, caseData);
            recommendations.push(...nodeRecommendations);

            // 连接推荐
            const connectionRecommendations = await this.getConnectionRecommendations(state);
            recommendations.push(...connectionRecommendations);

            // 布局推荐
            const layoutRecommendations = await this.getLayoutRecommendations(state);
            recommendations.push(...layoutRecommendations);

            // 文档标签推荐
            const documentTagRecommendations = await this.getDocumentTagRecommendations(state);
            recommendations.push(...documentTagRecommendations);

            // 时间线推荐
            const timelineRecommendations = await this.getTimelineRecommendations(state, caseData);
            recommendations.push(...timelineRecommendations);

            // 关系推荐
            const relationshipRecommendations = await this.getRelationshipRecommendations(state);
            recommendations.push(...relationshipRecommendations);

            // 按置信度排序
            recommendations.sort((a, b) => b.confidence - a.confidence);

            console.log(`[AIRecommendation] 生成了 ${recommendations.length} 个推荐`);
            return recommendations;
          }
        );
      },
      60000 // 缓存1分钟
    );
  }

  /**
   * 节点推荐
   */
  private async getNodeRecommendations(
    state: CanvasState,
    caseData?: any
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // 推荐添加案件节点（如果没有）
    const hasCaseNode = state.nodes.some(n => n.shape === 'legal-case');
    if (!hasCaseNode && caseData) {
      recommendations.push({
        id: 'rec-node-case',
        type: 'node',
        title: '添加案件节点',
        description: `建议添加案件"${caseData.title}"的节点`,
        confidence: 0.95,
        action: () => {
          console.log('[AIRecommendation] 添加案件节点');
        },
        metadata: { nodeType: 'legal-case', caseData },
      });
    }

    // 推荐添加当事人节点（如果没有）
    const hasApplicantNode = state.nodes.some(
      n => n.shape === 'legal-person' && n.data.role === 'applicant'
    );
    if (!hasApplicantNode && caseData?.applicant) {
      recommendations.push({
        id: 'rec-node-applicant',
        type: 'node',
        title: '添加申请人节点',
        description: `建议添加申请人"${caseData.applicant}"的节点`,
        confidence: 0.9,
        action: () => {
          console.log('[AIRecommendation] 添加申请人节点');
        },
        metadata: { nodeType: 'legal-person', role: 'applicant' },
      });
    }

    const hasRespondentNode = state.nodes.some(
      n => n.shape === 'legal-person' && n.data.role === 'respondent'
    );
    if (!hasRespondentNode && caseData?.respondent) {
      recommendations.push({
        id: 'rec-node-respondent',
        type: 'node',
        title: '添加被申请人节点',
        description: `建议添加被申请人"${caseData.respondent}"的节点`,
        confidence: 0.9,
        action: () => {
          console.log('[AIRecommendation] 添加被申请人节点');
        },
        metadata: { nodeType: 'legal-person', role: 'respondent' },
      });
    }

    // 推荐添加庭审节点（如果有庭审数据）
    if (caseData?.hearings && caseData.hearings.length > 0) {
      const hasHearingNode = state.nodes.some(n => n.shape === 'legal-hearing');
      if (!hasHearingNode) {
        recommendations.push({
          id: 'rec-node-hearing',
          type: 'node',
          title: '添加庭审节点',
          description: `建议添加 ${caseData.hearings.length} 个庭审节点`,
          confidence: 0.85,
          action: () => {
            console.log('[AIRecommendation] 添加庭审节点');
          },
          metadata: { nodeType: 'legal-hearing', hearings: caseData.hearings },
        });
      }
    }

    return recommendations;
  }

  /**
   * 连接推荐
   */
  private async getConnectionRecommendations(state: CanvasState): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // 查找案件节点
    const caseNode = state.nodes.find(n => n.shape === 'legal-case');
    if (!caseNode) return recommendations;

    // 推荐连接案件节点和当事人节点
    const personNodes = state.nodes.filter(n => n.shape === 'legal-person');
    personNodes.forEach(personNode => {
      const hasConnection = state.connections.some(
        c => (c.source === caseNode.id && c.target === personNode.id) ||
          (c.source === personNode.id && c.target === caseNode.id)
      );

      if (!hasConnection) {
        recommendations.push({
          id: `rec-conn-case-person-${personNode.id}`,
          type: 'connection',
          title: '连接案件和当事人',
          description: `建议连接案件节点和"${personNode.data.name}"节点`,
          confidence: 0.8,
          action: () => {
            console.log('[AIRecommendation] 连接案件和当事人');
          },
          metadata: { source: caseNode.id, target: personNode.id, type: 'participant' },
        });
      }
    });

    // 推荐连接案件节点和文档节点
    const documentNodes = state.nodes.filter(n => n.shape === 'legal-document');
    documentNodes.forEach(documentNode => {
      const hasConnection = state.connections.some(
        c => (c.source === caseNode.id && c.target === documentNode.id) ||
          (c.source === documentNode.id && c.target === caseNode.id)
      );

      if (!hasConnection) {
        recommendations.push({
          id: `rec-conn-case-document-${documentNode.id}`,
          type: 'connection',
          title: '连接案件和文档',
          description: `建议连接案件节点和文档"${documentNode.data.name}"`,
          confidence: 0.75,
          action: () => {
            console.log('[AIRecommendation] 连接案件和文档');
          },
          metadata: { source: caseNode.id, target: documentNode.id, type: 'evidence' },
        });
      }
    });

    return recommendations;
  }

  /**
   * 布局推荐
   */
  private async getLayoutRecommendations(state: CanvasState): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // 检查节点是否重叠
    const hasOverlap = this.detectNodeOverlap(state.nodes);
    if (hasOverlap) {
      recommendations.push({
        id: 'rec-layout-overlap',
        type: 'layout',
        title: '优化节点布局',
        description: '检测到节点重叠，建议自动优化布局',
        confidence: 0.9,
        action: () => {
          console.log('[AIRecommendation] 优化节点布局');
        },
      });
    }

    // 检查节点是否分散
    const isScattered = this.detectNodeScatter(state.nodes);
    if (isScattered) {
      recommendations.push({
        id: 'rec-layout-scatter',
        type: 'layout',
        title: '紧凑节点布局',
        description: '节点分布较分散，建议紧凑排列',
        confidence: 0.7,
        action: () => {
          console.log('[AIRecommendation] 紧凑节点布局');
        },
      });
    }

    return recommendations;
  }

  /**
   * 文档标签推荐
   */
  private async getDocumentTagRecommendations(state: CanvasState): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // 查找未标记的文档节点
    const documentNodes = state.nodes.filter(
      n => n.shape === 'legal-document' && (!n.data.tags || n.data.tags.length === 0)
    );

    if (documentNodes.length > 0) {
      recommendations.push({
        id: 'rec-document-tag',
        type: 'document-tag',
        title: '添加文档标签',
        description: `有 ${documentNodes.length} 个文档未添加标签，建议自动分类`,
        confidence: 0.8,
        action: () => {
          console.log('[AIRecommendation] 添加文档标签');
        },
        metadata: { documentNodes },
      });
    }

    return recommendations;
  }

  /**
   * 时间线推荐
   */
  private async getTimelineRecommendations(
    state: CanvasState,
    caseData?: any
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // 检查是否有时间线节点
    const hasTimelineNode = state.nodes.some(n => n.shape === 'legal-timeline');
    if (!hasTimelineNode && caseData?.hearings && caseData.hearings.length > 0) {
      recommendations.push({
        id: 'rec-timeline',
        type: 'timeline',
        title: '创建时间线',
        description: '建议根据庭审记录创建时间线节点',
        confidence: 0.85,
        action: () => {
          console.log('[AIRecommendation] 创建时间线');
        },
        metadata: { hearings: caseData.hearings },
      });
    }

    return recommendations;
  }

  /**
   * 关系推荐
   */
  private async getRelationshipRecommendations(state: CanvasState): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // 查找可能的隐藏关系
    // 例如：两个当事人节点都连接到同一个文档节点
    const personNodes = state.nodes.filter(n => n.shape === 'legal-person');

    for (let i = 0; i < personNodes.length; i++) {
      for (let j = i + 1; j < personNodes.length; j++) {
        const person1 = personNodes[i];
        const person2 = personNodes[j];

        // 检查是否已有连接
        const hasConnection = state.connections.some(
          c => (c.source === person1.id && c.target === person2.id) ||
            (c.source === person2.id && c.target === person1.id)
        );

        if (!hasConnection) {
          // 查找共同连接的文档
          const person1Docs = state.connections
            .filter(c => c.source === person1.id || c.target === person1.id)
            .map(c => c.source === person1.id ? c.target : c.source);

          const person2Docs = state.connections
            .filter(c => c.source === person2.id || c.target === person2.id)
            .map(c => c.source === person2.id ? c.target : c.source);

          const commonDocs = person1Docs.filter(id => person2Docs.includes(id));

          if (commonDocs.length > 0) {
            recommendations.push({
              id: `rec-relationship-${person1.id}-${person2.id}`,
              type: 'relationship',
              title: '发现潜在关系',
              description: `"${person1.data.name}"和"${person2.data.name}"有 ${commonDocs.length} 个共同文档，可能存在关系`,
              confidence: 0.6,
              action: () => {
                console.log('[AIRecommendation] 添加关系连接');
              },
              metadata: { source: person1.id, target: person2.id, commonDocs },
            });
          }
        }
      }
    }

    return recommendations;
  }

  /**
   * 检测节点重叠
   */
  private detectNodeOverlap(nodes: LegalNode[]): boolean {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const node1 = nodes[i];
        const node2 = nodes[j];

        const dx = Math.abs(node1.position.x - node2.position.x);
        const dy = Math.abs(node1.position.y - node2.position.y);

        // 假设节点大小为300x200
        if (dx < 300 && dy < 200) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 检测节点分散
   */
  private detectNodeScatter(nodes: LegalNode[]): boolean {
    if (nodes.length < 2) return false;

    // 计算节点的平均距离
    let totalDistance = 0;
    let count = 0;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].position.x - nodes[j].position.x;
        const dy = nodes[i].position.y - nodes[j].position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        totalDistance += distance;
        count++;
      }
    }

    const avgDistance = totalDistance / count;

    // 如果平均距离大于800，认为分散
    return avgDistance > 800;
  }
}

/**
 * 全局AI推荐实例
 */
export const aiRecommendation = new AIRecommendation();

