import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  FileText,
  Link,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  TrendingUp,
  Shield,
  Zap,
  RefreshCw,
  Plus
} from 'lucide-react';
import { useEvidenceStore, Evidence, EvidenceInput } from '../../lib/evidence-chain-analyzer-v2';

interface EvidenceChainAnalyzerProps {
  caseId: string;
  onEvidenceAnalyze?: (evidenceId: string) => void;
  onChainCreate?: (name: string, description: string, evidenceIds: string[]) => void;
}

export const EvidenceChainAnalyzer: React.FC<EvidenceChainAnalyzerProps> = ({
  caseId,
  onEvidenceAnalyze,
  onChainCreate
}) => {
  // 使用Zustand store
  const {
    evidences,
    chains,
    loading,
    addEvidence,
    analyzeEvidence,
    createChain,
    loadData
  } = useEvidenceStore();

  // 加载数据
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 演示数据（仅用于初始化）
  const [demoEvidences] = useState<Evidence[]>([
    {
      id: 'ev-001',
      title: '货物买卖合同',
      type: 'contract',
      description: '双方签署的货物买卖合同原件，约定交付时间为2023年12月15日',
      submittedBy: 'applicant',
      submissionDate: '2024-01-10',
      authenticity: 'verified',
      relevance: 0.95,
      weight: 0.9,
      connections: ['ev-002', 'ev-003'],
      metadata: {
        fileSize: '2.3MB',
        format: 'PDF',
        pages: 12
      },
      aiAnalysis: {
        keyPoints: ['交付时间明确约定', '违约责任条款清晰', '付款方式已确定'],
        contradictions: [],
        supportingEvidence: ['ev-002', 'ev-003'],
        riskFactors: ['合同条款可能存在歧义'],
        confidence: 0.92
      }
    },
    {
      id: 'ev-002',
      title: '交付延迟通知函',
      type: 'document',
      description: '被申请人发送的交付延迟通知函，说明延迟原因',
      submittedBy: 'respondent',
      submissionDate: '2024-01-12',
      authenticity: 'verified',
      relevance: 0.88,
      weight: 0.75,
      connections: ['ev-001', 'ev-004'],
      metadata: {
        fileSize: '0.8MB',
        format: 'PDF',
        pages: 2
      },
      aiAnalysis: {
        keyPoints: ['延迟原因为不可抗力', '通知时间符合合同约定', '提出了补救措施'],
        contradictions: ['与合同约定的通知时限存在争议'],
        supportingEvidence: ['ev-004'],
        riskFactors: ['不可抗力证明可能不充分'],
        confidence: 0.78
      }
    },
    {
      id: 'ev-003',
      title: '催告函及回复',
      type: 'email',
      description: '申请人发送的催告函及被申请人的回复邮件',
      submittedBy: 'applicant',
      submissionDate: '2024-01-11',
      authenticity: 'verified',
      relevance: 0.82,
      weight: 0.7,
      connections: ['ev-001', 'ev-002'],
      metadata: {
        fileSize: '1.2MB',
        format: 'EML'
      },
      aiAnalysis: {
        keyPoints: ['催告程序合规', '被申请人承认延迟', '双方沟通记录完整'],
        contradictions: [],
        supportingEvidence: ['ev-001'],
        riskFactors: [],
        confidence: 0.85
      }
    }
  ]);

  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'chain' | 'timeline'>('list');

  // 初始化演示数据（仅在evidences为空时）
  useEffect(() => {
    if (evidences.length === 0 && demoEvidences.length > 0) {
      demoEvidences.forEach(demo => {
        const input: EvidenceInput = {
          title: demo.title,
          type: demo.type,
          description: demo.description,
          submittedBy: demo.submittedBy,
          metadata: demo.metadata
        };
        addEvidence(input);
      });
    }
  }, [evidences.length, demoEvidences, addEvidence]);

  // 获取证据类型配置
  const getEvidenceTypeConfig = (type: Evidence['type']) => {
    const configs = {
      contract: { label: '合同', color: 'bg-blue-500', icon: FileText },
      document: { label: '文档', color: 'bg-green-500', icon: FileText },
      email: { label: '邮件', color: 'bg-purple-500', icon: FileText },
      photo: { label: '照片', color: 'bg-orange-500', icon: FileText },
      video: { label: '视频', color: 'bg-red-500', icon: FileText },
      audio: { label: '音频', color: 'bg-yellow-500', icon: FileText },
      witness: { label: '证人', color: 'bg-indigo-500', icon: FileText },
      expert: { label: '专家', color: 'bg-pink-500', icon: FileText }
    };
    return configs[type as keyof typeof configs];
  };

  // 获取真实性状态配置
  const getAuthenticityConfig = (authenticity: Evidence['authenticity']) => {
    const configs = {
      verified: { label: '已验证', color: 'bg-green-100 text-green-700', icon: CheckCircle },
      pending: { label: '待验证', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
      disputed: { label: '存争议', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
      rejected: { label: '已拒绝', color: 'bg-gray-100 text-gray-700', icon: AlertTriangle }
    };
    return configs[authenticity as keyof typeof configs];
  };

  // 计算证据强度颜色
  const getStrengthColor = (strength: number) => {
    if (strength >= 0.8) return 'text-green-600';
    if (strength >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  // 选择证据
  const handleSelectEvidence = useCallback((evidenceId: string) => {
    setSelectedEvidence(selectedEvidence === evidenceId ? null : evidenceId);
  }, [selectedEvidence]);

  // 分析证据
  const handleAnalyzeEvidence = useCallback((evidenceId: string) => {
    analyzeEvidence(evidenceId);
    onEvidenceAnalyze?.(evidenceId);
  }, [analyzeEvidence, onEvidenceAnalyze]);


  // 创建证据链
  const handleCreateChain = useCallback(() => {
    if (evidences.length >= 2) {
      const evidenceIds = evidences.slice(0, 3).map(e => e.id);
      createChain('新证据链', '请输入证据链描述', evidenceIds);
      onChainCreate?.('新证据链', '请输入证据链描述', evidenceIds);
    }
  }, [evidences, createChain, onChainCreate]);


  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-4">
      {/* 标题和控制栏 */}
      <Card className="border-orange-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Link className="w-5 h-5 text-orange-500" />
              证据链分析系统
              <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                案件 {caseId}
              </Badge>
            </CardTitle>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="text-xs"
              >
                列表视图
              </Button>
              <Button
                variant={viewMode === 'chain' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('chain')}
                className="text-xs"
              >
                链条视图
              </Button>
              <Button
                variant={viewMode === 'timeline' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('timeline')}
                className="text-xs"
              >
                时间轴
              </Button>

              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                {evidences.length} 项证据
              </Badge>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateChain}
                className="text-xs border-orange-200 hover:border-orange-400"
                disabled={evidences.length < 2}
              >
                <Plus className="w-3 h-3 mr-1" />
                创建证据链
              </Button>

              {loading && (
                <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  加载中...
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 证据统计面板 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">已验证证据</p>
                <p className="text-lg font-bold text-green-600">
                  {evidences.filter(e => e.authenticity === 'verified').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">平均相关性</p>
                <p className="text-lg font-bold text-blue-600">
                  {Math.round(evidences.reduce((sum, e) => sum + e.relevance, 0) / evidences.length * 100)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">证据链强度</p>
                <p className="text-lg font-bold text-purple-600">
                  {Math.round(chains[0]?.strength * 100 || 0)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">AI置信度</p>
                <p className="text-lg font-bold text-orange-600">
                  {Math.round(evidences.reduce((sum, e) => sum + (e.aiAnalysis?.confidence || 0), 0) / evidences.length * 100)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 证据列表 */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {evidences.map((evidence) => {
            const typeConfig = getEvidenceTypeConfig(evidence.type);
            const authenticityConfig = getAuthenticityConfig(evidence.authenticity);
            const TypeIcon = typeConfig.icon;
            const AuthIcon = authenticityConfig.icon;
            const isSelected = selectedEvidence === evidence.id;

            return (
              <Card
                key={evidence.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${isSelected ? 'ring-2 ring-orange-500 shadow-lg' : 'border-gray-200'
                  }`}
                onClick={() => handleSelectEvidence(evidence.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg ${typeConfig.color} flex items-center justify-center`}>
                        <TypeIcon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold text-gray-800">
                          {evidence.title}
                        </CardTitle>
                        <p className="text-xs text-gray-500 mt-1">
                          {typeConfig.label} • 提交方: {evidence.submittedBy === 'applicant' ? '申请人' : '被申请人'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${authenticityConfig.color}`}
                      >
                        <AuthIcon className="w-3 h-3 mr-1" />
                        {authenticityConfig.label}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">相关性:</span>
                        <span className={`text-xs font-medium ${getStrengthColor(evidence.relevance)}`}>
                          {Math.round(evidence.relevance * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {evidence.description}
                  </p>

                  {/* AI分析结果 */}
                  {evidence.aiAnalysis && (
                    <div className="bg-orange-50 rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-orange-700">AI分析要点</span>
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-xs">
                          置信度 {Math.round(evidence.aiAnalysis.confidence * 100)}%
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        {evidence.aiAnalysis.keyPoints.slice(0, 2).map((point, index) => (
                          <p key={index} className="text-xs text-gray-700">• {point}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 元数据和操作 */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {evidence.metadata?.format} • {evidence.metadata?.fileSize}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAnalyzeEvidence(evidence.id);
                        }}
                        className="text-xs h-6 px-2"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        详细分析
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
