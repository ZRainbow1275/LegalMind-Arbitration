/**
 * 时间轴视图组件
 * 按时间顺序展示节点
 */

import React from 'react';
import { LegalNode } from './DrawnixLegalWorkspace';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import {
  Scale,
  Users,
  FileText,
  Calendar,
  MessageSquare,
  Target,
} from 'lucide-react';

interface TimelineViewProps {
  nodes: LegalNode[];
  onNodeClick: (nodeId: string) => void;
  onNodeDoubleClick: (nodeId: string) => void;
  selectedNodes: string[];
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  nodes,
  onNodeClick,
  onNodeDoubleClick,
  selectedNodes,
}) => {
  // 按创建时间排序节点
  const sortedNodes = [...nodes].sort((a, b) => {
    const timeA = new Date(a.data.createdAt || 0).getTime();
    const timeB = new Date(b.data.createdAt || 0).getTime();
    return timeA - timeB;
  });

  // 节点类型配置
  const nodeTypeConfig: Record<string, { icon: any; color: string; label: string }> = {
    'legal-case': { icon: Scale, color: 'bg-blue-500', label: '案件信息' },
    'legal-person': { icon: Users, color: 'bg-green-500', label: '当事人' },
    'legal-document': { icon: FileText, color: 'bg-purple-500', label: '文档证据' },
    'legal-hearing': { icon: Calendar, color: 'bg-orange-500', label: '庭审安排' },
    'legal-timeline': { icon: MessageSquare, color: 'bg-pink-500', label: '时间线' },
    'legal-ai': { icon: Target, color: 'bg-cyan-500', label: 'AI助手' },
  };

  // 格式化日期
  const formatDate = (dateString?: string): string => {
    if (!dateString) return '未知时间';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* 标题 */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">时间轴视图</h2>
          <p className="text-sm text-gray-600">按时间顺序展示所有节点</p>
        </div>

        {/* 时间轴 */}
        <div className="relative">
          {/* 中心线 */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-orange-400 via-orange-300 to-orange-200" />

          {/* 节点列表 */}
          <div className="space-y-6">
            {sortedNodes.map((node, index) => {
              const config = nodeTypeConfig[node.type] || nodeTypeConfig['legal-case'];
              const Icon = config.icon;
              // {{ AURA: Fix - 添加空值检查防止报错 }}
              const isSelected = selectedNodes?.includes(node.id) || false;

              return (
                <div key={node.id} className="relative pl-20">
                  {/* 时间点 */}
                  <div className="absolute left-0 top-6 flex items-center">
                    <div className={`w-16 h-16 rounded-full ${config.color} 
                      flex items-center justify-center shadow-lg ring-4 ring-white`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                  </div>

                  {/* 节点卡片 */}
                  <Card
                    className={`cursor-pointer transition-all duration-200 ${isSelected
                      ? 'ring-4 ring-orange-400 ring-opacity-50 shadow-2xl border-orange-400'
                      : 'hover:shadow-xl hover:border-orange-300'
                      }`}
                    onClick={() => onNodeClick(node.id)}
                    onDoubleClick={() => onNodeDoubleClick(node.id)}
                  >
                    <CardHeader className="pb-3 bg-gradient-to-r from-orange-50 to-white">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-bold text-gray-800 mb-1">
                            {node.data.title}
                          </CardTitle>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(node.data.createdAt)}</span>
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className={`text-xs font-medium ${node.data.status === 'active' ? 'bg-green-100 text-green-700 border-green-200' :
                            node.data.status === 'completed' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                              node.data.status === 'cancelled' ? 'bg-red-100 text-red-700 border-red-200' :
                                'bg-gray-100 text-gray-700 border-gray-200'
                            } border`}
                        >
                          {node.data.status === 'active' ? '进行中' :
                            node.data.status === 'completed' ? '已完成' :
                              node.data.status === 'cancelled' ? '已取消' : '待处理'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-3">
                      <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                        {node.data.description}
                      </p>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <Badge variant="outline" className="text-xs">
                          {config.label}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {node.data.connections.length} 个连接
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 连接线指示 */}
                  {index < sortedNodes.length - 1 && (
                    <div className="absolute left-8 -bottom-3 w-0.5 h-6 bg-orange-200" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 空状态 */}
        {sortedNodes.length === 0 && (
          <div className="text-center py-20">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无节点数据</p>
          </div>
        )}
      </div>
    </div>
  );
};

