/**
 * 性能监控面板
 * 
 * 功能：
 * 1. 实时性能指标显示
 * 2. 性能图表
 * 3. 性能报告
 * 4. 性能警告
 */

import React, { useState, useEffect, useCallback } from 'react';

import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  performanceMonitor,
  usePerformanceStore,
  PerformanceMetric,
  checkPerformanceIssues
} from '../lib/performance-monitor';
import {
  Activity,
  AlertTriangle,
  Download,
  Trash2,
  X
} from 'lucide-react';

interface PerformanceMonitorPanelProps {
  onClose?: () => void;
}

export const PerformanceMonitorPanel: React.FC<PerformanceMonitorPanelProps> = ({
  onClose
}) => {
  const { enabled, setEnabled } = usePerformanceStore();
  const toggleEnabled = () => setEnabled(!enabled);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [summary, setSummary] = useState<{
    totalOperations: number;
    averageDuration: number;
    slowestOperation: PerformanceMetric | null;
    fastestOperation: PerformanceMetric | null;
  }>({
    totalOperations: 0,
    averageDuration: 0,
    slowestOperation: null,
    fastestOperation: null
  });
  const [warnings, setWarnings] = useState<string[]>([]);

  // 更新性能数据
  const updateMetrics = useCallback(() => {
    const report = performanceMonitor.generateReport();
    setMetrics(report.metrics.slice(-50)); // 只显示最近50条
    setSummary(report.summary);

    // 检查性能警告
    const newWarnings = checkPerformanceIssues(report);
    setWarnings(newWarnings);
  }, []);

  // 定时更新
  useEffect(() => {
    updateMetrics();
    const interval = setInterval(updateMetrics, 1000);
    return () => clearInterval(interval);
  }, [updateMetrics]);

  // 清除数据
  const handleClear = useCallback(() => {
    performanceMonitor.clear();
    updateMetrics();
  }, [updateMetrics]);

  // 导出报告
  const handleExport = useCallback(() => {
    const report = performanceMonitor.generateReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // 获取性能等级
  const getPerformanceGrade = () => {
    if (summary.averageDuration < 16) return { grade: 'A', color: 'green', text: '优秀' };
    if (summary.averageDuration < 33) return { grade: 'B', color: 'blue', text: '良好' };
    if (summary.averageDuration < 50) return { grade: 'C', color: 'yellow', text: '一般' };
    return { grade: 'D', color: 'red', text: '需要优化' };
  };

  const grade = getPerformanceGrade();

  // 按类型分组统计
  const metricsByType = metrics.reduce((acc, metric) => {
    if (!acc[metric.type]) {
      acc[metric.type] = [];
    }
    acc[metric.type].push(metric);
    return acc;
  }, {} as Record<string, PerformanceMetric[]>);

  const typeStats = Object.entries(metricsByType).map(([type, items]) => ({
    type,
    count: items.length,
    avgDuration: items.reduce((sum, m) => sum + (m.duration || 0), 0) / items.length
  }));

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-[80vh] overflow-hidden bg-white rounded-lg shadow-2xl border border-gray-200 z-50">
      {/* 标题栏 */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          <span className="font-semibold">性能监控</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleEnabled}
            className="text-white hover:bg-orange-600 h-7"
          >
            {enabled ? '暂停' : '启动'}
          </Button>
          {onClose && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="text-white hover:bg-orange-600 h-7 w-7 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* 内容区 */}
      <div className="overflow-y-auto max-h-[calc(80vh-60px)]">
        {/* 性能等级 */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">性能等级</span>
            <Badge
              variant="secondary"
              className={`bg-${grade.color}-100 text-${grade.color}-700 text-lg font-bold px-3`}
            >
              {grade.grade}
            </Badge>
          </div>
          <div className="text-xs text-gray-600">{grade.text}</div>
        </div>

        {/* 性能摘要 */}
        <div className="p-4 border-b">
          <div className="text-sm font-medium text-gray-700 mb-3">性能摘要</div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">总操作数</span>
              <span className="font-medium">{summary.totalOperations}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">平均耗时</span>
              <span className="font-medium">{summary.averageDuration.toFixed(2)}ms</span>
            </div>
            {summary.slowestOperation && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">最慢操作</span>
                <span className="font-medium text-red-600">
                  {summary.slowestOperation.name} ({summary.slowestOperation.duration?.toFixed(2)}ms)
                </span>
              </div>
            )}
            {summary.fastestOperation && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">最快操作</span>
                <span className="font-medium text-green-600">
                  {summary.fastestOperation.name} ({summary.fastestOperation.duration?.toFixed(2)}ms)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 按类型统计 */}
        <div className="p-4 border-b">
          <div className="text-sm font-medium text-gray-700 mb-3">操作类型统计</div>
          <div className="space-y-2">
            {typeStats.map(stat => (
              <div key={stat.type} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${stat.type === 'render' ? 'bg-blue-500' :
                    stat.type === 'operation' ? 'bg-green-500' :
                      stat.type === 'memory' ? 'bg-purple-500' :
                        'bg-orange-500'
                    }`} />
                  <span className="text-gray-600 capitalize">{stat.type}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-500">{stat.count}次</span>
                  <span className="font-medium">{stat.avgDuration.toFixed(2)}ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 性能警告 */}
        {warnings.length > 0 && (
          <div className="p-4 border-b bg-yellow-50">
            <div className="flex items-center gap-2 text-sm font-medium text-yellow-800 mb-2">
              <AlertTriangle className="w-4 h-4" />
              性能警告
            </div>
            <div className="space-y-1">
              {warnings.map((warning, index) => (
                <div key={index} className="text-xs text-yellow-700">
                  • {warning}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 最近操作 */}
        <div className="p-4">
          <div className="text-sm font-medium text-gray-700 mb-3">最近操作</div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {metrics.slice(-10).reverse().map(metric => (
              <div key={metric.id} className="text-xs bg-gray-50 rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-700">{metric.name}</span>
                  <span className={`font-medium ${(metric.duration || 0) < 16 ? 'text-green-600' :
                    (metric.duration || 0) < 33 ? 'text-blue-600' :
                      (metric.duration || 0) < 50 ? 'text-yellow-600' :
                        'text-red-600'
                    }`}>
                    {metric.duration?.toFixed(2)}ms
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <Badge variant="secondary" className="text-xs">
                    {metric.type}
                  </Badge>
                  {metric.metadata && Object.keys(metric.metadata).length > 0 && (
                    <span className="text-xs">
                      {Object.entries(metric.metadata).map(([k, v]) => `${k}: ${v}`).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="p-4 border-t bg-gray-50 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-1" />
            导出报告
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleClear}
            className="flex-1"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            清除数据
          </Button>
        </div>
      </div>
    </div>
  );
};
