import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

import {
  AlertTriangle,
  CheckCircle,
  Target,
  Network,
  Scale,
  Lightbulb,
  Eye,
  Download,
  Sparkles,
  Brain
} from 'lucide-react';
import { LegalNode } from '../workspace/types';
import { LegalLogicEngine } from '../../lib/legal-logic-engine';

// AI分析结果数据结构
interface NodeAnalysisResult {
  id: string;
  nodeIds: string[];
  analysisType: 'relationship' | 'contradiction' | 'evidence_gap' | 'legal_risk' | 'strategy';
  title: string;
  description: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  insights: string[];
  recommendations: string[];
  affectedParties: string[];
  legalBasis: string[];
  timeEstimate?: number; // 处理时间估计（小时）
  priority: number; // 1-10
}

// 智能组合分析结果
interface CombinationAnalysis {
  id: string;
  combinationType: 'evidence_chain' | 'case_theory' | 'dispute_pattern' | 'risk_assessment';
  title: string;
  description: string;
  nodeIds: string[];
  strength: number; // 0-1
  completeness: number; // 0-1
  consistency: number; // 0-1
  gaps: string[];
  strengths: string[];
  recommendations: string[];
  aiConfidence: number;
}

interface IntelligentNodeAnalyzerProps {
  selectedNodes: LegalNode[];
  allNodes: LegalNode[];
  onAnalysisComplete?: (results: NodeAnalysisResult[]) => void;
  onRecommendationApply?: (recommendation: string, nodeIds: string[]) => void;
}

export const IntelligentNodeAnalyzer: React.FC<IntelligentNodeAnalyzerProps> = ({
  selectedNodes,
  allNodes,
  onAnalysisComplete,
  onRecommendationApply
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<NodeAnalysisResult[]>([]);
  const [combinationAnalysis, setCombinationAnalysis] = useState<CombinationAnalysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<string | null>(null);
  const [analysisMode, setAnalysisMode] = useState<'quick' | 'deep' | 'comprehensive'>('quick');

  // 真实AI分析过程（基于规则引擎）
  const performIntelligentAnalysis = useCallback(async () => {
    // 即使只选择了一个节点，也可以进行全局或局部上下文分析
    if (selectedNodes.length === 0 && allNodes.length === 0) return;

    setIsAnalyzing(true);

    // 模拟计算延迟，提供更好的UX
    await new Promise(resolve => setTimeout(resolve, 800));

    // 使用规则引擎分析
    const engineResults = LegalLogicEngine.analyze(selectedNodes.length > 0 ? selectedNodes : allNodes);

    // 转换为组件需要的格式
    const results: NodeAnalysisResult[] = engineResults.map((res) => ({
      id: res.id,
      nodeIds: res.nodeIds,
      analysisType: res.type === 'gap' ? 'evidence_gap' : res.type === 'risk' ? 'legal_risk' : res.type === 'contradiction' ? 'contradiction' : 'strategy',
      title: res.title,
      description: res.description,
      confidence: 0.95, // 规则引擎是确定的
      severity: (res.severity === 'high' ? 'high' : res.severity === 'medium' ? 'medium' : 'low') as NodeAnalysisResult['severity'],
      insights: [res.description],
      recommendations: [res.recommendation],
      affectedParties: [], // 可以进一步推断
      legalBasis: [], // 可以进一步关联
      timeEstimate: 1,
      priority: res.severity === 'high' ? 9 : res.severity === 'medium' ? 6 : 3
    }));

    // 如果没有发现问题，生成一些正面反馈
    if (results.length === 0) {
      results.push({
        id: 'success-check',
        nodeIds: [],
        analysisType: 'strategy',
        title: '结构完整性检查通过',
        description: '当前选中的节点结构合理，未发现明显的逻辑缺口或孤立节点。',
        confidence: 1.0,
        severity: 'low',
        insights: ['节点连接紧密', '关键要素齐全'],
        recommendations: ['继续保持当前的梳理深度'],
        affectedParties: [],
        legalBasis: [],
        priority: 1
      });
    }

    setAnalysisResults(results);
    // 组合分析暂时保持为空或基于规则生成
    setCombinationAnalysis([]);
    setIsAnalyzing(false);

    onAnalysisComplete?.(results);
  }, [selectedNodes, allNodes, onAnalysisComplete]);

  // 自动分析触发
  useEffect(() => {
    if (selectedNodes.length >= 2) {
      performIntelligentAnalysis();
    } else {
      setAnalysisResults([]);
      setCombinationAnalysis([]);
    }
  }, [selectedNodes, performIntelligentAnalysis]);

  // 获取严重程度配置
  const getSeverityConfig = (severity: NodeAnalysisResult['severity']) => {
    const configs = {
      low: { label: '低风险', color: 'bg-green-100 text-green-700', icon: CheckCircle },
      medium: { label: '中等风险', color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle },
      high: { label: '高风险', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
      critical: { label: '严重风险', color: 'bg-red-100 text-red-700', icon: AlertTriangle }
    };
    return configs[severity];
  };

  // 获取分析类型配置
  const getAnalysisTypeConfig = (type: NodeAnalysisResult['analysisType']) => {
    const configs = {
      relationship: { label: '关联分析', color: 'bg-blue-500', icon: Network },
      contradiction: { label: '矛盾检测', color: 'bg-red-500', icon: AlertTriangle },
      evidence_gap: { label: '证据缺失', color: 'bg-yellow-500', icon: Target },
      legal_risk: { label: '法律风险', color: 'bg-purple-500', icon: Scale },
      strategy: { label: '策略建议', color: 'bg-green-500', icon: Lightbulb }
    };
    return configs[type];
  };

  // 应用建议
  const handleApplyRecommendation = useCallback((recommendation: string, nodeIds: string[]) => {
    onRecommendationApply?.(recommendation, nodeIds);
  }, [onRecommendationApply]);

  if (selectedNodes.length < 2) {
    return (
      <Card className="border-orange-200">
        <CardContent className="p-8 text-center">
          <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <div className="flex items-center gap-2 justify-center mb-2">
            <h3 className="text-lg font-semibold text-gray-700">智能节点分析</h3>
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 text-xs">
              演示模式
            </Badge>
          </div>
          <p className="text-gray-500 mb-4">
            请选择至少2个节点来启动AI智能分析（演示功能）
          </p>
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            当前已选择 {selectedNodes.length} 个节点
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 分析控制面板 */}
      <Card className="border-orange-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Brain className="w-5 h-5 text-orange-500" />
              AI智能节点分析
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 text-xs">
                演示模式
              </Badge>
              <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                {selectedNodes.length} 个节点
              </Badge>
            </CardTitle>

            <div className="flex items-center gap-2">
              <Button
                variant={analysisMode === 'quick' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAnalysisMode('quick')}
                className="text-xs"
              >
                快速分析
              </Button>
              <Button
                variant={analysisMode === 'deep' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAnalysisMode('deep')}
                className="text-xs"
              >
                深度分析
              </Button>
              <Button
                variant={analysisMode === 'comprehensive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAnalysisMode('comprehensive')}
                className="text-xs"
              >
                全面分析
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 分析状态 */}
      {isAnalyzing && (
        <Card className="border-blue-200">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-lg font-semibold text-blue-700">AI正在分析中...</span>
            </div>
            <p className="text-gray-600">
              正在对 {selectedNodes.length} 个节点进行智能分析，请稍候
            </p>
          </CardContent>
        </Card>
      )}

      {/* 分析结果 */}
      {!isAnalyzing && analysisResults.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {analysisResults.map((result) => {
            const typeConfig = getAnalysisTypeConfig(result.analysisType);
            const severityConfig = getSeverityConfig(result.severity);
            const TypeIcon = typeConfig.icon;
            const SeverityIcon = severityConfig.icon;
            const isSelected = selectedAnalysis === result.id;

            return (
              <Card
                key={result.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${isSelected ? 'ring-2 ring-orange-500 shadow-lg' : 'border-gray-200'
                  }`}
                onClick={() => setSelectedAnalysis(isSelected ? null : result.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${typeConfig.color} flex items-center justify-center`}>
                        <TypeIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold text-gray-800">
                          {result.title}
                        </CardTitle>
                        <p className="text-xs text-gray-500 mt-1">
                          {typeConfig.label} • 优先级 {result.priority}/10
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${severityConfig.color}`}
                      >
                        <SeverityIcon className="w-3 h-3 mr-1" />
                        {severityConfig.label}
                      </Badge>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                        置信度 {Math.round(result.confidence * 100)}%
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <p className="text-sm text-gray-600 mb-3">
                    {result.description}
                  </p>

                  {/* 关键洞察 */}
                  <div className="bg-blue-50 rounded-lg p-3 mb-3">
                    <h4 className="text-xs font-medium text-blue-700 mb-2">关键洞察</h4>
                    <div className="space-y-1">
                      {result.insights.slice(0, 2).map((insight, index) => (
                        <p key={index} className="text-xs text-gray-700">• {insight}</p>
                      ))}
                    </div>
                  </div>

                  {/* 展开详情 */}
                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                      {/* AI建议 */}
                      <div>
                        <h4 className="text-xs font-medium text-gray-700 mb-2">AI建议</h4>
                        <div className="space-y-2">
                          {result.recommendations.map((rec, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <p className="text-xs text-gray-600 flex-1">• {rec}</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApplyRecommendation(rec, result.nodeIds);
                                }}
                                className="text-xs h-6 px-2"
                              >
                                应用
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 法律依据 */}
                      <div>
                        <h4 className="text-xs font-medium text-gray-700 mb-2">法律依据</h4>
                        <div className="flex flex-wrap gap-1">
                          {result.legalBasis.map((basis, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {basis}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex items-center gap-2 pt-2">
                        <Button variant="outline" size="sm" className="text-xs">
                          <Eye className="w-3 h-3 mr-1" />
                          详细报告
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs">
                          <Download className="w-3 h-3 mr-1" />
                          导出分析
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 组合分析结果 */}
      {!isAnalyzing && combinationAnalysis.length > 0 && (
        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle className="text-md font-semibold text-gray-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              智能组合分析
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {combinationAnalysis.map((combo) => (
                <div key={combo.id} className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-800">{combo.title}</h3>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-xs">
                      AI置信度 {Math.round(combo.aiConfidence * 100)}%
                    </Badge>
                  </div>

                  <p className="text-sm text-gray-600 mb-3">{combo.description}</p>

                  {/* 强度指标 */}
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <span className="text-xs text-gray-500">强度</span>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${combo.strength * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium">{Math.round(combo.strength * 100)}%</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">完整性</span>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${combo.completeness * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium">{Math.round(combo.completeness * 100)}%</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">一致性</span>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className="bg-purple-500 h-2 rounded-full"
                          style={{ width: `${combo.consistency * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium">{Math.round(combo.consistency * 100)}%</span>
                    </div>
                  </div>

                  {/* 优势和缺失 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-medium text-green-700 mb-2">优势</h4>
                      <div className="space-y-1">
                        {combo.strengths.slice(0, 2).map((strength, index) => (
                          <p key={index} className="text-xs text-gray-600">✓ {strength}</p>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-red-700 mb-2">缺失</h4>
                      <div className="space-y-1">
                        {combo.gaps.slice(0, 2).map((gap, index) => (
                          <p key={index} className="text-xs text-gray-600">⚠ {gap}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
