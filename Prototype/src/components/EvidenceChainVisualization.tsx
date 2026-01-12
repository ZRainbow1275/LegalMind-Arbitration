/**
 * 证据链可视化组件
 * 展示证据之间的逻辑关系，支持/反对分析，证据强度评估
 */

import React, { useEffect, useState } from 'react';
import { LegalNode } from './DrawnixLegalWorkspace';
import {
  EvidenceChainAnalyzerV2,
  EvidenceAnalysisResult,
  EvidenceType,
} from '../lib/evidence-chain-analyzer-v2';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';

interface EvidenceChainVisualizationProps {
  nodes: LegalNode[];
  onClose: () => void;
}

import { DraggablePanel } from './common/DraggablePanel';

export const EvidenceChainVisualization: React.FC<EvidenceChainVisualizationProps> = ({
  nodes,
  onClose,
}) => {
  const [analysis, setAnalysis] = useState<EvidenceAnalysisResult | null>(null);

  // 分析证据链
  useEffect(() => {
    const result = EvidenceChainAnalyzerV2.analyze(nodes);
    setAnalysis(result);
  }, [nodes]);

  if (!analysis) {
    return null; // 或者显示加载状态
  }

  // 证据类型配置
  const evidenceTypeConfig: Record<EvidenceType, { label: string; color: string }> = {
    direct: { label: '直接证据', color: 'bg-green-100 text-green-700 border-green-200' },
    indirect: { label: '间接证据', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    physical: { label: '物证', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    documentary: { label: '书证', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    testimony: { label: '证言', color: 'bg-pink-100 text-pink-700 border-pink-200' },
    expert: { label: '鉴定意见', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
    'audio-video': { label: '视听资料', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    electronic: { label: '电子数据', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  };



  // 强度颜色
  const getStrengthColor = (strength: number): string => {
    if (strength >= 0.8) return 'bg-green-500';
    if (strength >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <DraggablePanel
      title="证据链分析"
      initialPosition={{ x: 100, y: 100 }}
      width={900}
      height={600}
      onClose={onClose}
    >
      <div className="flex flex-col h-full">
        {/* 标题栏信息 */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-white">
          <p className="text-sm text-gray-600">
            {analysis.evidences.length} 个证据 · {analysis.chains.length} 条证据链 · {analysis.relations.length} 个关系
          </p>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧：证据列表 */}
            <div className="lg:col-span-2">
              <h3 className="text-lg font-bold text-gray-800 mb-4">所有证据</h3>
              <div className="space-y-3">
                {analysis.evidences.map((evidence) => {
                  const typeConfig = evidenceTypeConfig[evidence.type];
                  const isSupporting = analysis.supportingEvidence.some(e => e.id === evidence.id);
                  const isContradicting = analysis.contradictingEvidence.some(e => e.id === evidence.id);

                  return (
                    <Card key={evidence.id} className="border-orange-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="font-medium text-gray-800 mb-1">{evidence.title}</div>
                            <div className="text-xs text-gray-600 line-clamp-2">{evidence.description}</div>
                          </div>
                          <div className="flex flex-col items-end gap-2 ml-4">
                            <Badge variant="outline" className={`text-xs ${typeConfig.color} border`}>
                              {typeConfig.label}
                            </Badge>
                            {isSupporting && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                支持性证据
                              </Badge>
                            )}
                            {isContradicting && (
                              <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                                矛盾证据
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">强度:</span>
                            <div className="flex items-center gap-1">
                              <div className={`w-2 h-2 rounded-full ${getStrengthColor(evidence.strength)}`} />
                              <span className="text-xs font-medium">{(evidence.strength * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">可靠性:</span>
                            <span className="text-xs font-medium">{(evidence.reliability * 100).toFixed(0)}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">相关性:</span>
                            <span className="text-xs font-medium">{(evidence.relevance * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* 右侧：分析结果 */}
            <div>
              {/* 证据链 */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">证据链</h3>
                <div className="space-y-3">
                  {analysis.chains.slice(0, 5).map((chain, index) => (
                    <Card key={chain.id} className="border-orange-200">
                      <CardHeader className="pb-3 bg-gradient-to-r from-orange-50 to-white">
                        <CardTitle className="text-sm font-bold text-gray-800">
                          证据链 {index + 1}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-3">
                        <div className="space-y-2 mb-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">整体强度:</span>
                            <span className="font-medium">{(chain.overallStrength * 100).toFixed(0)}%</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">完整性:</span>
                            <span className="font-medium">{(chain.completeness * 100).toFixed(0)}%</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">一致性:</span>
                            <span className="font-medium">{(chain.consistency * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-600">{chain.conclusion}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* 弱点 */}
              {analysis.weaknesses.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    弱点
                  </h3>
                  <div className="space-y-2">
                    {analysis.weaknesses.map((weakness, index) => (
                      <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                        {weakness}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 建议 */}
              {analysis.recommendations.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    建议
                  </h3>
                  <div className="space-y-2">
                    {analysis.recommendations.map((recommendation, index) => (
                      <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                        {recommendation}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 底部统计 */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>支持性证据 ({analysis.supportingEvidence.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" />
                <span>矛盾证据 ({analysis.contradictingEvidence.length})</span>
              </div>
            </div>
            <Button
              onClick={onClose}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              关闭
            </Button>
          </div>
        </div>
      </div>
    </DraggablePanel>
  );
};

