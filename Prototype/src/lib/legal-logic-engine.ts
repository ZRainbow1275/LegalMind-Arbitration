import { LegalNode } from '../components/workspace/types';
import { Connection, CaseInfoMetadata, TimelineMetadata } from '../components/workspace/types';

export interface AnalysisResult {
    id: string;
    type: 'gap' | 'risk' | 'contradiction' | 'strength';
    title: string;
    description: string;
    nodeIds: string[];
    severity: 'low' | 'medium' | 'high';
    recommendation: string;
}

export class LegalLogicEngine {
    static analyze(nodes: LegalNode[], connections: Connection[] = []): AnalysisResult[] {
        const results: AnalysisResult[] = [];

        // 1. Check for Isolated Case Nodes (Gap)
        const caseNodes = nodes.filter(n => n.type === 'legal-case');
        caseNodes.forEach(caseNode => {
            const hasConnections = nodes.some(n =>
                n.data.connections?.includes(caseNode.id) ||
                caseNode.data.connections?.includes(n.id)
            );

            if (!hasConnections) {
                results.push({
                    id: `gap-isolated-${caseNode.id}`,
                    type: 'gap',
                    title: '孤立的案件节点',
                    description: `案件 "${caseNode.data.title}" 没有任何关联的当事人或证据。`,
                    nodeIds: [caseNode.id],
                    severity: 'high',
                    recommendation: '请添加当事人、证据或时间轴节点并连接到此案件。'
                });
            }
        });

        // 2. Check for Claims without Evidence (Gap)
        caseNodes.forEach(caseNode => {
            const connectedNodes = nodes.filter(n =>
                n.data.connections?.includes(caseNode.id) ||
                caseNode.data.connections?.includes(n.id)
            );
            const hasEvidence = connectedNodes.some(n => n.type === 'legal-document');

            if (!hasEvidence) {
                results.push({
                    id: `gap-no-evidence-${caseNode.id}`,
                    type: 'gap',
                    title: '案件缺少证据',
                    description: `案件 "${caseNode.data.title}" 尚未关联任何文档证据。`,
                    nodeIds: [caseNode.id],
                    severity: 'medium',
                    recommendation: '请上传并关联相关的法律文档或证据材料。'
                });
            }
        });

        // 3. Check for Person without Role (Risk)
        const personNodes = nodes.filter(n => n.type === 'legal-person');
        personNodes.forEach(personNode => {
            const connectedToCase = nodes.some(n =>
                n.type === 'legal-case' && (
                    n.data.connections?.includes(personNode.id) ||
                    personNode.data.connections?.includes(n.id)
                )
            );

            if (!connectedToCase) {
                results.push({
                    id: `risk-isolated-person-${personNode.id}`,
                    type: 'risk',
                    title: '未关联案件的当事人',
                    description: `当事人 "${personNode.data.title}" 未关联到任何具体案件。`,
                    nodeIds: [personNode.id],
                    severity: 'low',
                    recommendation: '请将此当事人连接到相关案件以明确其法律地位。'
                });
            }
        });

        // 4. Check for Timeline Gaps (Gap)
        const timelineNodes = nodes.filter(n => n.type === 'legal-timeline');
        if (timelineNodes.length > 1) {
            const docCount = nodes.filter(n => n.type === 'legal-document').length;
            if (docCount > 5 && timelineNodes.length < 2) {
                results.push({
                    id: `gap-timeline-sparse`,
                    type: 'gap',
                    title: '时间轴节点稀疏',
                    description: `当前案件文档较多 (${docCount}份)，但时间轴节点较少，可能导致事实梳理不清。`,
                    nodeIds: timelineNodes.map(n => n.id),
                    severity: 'medium',
                    recommendation: '建议根据关键文档的签署或发生时间，补充更多时间轴节点。'
                });
            }
        }

        // 5. Contradiction Detection (Contradiction)
        // Check for 'conflicts-with' connections
        const conflictingConnections = connections.filter(c => c.type === 'conflicts-with');
        conflictingConnections.forEach(conn => {
            const sourceNode = nodes.find(n => n.id === conn.source);
            const targetNode = nodes.find(n => n.id === conn.target);

            if (sourceNode && targetNode) {
                results.push({
                    id: `contradiction-${conn.id}`,
                    type: 'contradiction',
                    title: '发现证据/观点冲突',
                    description: `"${sourceNode.data.title}" 与 "${targetNode.data.title}" 存在冲突关系。`,
                    nodeIds: [sourceNode.id, targetNode.id],
                    severity: 'high',
                    recommendation: '请重点审查这两份材料的冲突点，确认事实真相。'
                });
            }
        });

        // 6. Statute of Limitations Check (Risk)
        caseNodes.forEach(caseNode => {
            const metadata = caseNode.data.metadata as CaseInfoMetadata;
            if (metadata && metadata.filingDate) {
                const filingDate = new Date(metadata.filingDate);

                // Find connected timeline nodes or just check all timeline nodes if specific connection missing
                // For strictness, let's check all timeline nodes associated with this case (via direct or indirect connection)
                // For prototype simplicity, we check all timeline nodes
                const relevantTimelineNodes = timelineNodes; // In real app, filter by case association

                if (relevantTimelineNodes.length > 0) {
                    // Find earliest event
                    const earliestEvent = relevantTimelineNodes.reduce((min, node) => {
                        const meta = node.data.metadata as TimelineMetadata;
                        if (meta && meta.eventDate) {
                            const date = new Date(meta.eventDate);
                            return date < min ? date : min;
                        }
                        return min;
                    }, new Date());

                    // Calculate difference in years
                    const diffTime = Math.abs(filingDate.getTime() - earliestEvent.getTime());
                    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365);

                    if (diffYears > 3) {
                        results.push({
                            id: `risk-statute-limit-${caseNode.id}`,
                            type: 'risk',
                            title: '诉讼时效风险',
                            description: `案件 "${caseNode.data.title}" 的最早事件时间与立案时间相差超过3年 (${diffYears.toFixed(1)}年)，可能存在诉讼时效过期的风险。`,
                            nodeIds: [caseNode.id],
                            severity: 'high',
                            recommendation: '请仔细核查是否存在诉讼时效中断或中止的情形。'
                        });
                    }
                }
            }
        });

        return results;
    }
}

