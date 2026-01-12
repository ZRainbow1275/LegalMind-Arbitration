
import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Link2,
  Network,
  AlertTriangle,
  CheckCircle,
  Eye,
  RefreshCw,
  Download,
  Target,
  Sparkles
} from 'lucide-react';
import { LegalNode } from '../DrawnixLegalWorkspace';

// 证据关系类型
type RelationshipType =
  | 'supports' // 支持
  | 'contradicts' // 矛盾
  | 'supplements' // 补充
  | 'duplicates' // 重复
  | 'references' // 引用
  | 'temporal' // 时间关联
  | 'causal' // 因果关系
  | 'contextual'; // 上下文关联

// 证据关系数据结构
interface EvidenceRelationship {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: RelationshipType;
  strength: number; // 0-1
  confidence: number; // 0-1
  description: string;
  aiReasoning: string;
  keyFactors: string[];
  riskLevel: 'low' | 'medium' | 'high';
  actionRequired: boolean;
  detectedAt: string;
}

// 关系网络分析结果
interface NetworkAnalysis {
  totalRelationships: number;
  strongRelationships: number; // strength > 0.7
  contradictions: number;
  evidenceGaps: string[];
  centralNodes: string[]; // 核心证据节点
  isolatedNodes: string[]; // 孤立节点
  clusters: Array<{
    id: string;
    nodeIds: string[];
    theme: string;
    strength: number;
  }>;
  recommendations: string[];
}

interface EvidenceRelationshipDetectorProps {
  nodes: LegalNode[];
  onRelationshipDetected?: (relationships: EvidenceRelationship[]) => void;
  onNetworkAnalysisComplete?: (analysis: NetworkAnalysis) => void;
}

export const EvidenceRelationshipDetector: React.FC<EvidenceRelationshipDetectorProps> = ({
  nodes,
  onRelationshipDetected,
  onNetworkAnalysisComplete
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [relationships, setRelationships] = useState<EvidenceRelationship[]>([]);
  const [networkAnalysis, setNetworkAnalysis] = useState<NetworkAnalysis | null>(null);
  const [selectedRelationship, setSelectedRelationship] = useState<string | null>(null);
  const [analysisMode, setAnalysisMode] = useState<'automatic' | 'manual' | 'hybrid'>('automatic');
  const [filterType, setFilterType] = useState<RelationshipType | 'all'>('all');

  // 获取关系类型配置
  const getRelationshipTypeConfig = (type: RelationshipType) => {
    const configs = {
      supports: { label: '支持', color: 'bg-green-500', textColor: 'text-green-700' },
      contradicts: { label: '矛盾', color: 'bg-red-500', textColor: 'text-red-700' },
      supplements: { label: '补充', color: 'bg-blue-500', textColor: 'text-blue-700' },
      duplicates: { label: '重复', color: 'bg-yellow-500', textColor: 'text-yellow-700' },
      references: { label: '引用', color: 'bg-purple-500', textColor: 'text-purple-700' },
      temporal: { label: '时间关联', color: 'bg-indigo-500', textColor: 'text-indigo-700' },
      causal: { label: '因果关系', color: 'bg-orange-500', textColor: 'text-orange-700' },
      contextual: { label: '上下文', color: 'bg-gray-500', textColor: 'text-gray-700' }
    };
    return configs[type];
  };

  // 模拟AI证据关系检测
  const performRelationshipDetection = useCallback(async () => {
    if (nodes.length < 2) return;

    setIsAnalyzing(true);

    // 模拟AI分析延迟
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 生成模拟关系数据
    const detectedRelationships: EvidenceRelationship[] = [
      {
        id: 'rel-001',
        sourceNodeId: nodes[0]?.id || 'case-001',
        targetNodeId: nodes[1]?.id || 'person-001',
        relationshipType: 'supports',
        strength: 0.89,
        confidence: 0.92,
        description: '合同条款直接支持申请人的主张',
        aiReasoning: 'AI检测到合同第5.2条明确约定了交付时间，与申请人陈述高度一致',
        keyFactors: ['条款明确性', '时间一致性', '法律效力'],
        riskLevel: 'low',
        actionRequired: false,
        detectedAt: new Date().toISOString()
      },
      {
        id: 'rel-002',
        sourceNodeId: nodes[1]?.id || 'person-001',
        targetNodeId: nodes[2]?.id || 'person-002',
        relationshipType: 'contradicts',
        strength: 0.76,
        confidence: 0.84,
        description: '双方对交付时间的陈述存在矛盾',
        aiReasoning: 'AI发现申请人声称12月15日应交付，但被申请人主张合同约定为12月20日',
        keyFactors: ['时间差异', '合同解释', '举证责任'],
        riskLevel: 'high',
        actionRequired: true,
        detectedAt: new Date().toISOString()
      },
      {
        id: 'rel-003',
        sourceNodeId: nodes[0]?.id || 'case-001',
        targetNodeId: nodes[2]?.id || 'person-002',
        relationshipType: 'temporal',
        strength: 0.82,
        confidence: 0.88,
        description: '时间序列关系清晰',
        aiReasoning: '合同签署时间与争议发生时间形成清晰的时间链条',
        keyFactors: ['时间顺序', '因果链条', '证据时效'],
        riskLevel: 'medium',
        actionRequired: false,
        detectedAt: new Date().toISOString()
      },
      {
        id: 'rel-004',
        sourceNodeId: nodes[1]?.id || 'person-001',
        targetNodeId: nodes[0]?.id || 'case-001',
        relationshipType: 'supplements',
        strength: 0.71,
        confidence: 0.79,
        description: '当事人陈述补充了合同条款的理解',
        aiReasoning: 'AI分析显示当事人的陈述为合同条款的具体执行提供了补充说明',
        keyFactors: ['条款解释', '执行细节', '意思表示'],
        riskLevel: 'low',
        actionRequired: false,
        detectedAt: new Date().toISOString()
      }
    ];

    // 生成网络分析
    const analysis: NetworkAnalysis = {
      totalRelationships: detectedRelationships.length,
      strongRelationships: detectedRelationships.filter(r => r.strength > 0.7).length,
      contradictions: detectedRelationships.filter(r => r.relationshipType === 'contradicts').length,
      evidenceGaps: ['损失计算证据缺失', '第三方确认材料不足', '时间节点证明需要加强'],
      centralNodes: [nodes[0]?.id || 'case-001'],
      isolatedNodes: [],
      clusters: [
        {
          id: 'cluster-001',
          nodeIds: [nodes[0]?.id || 'case-001', nodes[1]?.id || 'person-001'],
          theme: '合同履行争议',
          strength: 0.85
        },
        {
          id: 'cluster-002',
          nodeIds: [nodes[1]?.id || 'person-001', nodes[2]?.id || 'person-002'],
          theme: '当事人陈述',
          strength: 0.72
        }
      ],
      recommendations: [
        '重点关注矛盾关系的解决',
        '加强证据链的完整性',
        '补充第三方证据材料',
        '明确时间节点的具体证据'
      ]
    };

    setRelationships(detectedRelationships);
    setNetworkAnalysis(analysis);
    setIsAnalyzing(false);

    onRelationshipDetected?.(detectedRelationships);
    onNetworkAnalysisComplete?.(analysis);
  }, [nodes, onRelationshipDetected, onNetworkAnalysisComplete]);

  // 自动检测触发
  useEffect(() => {
    if (nodes.length >= 2 && analysisMode === 'automatic') {
      performRelationshipDetection();
    }
  }, [nodes, analysisMode, performRelationshipDetection]);

  // 过滤关系
  const filteredRelationships = relationships.filter(rel =>
    filterType === 'all' || rel.relationshipType === filterType
  );

  // 获取强度颜色
  const getStrengthColor = (strength: number) => {
    if (strength >= 0.8) return 'text-green-600';
    if (strength >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  // 获取风险等级颜色
  const getRiskColor = (risk: string) => {
    const colors = {
      low: 'bg-green-100 text-green-700',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-red-100 text-red-700'
    };
    return colors[risk as keyof typeof colors] || colors.low;
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-4">
      {/* 控制面板 */}
      <Card className="border-orange-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Network className="w-5 h-5 text-orange-500" />
              AI证据关系自动识别
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 text-xs">
                演示模式
              </Badge>
              <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                {nodes.length} 个节点
              </Badge>
            </CardTitle>

            <div className="flex items-center gap-2">
              <Button
                variant={analysisMode === 'automatic' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAnalysisMode('automatic')}
                className="text-xs"
              >
                自动检测
              </Button>
              <Button
                variant={analysisMode === 'manual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAnalysisMode('manual')}
                className="text-xs"
              >
                手动分析
              </Button>
              <Button
                variant={analysisMode === 'hybrid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAnalysisMode('hybrid')}
                className="text-xs"
              >
                混合模式
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={performRelationshipDetection}
                disabled={isAnalyzing}
                className="border-orange-200 hover:border-orange-400"
              >
                <RefreshCw className={`w - 4 h - 4 mr - 2 ${isAnalyzing ? 'animate-spin' : ''} `} />
                重新分析
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 网络分析概览 */}
      {networkAnalysis && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700">总关系数</p>
                  <p className="text-lg font-bold text-blue-600">{networkAnalysis.totalRelationships}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700">强关系</p>
                  <p className="text-lg font-bold text-green-600">{networkAnalysis.strongRelationships}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700">矛盾关系</p>
                  <p className="text-lg font-bold text-red-600">{networkAnalysis.contradictions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700">证据缺口</p>
                  <p className="text-lg font-bold text-purple-600">{networkAnalysis.evidenceGaps.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 分析状态 */}
      {isAnalyzing && (
        <Card className="border-blue-200">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-lg font-semibold text-blue-700">AI正在分析证据关系...</span>
            </div>
            <p className="text-gray-600">
              正在使用深度学习算法分析 {nodes.length} 个节点之间的关系
            </p>
          </CardContent>
        </Card>
      )}

      {/* 关系过滤器 */}
      {!isAnalyzing && relationships.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-md font-semibold text-gray-800">检测到的关系</CardTitle>
              <div className="flex items-center gap-2">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as RelationshipType | 'all')}
                  className="text-xs border border-gray-300 rounded px-2 py-1"
                >
                  <option value="all">所有类型</option>
                  <option value="supports">支持关系</option>
                  <option value="contradicts">矛盾关系</option>
                  <option value="supplements">补充关系</option>
                  <option value="temporal">时间关联</option>
                  <option value="causal">因果关系</option>
                </select>
                <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                  {filteredRelationships.length} 个关系
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredRelationships.map((relationship) => {
                const typeConfig = getRelationshipTypeConfig(relationship.relationshipType);
                const isSelected = selectedRelationship === relationship.id;

                return (
                  <div key={relationship.id}>
                    <div
                      className={`p - 4 rounded - lg cursor - pointer transition - all duration - 200 ${isSelected ? 'bg-orange-50 border border-orange-200' : 'hover:bg-gray-50 border border-gray-200'
                        } `}
                      onClick={() => setSelectedRelationship(isSelected ? null : relationship.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`w - 3 h - 3 rounded - full ${typeConfig.color} `} />
                          <span className="text-sm font-semibold text-gray-800">
                            {typeConfig.label}关系
                          </span>
                          <Badge variant="outline" className={getRiskColor(relationship.riskLevel)}>
                            {relationship.riskLevel === 'low' ? '低风险' :
                              relationship.riskLevel === 'medium' ? '中风险' : '高风险'}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">强度:</span>
                          <span className={`text - xs font - medium ${getStrengthColor(relationship.strength)} `}>
                            {Math.round(relationship.strength * 100)}%
                          </span>
                          <span className="text-xs text-gray-500">置信度:</span>
                          <span className="text-xs font-medium text-blue-600">
                            {Math.round(relationship.confidence * 100)}%
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mb-2">{relationship.description}</p>

                      {/* 展开详情 */}
                      {isSelected && (
                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                          <div>
                            <h4 className="text-xs font-medium text-gray-700 mb-2">AI推理过程</h4>
                            <p className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
                              {relationship.aiReasoning}
                            </p>
                          </div>

                          <div>
                            <h4 className="text-xs font-medium text-gray-700 mb-2">关键因素</h4>
                            <div className="flex flex-wrap gap-1">
                              {relationship.keyFactors.map((factor, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {factor}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {relationship.actionRequired && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                                <span className="text-xs font-medium text-yellow-700">需要处理</span>
                              </div>
                              <p className="text-xs text-yellow-700">
                                此关系需要进一步调查和处理，建议优先关注。
                              </p>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="text-xs">
                              <Eye className="w-3 h-3 mr-1" />
                              详细分析
                            </Button>
                            <Button variant="outline" size="sm" className="text-xs">
                              <Download className="w-3 h-3 mr-1" />
                              导出报告
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 网络分析建议 */}
      {networkAnalysis && networkAnalysis.recommendations.length > 0 && (
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="text-md font-semibold text-gray-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-green-500" />
              AI网络分析建议
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {networkAnalysis.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700">{recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
