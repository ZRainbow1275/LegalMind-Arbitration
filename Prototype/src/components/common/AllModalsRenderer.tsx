/**
 * 所有模态面板渲染器
 * 
 * 统一管理所有模态面板的渲染
 */

import React from 'react';
import { Badge } from '../ui/badge';
import { ModalPanel } from './ModalPanel';
import { DraggableEditorWindow } from './DraggableEditorWindow'; // {{ AURA: Add - 使用可拖拽编辑器窗口 }}
import { ArbitrationFunctionPanel } from '../arbitration/ArbitrationFunctionPanel';
import { DisputeFocusVisualizer } from '../arbitration/DisputeFocusVisualizer';
import { EvidenceChainAnalyzer } from '../arbitration/EvidenceChainAnalyzer';
import { ArbitrationProcedureManager } from '../arbitration/ArbitrationProcedureManager';
import { IntelligentNodeAnalyzer } from '../ai/IntelligentNodeAnalyzer';
import { EvidenceRelationshipDetector } from '../ai/EvidenceRelationshipDetector';
import { SmartRecommendationEngine } from '../ai/SmartRecommendationEngine';
import { UserPermissionManager } from '../collaboration/UserPermissionManager';
import { MultiUserCollaboration } from '../collaboration/MultiUserCollaboration';
import type { LegalNode } from '../workspace/types';

export interface AllModalsRendererProps {
  // 工作区状态
  workspaceState: {
    editingNode: LegalNode | null;
    editingNodes: LegalNode[]; // {{ AURA: Add - 支持同时打开多个节点详情 }}
    showArbitrationPanel: boolean;
    activeArbitrationFunction: string | null;
    showAIAnalysisPanel: boolean;
    showEvidenceRelationPanel: boolean;
    showRecommendationPanel: boolean;
    showPermissionPanel: boolean;
    showCollaborationPanel: boolean;
    selectedNodes: string[];
  };

  // 节点数据
  nodes: LegalNode[];

  // 回调函数
  onCloseEditingNode: () => void;
  onRemoveEditingNode: (nodeId: string) => void; // {{ AURA: Add - 关闭单个节点编辑器 }}
  onNodeSave: (nodeId: string, updates: Partial<LegalNode>) => void;
  onNodeDelete: (nodeId: string) => void;
  onCloseArbitrationPanel: () => void;
  onArbitrationFunctionSelect: (functionId: string) => void;
  onArbitrationFunctionLaunch: (functionId: string) => void;
  onCloseAIAnalysisPanel: () => void;
  onCloseEvidenceRelationPanel: () => void;
  onCloseRecommendationPanel: () => void;
  onClosePermissionPanel: () => void;
  onCloseCollaborationPanel: () => void;
}

export const AllModalsRenderer = React.memo<AllModalsRendererProps>(({
  workspaceState,
  nodes,
  // onCloseEditingNode,
  onRemoveEditingNode, // {{ AURA: Add - 接收新的回调 }}
  onNodeSave,
  onNodeDelete,
  onCloseArbitrationPanel,
  onArbitrationFunctionSelect,
  onArbitrationFunctionLaunch,
  onCloseAIAnalysisPanel,
  onCloseEvidenceRelationPanel,
  onCloseRecommendationPanel,
  onClosePermissionPanel,
  onCloseCollaborationPanel,
}) => {

  return (
    <>
      {/* {{ AURA: Modify - 移除背景遮罩，避免阻止点击其他节点 }} */}
      {/* {{ AURA: Fix - 使用独立组件避免Hooks规则违反 }} */}
      {workspaceState.editingNodes.map((node, index) => (
        <DraggableEditorWindow
          key={node.id}
          node={node}
          index={index}
          onClose={onRemoveEditingNode}
          onSave={onNodeSave}
          onDelete={onNodeDelete}
        />
      ))}

      {/* 仲裁功能面板 */}
      <ModalPanel
        isOpen={workspaceState.showArbitrationPanel}
        title="仲裁专用功能"
        onClose={onCloseArbitrationPanel}
        size="xl"
      >
        {!workspaceState.activeArbitrationFunction ? (
          <ArbitrationFunctionPanel
            caseId="ARB-2024-001"
            onFunctionSelect={onArbitrationFunctionSelect}
            onFunctionLaunch={onArbitrationFunctionLaunch}
          />
        ) : (
          <div className="p-4">
            {workspaceState.activeArbitrationFunction === 'dispute-focus' && (
              <DisputeFocusVisualizer caseId="ARB-2024-001" />
            )}
            {workspaceState.activeArbitrationFunction === 'evidence-chain' && (
              <EvidenceChainAnalyzer caseId="ARB-2024-001" />
            )}
            {workspaceState.activeArbitrationFunction === 'procedure-manager' && (
              <ArbitrationProcedureManager caseId="ARB-2024-001" />
            )}
          </div>
        )}
      </ModalPanel>

      {/* AI智能分析面板 */}
      <ModalPanel
        isOpen={workspaceState.showAIAnalysisPanel}
        title="AI智能节点分析"
        onClose={onCloseAIAnalysisPanel}
        size="xl"
      >
        <div className="p-4">
          <IntelligentNodeAnalyzer
            selectedNodes={nodes.filter(node => workspaceState.selectedNodes.includes(node.id))}
            allNodes={nodes}
            onAnalysisComplete={(results) => {
              console.log('AI分析完成:', results);
            }}
            onRecommendationApply={(recommendation, nodeIds) => {
              console.log('应用建议:', recommendation, nodeIds);
            }}
          />
        </div>
      </ModalPanel>

      {/* 证据关系检测面板 */}
      <ModalPanel
        isOpen={workspaceState.showEvidenceRelationPanel}
        title="AI证据关系检测"
        onClose={onCloseEvidenceRelationPanel}
        size="xl"
      >
        <EvidenceRelationshipDetector
          nodes={nodes}
          onRelationshipDetected={(relationships) => {
            console.log('检测到关系:', relationships);
          }}
          onNetworkAnalysisComplete={(analysis) => {
            console.log('网络分析完成:', analysis);
          }}
        />
      </ModalPanel>

      {/* AI智能建议面板 */}
      <ModalPanel
        isOpen={workspaceState.showRecommendationPanel}
        title="AI智能建议引擎"
        onClose={onCloseRecommendationPanel}
        size="xl"
        headerExtra={
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
            演示模式
          </Badge>
        }
      >
        <SmartRecommendationEngine
          nodes={nodes}
          caseContext={{
            caseType: 'commercial_arbitration',
            stage: 'evidence_exchange',
            complexity: 'medium',
            budget: 100000,
            timeline: '3个月'
          }}
          onRecommendationAction={(recommendationId, action) => {
            console.log('建议操作:', recommendationId, action);
          }}
          onRecommendationApply={(recommendation) => {
            console.log('应用建议:', recommendation);
          }}
        />
      </ModalPanel>

      {/* 用户权限管理面板 */}
      <ModalPanel
        isOpen={workspaceState.showPermissionPanel}
        title="用户权限管理"
        onClose={onClosePermissionPanel}
        size="xl"
      >
        <UserPermissionManager
          caseId="ARB-2024-001"
          currentUser={{
            id: 'current-user',
            name: '当前用户',
            email: 'current@legalmind.com',
            role: 'admin',
            permissions: [],
            status: 'active',
            createdAt: new Date().toISOString(),
            caseAccess: ['ARB-2024-001']
          }}
          onUserUpdate={(user) => {
            console.log('用户更新:', user);
          }}
          onUserInvite={(email: string, role: string) => {
            console.log('邀请用户:', email, role);
          }}
        />
      </ModalPanel>

      {/* 多用户协作面板 */}
      <ModalPanel
        isOpen={workspaceState.showCollaborationPanel}
        title="多用户协作"
        onClose={onCloseCollaborationPanel}
        size="xl"
      >
        <MultiUserCollaboration
        // nodes={nodes}
        />
      </ModalPanel>
    </>
  );
});

AllModalsRenderer.displayName = 'AllModalsRenderer';

