import React, { useState } from 'react';
import { SimpleCanvas } from './SimpleCanvas';
import { EnhancedAIAssistant } from './ai/EnhancedAIAssistant';
import { LegalNodeTypes } from '../plugins/legal-nodes/types';

interface Node {
  id: string;
  type: 'case' | 'person' | 'document' | 'hearing' | 'mediation' | 'timeline';
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  content: string;
  color: string;
  borderColor: string;
  status?: string;
  metadata?: any;
}

interface SimpleLegalWorkspaceProps {
  // 可选的props，保持与原组件兼容
}

export const SimpleLegalWorkspace: React.FC<SimpleLegalWorkspaceProps> = () => {
  const [nodes, setNodes] = useState<Node[]>([
    {
      id: 'case-1',
      type: 'case',
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      title: '📋 合同纠纷案件',
      content: '案件编号: 2024-001',
      color: '#e3f2fd',
      borderColor: '#1976d2',
      status: 'IN_PROGRESS'
    },
    {
      id: 'person-1',
      type: 'person',
      x: 400,
      y: 80,
      width: 120,
      height: 120,
      title: '👤 张三',
      content: '原告方',
      color: '#e8f5e8',
      borderColor: '#4caf50'
    },
    {
      id: 'person-2',
      type: 'person',
      x: 400,
      y: 250,
      width: 120,
      height: 120,
      title: '👤 李四',
      content: '被告方',
      color: '#fff3e0',
      borderColor: '#ff9800'
    },
    {
      id: 'hearing-1',
      type: 'hearing',
      x: 600,
      y: 100,
      width: 180,
      height: 120,
      title: '🏛️ 在线庭审',
      content: '2024-12-20 14:00',
      color: '#f3e5f5',
      borderColor: '#9c27b0',
      status: 'SCHEDULED',
      metadata: {
        hearingType: 'ONLINE',
        participants: ['张三', '李四', '仲裁员王五']
      }
    },
    {
      id: 'timeline-1',
      type: 'timeline',
      x: 100,
      y: 300,
      width: 200,
      height: 80,
      title: '📅 案件时间轴',
      content: '关键节点跟踪',
      color: '#fff8e1',
      borderColor: '#f57c00'
    }
  ]);

  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [isAIMode, setIsAIMode] = useState(false);

  const createNode = (nodeType: 'case' | 'person' | 'document' | 'hearing' | 'mediation' | 'timeline') => {
    const position = {
      x: 200 + Math.random() * 300,
      y: 200 + Math.random() * 200
    };

    const width = nodeType === 'person' ? 120 :
                  nodeType === 'hearing' ? 180 :
                  200;
    const height = nodeType === 'person' ? 120 :
                   nodeType === 'hearing' ? 120 :
                   nodeType === 'timeline' ? 80 :
                   100;

    const newNode: Node = {
      id: `${nodeType}-${Date.now()}`,
      type: nodeType,
      x: position.x,
      y: position.y,
      width,
      height,
      title: nodeType === 'case' ? '📋 新案件' :
             nodeType === 'person' ? '👤 新人物' :
             nodeType === 'document' ? '📄 新文档' :
             nodeType === 'hearing' ? '🏛️ 新庭审' :
             nodeType === 'mediation' ? '🤝 新调解' :
             '📅 新时间轴',
      content: nodeType === 'case' ? '点击编辑案件信息' :
               nodeType === 'person' ? '点击编辑人物信息' :
               nodeType === 'document' ? '点击编辑文档信息' :
               nodeType === 'hearing' ? '点击安排庭审' :
               nodeType === 'mediation' ? '点击安排调解' :
               '点击编辑时间轴',
      color: nodeType === 'case' ? '#e3f2fd' :
             nodeType === 'person' ? '#e8f5e8' :
             nodeType === 'document' ? '#fff3e0' :
             nodeType === 'hearing' ? '#f3e5f5' :
             nodeType === 'mediation' ? '#e8f5e8' :
             '#fff8e1',
      borderColor: nodeType === 'case' ? '#1976d2' :
                   nodeType === 'person' ? '#4caf50' :
                   nodeType === 'document' ? '#ff9800' :
                   nodeType === 'hearing' ? '#9c27b0' :
                   nodeType === 'mediation' ? '#4caf50' :
                   '#f57c00',
      status: nodeType === 'hearing' ? 'SCHEDULED' :
              nodeType === 'case' ? 'DRAFT' :
              undefined
    };

    setNodes(prev => [...prev, newNode]);
  };

  const handleAICreateNode = (nodeType: LegalNodeTypes) => {
    // 将LegalNodeTypes转换为简单的字符串类型
    const simpleType = nodeType.replace('legal-', '') as 'case' | 'person' | 'document';
    createNode(simpleType);
  };

  const handleAIAnalyzeCase = () => {
    console.log('AI analyzing case with', nodes.length, 'nodes');
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#f5f5f5'
    }}>
      {/* 顶部工具栏 */}
      <div style={{
        height: '60px',
        backgroundColor: 'white',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <h1 style={{ 
            color: '#FF6B35', 
            margin: '0',
            fontSize: '20px',
            fontWeight: '600'
          }}>
            🏛️ LegalMind 法律工作台
          </h1>
          
          {/* 工具按钮 */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginLeft: '20px'
          }}>
            <button
              onClick={() => {
                setSelectedTool('case');
                createNode('case');
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: selectedTool === 'case' ? '#FF6B35' : 'white',
                color: selectedTool === 'case' ? 'white' : '#333',
                border: '1px solid #FF6B35',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              📋 案件
            </button>
            <button
              onClick={() => {
                setSelectedTool('person');
                createNode('person');
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: selectedTool === 'person' ? '#FF6B35' : 'white',
                color: selectedTool === 'person' ? 'white' : '#333',
                border: '1px solid #FF6B35',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              👥 人物
            </button>
            <button
              onClick={() => {
                setSelectedTool('document');
                createNode('document');
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: selectedTool === 'document' ? '#FF6B35' : 'white',
                color: selectedTool === 'document' ? 'white' : '#333',
                border: '1px solid #FF6B35',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              📄 文档
            </button>
            <button
              onClick={() => {
                setSelectedTool('hearing');
                createNode('hearing');
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: selectedTool === 'hearing' ? '#FF6B35' : 'white',
                color: selectedTool === 'hearing' ? 'white' : '#333',
                border: '1px solid #FF6B35',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🏛️ 庭审
            </button>
            <button
              onClick={() => {
                setSelectedTool('timeline');
                createNode('timeline');
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: selectedTool === 'timeline' ? '#FF6B35' : 'white',
                color: selectedTool === 'timeline' ? 'white' : '#333',
                border: '1px solid #FF6B35',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              📅 时间轴
            </button>
            <button
              onClick={() => setIsAIMode(!isAIMode)}
              style={{
                padding: '8px 16px',
                backgroundColor: isAIMode ? '#FF6B35' : 'white',
                color: isAIMode ? 'white' : '#333',
                border: '1px solid #FF6B35',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🤖 AI助手
            </button>
          </div>
        </div>
      </div>

      {/* 主工作区域 */}
      <div style={{
        flex: 1,
        display: 'flex',
        position: 'relative'
      }}>
        {/* 画布区域 */}
        <div style={{
          flex: 1,
          height: '100%'
        }}>
          <SimpleCanvas
            nodes={nodes}
            onNodesChange={setNodes}
          />
        </div>

        {/* AI助手面板 */}
        {isAIMode && (
          <div style={{
            width: '350px',
            height: '100%',
            backgroundColor: 'white',
            borderLeft: '1px solid #e0e0e0',
            boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
            zIndex: 1000
          }}>
            <EnhancedAIAssistant
              onCreateNode={handleAICreateNode}
              onAnalyzeCase={handleAIAnalyzeCase}
              currentNodes={nodes}
            />
          </div>
        )}
      </div>
    </div>
  );
};
