import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Target,
  Zap,
  Brain,
  Star,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Bookmark,
  Download
} from 'lucide-react';
import { LegalNode } from '../DrawnixLegalWorkspace';

// 智能建议类型
type RecommendationType =
  | 'evidence_collection' // 证据收集
  | 'legal_strategy' // 法律策略
  | 'risk_mitigation' // 风险缓解
  | 'procedure_optimization' // 程序优化
  | 'document_preparation' // 文档准备
  | 'timeline_management' // 时间管理
  | 'cost_optimization' // 成本优化
  | 'settlement_opportunity'; // 和解机会

// 智能建议数据结构
interface SmartRecommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  confidence: number; // 0-1
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  timeframe: string; // 建议执行时间
  reasoning: string;
  actionSteps: string[];
  expectedOutcome: string;
  riskFactors: string[];
  relatedNodes: string[];
  legalBasis: string[];
  precedentCases: string[];
  estimatedCost?: number;
  estimatedTime?: number; // 小时
  createdAt: string;
  status: 'new' | 'viewed' | 'accepted' | 'rejected' | 'implemented';
}

// 建议分析结果
interface RecommendationAnalysis {
  totalRecommendations: number;
  highPriorityCount: number;
  averageConfidence: number;
  implementationRate: number;
  categories: Array<{
    type: RecommendationType;
    count: number;
    averagePriority: number;
  }>;
  trends: Array<{
    period: string;
    count: number;
    successRate: number;
  }>;
}

interface SmartRecommendationEngineProps {
  nodes: LegalNode[];
  caseContext?: {
    caseType: string;
    stage: string;
    complexity: 'low' | 'medium' | 'high';
    budget?: number;
    timeline?: string;
  };
  onRecommendationAction?: (recommendationId: string, action: 'accept' | 'reject' | 'implement') => void;
  onRecommendationApply?: (recommendation: SmartRecommendation) => void;
}

export const SmartRecommendationEngine: React.FC<SmartRecommendationEngineProps> = ({
  nodes,
  onRecommendationAction,
  onRecommendationApply
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [recommendations, setRecommendations] = useState<SmartRecommendation[]>([]);
  const [analysis, setAnalysis] = useState<RecommendationAnalysis | null>(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<RecommendationType | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'urgent'>('all');

  // 获取建议类型配置
  const getRecommendationTypeConfig = (type: RecommendationType) => {
    const configs = {
      evidence_collection: { label: '证据收集', color: 'bg-blue-500', icon: Target },
      legal_strategy: { label: '法律策略', color: 'bg-purple-500', icon: Brain },
      risk_mitigation: { label: '风险缓解', color: 'bg-red-500', icon: AlertTriangle },
      procedure_optimization: { label: '程序优化', color: 'bg-green-500', icon: TrendingUp },
      document_preparation: { label: '文档准备', color: 'bg-yellow-500', icon: CheckCircle },
      timeline_management: { label: '时间管理', color: 'bg-indigo-500', icon: Clock },
      cost_optimization: { label: '成本优化', color: 'bg-orange-500', icon: Star },
      settlement_opportunity: { label: '和解机会', color: 'bg-teal-500', icon: Lightbulb }
    };
    return configs[type];
  };

  // 获取优先级配置
  const getPriorityConfig = (priority: SmartRecommendation['priority']) => {
    const configs = {
      low: { label: '低优先级', color: 'bg-gray-100 text-gray-700' },
      medium: { label: '中优先级', color: 'bg-blue-100 text-blue-700' },
      high: { label: '高优先级', color: 'bg-orange-100 text-orange-700' },
      urgent: { label: '紧急', color: 'bg-red-100 text-red-700' }
    };
    return configs[priority];
  };

  // 生成智能建议
  const generateRecommendations = useCallback(async () => {
    setIsGenerating(true);

    // 模拟AI生成延迟
    await new Promise(resolve => setTimeout(resolve, 2500));

    // 生成模拟建议数据
    const generatedRecommendations: SmartRecommendation[] = [
      {
        id: 'rec-001',
        type: 'evidence_collection',
        title: '补充关键证据材料',
        description: 'AI分析发现当前证据链在损失计算方面存在缺失，建议补充相关材料',
        priority: 'high',
        confidence: 0.89,
        impact: 'high',
        effort: 'medium',
        timeframe: '7天内',
        reasoning: '基于类似案例分析，损失计算证据的完整性直接影响仲裁结果，当前缺失的材料可能导致败诉风险增加35%',
        actionSteps: [
          '委托专业评估机构进行损失评估',
          '收集市场价格对比数据',
          '整理相关财务记录和凭证',
          '准备专家证人证言'
        ],
        expectedOutcome: '提高胜诉概率约25%，增强损失主张的可信度',
        riskFactors: ['评估成本较高', '时间紧迫', '第三方配合度不确定'],
        relatedNodes: [nodes[0]?.id || 'case-001'],
        legalBasis: ['合同法第113条', '最高法损害赔偿司法解释'],
        precedentCases: ['(2023)最高法民终123号', '(2022)京仲裁字第456号'],
        estimatedCost: 15000,
        estimatedTime: 40,
        createdAt: new Date().toISOString(),
        status: 'new'
      },
      {
        id: 'rec-002',
        type: 'legal_strategy',
        title: '调整仲裁策略重点',
        description: '建议将重点从违约责任转向合同解释，提高胜诉可能性',
        priority: 'medium',
        confidence: 0.76,
        impact: 'high',
        effort: 'low',
        timeframe: '3天内',
        reasoning: '通过案例数据库分析，类似争议中合同解释角度的成功率为72%，而违约责任角度仅为45%',
        actionSteps: [
          '重新梳理合同条款解释逻辑',
          '收集合同签署时的背景材料',
          '准备合同解释的法律依据',
          '调整庭审陈述重点'
        ],
        expectedOutcome: '提高胜诉概率约27%，降低败诉风险',
        riskFactors: ['策略调整可能影响一致性', '需要重新准备部分材料'],
        relatedNodes: [nodes[0]?.id || 'case-001', nodes[1]?.id || 'person-001'],
        legalBasis: ['合同法第125条', '民法典第466条'],
        precedentCases: ['(2023)沪仲裁字第789号'],
        estimatedTime: 16,
        createdAt: new Date().toISOString(),
        status: 'new'
      },
      {
        id: 'rec-003',
        type: 'risk_mitigation',
        title: '应对管辖权异议风险',
        description: '预测对方可能提出管辖权异议，建议提前准备应对材料',
        priority: 'urgent',
        confidence: 0.82,
        impact: 'medium',
        effort: 'medium',
        timeframe: '2天内',
        reasoning: '基于对方律师历史案例分析，其在类似案件中提出管辖权异议的概率为78%',
        actionSteps: [
          '整理仲裁协议的有效性证据',
          '准备管辖权确认的法律依据',
          '收集双方认可仲裁条款的证据',
          '准备应对异议的书面材料'
        ],
        expectedOutcome: '避免程序性败诉，确保案件顺利进行',
        riskFactors: ['时间紧迫', '需要大量文件整理'],
        relatedNodes: [nodes[0]?.id || 'case-001'],
        legalBasis: ['仲裁法第20条', '最高法仲裁司法解释'],
        precedentCases: ['(2023)最高法民特123号'],
        estimatedTime: 24,
        createdAt: new Date().toISOString(),
        status: 'new'
      },
      {
        id: 'rec-004',
        type: 'settlement_opportunity',
        title: '探索和解可能性',
        description: 'AI分析显示当前阶段存在较好的和解机会，建议主动探索',
        priority: 'medium',
        confidence: 0.71,
        impact: 'medium',
        effort: 'low',
        timeframe: '5天内',
        reasoning: '基于案件进展和双方态度分析，当前和解成功率约为65%，可节省时间和成本',
        actionSteps: [
          '评估和解的底线和条件',
          '准备和解方案草案',
          '通过仲裁庭探索和解意向',
          '制定和解谈判策略'
        ],
        expectedOutcome: '可能节省50%的时间和成本，避免败诉风险',
        riskFactors: ['对方可能不配合', '和解条件可能不理想'],
        relatedNodes: [nodes[0]?.id || 'case-001', nodes[1]?.id || 'person-001'],
        legalBasis: ['仲裁法第51条'],
        precedentCases: [],
        estimatedTime: 12,
        createdAt: new Date().toISOString(),
        status: 'new'
      }
    ];

    // 生成分析数据
    const analysisData: RecommendationAnalysis = {
      totalRecommendations: generatedRecommendations.length,
      highPriorityCount: generatedRecommendations.filter(r => r.priority === 'high' || r.priority === 'urgent').length,
      averageConfidence: generatedRecommendations.reduce((sum, r) => sum + r.confidence, 0) / generatedRecommendations.length,
      implementationRate: 0.75,
      categories: [
        { type: 'evidence_collection', count: 1, averagePriority: 3 },
        { type: 'legal_strategy', count: 1, averagePriority: 2 },
        { type: 'risk_mitigation', count: 1, averagePriority: 4 },
        { type: 'settlement_opportunity', count: 1, averagePriority: 2 }
      ],
      trends: [
        { period: '本周', count: 4, successRate: 0.75 },
        { period: '上周', count: 3, successRate: 0.67 },
        { period: '本月', count: 12, successRate: 0.71 }
      ]
    };

    setRecommendations(generatedRecommendations);
    setAnalysis(analysisData);
    setIsGenerating(false);
  }, [nodes]);

  // 自动生成建议
  useEffect(() => {
    if (nodes.length > 0) {
      generateRecommendations();
    }
  }, [nodes, generateRecommendations]);

  // 处理建议操作
  const handleRecommendationAction = useCallback((recommendationId: string, action: 'accept' | 'reject' | 'implement') => {
    setRecommendations(prev => prev.map(rec =>
      rec.id === recommendationId
        ? { ...rec, status: action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'implemented' }
        : rec
    ));
    onRecommendationAction?.(recommendationId, action);
  }, [onRecommendationAction]);

  // 过滤建议
  const filteredRecommendations = recommendations.filter(rec => {
    const typeMatch = filterType === 'all' || rec.type === filterType;
    const priorityMatch = filterPriority === 'all' ||
      (filterPriority === 'high' && (rec.priority === 'high' || rec.priority === 'urgent')) ||
      (filterPriority === 'urgent' && rec.priority === 'urgent');
    return typeMatch && priorityMatch;
  });

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-4">
      {/* 控制面板 */}
      <Card className="border-orange-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-orange-500" />
              AI智能建议引擎
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 text-xs">
                演示模式
              </Badge>
              <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                {nodes.length} 个节点
              </Badge>
            </CardTitle>

            <Button
              variant="outline"
              size="sm"
              onClick={generateRecommendations}
              disabled={isGenerating}
              className="border-orange-200 hover:border-orange-400"
            >
              <Zap className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-pulse' : ''}`} />
              {isGenerating ? '生成中...' : '重新生成'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* 分析概览 */}
      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700">总建议数</p>
                  <p className="text-lg font-bold text-blue-600">{analysis.totalRecommendations}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700">高优先级</p>
                  <p className="text-lg font-bold text-red-600">{analysis.highPriorityCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700">平均置信度</p>
                  <p className="text-lg font-bold text-green-600">{Math.round(analysis.averageConfidence * 100)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700">实施率</p>
                  <p className="text-lg font-bold text-purple-600">{Math.round(analysis.implementationRate * 100)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 生成状态 */}
      {isGenerating && (
        <Card className="border-blue-200">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-lg font-semibold text-blue-700">AI正在生成智能建议...</span>
            </div>
            <p className="text-gray-600">
              正在基于案件情况和历史数据生成个性化建议
            </p>
          </CardContent>
        </Card>
      )}

      {/* 建议过滤器 */}
      {!isGenerating && recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-md font-semibold text-gray-800">智能建议列表</CardTitle>
              <div className="flex items-center gap-2">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as RecommendationType | 'all')}
                  className="text-xs border border-gray-300 rounded px-2 py-1"
                >
                  <option value="all">所有类型</option>
                  <option value="evidence_collection">证据收集</option>
                  <option value="legal_strategy">法律策略</option>
                  <option value="risk_mitigation">风险缓解</option>
                  <option value="settlement_opportunity">和解机会</option>
                </select>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value as 'all' | 'high' | 'urgent')}
                  className="text-xs border border-gray-300 rounded px-2 py-1"
                >
                  <option value="all">所有优先级</option>
                  <option value="high">高优先级</option>
                  <option value="urgent">紧急</option>
                </select>
                <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                  {filteredRecommendations.length} 个建议
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredRecommendations.map((recommendation) => {
                const typeConfig = getRecommendationTypeConfig(recommendation.type);
                const priorityConfig = getPriorityConfig(recommendation.priority);
                const TypeIcon = typeConfig.icon;
                const isSelected = selectedRecommendation === recommendation.id;

                return (
                  <Card
                    key={recommendation.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${isSelected ? 'ring-2 ring-orange-500 shadow-lg' : 'border-gray-200'
                      }`}
                    onClick={() => setSelectedRecommendation(isSelected ? null : recommendation.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg ${typeConfig.color} flex items-center justify-center`}>
                            <TypeIcon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-semibold text-gray-800">
                              {recommendation.title}
                            </CardTitle>
                            <p className="text-xs text-gray-500 mt-1">
                              {typeConfig.label} • {recommendation.timeframe}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            variant="secondary"
                            className={`text-xs ${priorityConfig.color}`}
                          >
                            {priorityConfig.label}
                          </Badge>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                            置信度 {Math.round(recommendation.confidence * 100)}%
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <p className="text-sm text-gray-600 mb-3">
                        {recommendation.description}
                      </p>

                      {/* 影响和努力指标 */}
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500">影响:</span>
                          <Badge variant="outline" className="text-xs">
                            {recommendation.impact === 'high' ? '高' : recommendation.impact === 'medium' ? '中' : '低'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500">努力:</span>
                          <Badge variant="outline" className="text-xs">
                            {recommendation.effort === 'high' ? '高' : recommendation.effort === 'medium' ? '中' : '低'}
                          </Badge>
                        </div>
                        {recommendation.estimatedTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-500" />
                            <span className="text-xs text-gray-500">{recommendation.estimatedTime}小时</span>
                          </div>
                        )}
                      </div>

                      {/* 展开详情 */}
                      {isSelected && (
                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                          {/* AI推理 */}
                          <div>
                            <h4 className="text-xs font-medium text-gray-700 mb-2">AI推理过程</h4>
                            <p className="text-xs text-gray-600 bg-blue-50 p-3 rounded">
                              {recommendation.reasoning}
                            </p>
                          </div>

                          {/* 行动步骤 */}
                          <div>
                            <h4 className="text-xs font-medium text-gray-700 mb-2">行动步骤</h4>
                            <div className="space-y-1">
                              {recommendation.actionSteps.map((step, index) => (
                                <div key={index} className="flex items-start gap-2">
                                  <span className="text-xs text-orange-500 font-medium">{index + 1}.</span>
                                  <p className="text-xs text-gray-600">{step}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 预期结果 */}
                          <div className="bg-green-50 rounded p-3">
                            <h4 className="text-xs font-medium text-green-700 mb-1">预期结果</h4>
                            <p className="text-xs text-green-700">{recommendation.expectedOutcome}</p>
                          </div>

                          {/* 风险因素 */}
                          {recommendation.riskFactors.length > 0 && (
                            <div className="bg-yellow-50 rounded p-3">
                              <h4 className="text-xs font-medium text-yellow-700 mb-2">风险因素</h4>
                              <div className="space-y-1">
                                {recommendation.riskFactors.map((risk, index) => (
                                  <p key={index} className="text-xs text-yellow-700">⚠ {risk}</p>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 操作按钮 */}
                          <div className="flex items-center gap-2 pt-2">
                            <Button
                              variant="default"
                              size="sm"
                              className="text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRecommendationAction(recommendation.id, 'accept');
                                onRecommendationApply?.(recommendation);
                              }}
                            >
                              <ThumbsUp className="w-3 h-3 mr-1" />
                              采纳建议
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRecommendationAction(recommendation.id, 'reject');
                              }}
                            >
                              <ThumbsDown className="w-3 h-3 mr-1" />
                              拒绝
                            </Button>
                            <Button variant="outline" size="sm" className="text-xs">
                              <Bookmark className="w-3 h-3 mr-1" />
                              收藏
                            </Button>
                            <Button variant="outline" size="sm" className="text-xs">
                              <Download className="w-3 h-3 mr-1" />
                              导出
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
