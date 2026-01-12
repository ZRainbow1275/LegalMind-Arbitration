/**
 * 法律关系图谱组件
 * 可视化展示节点间的法律关系
 */

import React, { useEffect, useState } from 'react';
import { LegalNode } from './DrawnixLegalWorkspace';
import {
  LegalRelationshipAnalyzer,

  RelationshipPath,
  LegalRelationType,
} from '../lib/legal-relationship-analyzer';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Network,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  FileText,
  Users,
  Scale,
  X,
} from 'lucide-react';

interface LegalRelationshipGraphProps {
  nodes: LegalNode[];
  onClose: () => void;
}

export const LegalRelationshipGraph: React.FC<LegalRelationshipGraphProps> = ({
  nodes,
  onClose,
}) => {
  const [graph, setGraph] = useState<ReturnType<typeof LegalRelationshipAnalyzer.generateGraph> | null>(null);
  const [selectedPath, setSelectedPath] = useState<RelationshipPath | null>(null);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());

  // 生成关系图谱
  useEffect(() => {
    const generatedGraph = LegalRelationshipAnalyzer.generateGraph(nodes);
    setGraph(generatedGraph);
  }, [nodes]);

  if (!graph) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <Network className="w-12 h-12 text-orange-500 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">正在分析法律关系...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 关系类型配置
  const relationTypeConfig: Record<LegalRelationType, { icon: any; color: string; label: string }> = {
    'plaintiff-defendant': { icon: Users, color: 'text-red-600', label: '原告-被告' },
    'evidence-support': { icon: CheckCircle, color: 'text-green-600', label: '证据支持' },
    'evidence-against': { icon: AlertCircle, color: 'text-red-600', label: '证据反对' },
    'legal-basis': { icon: Scale, color: 'text-blue-600', label: '法律依据' },
    'hearing-participant': { icon: Users, color: 'text-purple-600', label: '庭审参与' },
    'document-reference': { icon: FileText, color: 'text-gray-600', label: '文档引用' },
    'timeline-sequence': { icon: TrendingUp, color: 'text-orange-600', label: '时间顺序' },
    'ai-analysis': { icon: Network, color: 'text-cyan-600', label: 'AI分析' },
  };

  // 获取节点标题
  const getNodeTitle = (nodeId: string): string => {
    const node = nodes.find(n => n.id === nodeId);
    return node?.data.title || '未知节点';
  };

  // 高亮路径
  const handlePathClick = (path: RelationshipPath) => {
    setSelectedPath(path);
    setHighlightedNodes(new Set(path.nodes));
  };

  // 关系强度颜色
  const getStrengthColor = (strength: number): string => {
    if (strength >= 0.8) return 'bg-green-500';
    if (strength >= 0.6) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-white">
          <div className="flex items-center gap-3">
            <Network className="w-8 h-8 text-orange-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-800">法律关系图谱</h2>
              <p className="text-sm text-gray-600">
                {graph.nodes.length} 个节点 · {graph.relationships.length} 个关系 · {graph.paths.length} 条关键路径
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-orange-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左侧：关键路径 */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                关键路径
              </h3>
              <div className="space-y-3">
                {graph.paths.slice(0, 10).map((path, index) => (
                  <Card
                    key={index}
                    className={`cursor-pointer transition-all duration-200 ${selectedPath === path
                      ? 'ring-2 ring-orange-400 shadow-lg'
                      : 'hover:shadow-md hover:border-orange-300'
                      }`}
                    onClick={() => handlePathClick(path)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-800 mb-1">
                            路径 {index + 1}
                          </div>
                          <div className="text-xs text-gray-600">
                            {path.nodes.map(nodeId => getNodeTitle(nodeId)).join(' → ')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getStrengthColor(path.totalStrength)}`} />
                          <span className="text-xs font-medium text-gray-600">
                            {(path.totalStrength * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 line-clamp-2">
                        {path.description}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* 右侧：关系列表 */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Network className="w-5 h-5 text-orange-600" />
                所有关系
              </h3>
              <div className="space-y-2">
                {graph.relationships
                  .sort((a, b) => b.strength - a.strength)
                  .map((rel) => {
                    const config = relationTypeConfig[rel.type];
                    const Icon = config.icon;
                    const isHighlighted = highlightedNodes.has(rel.sourceId) && highlightedNodes.has(rel.targetId);

                    return (
                      <div
                        key={rel.id}
                        className={`p-3 rounded-lg border transition-all duration-200 ${isHighlighted
                          ? 'bg-orange-50 border-orange-300'
                          : 'bg-white border-gray-200 hover:border-orange-200'
                          }`}
                      >
                        <div className="flex items-start gap-3">
                          <Icon className={`w-5 h-5 ${config.color} flex-shrink-0 mt-0.5`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {config.label}
                              </Badge>
                              <div className="flex items-center gap-1">
                                <div className={`w-1.5 h-1.5 rounded-full ${getStrengthColor(rel.strength)}`} />
                                <span className="text-xs text-gray-500">
                                  {(rel.strength * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                            <div className="text-sm text-gray-800 font-medium">
                              {getNodeTitle(rel.sourceId)} → {getNodeTitle(rel.targetId)}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {rel.description}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* 节点聚类 */}
          {graph.clusters.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Scale className="w-5 h-5 text-orange-600" />
                节点聚类
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {graph.clusters.map((cluster, index) => (
                  <Card key={index} className="border-orange-200">
                    <CardHeader className="pb-3 bg-gradient-to-r from-orange-50 to-white">
                      <CardTitle className="text-sm font-bold text-gray-800">
                        聚类 {index + 1}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-3">
                      <div className="space-y-2">
                        {cluster.map(nodeId => (
                          <div
                            key={nodeId}
                            className="text-sm text-gray-700 px-3 py-2 bg-gray-50 rounded-lg"
                          >
                            {getNodeTitle(nodeId)}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 底部统计 */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>强关系 ({graph.relationships.filter(r => r.strength >= 0.8).length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span>中等关系 ({graph.relationships.filter(r => r.strength >= 0.6 && r.strength < 0.8).length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                <span>弱关系 ({graph.relationships.filter(r => r.strength < 0.6).length})</span>
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
    </div>
  );
};

