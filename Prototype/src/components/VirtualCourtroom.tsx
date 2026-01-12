import React, { useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface CourtParticipant {
  id: string;
  name: string;
  role: 'arbitrator' | 'applicant' | 'respondent' | 'witness' | 'observer';
  status: 'present' | 'absent' | 'speaking' | 'muted';
  position: { x: number; y: number };
  avatar?: string;
  isOnline: boolean;
  joinedAt?: Date;
}

interface Evidence {
  id: string;
  title: string;
  type: 'document' | 'video' | 'audio' | 'image';
  status: 'submitted' | 'reviewing' | 'accepted' | 'objected';
  submittedBy: string;
  position: { x: number; y: number };
  relationships: {
    supports: string[];
    contradicts: string[];
    supplements: string[];
  };
  confidence: number;
  importance: 'high' | 'medium' | 'low';
}

interface HearingStage {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'active' | 'completed';
  duration?: number;
  startTime?: Date;
  order: number;
}

interface VirtualCourtroomProps {
  hearingId: string;
  isArbitrator?: boolean;
}

export const VirtualCourtroom: React.FC<VirtualCourtroomProps> = ({

  isArbitrator = false
}) => {
  // 参与者状态
  const [participants, setParticipants] = useState<CourtParticipant[]>([
    {
      id: 'arb-1',
      name: '王仲裁员',
      role: 'arbitrator',
      status: 'present',
      position: { x: 400, y: 100 },
      isOnline: true,
      joinedAt: new Date()
    },
    {
      id: 'app-1',
      name: '张三（申请人）',
      role: 'applicant',
      status: 'present',
      position: { x: 200, y: 300 },
      isOnline: true,
      joinedAt: new Date()
    },
    {
      id: 'res-1',
      name: '李四（被申请人）',
      role: 'respondent',
      status: 'present',
      position: { x: 600, y: 300 },
      isOnline: true,
      joinedAt: new Date()
    },
    {
      id: 'wit-1',
      name: '赵五（证人）',
      role: 'witness',
      status: 'absent',
      position: { x: 400, y: 450 },
      isOnline: false
    }
  ]);

  // 证据状态
  const [evidences] = useState<Evidence[]>([
    {
      id: 'ev-1',
      title: '合同原件',
      type: 'document',
      status: 'accepted',
      submittedBy: 'app-1',
      position: { x: 150, y: 200 },
      relationships: {
        supports: ['ev-2'],
        contradicts: [],
        supplements: []
      },
      confidence: 0.95,
      importance: 'high'
    },
    {
      id: 'ev-2',
      title: '付款凭证',
      type: 'document',
      status: 'accepted',
      submittedBy: 'app-1',
      position: { x: 250, y: 200 },
      relationships: {
        supports: ['ev-1'],
        contradicts: ['ev-3'],
        supplements: []
      },
      confidence: 0.88,
      importance: 'high'
    },
    {
      id: 'ev-3',
      title: '对方否认函',
      type: 'document',
      status: 'reviewing',
      submittedBy: 'res-1',
      position: { x: 650, y: 200 },
      relationships: {
        supports: [],
        contradicts: ['ev-2'],
        supplements: []
      },
      confidence: 0.72,
      importance: 'medium'
    }
  ]);

  // 庭审阶段
  const [hearingStages, setHearingStages] = useState<HearingStage[]>([
    { id: 'stage-1', name: '宣布开庭', description: '核实身份，宣布庭审开始', status: 'completed', order: 1 },
    { id: 'stage-2', name: '申请人陈述', description: '申请人陈述案件事实和理由', status: 'completed', order: 2 },
    { id: 'stage-3', name: '被申请人答辩', description: '被申请人进行答辩', status: 'active', order: 3 },
    { id: 'stage-4', name: '举证质证', description: '双方举证和质证', status: 'pending', order: 4 },
    { id: 'stage-5', name: '法庭辩论', description: '双方进行法庭辩论', status: 'pending', order: 5 },
    { id: 'stage-6', name: '最后陈述', description: '双方最后陈述', status: 'pending', order: 6 },
    { id: 'stage-7', name: '宣布休庭', description: '庭审结束', status: 'pending', order: 7 }
  ]);


  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null);
  const [showEvidencePanel, setShowEvidencePanel] = useState(true);
  const [showStagePanel, setShowStagePanel] = useState(true);

  // 获取参与者角色颜色
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'arbitrator': return 'bg-purple-100 border-purple-300 text-purple-800';
      case 'applicant': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'respondent': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'witness': return 'bg-green-100 border-green-300 text-green-800';
      case 'observer': return 'bg-gray-100 border-gray-300 text-gray-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  // 获取参与者状态指示器
  const getStatusIndicator = (participant: CourtParticipant) => {
    if (!participant.isOnline) return '🔴';
    if (participant.status === 'speaking') return '🎤';
    if (participant.status === 'muted') return '🔇';
    return '🟢';
  };

  // 获取证据状态颜色
  const getEvidenceColor = (evidence: Evidence) => {
    switch (evidence.status) {
      case 'accepted': return 'bg-green-50 border-green-300';
      case 'reviewing': return 'bg-yellow-50 border-yellow-300';
      case 'objected': return 'bg-red-50 border-red-300';
      default: return 'bg-gray-50 border-gray-300';
    }
  };

  // 获取证据重要性大小
  const getEvidenceSize = (importance: string) => {
    switch (importance) {
      case 'high': return 'w-20 h-16';
      case 'medium': return 'w-16 h-12';
      case 'low': return 'w-12 h-10';
      default: return 'w-16 h-12';
    }
  };

  // 切换发言人
  const handleSpeakerChange = useCallback((participantId: string) => {
    if (!isArbitrator) return;

    setParticipants(prev => prev.map(p => ({
      ...p,
      status: p.id === participantId ? 'speaking' :
        p.status === 'speaking' ? 'present' : p.status
    })));
  }, [isArbitrator]);

  // 进入下一阶段
  const handleNextStage = useCallback(() => {
    if (!isArbitrator) return;

    setHearingStages(prev => {
      const activeIndex = prev.findIndex(s => s.status === 'active');
      if (activeIndex === -1 || activeIndex === prev.length - 1) return prev;

      return prev.map((stage, index) => ({
        ...stage,
        status: index === activeIndex ? 'completed' :
          index === activeIndex + 1 ? 'active' : stage.status
      }));
    });
  }, [isArbitrator]);

  // 证据拖拽到展示区
  const handleEvidencePresent = useCallback((evidenceId: string) => {
    setSelectedEvidence(evidenceId);
    // 这里可以添加证据展示逻辑
  }, []);

  return (
    <div className="w-full h-screen flex flex-col bg-gradient-to-br from-blue-50 to-purple-50">
      {/* 顶部控制栏 */}
      <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-800">
            🏛️ 虚拟法庭 - 案件 2024-001
          </h1>
          <div className="h-6 w-px bg-gray-300" />
          <div className="text-sm text-gray-600">
            当前阶段: {hearingStages.find(s => s.status === 'active')?.name}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isArbitrator && (
            <>
              <Button size="sm" onClick={handleNextStage}>
                ⏭️ 下一阶段
              </Button>
              <Button size="sm" variant="outline">
                ⏸️ 暂停庭审
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowEvidencePanel(!showEvidencePanel)}
          >
            📄 证据面板
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowStagePanel(!showStagePanel)}
          >
            📋 流程面板
          </Button>
        </div>
      </div>

      {/* 主要区域 */}
      <div className="flex-1 flex">
        {/* 虚拟法庭空间 */}
        <div className="flex-1 relative overflow-hidden">
          {/* 法庭背景 */}
          <div className="absolute inset-0 bg-gradient-to-b from-blue-100 to-blue-200 opacity-30" />

          {/* 法官席指示 */}
          <div className="absolute top-8 left-1/2 transform -translate-x-1/2 text-sm text-gray-600 font-medium">
            ⚖️ 仲裁员席
          </div>

          {/* 当事人席指示 */}
          <div className="absolute top-1/2 left-8 transform -translate-y-1/2 text-sm text-gray-600 font-medium rotate-90">
            申请人席
          </div>
          <div className="absolute top-1/2 right-8 transform -translate-y-1/2 text-sm text-gray-600 font-medium -rotate-90">
            被申请人席
          </div>

          {/* 参与者节点 */}
          {participants.map(participant => (
            <div
              key={participant.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 ${participant.status === 'speaking' ? 'scale-110 z-20' : 'z-10'
                }`}
              style={{
                left: participant.position.x,
                top: participant.position.y
              }}
              onClick={() => handleSpeakerChange(participant.id)}
            >
              <div className={`
                w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center
                ${getRoleColor(participant.role)}
                ${participant.status === 'speaking' ? 'ring-4 ring-yellow-400 ring-opacity-50' : ''}
                ${!participant.isOnline ? 'opacity-50' : ''}
                hover:scale-105 transition-transform
              `}>
                <div className="text-2xl mb-1">
                  {participant.role === 'arbitrator' ? '⚖️' :
                    participant.role === 'applicant' ? '👨‍💼' :
                      participant.role === 'respondent' ? '👩‍💼' :
                        participant.role === 'witness' ? '👤' : '👁️'}
                </div>
                <div className="text-xs font-medium text-center leading-tight">
                  {participant.name.split('（')[0]}
                </div>
              </div>
              <div className="absolute -top-2 -right-2 text-lg">
                {getStatusIndicator(participant)}
              </div>
            </div>
          ))}

          {/* 证据节点 */}
          {evidences.map(evidence => (
            <div
              key={evidence.id}
              className={`
                absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer
                ${getEvidenceSize(evidence.importance)}
                ${getEvidenceColor(evidence)}
                border-2 rounded-lg flex flex-col items-center justify-center
                hover:scale-105 transition-all duration-300
                ${selectedEvidence === evidence.id ? 'ring-4 ring-blue-400 ring-opacity-50' : ''}
              `}
              style={{
                left: evidence.position.x,
                top: evidence.position.y
              }}
              onClick={() => handleEvidencePresent(evidence.id)}
            >
              <div className="text-lg mb-1">
                {evidence.type === 'document' ? '📄' :
                  evidence.type === 'video' ? '🎥' :
                    evidence.type === 'audio' ? '🎵' : '🖼️'}
              </div>
              <div className="text-xs font-medium text-center leading-tight px-1">
                {evidence.title}
              </div>
              <div className="text-xs opacity-75">
                {Math.round(evidence.confidence * 100)}%
              </div>
            </div>
          ))}

          {/* 证据关系连线 */}
          <svg className="absolute inset-0 pointer-events-none">
            {evidences.map(evidence =>
              evidence.relationships.supports.map(targetId => {
                const target = evidences.find(e => e.id === targetId);
                if (!target) return null;

                return (
                  <line
                    key={`${evidence.id}-${targetId}`}
                    x1={evidence.position.x}
                    y1={evidence.position.y}
                    x2={target.position.x}
                    y2={target.position.y}
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    opacity="0.6"
                  />
                );
              })
            )}
            {evidences.map(evidence =>
              evidence.relationships.contradicts.map(targetId => {
                const target = evidences.find(e => e.id === targetId);
                if (!target) return null;

                return (
                  <line
                    key={`${evidence.id}-${targetId}-contra`}
                    x1={evidence.position.x}
                    y1={evidence.position.y}
                    x2={target.position.x}
                    y2={target.position.y}
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeDasharray="10,5"
                    opacity="0.6"
                  />
                );
              })
            )}
          </svg>

          {/* 中央展示区 */}
          {selectedEvidence && (
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
              <Card className="w-80 bg-white/90 backdrop-blur-sm border-2 border-blue-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    📺 正在展示: {evidences.find(e => e.id === selectedEvidence)?.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-gray-600">
                    置信度: {Math.round((evidences.find(e => e.id === selectedEvidence)?.confidence || 0) * 100)}%
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* 右侧面板 */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
          {/* 庭审流程面板 */}
          {showStagePanel && (
            <div className="flex-1 border-b border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800">📋 庭审流程</h3>
              </div>
              <div className="p-4 space-y-2 overflow-auto">
                {hearingStages.map(stage => (
                  <div
                    key={stage.id}
                    className={`p-3 rounded-lg border ${stage.status === 'completed' ? 'bg-green-50 border-green-200' :
                      stage.status === 'active' ? 'bg-blue-50 border-blue-200' :
                        'bg-gray-50 border-gray-200'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-lg">
                        {stage.status === 'completed' ? '✅' :
                          stage.status === 'active' ? '🔄' : '⏳'}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{stage.name}</div>
                        <div className="text-xs text-gray-600">{stage.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 证据面板 */}
          {showEvidencePanel && (
            <div className="flex-1">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800">📄 证据管理</h3>
              </div>
              <div className="p-4 space-y-2 overflow-auto">
                {evidences.map(evidence => (
                  <div
                    key={evidence.id}
                    className={`p-3 rounded-lg border cursor-pointer ${getEvidenceColor(evidence)}`}
                    onClick={() => handleEvidencePresent(evidence.id)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-lg">
                        {evidence.type === 'document' ? '📄' :
                          evidence.type === 'video' ? '🎥' :
                            evidence.type === 'audio' ? '🎵' : '🖼️'}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{evidence.title}</div>
                        <div className="text-xs text-gray-600">
                          置信度: {Math.round(evidence.confidence * 100)}% |
                          重要性: {evidence.importance === 'high' ? '高' : evidence.importance === 'medium' ? '中' : '低'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
