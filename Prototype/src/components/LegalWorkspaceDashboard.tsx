/**
 * LegalMind 法律工作台 - 综合仪表板
 * 
 * 整合所有工作台功能的主仪表板组件
 */

import React, { useState, useCallback } from 'react'
import {
  LayoutDashboard,
  FileText,
  Users,
  Clock,
  Settings,
  Bot,
  Search
} from 'lucide-react'

import LegalWorkspaceCanvas from './LegalWorkspaceCanvas'
import TimelineVisualization from './TimelineVisualization'
import RelationshipGraph from './RelationshipGraph'
import DocumentManager from './DocumentManager'
import ProcessTemplateManager from './ProcessTemplateManager'
import AIAssistantPanel from './AIAssistantPanel'

import { NodeData } from '../lib/node-system'
import { ConnectionData } from '../lib/connection-system'

// ==================== 类型定义 ====================

interface DashboardLayout {
  canvas: { visible: boolean; size: 'small' | 'medium' | 'large' | 'fullscreen' }
  timeline: { visible: boolean; position: 'top' | 'bottom' | 'left' | 'right' }
  relationships: { visible: boolean; position: 'top' | 'bottom' | 'left' | 'right' }
  documents: { visible: boolean; position: 'top' | 'bottom' | 'left' | 'right' }
  processes: { visible: boolean; position: 'top' | 'bottom' | 'left' | 'right' }
  aiAssistant: { visible: boolean; position: 'right' | 'left' | 'bottom' }
}

interface LegalWorkspaceDashboardProps {
  // 画布数据
  nodes: NodeData[]
  connections: ConnectionData[]
  onNodeAdd?: (node: NodeData) => void
  onNodeUpdate?: (nodeId: string, updates: Partial<NodeData>) => void
  onNodeDelete?: (nodeId: string) => void
  onConnectionAdd?: (connection: ConnectionData) => void
  onConnectionDelete?: (connectionId: string) => void

  // 时间轴数据
  timelineEvents?: any[]
  onTimelineEventAdd?: (event: any) => void
  onTimelineEventUpdate?: (eventId: string, updates: any) => void
  onTimelineEventDelete?: (eventId: string) => void

  // 人物关系数据
  people?: any[]
  relationships?: any[]
  onPersonAdd?: (person: any) => void
  onPersonUpdate?: (personId: string, updates: any) => void
  onPersonDelete?: (personId: string) => void
  onRelationshipAdd?: (relationship: any) => void
  onRelationshipUpdate?: (relationshipId: string, updates: any) => void
  onRelationshipDelete?: (relationshipId: string) => void

  // 文档数据
  documents?: any[]
  onDocumentAdd?: (document: any) => void
  onDocumentUpdate?: (documentId: string, updates: any) => void
  onDocumentDelete?: (documentId: string) => void

  // 流程模板数据
  processTemplates?: any[]
  processExecutions?: any[]
  onProcessTemplateAdd?: (template: any) => void
  onProcessTemplateUpdate?: (templateId: string, updates: any) => void
  onProcessTemplateDelete?: (templateId: string) => void
  onProcessExecute?: (templateId: string) => void

  className?: string
  readOnly?: boolean
}

// ==================== 默认布局配置 ====================

const DEFAULT_LAYOUT: DashboardLayout = {
  canvas: { visible: true, size: 'large' },
  timeline: { visible: true, position: 'bottom' },
  relationships: { visible: true, position: 'left' },
  documents: { visible: true, position: 'right' },
  processes: { visible: false, position: 'bottom' },
  aiAssistant: { visible: true, position: 'right' }
}

const LAYOUT_PRESETS = {
  'canvas-focused': {
    canvas: { visible: true, size: 'fullscreen' as const },
    timeline: { visible: false, position: 'bottom' as const },
    relationships: { visible: false, position: 'left' as const },
    documents: { visible: false, position: 'right' as const },
    processes: { visible: false, position: 'bottom' as const },
    aiAssistant: { visible: true, position: 'right' as const }
  },
  'analysis-focused': {
    canvas: { visible: true, size: 'medium' as const },
    timeline: { visible: true, position: 'bottom' as const },
    relationships: { visible: true, position: 'left' as const },
    documents: { visible: true, position: 'right' as const },
    processes: { visible: false, position: 'bottom' as const },
    aiAssistant: { visible: true, position: 'right' as const }
  },
  'process-focused': {
    canvas: { visible: true, size: 'small' as const },
    timeline: { visible: true, position: 'top' as const },
    relationships: { visible: false, position: 'left' as const },
    documents: { visible: true, position: 'right' as const },
    processes: { visible: true, position: 'bottom' as const },
    aiAssistant: { visible: true, position: 'right' as const }
  }
}

// ==================== 主组件 ====================

export const LegalWorkspaceDashboard: React.FC<LegalWorkspaceDashboardProps> = ({
  nodes,
  connections,
  onNodeAdd,
  onNodeUpdate,
  onNodeDelete,
  onConnectionAdd,
  onConnectionDelete,
  timelineEvents = [],
  onTimelineEventAdd,
  onTimelineEventUpdate,
  onTimelineEventDelete,
  people = [],
  relationships = [],
  onPersonAdd,
  onPersonUpdate,
  onPersonDelete,
  onRelationshipAdd,
  onRelationshipUpdate,
  onRelationshipDelete,
  documents = [],
  onDocumentAdd,
  onDocumentUpdate,
  onDocumentDelete,
  processTemplates = [],
  processExecutions = [],
  onProcessTemplateAdd,
  onProcessTemplateUpdate,
  onProcessTemplateDelete,
  onProcessExecute,
  className = ''
}) => {
  const [layout, setLayout] = useState<DashboardLayout>(DEFAULT_LAYOUT)
  const [activePreset, setActivePreset] = useState<string>('analysis-focused')
  const [searchTerm, setSearchTerm] = useState('')

  // ==================== 布局管理 ====================

  const applyLayoutPreset = useCallback((presetName: string) => {
    const preset = LAYOUT_PRESETS[presetName as keyof typeof LAYOUT_PRESETS]
    if (preset) {
      setLayout(preset)
      setActivePreset(presetName)
    }
  }, [])

  const toggleComponent = useCallback((component: keyof DashboardLayout) => {
    setLayout(prev => ({
      ...prev,
      [component]: {
        ...prev[component],
        visible: !prev[component].visible
      }
    }))
  }, [])

  // ==================== AI节点创建处理 ====================

  const handleAICreateNode = useCallback((nodeData: NodeData) => {
    onNodeAdd?.(nodeData)
  }, [onNodeAdd])

  // ==================== 渲染组件网格 ====================

  const renderComponentGrid = () => {
    // 全屏模式：只显示画布
    if (layout.canvas.size === 'fullscreen') {
      return (
        <div className="h-full">
          <LegalWorkspaceCanvas
            width={800}
            height={600}
            initialNodes={nodes}
            initialConnections={connections}
            onNodeUpdated={(nodeId, _, newData) => onNodeUpdate?.(nodeId, newData)}
            onNodeRemoved={onNodeDelete}
            onConnectionAdded={(connection) => onConnectionAdd?.(connection)}
            onConnectionRemoved={onConnectionDelete}
            className="w-full h-full"
          />
        </div>
      )
    }

    // 网格布局模式
    return (
      <div className="grid grid-cols-12 gap-4 p-4 h-full overflow-auto">
        {/* 画布区域 */}
        {layout.canvas.visible && (
          <div className={`
            ${layout.canvas.size === 'small' ? 'col-span-4' :
              layout.canvas.size === 'medium' ? 'col-span-6' : 'col-span-8'}
            h-[600px] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden
          `}>
            <div className="h-full flex flex-col">
              <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h3 className="font-medium text-gray-700 flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4" />
                  案件画布
                </h3>
              </div>
              <div className="flex-1 relative">
                <LegalWorkspaceCanvas
                  width={800}
                  height={600}
                  initialNodes={nodes}
                  initialConnections={connections}
                  onNodeUpdated={(nodeId, _, newData) => onNodeUpdate?.(nodeId, newData)}
                  onNodeRemoved={onNodeDelete}
                  onConnectionAdded={(connection) => onConnectionAdd?.(connection)}
                  onConnectionRemoved={onConnectionDelete}
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* 时间轴区域 */}
        {layout.timeline.visible && (
          <div className="col-span-12 lg:col-span-6 xl:col-span-4 h-[400px]">
            <TimelineVisualization
              events={timelineEvents}
              onEventAdd={onTimelineEventAdd}
              onEventEdit={onTimelineEventUpdate}
              onEventDelete={onTimelineEventDelete}
              className="h-full"
            />
          </div>
        )}

        {/* 关系图区域 */}
        {layout.relationships.visible && (
          <div className="col-span-12 lg:col-span-6 xl:col-span-4 h-[400px]">
            <RelationshipGraph
              people={people}
              relationships={relationships}
              onPersonAdd={onPersonAdd}
              onPersonEdit={onPersonUpdate}
              onPersonDelete={onPersonDelete}
              onRelationshipAdd={onRelationshipAdd}
              onRelationshipEdit={onRelationshipUpdate}
              onRelationshipDelete={onRelationshipDelete}
              className="h-full"
            />
          </div>
        )}

        {/* 文档管理区域 */}
        {layout.documents.visible && (
          <div className="col-span-12 lg:col-span-6 xl:col-span-4 h-[400px]">
            <DocumentManager
              documents={documents}
              onDocumentAdd={onDocumentAdd}
              onDocumentEdit={onDocumentUpdate}
              onDocumentDelete={onDocumentDelete}
              className="h-full"
            />
          </div>
        )}

        {/* 流程模板区域 */}
        {layout.processes.visible && (
          <div className="col-span-12 lg:col-span-6 xl:col-span-4 h-[400px]">
            <ProcessTemplateManager
              templates={processTemplates}
              executions={processExecutions}
              onTemplateCreate={onProcessTemplateAdd}
              onTemplateEdit={onProcessTemplateUpdate}
              onTemplateDelete={onProcessTemplateDelete}
              onTemplateExecute={onProcessExecute}
              className="h-full"
            />
          </div>
        )}
      </div>
    )
  }

  // ==================== 网格布局计算 ====================



  // ==================== 渲染 ====================

  return (
    <div className={`h-screen flex flex-col bg-gray-100 ${className}`}>
      {/* 顶部工具栏 */}
      <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">LegalMind 法律工作台</h1>
              <p className="text-sm text-gray-500">智能可视化案件管理平台</p>
            </div>
          </div>

          {/* 布局预设 */}
          <div className="flex items-center gap-2 ml-8">
            <span className="text-sm text-gray-500">布局:</span>
            {Object.keys(LAYOUT_PRESETS).map((preset) => (
              <button
                key={preset}
                onClick={() => applyLayoutPreset(preset)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${activePreset === preset
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50'
                  }`}
              >
                {preset === 'canvas-focused' ? '画布' :
                  preset === 'analysis-focused' ? '分析' :
                    preset === 'process-focused' ? '流程' : preset}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索工作台内容..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
            />
          </div>

          {/* 组件显示控制 */}
          <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg">
            <button
              onClick={() => toggleComponent('canvas')}
              className={`p-2 rounded-md transition-all duration-200 ${layout.canvas.visible
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-gray-500 hover:text-orange-600 hover:bg-white'
                }`}
              title="画布"
            >
              <LayoutDashboard className="w-4 h-4" />
            </button>
            <button
              onClick={() => toggleComponent('timeline')}
              className={`p-2 rounded-md transition-all duration-200 ${layout.timeline.visible
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-gray-500 hover:text-orange-600 hover:bg-white'
                }`}
              title="时间轴"
            >
              <Clock className="w-4 h-4" />
            </button>
            <button
              onClick={() => toggleComponent('relationships')}
              className={`p-2 rounded-md transition-all duration-200 ${layout.relationships.visible
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-gray-500 hover:text-orange-600 hover:bg-white'
                }`}
              title="人物关系"
            >
              <Users className="w-4 h-4" />
            </button>
            <button
              onClick={() => toggleComponent('documents')}
              className={`p-2 rounded-md transition-all duration-200 ${layout.documents.visible
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-gray-500 hover:text-orange-600 hover:bg-white'
                }`}
              title="文档管理"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={() => toggleComponent('processes')}
              className={`p-2 rounded-md transition-all duration-200 ${layout.processes.visible
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-gray-500 hover:text-orange-600 hover:bg-white'
                }`}
              title="流程模板"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => toggleComponent('aiAssistant')}
              className={`p-2 rounded-md transition-all duration-200 ${layout.aiAssistant.visible
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-gray-500 hover:text-orange-600 hover:bg-white'
                }`}
              title="AI助手"
            >
              <Bot className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 主工作区域 */}
        <div className="flex-1 relative">
          {renderComponentGrid()}
        </div>

        {/* AI助手面板 - 右侧固定宽度 */}
        {layout.aiAssistant.visible && (
          <div className="w-96 border-l border-gray-200 bg-white">
            <AIAssistantPanel
              isVisible={layout.aiAssistant.visible}
              onToggle={() => toggleComponent('aiAssistant')}
              onCreateNode={handleAICreateNode}
              currentContext={{
                selectedNodes: [],
                selectedConnections: [],
                canvasState: { nodes, connections }
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default LegalWorkspaceDashboard
