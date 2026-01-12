/**
 * 工作台统计详情面板
 * 显示完整的工作台统计信息
 */

import React from 'react';
import { X, BarChart3, Users, Link2, Layers } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import type { WorkspaceStatsData } from './WorkspaceStats';
import { formatNodeType, formatNodeStatus, formatConnectionType } from './WorkspaceStats';

export interface StatsPanelProps {
  stats: WorkspaceStatsData;
  onClose: () => void;
}

/**
 * 统计详情面板组件
 */
export const StatsPanel: React.FC<StatsPanelProps> = ({ stats, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-[600px] max-h-[80vh] shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-orange-500" />
            <CardTitle className="text-lg">工作台统计</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 hover:bg-orange-50"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <ScrollArea className="h-[calc(80vh-80px)]">
          <CardContent className="p-6 space-y-6">
            {/* 节点统计 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-blue-500" />
                <h3 className="font-semibold text-sm">节点统计</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                  <span className="text-sm text-gray-700">总节点数</span>
                  <span className="text-sm font-semibold text-blue-600">{stats.totalNodes}</span>
                </div>
                
                <div className="pl-4 space-y-1">
                  <div className="text-xs font-medium text-gray-600 mb-1">按类型分布：</div>
                  {Object.entries(stats.nodesByType).map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center text-xs">
                      <span className="text-gray-600">{formatNodeType(type)}</span>
                      <span className="font-medium text-gray-900">{count}个</span>
                    </div>
                  ))}
                </div>
                
                <div className="pl-4 space-y-1 mt-2">
                  <div className="text-xs font-medium text-gray-600 mb-1">按状态分布：</div>
                  {Object.entries(stats.nodesByStatus).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center text-xs">
                      <span className="text-gray-600">{formatNodeStatus(status)}</span>
                      <span className="font-medium text-gray-900">{count}个</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 连接统计 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Link2 className="w-4 h-4 text-purple-500" />
                <h3 className="font-semibold text-sm">连接统计</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-purple-50 rounded">
                  <span className="text-sm text-gray-700">总连接数</span>
                  <span className="text-sm font-semibold text-purple-600">{stats.totalConnections}</span>
                </div>
                
                {Object.keys(stats.connectionsByType).length > 0 && (
                  <div className="pl-4 space-y-1">
                    <div className="text-xs font-medium text-gray-600 mb-1">按类型分布：</div>
                    {Object.entries(stats.connectionsByType).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center text-xs">
                        <span className="text-gray-600">{formatConnectionType(type)}</span>
                        <span className="font-medium text-gray-900">{count}条</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 选中统计 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-orange-500" />
                <h3 className="font-semibold text-sm">选中统计</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                  <span className="text-sm text-gray-700">选中节点数</span>
                  <span className="text-sm font-semibold text-orange-600">{stats.selectedCount}</span>
                </div>
                
                {stats.selectedNodeTypes.length > 0 && (
                  <div className="pl-4 space-y-1">
                    <div className="text-xs font-medium text-gray-600 mb-1">选中节点类型：</div>
                    {stats.selectedNodeTypes.map((type, index) => (
                      <div key={index} className="text-xs text-gray-600">
                        • {formatNodeType(type)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 协作统计 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-green-500" />
                <h3 className="font-semibold text-sm">协作统计</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                  <span className="text-sm text-gray-700">在线协作者</span>
                  <span className="text-sm font-semibold text-green-600">{stats.collaboratorCount}人</span>
                </div>
                
                {stats.collaboratorNames.length > 0 && (
                  <div className="pl-4 space-y-1">
                    <div className="text-xs font-medium text-gray-600 mb-1">协作者列表：</div>
                    {stats.collaboratorNames.map((name, index) => (
                      <div key={index} className="text-xs text-gray-600">
                        • {name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 性能统计 */}
            {stats.performanceGain > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4 text-gray-500" />
                  <h3 className="font-semibold text-sm">性能统计</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700">性能提升</span>
                    <span className="text-sm font-semibold text-gray-900">+{stats.performanceGain.toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700">节点剔除率</span>
                    <span className="text-sm font-semibold text-gray-900">{(stats.cullingRate * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </ScrollArea>
      </Card>
    </div>
  );
};

StatsPanel.displayName = 'StatsPanel';

