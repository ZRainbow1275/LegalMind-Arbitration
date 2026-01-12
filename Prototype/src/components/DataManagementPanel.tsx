/**
 * 数据管理面板
 * 
 * 功能：
 * 1. 数据备份和恢复
 * 2. 数据导入导出
 * 3. 数据同步配置
 * 4. 版本管理
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { buttonVariants } from './ui/buttonVariants';
import { cn } from '../lib/utils';


import {
  Database,
  Download,
  Upload,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Save,
  Cloud,
  HardDrive,
  Settings
} from 'lucide-react';
import {
  getCurrentDataVersion,
  migrateData,
  createBackup,
  listBackups,
  restoreBackup,
  deleteBackup,
  exportData,
  importData,
  DataSnapshot,
  VERSION_HISTORY
} from '../lib/data-version-manager';
import { useSyncStore } from '../lib/data-sync-manager';

interface DataManagementPanelProps {
  onClose?: () => void;
}

export const DataManagementPanel: React.FC<DataManagementPanelProps> = ({ onClose }) => {
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [backups, setBackups] = useState<DataSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'backup' | 'sync' | 'version'>('backup');

  const { config, status, sync, pull, loadConfig } = useSyncStore();

  // 加载数据
  useEffect(() => {
    loadData();
    loadConfig();
  }, [loadConfig]);

  const loadData = async () => {
    const version = await getCurrentDataVersion();
    setCurrentVersion(version);

    const backupList = await listBackups();
    setBackups(backupList);
  };

  // 创建备份
  const handleCreateBackup = useCallback(async () => {
    setLoading(true);
    setMessage(null);

    try {
      const description = `手动备份 - ${new Date().toLocaleString('zh-CN')}`;
      await createBackup(description);
      await loadData();
      setMessage({ type: 'success', text: '备份创建成功' });
    } catch (error) {
      setMessage({ type: 'error', text: '备份创建失败' });
    } finally {
      setLoading(false);
    }
  }, []);

  // 恢复备份
  const handleRestoreBackup = useCallback(async (backupId: string) => {
    if (!confirm('确定要恢复此备份吗？当前数据将被覆盖。')) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const success = await restoreBackup(backupId);
      if (success) {
        await loadData();
        setMessage({ type: 'success', text: '备份恢复成功' });
        // 刷新页面以加载新数据
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setMessage({ type: 'error', text: '备份恢复失败' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '备份恢复失败' });
    } finally {
      setLoading(false);
    }
  }, []);

  // 删除备份
  const handleDeleteBackup = useCallback(async (backupId: string) => {
    if (!confirm('确定要删除此备份吗？')) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await deleteBackup(backupId);
      await loadData();
      setMessage({ type: 'success', text: '备份删除成功' });
    } catch (error) {
      setMessage({ type: 'error', text: '备份删除失败' });
    } finally {
      setLoading(false);
    }
  }, []);

  // 导出数据
  const handleExportData = useCallback(async () => {
    setLoading(true);
    setMessage(null);

    try {
      const jsonStr = await exportData();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `legalmind-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: '数据导出成功' });
    } catch (error) {
      setMessage({ type: 'error', text: '数据导出失败' });
    } finally {
      setLoading(false);
    }
  }, []);

  // 导入数据
  const handleImportData = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage(null);

    try {
      const text = await file.text();
      const result = await importData(text);

      if (result.success) {
        await loadData();
        setMessage({ type: 'success', text: '数据导入成功' });
        // 刷新页面以加载新数据
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setMessage({ type: 'error', text: `数据导入失败: ${result.error}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '数据导入失败' });
    } finally {
      setLoading(false);
      // 重置文件输入
      event.target.value = '';
    }
  }, []);

  // 执行迁移
  const handleMigrate = useCallback(async () => {
    setLoading(true);
    setMessage(null);

    try {
      const result = await migrateData();

      if (result.success) {
        await loadData();
        setMessage({ type: 'success', text: `数据迁移成功 (${result.fromVersion} -> ${result.toVersion})` });
      } else {
        setMessage({ type: 'error', text: `数据迁移失败: ${result.errors.join(', ')}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '数据迁移失败' });
    } finally {
      setLoading(false);
    }
  }, []);

  // 格式化文件大小
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <Card className="border-orange-200">
        <CardHeader className="border-b border-orange-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="w-6 h-6 text-orange-500" />
              <CardTitle className="text-xl">数据管理</CardTitle>
            </div>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                关闭
              </Button>
            )}
          </div>

          {/* 标签页 */}
          <div className="flex gap-2 mt-4">
            <Button
              variant={activeTab === 'backup' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('backup')}
              className={activeTab === 'backup' ? 'bg-orange-500 hover:bg-orange-600' : ''}
            >
              <HardDrive className="w-4 h-4 mr-2" />
              备份管理
            </Button>
            <Button
              variant={activeTab === 'sync' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('sync')}
              className={activeTab === 'sync' ? 'bg-orange-500 hover:bg-orange-600' : ''}
            >
              <Cloud className="w-4 h-4 mr-2" />
              云端同步
            </Button>
            <Button
              variant={activeTab === 'version' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('version')}
              className={activeTab === 'version' ? 'bg-orange-500 hover:bg-orange-600' : ''}
            >
              <Settings className="w-4 h-4 mr-2" />
              版本管理
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* 消息提示 */}
          {message && (
            <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* 备份管理标签页 */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              {/* 操作按钮 */}
              <div className="flex gap-3">
                <Button
                  onClick={handleCreateBackup}
                  disabled={loading}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <Save className="w-4 h-4 mr-2" />
                  创建备份
                </Button>

                <Button
                  onClick={handleExportData}
                  disabled={loading}
                  variant="outline"
                  className="border-orange-200 hover:border-orange-400"
                >
                  <Download className="w-4 h-4 mr-2" />
                  导出数据
                </Button>

                <label>
                  <span
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "border-orange-200 hover:border-orange-400 cursor-pointer",
                      loading && "pointer-events-none opacity-50"
                    )}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    导入数据
                  </span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportData}
                    className="hidden"
                  />
                </label>
              </div>

              {/* 备份列表 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">备份历史</h3>
                {backups.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    暂无备份记录
                  </div>
                ) : (
                  <div className="space-y-2">
                    {backups.map(backup => (
                      <Card key={backup.id} className="border-gray-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{backup.description}</span>
                                <Badge variant="secondary" className="text-xs">
                                  v{backup.version}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(backup.timestamp).toLocaleString('zh-CN')}
                                </span>
                                <span>{formatSize(backup.size)}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRestoreBackup(backup.id)}
                                disabled={loading}
                                className="border-orange-200 hover:border-orange-400"
                              >
                                <RefreshCw className="w-3 h-3 mr-1" />
                                恢复
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteBackup(backup.id)}
                                disabled={loading}
                                className="border-red-200 hover:border-red-400 text-red-600"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 云端同步标签页 */}
          {activeTab === 'sync' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  ℹ️ 云端同步功能当前为演示模式。在生产环境中，需要配置实际的API端点和认证信息。
                </p>
              </div>

              {/* 同步状态 */}
              <Card className="border-gray-200">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">同步状态</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">最后同步时间:</span>
                      <span>{status.lastSyncTime ? new Date(status.lastSyncTime).toLocaleString('zh-CN') : '从未同步'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">待同步变更:</span>
                      <Badge variant="secondary">{status.pendingChanges}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">同步状态:</span>
                      {status.syncInProgress ? (
                        <Badge className="bg-blue-100 text-blue-700">
                          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                          同步中...
                        </Badge>
                      ) : status.lastSyncSuccess ? (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          正常
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          失败
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 同步操作 */}
              <div className="flex gap-3">
                <Button
                  onClick={sync}
                  disabled={status.syncInProgress || !config.enabled}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  推送到云端
                </Button>
                <Button
                  onClick={pull}
                  disabled={status.syncInProgress || !config.enabled}
                  variant="outline"
                  className="border-orange-200 hover:border-orange-400"
                >
                  <Download className="w-4 h-4 mr-2" />
                  从云端拉取
                </Button>
              </div>
            </div>
          )}

          {/* 版本管理标签页 */}
          {activeTab === 'version' && (
            <div className="space-y-6">
              {/* 当前版本 */}
              <Card className="border-gray-200">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">当前版本</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-orange-500">v{currentVersion}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {VERSION_HISTORY.find(v => v.version === currentVersion)?.description}
                      </div>
                    </div>
                    <Button
                      onClick={handleMigrate}
                      disabled={loading}
                      variant="outline"
                      className="border-orange-200 hover:border-orange-400"
                    >
                      检查更新
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 版本历史 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">版本历史</h3>
                <div className="space-y-3">
                  {VERSION_HISTORY.map(version => (
                    <Card key={version.version} className="border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">v{version.version}</span>
                            {version.version === currentVersion && (
                              <Badge className="bg-orange-100 text-orange-700">当前版本</Badge>
                            )}
                          </div>
                          <span className="text-sm text-gray-600">{version.timestamp}</span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{version.description}</p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {version.changes.map((change, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-orange-500">•</span>
                              <span>{change}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
