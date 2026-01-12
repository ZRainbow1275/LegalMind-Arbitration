/**
 * 导出/导入面板
 * 
 * @author AI Agent
 * @date 2025-11-06
 */

import React, { useState } from 'react';
import { Download, Upload, FileJson, Image, FileText, X } from 'lucide-react';
import { ExportService, type ExportFormat } from '../lib/export-service';
import { ImportService, type ImportOptions } from '../lib/import-service';
import type { LegalNode, Connection } from './workspace/types';
import type { CanvasState } from '../interfaces/case-canvas-mapping';

interface ExportImportPanelProps {
  nodes: LegalNode[];
  connections: Connection[];
  viewport: { zoom: number; x: number; y: number; origination: [number, number] };
  isOpen: boolean;
  onClose: () => void;
  onImport: (nodes: LegalNode[], connections: Connection[]) => void;
}

export const ExportImportPanel: React.FC<ExportImportPanelProps> = ({
  nodes,
  connections,
  viewport,
  isOpen,
  onClose,
  onImport,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [importStrategy, setImportStrategy] = useState<'replace' | 'merge'>('merge');
  const [conflictStrategy, setConflictStrategy] = useState<'skip' | 'replace' | 'rename'>('rename');
  const [isProcessing, setIsProcessing] = useState(false);
  const [exportProgress, setExportProgress] = useState<string>('');
  const [importPreview, setImportPreview] = useState<{ nodes: number; connections: number } | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const exportService = new ExportService();
  const importService = new ImportService();

  const handleExport = async () => {
    setIsProcessing(true);
    setMessage(null);
    setExportProgress('');

    try {
      const canvasState: CanvasState = {
        nodes: nodes as any,
        connections: connections as any,
        viewport,
        metadata: {
          version: '1.0.0',
          lastEditedBy: undefined,
          editCount: 0,
        },
      };

      // 根据导出格式显示不同的进度提示
      if (exportFormat === 'png') {
        setExportProgress('正在渲染画布...');
      } else if (exportFormat === 'pdf') {
        setExportProgress('正在生成PDF文档...');
      } else if (exportFormat === 'svg') {
        setExportProgress('正在导出SVG矢量图...');
      } else {
        setExportProgress('正在导出数据...');
      }

      await exportService.exportCanvas('workspace', canvasState, {
        format: exportFormat,
        includeMetadata: true,
        quality: 0.95,
        scale: 2,
      });

      setExportProgress('');
      setMessage({ type: 'success', text: `成功导出为 ${exportFormat.toUpperCase()} 格式` });
    } catch (error) {
      setExportProgress('');
      setMessage({ type: 'error', text: `导出失败: ${(error as Error).message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setMessage(null);
    setImportPreview(null);

    try {
      // 先读取文件内容进行预览
      const text = await file.text();
      const jsonData = JSON.parse(text);

      // 显示预览信息
      const previewNodes = jsonData.nodes?.length || 0;
      const previewConnections = jsonData.connections?.length || 0;
      setImportPreview({ nodes: previewNodes, connections: previewConnections });

      // 等待一小段时间让用户看到预览
      await new Promise(resolve => setTimeout(resolve, 500));

      const options: ImportOptions = {
        replace: importStrategy === 'replace',
        merge: importStrategy === 'merge',
        conflictStrategy: conflictStrategy,
        validate: true,
      };

      const { data, result } = await importService.importFromJSON(
        file,
        nodes,
        connections,
        options
      );

      onImport(data.nodes, data.connections);

      setMessage({
        type: 'success',
        text: `成功导入 ${result.nodesImported} 个节点和 ${result.connectionsImported} 个连接`,
      });

      if (result.warnings.length > 0) {
        console.warn('[Import] Warnings:', result.warnings);
      }
    } catch (error) {
      setMessage({ type: 'error', text: `导入失败: ${(error as Error).message}` });
    } finally {
      setIsProcessing(false);
      setImportPreview(null);
      event.target.value = ''; // 重置input
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div className="w-full max-w-md bg-white rounded-lg shadow-2xl" data-tutorial="export-import-panel">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">导出/导入</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 标签页 */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 px-4 py-3 font-medium ${activeTab === 'export'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <Download className="w-4 h-4 inline mr-2" />
            导出
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 px-4 py-3 font-medium ${activeTab === 'import'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            导入
          </button>
        </div>

        {/* 内容区 */}
        <div className="p-6">
          {activeTab === 'export' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择导出格式
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'json', label: 'JSON', icon: FileJson },
                    { value: 'png', label: 'PNG图片', icon: Image },
                    { value: 'svg', label: 'SVG矢量', icon: FileText },
                    { value: 'pdf', label: 'PDF文档', icon: FileText },
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setExportFormat(value as ExportFormat)}
                      className={`p-3 border rounded-lg flex items-center gap-2 ${exportFormat === value
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-300 hover:border-gray-400'
                        }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                <p>当前工作台包含:</p>
                <ul className="mt-2 space-y-1">
                  <li>• {nodes.length} 个节点</li>
                  <li>• {connections.length} 个连接</li>
                </ul>
              </div>

              {/* 导出进度指示器 */}
              {exportProgress && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                  <span className="text-sm text-blue-700">{exportProgress}</span>
                </div>
              )}

              <button
                onClick={handleExport}
                disabled={isProcessing}
                className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? '导出中...' : '开始导出'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  导入策略
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="strategy"
                      value="merge"
                      checked={importStrategy === 'merge'}
                      onChange={(e) => setImportStrategy(e.target.value as 'merge')}
                      className="text-orange-500"
                    />
                    <div>
                      <div className="font-medium">合并数据</div>
                      <div className="text-xs text-gray-500">保留现有数据，添加新数据</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="strategy"
                      value="replace"
                      checked={importStrategy === 'replace'}
                      onChange={(e) => setImportStrategy(e.target.value as 'replace')}
                      className="text-orange-500"
                    />
                    <div>
                      <div className="font-medium">替换数据</div>
                      <div className="text-xs text-gray-500">清空现有数据，使用导入数据</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* 冲突策略选择器（仅在合并模式下显示） */}
              {importStrategy === 'merge' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    冲突处理策略
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="conflict"
                        value="skip"
                        checked={conflictStrategy === 'skip'}
                        onChange={(e) => setConflictStrategy(e.target.value as 'skip')}
                        className="text-orange-500"
                      />
                      <div>
                        <div className="font-medium">跳过冲突</div>
                        <div className="text-xs text-gray-500">保留现有节点，跳过重复的导入节点</div>
                      </div>
                    </label>
                    <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="conflict"
                        value="replace"
                        checked={conflictStrategy === 'replace'}
                        onChange={(e) => setConflictStrategy(e.target.value as 'replace')}
                        className="text-orange-500"
                      />
                      <div>
                        <div className="font-medium">替换冲突</div>
                        <div className="text-xs text-gray-500">用导入节点替换现有的同ID节点</div>
                      </div>
                    </label>
                    <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="conflict"
                        value="rename"
                        checked={conflictStrategy === 'rename'}
                        onChange={(e) => setConflictStrategy(e.target.value as 'rename')}
                        className="text-orange-500"
                      />
                      <div>
                        <div className="font-medium">重命名冲突</div>
                        <div className="text-xs text-gray-500">为冲突节点生成新ID并导入</div>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              <div className="text-sm text-yellow-700 bg-yellow-50 p-3 rounded">
                ⚠️ 导入前建议先导出当前数据作为备份
              </div>

              {/* 导入预览 */}
              {importPreview && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                    <span className="text-sm font-medium text-blue-700">正在导入...</span>
                  </div>
                  <div className="text-sm text-blue-600">
                    <p>• 将导入 {importPreview.nodes} 个节点</p>
                    <p>• 将导入 {importPreview.connections} 个连接</p>
                  </div>
                </div>
              )}

              <label className="block">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  disabled={isProcessing}
                  className="hidden"
                />
                <div className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-center cursor-pointer">
                  {isProcessing ? '导入中...' : '选择JSON文件'}
                </div>
              </label>
            </div>
          )}

          {/* 消息提示 */}
          {message && (
            <div
              className={`mt-4 p-3 rounded-lg ${message.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
                }`}
            >
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

