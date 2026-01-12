/**
 * 列表视图组件
 * 以表格形式展示节点
 */

import React, { useState } from 'react';
import { LegalNode } from './workspace/types';
import { Badge } from './ui/badge';
import {
  Scale,
  Users,
  FileText,
  Calendar,
  MessageSquare,
  Target,
  ArrowUpDown,
} from 'lucide-react';

interface ListViewProps {
  nodes: LegalNode[];
  onNodeClick: (nodeId: string) => void;
  onNodeDoubleClick: (nodeId: string) => void;
  selectedNodeIds: string[]; // {{ AURA: Modify - 统一prop命名为selectedNodeIds }}
}

type SortField = 'title' | 'type' | 'status' | 'connections' | 'createdAt';
type SortOrder = 'asc' | 'desc';

export const ListView: React.FC<ListViewProps> = ({
  nodes,
  onNodeClick,
  onNodeDoubleClick,
  selectedNodeIds = [], // {{ AURA: Modify - 统一prop命名并添加默认值防止undefined }}
}) => {
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // 节点类型配置
  const nodeTypeConfig: Record<string, { icon: any; color: string; label: string }> = {
    'legal-case': { icon: Scale, color: 'text-blue-600', label: '案件信息' },
    'legal-person': { icon: Users, color: 'text-green-600', label: '当事人' },
    'legal-document': { icon: FileText, color: 'text-purple-600', label: '文档证据' },
    'legal-hearing': { icon: Calendar, color: 'text-orange-600', label: '庭审安排' },
    'legal-timeline': { icon: MessageSquare, color: 'text-pink-600', label: '时间线' },
    'legal-ai': { icon: Target, color: 'text-cyan-600', label: 'AI助手' },
  };

  // 排序处理
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // 排序节点
  const sortedNodes = [...nodes].sort((a, b) => {
    let compareResult = 0;

    switch (sortField) {
      case 'title':
        compareResult = a.data.title.localeCompare(b.data.title);
        break;
      case 'type':
        compareResult = a.type.localeCompare(b.type);
        break;
      case 'status':
        compareResult = (a.data.status || '').localeCompare(b.data.status || '');
        break;
      case 'connections':
        compareResult = a.data.connections.length - b.data.connections.length;
        break;
      case 'createdAt': {
        const timeA = new Date((a.data.metadata as any)?.createdAt || 0).getTime();
        const timeB = new Date((b.data.metadata as any)?.createdAt || 0).getTime();
        compareResult = timeA - timeB;
        break;
      }
    }

    return sortOrder === 'asc' ? compareResult : -compareResult;
  });

  // 格式化日期
  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN');
  };

  // 排序图标
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return (
      <ArrowUpDown className={`w-4 h-4 ${sortOrder === 'asc' ? 'text-orange-600 rotate-180' : 'text-orange-600'
        }`} />
    );
  };

  return (
    <div className="h-full w-full overflow-auto bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* 标题 */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">列表视图</h2>
          <p className="text-sm text-gray-600">以表格形式展示所有节点，支持排序和筛选</p>
        </div>

        {/* 表格 */}
        <div className="bg-white rounded-xl shadow-xl border-2 border-orange-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-orange-50 to-white border-b-2 border-orange-200">
              <tr>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => handleSort('title')}
                    className="flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-orange-600 transition-colors"
                  >
                    标题
                    <SortIcon field="title" />
                  </button>
                </th>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => handleSort('type')}
                    className="flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-orange-600 transition-colors"
                  >
                    类型
                    <SortIcon field="type" />
                  </button>
                </th>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-orange-600 transition-colors"
                  >
                    状态
                    <SortIcon field="status" />
                  </button>
                </th>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => handleSort('connections')}
                    className="flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-orange-600 transition-colors"
                  >
                    连接数
                    <SortIcon field="connections" />
                  </button>
                </th>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => handleSort('createdAt')}
                    className="flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-orange-600 transition-colors"
                  >
                    创建时间
                    <SortIcon field="createdAt" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedNodes.map((node, index) => {
                const config = nodeTypeConfig[node.type] || nodeTypeConfig['legal-case'];
                const Icon = config.icon;
                const isSelected = selectedNodeIds.includes(node.id); // {{ AURA: Modify - 使用selectedNodeIds }}


                return (
                  <tr
                    key={node.id}
                    className={`border-b border-gray-100 cursor-pointer transition-all duration-200 ${isSelected
                      ? 'bg-orange-50 hover:bg-orange-100'
                      : index % 2 === 0
                        ? 'bg-white hover:bg-gray-50'
                        : 'bg-gray-50/50 hover:bg-gray-100'
                      }`}
                    onClick={() => onNodeClick(node.id)}
                    onDoubleClick={() => onNodeDoubleClick(node.id)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-800">{node.data.title}</div>
                      <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                        {node.data.description}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-5 h-5 ${config.color}`} />
                        <span className="text-sm text-gray-700">{config.label}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
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
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">
                        {node.data.connections.length}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {formatDate((node.data.metadata as any)?.createdAt)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* 空状态 */}
          {sortedNodes.length === 0 && (
            <div className="text-center py-20">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">暂无节点数据</p>
            </div>
          )}
        </div>

        {/* 统计信息 */}
        <div className="mt-4 text-sm text-gray-600">
          共 {sortedNodes.length} 个节点
        </div>
      </div>
    </div>
  );
};

