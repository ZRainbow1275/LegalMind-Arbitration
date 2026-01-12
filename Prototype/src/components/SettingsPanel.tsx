import React, { useState } from 'react'
import {
  Settings,
  X,
  Grid3X3,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  Palette,
  Download,
  Upload,
  Info
} from 'lucide-react'
import { cn } from '../lib/utils'
import { useWorkspaceStore } from '../stores/workspaceStore'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  canvasTransform: {
    scale: number
    translateX: number
    translateY: number
  }
  onCanvasTransformChange: (transform: any) => void
  onResetView: () => void
  onFitToWindow: () => void
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  canvasTransform,
  onCanvasTransformChange,
  onResetView,
  onFitToWindow
}) => {
  const { userSettings, updateUserSettings, nodes, connections } = useWorkspaceStore()
  const [activeTab, setActiveTab] = useState<'canvas' | 'nodes' | 'appearance' | 'export'>('canvas')

  if (!isOpen) return null

  const handleZoomChange = (newZoom: number) => {
    const clampedZoom = Math.max(0.1, Math.min(3, newZoom))
    onCanvasTransformChange({
      ...canvasTransform,
      scale: clampedZoom
    })
  }

  const tabs = [
    { id: 'canvas', label: '画布设置', icon: Grid3X3 },
    { id: 'nodes', label: '节点设置', icon: Settings },
    { id: 'appearance', label: '外观设置', icon: Palette },
    { id: 'export', label: '导入导出', icon: Download }
  ]

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col animate-slide-in-up">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <Settings className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">工作台设置</h2>
              <p className="text-sm text-gray-500">自定义您的法律工作台体验</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 侧边栏 */}
          <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
            <nav className="space-y-2">
              {tabs.map(tab => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors",
                      activeTab === tab.id
                        ? "bg-orange-100 text-orange-700 font-medium"
                        : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>

            {/* 工作台统计 */}
            <div className="mt-8 p-4 bg-white rounded-xl border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3">工作台统计</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">节点数量</span>
                  <span className="font-medium">{nodes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">连接数量</span>
                  <span className="font-medium">{connections.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">缩放比例</span>
                  <span className="font-medium">{Math.round(canvasTransform.scale * 100)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* 主内容区 */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'canvas' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">画布控制</h3>

                  {/* 缩放控制 */}
                  <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      缩放比例: {Math.round(canvasTransform.scale * 100)}%
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleZoomChange(canvasTransform.scale - 0.1)}
                        className="w-10 h-10 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 flex items-center justify-center"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>
                      <input
                        type="range"
                        min="0.1"
                        max="3"
                        step="0.1"
                        value={canvasTransform.scale}
                        onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <button
                        onClick={() => handleZoomChange(canvasTransform.scale + 0.1)}
                        className="w-10 h-10 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 flex items-center justify-center"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 视图控制 */}
                  <div className="flex gap-3">
                    <button
                      onClick={onResetView}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-orange-100 text-orange-700 rounded-xl hover:bg-orange-200 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      重置视图
                    </button>
                    <button
                      onClick={onFitToWindow}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      适应窗口
                    </button>
                  </div>
                </div>

                {/* 网格设置 */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">网格设置</h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={userSettings.workspace.snapToGrid}
                        onChange={(e) => updateUserSettings({
                          workspace: {
                            ...userSettings.workspace,
                            snapToGrid: e.target.checked
                          }
                        })}
                        className="w-4 h-4 text-orange-600 rounded"
                      />
                      <span className="text-sm text-gray-700">启用网格吸附</span>
                    </label>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        网格大小: {userSettings.workspace.gridSize}px
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="50"
                        value={userSettings.workspace.gridSize}
                        onChange={(e) => updateUserSettings({
                          workspace: {
                            ...userSettings.workspace,
                            gridSize: parseInt(e.target.value)
                          }
                        })}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'nodes' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">节点设置</h3>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Info className="w-5 h-5 text-blue-500" />
                      <span className="font-medium text-gray-900">节点信息</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">总节点数</span>
                        <div className="font-semibold text-lg">{nodes.length}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">连接数</span>
                        <div className="font-semibold text-lg">{connections.length}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">外观设置</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">主题</label>
                      <select
                        value={userSettings.theme}
                        onChange={(e) => updateUserSettings({ theme: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      >
                        <option value="light">浅色主题</option>
                        <option value="dark">深色主题</option>
                        <option value="auto">跟随系统</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">语言</label>
                      <select
                        value={userSettings.language}
                        onChange={(e) => updateUserSettings({ language: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      >
                        <option value="zh-CN">简体中文</option>
                        <option value="en-US">English</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'export' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">导入导出</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <button className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-colors">
                      <Upload className="w-8 h-8 text-gray-400" />
                      <div className="text-center">
                        <div className="font-medium text-gray-900">导入工作流</div>
                        <div className="text-sm text-gray-500">从文件导入</div>
                      </div>
                    </button>

                    <button className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors">
                      <Download className="w-8 h-8 text-gray-400" />
                      <div className="text-center">
                        <div className="font-medium text-gray-900">导出工作流</div>
                        <div className="text-sm text-gray-500">保存为文件</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPanel
