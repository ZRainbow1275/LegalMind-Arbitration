import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import {
  Target,
  Link,
  Gavel,
  Users,
  Calculator,
  FileText,
  ArrowRightLeft,
  Play,
  Scale,
  Database,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Video
} from 'lucide-react';

// 仲裁功能配置
interface ArbitrationFunction {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  status: 'available' | 'active' | 'completed' | 'locked';
  progress?: number;
  lastUsed?: string;
  aiEnhanced: boolean;
}

interface ArbitrationFunctionPanelProps {
  caseId: string;
  onFunctionSelect: (functionId: string) => void;
  onFunctionLaunch: (functionId: string) => void;
}

export const ArbitrationFunctionPanel: React.FC<ArbitrationFunctionPanelProps> = ({
  caseId,
  onFunctionSelect,
  onFunctionLaunch
}) => {
  // 10个仲裁专用功能
  const [functions] = useState<ArbitrationFunction[]>([
    {
      id: 'dispute-focus',
      name: '争议焦点可视化',
      description: '智能识别和可视化案件争议焦点，分析双方立场和证据支撑',
      icon: Target,
      color: 'bg-blue-500',
      status: 'available',
      progress: 85,
      lastUsed: '2024-01-20',
      aiEnhanced: true
    },
    {
      id: 'evidence-chain',
      name: '证据链分析系统',
      description: '构建完整证据链条，分析证据关联性和证明力',
      icon: Link,
      color: 'bg-green-500',
      status: 'active',
      progress: 60,
      lastUsed: '2024-01-21',
      aiEnhanced: true
    },
    {
      id: 'procedure-manager',
      name: '仲裁程序节点管理',
      description: '全程跟踪仲裁程序进展，智能提醒关键节点',
      icon: Gavel,
      color: 'bg-orange-500',
      status: 'active',
      progress: 75,
      lastUsed: '2024-01-21',
      aiEnhanced: true
    },
    {
      id: 'tribunal-composition',
      name: '仲裁员组成可视化',
      description: '展示仲裁庭组成，分析仲裁员背景和专业领域',
      icon: Users,
      color: 'bg-purple-500',
      status: 'available',
      aiEnhanced: false
    },
    {
      id: 'fee-calculator',
      name: '仲裁费用计算器',
      description: '智能计算仲裁费用，包括案件受理费和仲裁员费用',
      icon: Calculator,
      color: 'bg-yellow-500',
      status: 'available',
      aiEnhanced: true
    },
    {
      id: 'virtual-courtroom',
      name: '在线庭审（虚拟法庭）',
      description: '沉浸式在线庭审环境，支持实时笔录、证据展示和AI辅助',
      icon: Video,
      color: 'bg-indigo-500',
      status: 'available',
      aiEnhanced: true
    },
    {
      id: 'award-generator',
      name: '裁决书生成器',
      description: 'AI辅助生成裁决书草稿，提高文书制作效率',
      icon: FileText,
      color: 'bg-red-500',
      status: 'locked',
      aiEnhanced: true
    },
    {
      id: 'mediation-workflow',
      name: '调解转仲裁工作流',
      description: '管理调解转仲裁流程，保持程序连续性',
      icon: ArrowRightLeft,
      color: 'bg-indigo-500',
      status: 'available',
      aiEnhanced: false
    },
    {
      id: 'execution-visualizer',
      name: '执行程序可视化',
      description: '跟踪裁决执行进展，可视化执行程序',
      icon: Play,
      color: 'bg-pink-500',
      status: 'locked',
      aiEnhanced: false
    },
    {
      id: 'rules-assistant',
      name: '仲裁规则助手',
      description: '智能检索适用的仲裁规则，提供规则解释',
      icon: Scale,
      color: 'bg-teal-500',
      status: 'available',
      aiEnhanced: true
    },
    {
      id: 'case-database',
      name: '案例数据库匹配',
      description: '匹配相似案例，提供判例参考和趋势分析',
      icon: Database,
      color: 'bg-cyan-500',
      status: 'available',
      aiEnhanced: true
    }
  ]);

  const [selectedFunction, setSelectedFunction] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // 获取状态配置
  const getStatusConfig = (status: ArbitrationFunction['status']) => {
    const configs = {
      available: { label: '可用', color: 'bg-green-100 text-green-700' },
      active: { label: '使用中', color: 'bg-blue-100 text-blue-700' },
      completed: { label: '已完成', color: 'bg-gray-100 text-gray-700' },
      locked: { label: '未解锁', color: 'bg-red-100 text-red-700' }
    };
    return configs[status];
  };

  // 处理功能选择
  const handleFunctionSelect = (functionId: string) => {
    setSelectedFunction(selectedFunction === functionId ? null : functionId);
    onFunctionSelect(functionId);
  };

  // 处理功能启动
  const handleFunctionLaunch = (functionId: string) => {
    const func = functions.find(f => f.id === functionId);
    if (func && func.status !== 'locked') {
      onFunctionLaunch(functionId);
    }
  };

  // 统计数据
  const availableFunctions = functions.filter(f => f.status === 'available').length;
  const activeFunctions = functions.filter(f => f.status === 'active').length;
  const aiEnhancedFunctions = functions.filter(f => f.aiEnhanced).length;

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-4">
      {/* 标题和统计 */}
      <Card className="border-orange-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-500" />
              仲裁专用功能中心
              <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                案件 {caseId}
              </Badge>
            </CardTitle>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="text-xs"
              >
                网格视图
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="text-xs"
              >
                列表视图
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 功能统计 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">总功能数</p>
                <p className="text-lg font-bold text-blue-600">{functions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Play className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">可用功能</p>
                <p className="text-lg font-bold text-green-600">{availableFunctions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">使用中</p>
                <p className="text-lg font-bold text-orange-600">{activeFunctions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">AI增强</p>
                <p className="text-lg font-bold text-purple-600">{aiEnhancedFunctions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 功能网格 */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {functions.map((func) => {
            const IconComponent = func.icon;
            const statusConfig = getStatusConfig(func.status);
            const isSelected = selectedFunction === func.id;
            const isLocked = func.status === 'locked';

            return (
              <Card
                key={func.id}
                draggable={!isLocked}
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/json', JSON.stringify({
                    type: 'arbitration-function',
                    functionId: func.id,
                    name: func.name
                  }));
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${isSelected ? 'ring-2 ring-orange-500 shadow-lg' : 'border-gray-200'
                  } ${isLocked ? 'opacity-60' : ''}`}
                onClick={() => !isLocked && handleFunctionSelect(func.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${func.color} flex items-center justify-center`}>
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                          {func.name}
                          {func.aiEnhanced && (
                            <Sparkles className="w-3 h-3 text-orange-500" />
                          )}
                        </CardTitle>
                        <Badge
                          variant="secondary"
                          className={`text-xs mt-1 ${statusConfig.color}`}
                        >
                          {statusConfig.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {func.description}
                  </p>

                  {/* 进度条 */}
                  {func.progress && func.status === 'active' && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">进度</span>
                        <span className="text-xs font-medium text-gray-700">{func.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${func.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex items-center justify-between">
                    {func.lastUsed && (
                      <span className="text-xs text-gray-500">
                        上次使用: {func.lastUsed}
                      </span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFunctionLaunch(func.id);
                      }}
                      disabled={isLocked}
                      className="text-xs border-orange-200 hover:border-orange-400"
                    >
                      {func.status === 'active' ? '继续使用' : '启动功能'}
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 功能列表 */}
      {viewMode === 'list' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-md font-semibold text-gray-800">功能列表</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {functions.map((func, index) => {
                const IconComponent = func.icon;
                const statusConfig = getStatusConfig(func.status);
                const isSelected = selectedFunction === func.id;
                const isLocked = func.status === 'locked';

                return (
                  <div key={func.id}>
                    <div
                      draggable={!isLocked}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify({
                          type: 'arbitration-function',
                          functionId: func.id,
                          name: func.name
                        }));
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all duration-200 ${isSelected ? 'bg-orange-50 border border-orange-200' : 'hover:bg-gray-50'
                        } ${isLocked ? 'opacity-60' : ''}`}
                      onClick={() => !isLocked && handleFunctionSelect(func.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-lg ${func.color} flex items-center justify-center`}>
                          <IconComponent className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            {func.name}
                            {func.aiEnhanced && (
                              <Sparkles className="w-3 h-3 text-orange-500" />
                            )}
                          </h3>
                          <p className="text-xs text-gray-600">{func.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${statusConfig.color}`}
                        >
                          {statusConfig.label}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFunctionLaunch(func.id);
                          }}
                          disabled={isLocked}
                          className="text-xs"
                        >
                          启动
                        </Button>
                      </div>
                    </div>

                    {index < functions.length - 1 && <Separator />}
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
