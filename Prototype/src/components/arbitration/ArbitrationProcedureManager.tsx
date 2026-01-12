import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  PlayCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
  Users,
  FileText,
  Calendar,
  Gavel,
  MessageSquare,
  Award,
  ArrowRight,
  Eye,
  Edit3,
  RefreshCw
} from 'lucide-react';
import {
  useProcedureStore,
  ArbitrationStep,
  ArbitrationProcedure
} from '../../lib/arbitration-procedure-manager';

interface ArbitrationProcedureManagerProps {
  caseId: string;
  onStepUpdate?: (stepId: string, updates: Partial<ArbitrationStep>) => void;
  onProcedureUpdate?: (updates: Partial<ArbitrationProcedure>) => void;
}

export const ArbitrationProcedureManager: React.FC<ArbitrationProcedureManagerProps> = ({
  caseId,


}) => {
  // 使用Zustand store
  const {
    procedures,
    loading,

    updateProgress,
    loadProcedures
  } = useProcedureStore();

  // 加载数据
  useEffect(() => {
    loadProcedures();
  }, [loadProcedures]);

  // 获取当前案件的程序
  const procedure = procedures.find(p => p.caseId === caseId) || null;



  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'kanban' | 'details'>('timeline');

  // 获取步骤类型配置
  const getStepTypeConfig = (type: ArbitrationStep['type']) => {
    const configs = {
      filing: { label: '申请阶段', color: 'bg-blue-500', icon: FileText },
      response: { label: '答辩阶段', color: 'bg-green-500', icon: MessageSquare },
      tribunal: { label: '仲裁庭', color: 'bg-purple-500', icon: Users },
      hearing: { label: '庭审阶段', color: 'bg-orange-500', icon: Gavel },
      evidence: { label: '证据阶段', color: 'bg-yellow-500', icon: FileText },
      deliberation: { label: '评议阶段', color: 'bg-indigo-500', icon: MessageSquare },
      award: { label: '裁决阶段', color: 'bg-red-500', icon: Award }
    };
    return configs[type];
  };

  // 获取状态配置
  const getStatusConfig = (status: ArbitrationStep['status']) => {
    const configs = {
      pending: { label: '待开始', color: 'bg-gray-100 text-gray-700', icon: Clock },
      active: { label: '进行中', color: 'bg-blue-100 text-blue-700', icon: PlayCircle },
      completed: { label: '已完成', color: 'bg-green-100 text-green-700', icon: CheckCircle },
      overdue: { label: '已逾期', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
      skipped: { label: '已跳过', color: 'bg-yellow-100 text-yellow-700', icon: ArrowRight }
    };
    return configs[status];
  };

  // 计算步骤进度
  const calculateProgress = (step: ArbitrationStep) => {
    if (step.status === 'completed') return 100;
    if (step.status === 'pending' || step.status === 'skipped') return 0;

    if (step.startDate && step.deadline) {
      const start = new Date(step.startDate).getTime();
      const end = new Date(step.deadline).getTime();
      const now = new Date().getTime();
      const progress = Math.min(Math.max((now - start) / (end - start) * 100, 0), 100);
      return Math.round(progress);
    }

    return 50; // 默认进度
  };

  // 选择步骤
  const handleSelectStep = useCallback((stepId: string) => {
    setSelectedStep(selectedStep === stepId ? null : stepId);
  }, [selectedStep]);





  // 刷新进度
  const handleRefreshProgress = useCallback(() => {
    if (!procedure) return;
    updateProgress(procedure.id);
  }, [procedure, updateProgress]);

  // 如果没有程序数据，显示提示
  if (!procedure && !loading) {
    return (
      <div className="w-full max-w-7xl mx-auto p-4">
        <Card className="border-orange-200">
          <CardContent className="p-8 text-center">
            <Gavel className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">该案件暂无仲裁程序记录</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!procedure) return null;

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-4">
      {/* 标题和控制栏 */}
      <Card className="border-orange-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Gavel className="w-5 h-5 text-orange-500" />
              仲裁程序管理
              <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                {procedure.caseName}
              </Badge>
            </CardTitle>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'timeline' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('timeline')}
                className="text-xs"
              >
                时间轴
              </Button>
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('kanban')}
                className="text-xs"
              >
                看板
              </Button>
              <Button
                variant={viewMode === 'details' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('details')}
                className="text-xs"
              >
                详情
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshProgress}
                className="text-xs border-orange-200 hover:border-orange-400"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                刷新进度
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

      {/* 进度概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">总体进度</p>
                <p className="text-lg font-bold text-blue-600">
                  {Math.round(procedure.progress * 100)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">已完成步骤</p>
                <p className="text-lg font-bold text-green-600">
                  {procedure.completedSteps}/{procedure.totalSteps}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">当前阶段</p>
                <p className="text-sm font-bold text-orange-600">
                  {procedure.steps.find(s => s.id === procedure.currentStep)?.name || '未知'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">预计完成</p>
                <p className="text-sm font-bold text-purple-600">
                  {procedure.estimatedCompletion}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 时间轴视图 */}
      {viewMode === 'timeline' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-md font-semibold text-gray-800">程序时间轴</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {procedure.steps.map((step, index) => {
                const typeConfig = getStepTypeConfig(step.type);
                const statusConfig = getStatusConfig(step.status);
                const TypeIcon = typeConfig.icon;
                const StatusIcon = statusConfig.icon;
                const progress = calculateProgress(step);
                const isSelected = selectedStep === step.id;

                return (
                  <div key={step.id} className="relative">
                    {/* 连接线 */}
                    {index < procedure.steps.length - 1 && (
                      <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-300" />
                    )}

                    <div
                      className={`flex items-start gap-4 p-4 rounded-lg cursor-pointer transition-all duration-200 ${isSelected ? 'bg-orange-50 border border-orange-200' : 'hover:bg-gray-50'
                        }`}
                      onClick={() => handleSelectStep(step.id)}
                    >
                      {/* 步骤图标 */}
                      <div className={`w-12 h-12 rounded-full ${typeConfig.color} flex items-center justify-center relative z-10`}>
                        <TypeIcon className="w-5 h-5 text-white" />
                      </div>

                      {/* 步骤内容 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-gray-800">{step.name}</h3>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className={`text-xs ${statusConfig.color}`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                            {step.deadline && (
                              <span className="text-xs text-gray-500">
                                截止: {step.deadline}
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-sm text-gray-600 mb-3">{step.description}</p>

                        {/* 进度条 */}
                        {step.status === 'active' && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-500">进度</span>
                              <span className="text-xs font-medium text-gray-700">{progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* AI建议 */}
                        {step.aiSuggestions && step.status === 'active' && (
                          <div className="bg-blue-50 rounded-lg p-3 mb-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-blue-700">AI建议</span>
                              <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                                置信度 {Math.round(step.aiSuggestions.confidence * 100)}%
                              </Badge>
                            </div>
                            <div className="space-y-1">
                              {step.aiSuggestions.nextActions.slice(0, 2).map((action, idx) => (
                                <p key={idx} className="text-xs text-gray-700">• {action}</p>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 详细信息 */}
                        {isSelected && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <h4 className="text-xs font-medium text-gray-700 mb-2">参与方</h4>
                                <div className="space-y-1">
                                  {step.participants.map((participant, idx) => (
                                    <span key={idx} className="inline-block text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded mr-1">
                                      {participant}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <h4 className="text-xs font-medium text-gray-700 mb-2">所需文档</h4>
                                <div className="space-y-1">
                                  {step.documents.map((doc, idx) => (
                                    <p key={idx} className="text-xs text-gray-600">• {doc}</p>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <h4 className="text-xs font-medium text-gray-700 mb-2">操作</h4>
                                <div className="flex items-center gap-2">
                                  <Button variant="outline" size="sm" className="text-xs">
                                    <Edit3 className="w-3 h-3 mr-1" />
                                    编辑
                                  </Button>
                                  <Button variant="outline" size="sm" className="text-xs">
                                    <Eye className="w-3 h-3 mr-1" />
                                    详情
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
