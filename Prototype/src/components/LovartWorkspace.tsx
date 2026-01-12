import React, { useState } from 'react'
import { cn } from '../lib/utils'
import PlaitBoard from './PlaitBoard'
import AILegalAdvisor from './AILegalAdvisor'
import { useWorkspaceStore } from '../stores/workspaceStore'
import {
  Layout,
  Maximize2,
  Minimize2,
  Download,
  Upload,
  Settings,
  Layers,
  Zap,
  Users,
  Clock,
  CheckCircle,
  FileText,
  MessageSquare,
  Video,
  File,
  PanelLeftClose,
  PanelRightClose,
  X
} from 'lucide-react'

const LovartWorkspace: React.FC = () => {
  // Zustand状态管理
  const {
    nodes,
    connections,
    selectedNodeId,
    templates,
    addNode,
    loadTemplate,
    exportWorkspace,
    importWorkspace
  } = useWorkspaceStore()

  // 本地UI状态
  const [showLeftPanel, setShowLeftPanel] = useState(true)
  const [showRightPanel, setShowRightPanel] = useState(true)
  const [showTemplatePanel, setShowTemplatePanel] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // 创建新节点
  const handleCreateNode = (type: string) => {
    const nodeTypes: Record<string, { title: string; description: string }> = {
      'hearing-preparation': { title: '庭审准备', description: '证据整理、争议焦点梳理' },
      'ai-assistant': { title: 'AI法律助手', description: '智能分析、文书生成' },
      'hearing-process': { title: '庭审进行', description: '实时庭审、记录管理' },
      'evidence-analysis': { title: '证据分析', description: 'AI辅助证据审查' },
      'decision-draft': { title: '裁决起草', description: 'AI辅助裁决书生成' }
    }

    const config = nodeTypes[type] || nodeTypes['hearing-preparation']

    addNode({
      type: type as any, // Cast to any or LegalNodeType if imported
      title: config.title,
      description: config.description,
      status: 'pending'
    })
  }

  // 加载模板
  const handleLoadTemplate = (templateId: string) => {
    loadTemplate(templateId)
    setShowTemplatePanel(false)
  }

  // 导出工作区
  const handleExport = () => {
    const data = exportWorkspace()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `legal-workspace-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 导入工作区
  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target?.result as string)
            importWorkspace(data)
          } catch (error) {
            console.error('导入失败:', error)
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  return (
    <div className={cn(
      "h-screen bg-gray-50 flex flex-col",
      isFullscreen && "fixed inset-0 z-50"
    )}>
      {/* 顶部工具栏 */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
              <Layout size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">AI法律工作台</h1>
              <p className="text-xs text-gray-500">Lovart风格 • 分离式交互</p>
            </div>
          </div>

          <div className="h-6 w-px bg-gray-200" />

          {/* 快速操作 */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowTemplatePanel(!showTemplatePanel)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <File size={16} />
              模板
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Download size={16} />
              导出
            </button>
            <button
              onClick={handleImport}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Upload size={16} />
              导入
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 工作区统计 */}
          <div className="flex items-center gap-4 text-sm text-gray-600 mr-4">
            <div className="flex items-center gap-1">
              <Layers size={14} />
              <span>{nodes.length} 节点</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap size={14} />
              <span>{connections.length} 连接</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle size={14} />
              <span>{nodes.filter(n => n.status === 'completed').length} 完成</span>
            </div>
          </div>

          {/* 视图控制 */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowLeftPanel(!showLeftPanel)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                showLeftPanel ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:bg-gray-100"
              )}
            >
              <PanelLeftClose size={16} />
            </button>
            <button
              onClick={() => setShowRightPanel(!showRightPanel)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                showRightPanel ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:bg-gray-100"
              )}
            >
              <PanelRightClose size={16} />
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 模板面板 */}
      {showTemplatePanel && (
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">工作流模板</h3>
            <button
              onClick={() => setShowTemplatePanel(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleLoadTemplate(template.id)}
                className="p-3 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-left"
              >
                <div className="font-medium text-sm text-gray-900 mb-1">{template.name}</div>
                <div className="text-xs text-gray-600">{template.description}</div>
                <div className="text-xs text-gray-500 mt-2">
                  {template.nodes.length} 节点 • {template.connections.length} 连接
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 主要内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧节点面板 */}
        {showLeftPanel && (
          <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3">节点工具箱</h3>
              <div className="space-y-2">
                {[
                  { type: 'hearing-preparation', icon: FileText, label: '庭审准备', color: 'text-blue-500', desc: '证据整理、争议焦点' },
                  { type: 'ai-assistant', icon: MessageSquare, label: 'AI法律助手', color: 'text-green-500', desc: '智能分析、文书生成' },
                  { type: 'hearing-process', icon: Video, label: '庭审进行', color: 'text-red-500', desc: '实时庭审、记录管理' },
                  { type: 'evidence-analysis', icon: Users, label: '证据分析', color: 'text-orange-500', desc: 'AI辅助证据审查' },
                  { type: 'decision-draft', icon: Clock, label: '裁决起草', color: 'text-purple-500', desc: 'AI辅助裁决书生成' }
                ].map((nodeType) => (
                  <button
                    key={nodeType.type}
                    onClick={() => handleCreateNode(nodeType.type)}
                    className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-left"
                  >
                    <nodeType.icon size={18} className={nodeType.color} />
                    <div>
                      <div className="font-medium text-sm text-gray-900">{nodeType.label}</div>
                      <div className="text-xs text-gray-600">{nodeType.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 工作区信息 */}
            <div className="p-4 flex-1">
              <h4 className="font-medium text-gray-900 mb-3">工作区概览</h4>
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm font-medium text-gray-900 mb-2">节点状态</div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">待处理</span>
                      <span className="font-medium">{nodes.filter(n => n.status === 'pending').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">进行中</span>
                      <span className="font-medium text-blue-600">{nodes.filter(n => n.status === 'in-progress').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">已完成</span>
                      <span className="font-medium text-green-600">{nodes.filter(n => n.status === 'completed').length}</span>
                    </div>
                  </div>
                </div>

                {selectedNodeId && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                    <div className="text-sm font-medium text-primary mb-1">当前选中</div>
                    <div className="text-xs text-gray-700">
                      {nodes.find(n => n.id === selectedNodeId)?.title || '未知节点'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 中间画布区域 */}
        <div className={cn(
          "flex-1 relative bg-gray-50",
          !showLeftPanel && !showRightPanel && "mx-4"
        )}>
          <PlaitBoard />
        </div>

        {/* 右侧AI对话面板 */}
        {showRightPanel && (
          <div className="w-96 bg-white">
            <AILegalAdvisor />
          </div>
        )}
      </div>
    </div>
  )
}

export default LovartWorkspace
