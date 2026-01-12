import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

import {
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Scale,
  FileText,
  Users,
  Plus,
  Minus,
  Eye,
  Edit3,
  RefreshCw
} from 'lucide-react';
import { useDisputeFocusStore, DisputeFocus, DisputeFocusInput } from '../../lib/dispute-focus-manager';

interface DisputeFocusVisualizerProps {
  caseId: string;
  onFocusCreate?: (focus: DisputeFocusInput) => void;
  onFocusUpdate?: (focusId: string, updates: Partial<DisputeFocus>) => void;
  onFocusDelete?: (focusId: string) => void;
}

export const DisputeFocusVisualizer: React.FC<DisputeFocusVisualizerProps> = ({
  caseId,
  onFocusCreate,

  onFocusDelete
}) => {
  // 使用Zustand store
  const { foci, loading, addFocus, deleteFocus, analyzeFocus, loadFoci } = useDisputeFocusStore();

  const [selectedFocus, setSelectedFocus] = useState<string | null>(null);


  // 加载数据
  useEffect(() => {
    loadFoci();
  }, [loadFoci]);

  // 获取类别配置
  const getCategoryConfig = (category: DisputeFocus['category']) => {
    const configs = {
      contract: { label: '合同条款', color: 'bg-blue-500', icon: FileText },
      payment: { label: '付款争议', color: 'bg-green-500', icon: Scale },
      delivery: { label: '交付问题', color: 'bg-orange-500', icon: Clock },
      quality: { label: '质量争议', color: 'bg-purple-500', icon: AlertTriangle },
      liability: { label: '责任认定', color: 'bg-red-500', icon: Users },
      other: { label: '其他争议', color: 'bg-gray-500', icon: Target }
    };
    return configs[category];
  };

  // 获取优先级颜色
  const getPriorityColor = (priority: DisputeFocus['priority']) => {
    const colors = {
      high: 'bg-red-100 text-red-700 border-red-200',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      low: 'bg-green-100 text-green-700 border-green-200'
    };
    return colors[priority];
  };

  // 获取状态配置
  const getStatusConfig = (status: DisputeFocus['status']) => {
    const configs = {
      pending: { label: '待分析', color: 'bg-gray-100 text-gray-700', icon: Clock },
      analyzing: { label: '分析中', color: 'bg-blue-100 text-blue-700', icon: Eye },
      resolved: { label: '已解决', color: 'bg-green-100 text-green-700', icon: CheckCircle },
      disputed: { label: '存争议', color: 'bg-red-100 text-red-700', icon: AlertTriangle }
    };
    return configs[status];
  };

  // 创建新争议焦点
  const handleCreateFocus = useCallback(() => {
    // 演示：创建一个新的争议焦点
    const newFocusInput: DisputeFocusInput = {
      title: '新争议焦点',
      description: '请输入争议焦点描述',
      applicantPosition: '申请人立场',
      respondentPosition: '被申请人立场',
      relatedEvidence: []
    };
    addFocus(newFocusInput);
    onFocusCreate?.(newFocusInput);
  }, [addFocus, onFocusCreate]);

  // 选择争议焦点
  const handleSelectFocus = useCallback((focusId: string) => {
    setSelectedFocus(selectedFocus === focusId ? null : focusId);
  }, [selectedFocus]);

  // 删除争议焦点
  const handleDeleteFocus = useCallback((focusId: string) => {
    deleteFocus(focusId);
    onFocusDelete?.(focusId);
  }, [deleteFocus, onFocusDelete]);

  // 重新分析争议焦点
  const handleAnalyzeFocus = useCallback((focusId: string) => {
    analyzeFocus(focusId);
  }, [analyzeFocus]);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-4">
      {/* 标题和控制栏 */}
      <Card className="border-orange-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-500" />
              争议焦点可视化分析
              <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                案件 {caseId}
              </Badge>
            </CardTitle>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateFocus}
                className="border-orange-200 hover:border-orange-400"
              >
                <Plus className="w-4 h-4 mr-2" />
                新增焦点
              </Button>

              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                {foci.length} 个争议焦点
              </Badge>

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

      {/* 争议焦点列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {foci.map((focus) => {
          const categoryConfig = getCategoryConfig(focus.category);
          const statusConfig = getStatusConfig(focus.status);
          const CategoryIcon = categoryConfig.icon;
          const StatusIcon = statusConfig.icon;
          const isSelected = selectedFocus === focus.id;

          return (
            <Card
              key={focus.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${isSelected ? 'ring-2 ring-orange-500 shadow-lg' : 'border-gray-200'
                }`}
              onClick={() => handleSelectFocus(focus.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg ${categoryConfig.color} flex items-center justify-center`}>
                      <CategoryIcon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold text-gray-800">
                        {focus.title}
                      </CardTitle>
                      <p className="text-xs text-gray-500 mt-1">
                        {categoryConfig.label}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <Badge
                      variant="outline"
                      className={`text-xs ${getPriorityColor(focus.priority)}`}
                    >
                      {focus.priority === 'high' ? '高优先级' :
                        focus.priority === 'medium' ? '中优先级' : '低优先级'}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${statusConfig.color}`}
                    >
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusConfig.label}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {focus.description}
                </p>

                {/* AI分析结果 */}
                {focus.aiAnalysis && (
                  <div className="bg-orange-50 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-orange-700">AI分析建议</span>
                      <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-xs">
                        置信度 {Math.round(focus.aiAnalysis.confidence * 100)}%
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-700">
                      {focus.aiAnalysis.recommendation}
                    </p>
                  </div>
                )}

                {/* 证据统计 */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{focus.evidence.length} 项证据</span>
                  <span>更新于 {focus.timeline.lastUpdated}</span>
                </div>

                {/* 展开详情 */}
                {isSelected && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="space-y-3">
                      {/* 双方立场 */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-blue-50 rounded-lg p-3">
                          <h4 className="text-xs font-medium text-blue-700 mb-2">申请人立场</h4>
                          <p className="text-xs text-gray-700 mb-2">{focus.parties.applicant.position}</p>
                          <div className="text-xs text-gray-500">
                            证据: {focus.parties.applicant.evidence.join(', ')}
                          </div>
                        </div>
                        <div className="bg-red-50 rounded-lg p-3">
                          <h4 className="text-xs font-medium text-red-700 mb-2">被申请人立场</h4>
                          <p className="text-xs text-gray-700 mb-2">{focus.parties.respondent.position}</p>
                          <div className="text-xs text-gray-500">
                            证据: {focus.parties.respondent.evidence.join(', ')}
                          </div>
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex items-center gap-2 pt-2">
                        <Button variant="outline" size="sm" className="text-xs">
                          <Edit3 className="w-3 h-3 mr-1" />
                          编辑
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs">
                          <Eye className="w-3 h-3 mr-1" />
                          详细分析
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs text-red-600 border-red-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFocus(focus.id);
                          }}
                        >
                          <Minus className="w-3 h-3 mr-1" />
                          删除
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs text-blue-600 border-blue-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAnalyzeFocus(focus.id);
                          }}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          重新分析
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
