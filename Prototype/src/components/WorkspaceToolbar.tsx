/**
 * LegalMind 法律工作台 - 工具栏组件
 * 
 * 提供节点创建、视图控制、操作快捷方式等功能
 */

import React, { useState } from 'react'
import {
  Plus,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Save,
  Upload,
  Download,
  Users,
  Settings,
  Grid3X3,
  Move,
  MousePointer,
  Bot
} from 'lucide-react'
import { NodeData } from '../lib/node-system'
import { Point } from '../lib/canvas-engine'

// ==================== 组件属性接口 ====================

export interface WorkspaceToolbarProps {
  onAddNode?: (nodeType: NodeData['type'], position?: Point) => void
  onZoomIn?: () => void
  onZoomOut?: () => void
  onFitToView?: () => void
  onResetView?: () => void
  onSave?: () => void
  onLoad?: () => void
  onExport?: () => void
  onToggleGrid?: () => void
  onToggleCollaboration?: () => void
  onToggleAI?: () => void
  onSettings?: () => void
  selectedTool?: 'select' | 'pan' | 'connect'
  onToolChange?: (tool: 'select' | 'pan' | 'connect') => void
  showGrid?: boolean
  collaborationEnabled?: boolean
  aiPanelVisible?: boolean
  className?: string
}

// ==================== 节点类型定义 ====================

const NODE_TYPES = [
  {
    type: 'case-info' as const,
    label: '案件信息',
    icon: '⚖️',
    description: '创建案件信息节点'
  },
  {
    type: 'person' as const,
    label: '人物关系',
    icon: '👤',
    description: '添加当事人、律师等人员'
  },
  {
    type: 'document' as const,
    label: '文档管理',
    icon: '📄',
    description: '管理证据、合同等文档'
  },
  {
    type: 'timeline' as const,
    label: '时间轴',
    icon: '⏰',
    description: '标记重要时间节点'
  },
  {
    type: 'process' as const,
    label: '流程模板',
    icon: '🔄',
    description: '使用或创建流程模板'
  },
  {
    type: 'ai-assistant' as const,
    label: 'AI助手',
    icon: '🤖',
    description: '添加AI智能助手'
  }
]

// ==================== 主组件 ====================

export const WorkspaceToolbar: React.FC<WorkspaceToolbarProps> = ({
  onAddNode,
  onZoomIn,
  onZoomOut,
  onFitToView,
  onResetView,
  onSave,
  onLoad,
  onExport,
  onToggleGrid,
  onToggleCollaboration,
  onToggleAI,
  onSettings,
  selectedTool = 'select',
  onToolChange,
  showGrid = true,
  collaborationEnabled = false,
  aiPanelVisible = false,
  className = ''
}) => {
  const [showNodeMenu, setShowNodeMenu] = useState(false)
  const [showViewMenu, setShowViewMenu] = useState(false)

  // ==================== 事件处理 ====================

  const handleAddNode = (nodeType: NodeData['type']) => {
    onAddNode?.(nodeType)
    setShowNodeMenu(false)
  }

  const handleToolChange = (tool: 'select' | 'pan' | 'connect') => {
    onToolChange?.(tool)
  }

  // ==================== 渲染 ====================

  return (
    <div className={`bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2 ${className}`}>
      {/* 工具选择 */}
      <div className="flex items-center gap-1 border-r border-gray-200 pr-4 mr-2">
        <button
          className={`p-2 rounded-lg transition-colors ${
            selectedTool === 'select' 
              ? 'bg-orange-100 text-orange-600' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          onClick={() => handleToolChange('select')}
          title="选择工具"
        >
          <MousePointer size={18} />
        </button>
        
        <button
          className={`p-2 rounded-lg transition-colors ${
            selectedTool === 'pan' 
              ? 'bg-orange-100 text-orange-600' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          onClick={() => handleToolChange('pan')}
          title="平移工具"
        >
          <Move size={18} />
        </button>
        
        <button
          className={`p-2 rounded-lg transition-colors ${
            selectedTool === 'connect' 
              ? 'bg-orange-100 text-orange-600' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          onClick={() => handleToolChange('connect')}
          title="连接工具"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 12h8" />
            <circle cx="6" cy="12" r="2" />
            <circle cx="18" cy="12" r="2" />
          </svg>
        </button>
      </div>

      {/* 添加节点 */}
      <div className="relative">
        <button
          className="flex items-center gap-2 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          onClick={() => setShowNodeMenu(!showNodeMenu)}
        >
          <Plus size={18} />
          <span>添加节点</span>
        </button>
        
        {showNodeMenu && (
          <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50 min-w-[200px]">
            {NODE_TYPES.map((nodeType) => (
              <button
                key={nodeType.type}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3"
                onClick={() => handleAddNode(nodeType.type)}
              >
                <span className="text-xl">{nodeType.icon}</span>
                <div>
                  <div className="font-medium text-gray-900">{nodeType.label}</div>
                  <div className="text-sm text-gray-500">{nodeType.description}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 视图控制 */}
      <div className="flex items-center gap-1 border-l border-gray-200 pl-4 ml-2">
        <button
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          onClick={onZoomIn}
          title="放大"
        >
          <ZoomIn size={18} />
        </button>
        
        <button
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          onClick={onZoomOut}
          title="缩小"
        >
          <ZoomOut size={18} />
        </button>
        
        <div className="relative">
          <button
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => setShowViewMenu(!showViewMenu)}
            title="视图选项"
          >
            <Maximize2 size={18} />
          </button>
          
          {showViewMenu && (
            <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50 min-w-[150px]">
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                onClick={() => {
                  onFitToView?.()
                  setShowViewMenu(false)
                }}
              >
                适应窗口
              </button>
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                onClick={() => {
                  onResetView?.()
                  setShowViewMenu(false)
                }}
              >
                重置视图
              </button>
            </div>
          )}
        </div>
        
        <button
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          onClick={onResetView}
          title="重置视图"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {/* 文件操作 */}
      <div className="flex items-center gap-1 border-l border-gray-200 pl-4 ml-2">
        <button
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          onClick={onSave}
          title="保存"
        >
          <Save size={18} />
        </button>
        
        <button
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          onClick={onLoad}
          title="加载"
        >
          <Upload size={18} />
        </button>
        
        <button
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          onClick={onExport}
          title="导出"
        >
          <Download size={18} />
        </button>
      </div>

      {/* 右侧功能 */}
      <div className="flex items-center gap-1 ml-auto">
        <button
          className={`p-2 rounded-lg transition-colors ${
            showGrid 
              ? 'bg-gray-100 text-gray-900' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          onClick={onToggleGrid}
          title="切换网格"
        >
          <Grid3X3 size={18} />
        </button>
        
        <button
          className={`p-2 rounded-lg transition-colors ${
            collaborationEnabled
              ? 'bg-green-100 text-green-600'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          onClick={onToggleCollaboration}
          title="协作模式"
        >
          <Users size={18} />
        </button>

        <button
          className={`p-2 rounded-lg transition-colors ${
            aiPanelVisible
              ? 'bg-orange-100 text-orange-600'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          onClick={onToggleAI}
          title="AI助手"
        >
          <Bot size={18} />
        </button>

        <button
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          onClick={onSettings}
          title="设置"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* 点击外部关闭菜单 */}
      {(showNodeMenu || showViewMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowNodeMenu(false)
            setShowViewMenu(false)
          }}
        />
      )}
    </div>
  )
}

export default WorkspaceToolbar
