import React, { useState } from 'react'
import {
  FileText,
  MessageSquare,
  Video,
  Clock,
  Users,
  Plus,
  Save,
  Download,
  Settings,
  X,
  PanelLeftClose,
  PanelRightClose,


  Layers,
  LayoutTemplate
} from 'lucide-react'
import { LegalPlaitBoard as PlaitBoard } from './PlaitBoard'
import { LegalNode } from '../utils/legalNodeUtils'
import { cn } from '../lib/utils'
import AIAssistant from './AIAssistant'
import { LegalNodeData } from '../types/legal-nodes'
import { useWorkspaceStore } from '../stores/workspaceStore'

const LegalWorkspace: React.FC = () => {
  // Zustand状态管理
  const {
    nodes,
    connections,

    templates,
    activeTemplateId,

    addNode,
    updateNode,
    deleteNode,
    setSelectedNode,
    loadTemplate,
    exportWorkspace,
    importWorkspace,
  } = useWorkspaceStore()

  // 本地UI状态
  const [showNodePalette, setShowNodePalette] = useState(true)
  const [showInspector, setShowInspector] = useState(false)
  const [showTemplatePanel, setShowTemplatePanel] = useState(false)
  const [selectedNode, setSelectedNodeLocal] = useState<LegalNodeData | null>(null)
  const [showAIDialog, setShowAIDialog] = useState(false)

  const handleNodeCreate = (node: LegalNode) => {
    // 转换为LegalNodeData格式并添加到store
    const nodeData: Omit<LegalNodeData, 'id' | 'createdAt' | 'updatedAt'> = {
      type: node.nodeType,
      title: node.title,
      description: node.description,
      status: node.status as any,
      caseId: 'CASE-2024-001'
    }
    addNode(nodeData)
  }

  const handleNodeUpdate = (node: LegalNode) => {
    // 更新节点到store
    updateNode(node.id, {
      title: node.title,
      description: node.description,
      status: node.status as any
    })
  }

  const handleNodeDelete = (nodeId: string) => {
    deleteNode(nodeId)
  }

  // 处理节点双击事件，打开AI对话
  const handleNodeDoubleClick = (node: LegalNodeData) => {
    setSelectedNodeLocal(node)
    setSelectedNode(node.id)
    setShowAIDialog(true)
  }

  // 关闭AI对话
  const handleCloseAIDialog = () => {
    setShowAIDialog(false)
    setSelectedNodeLocal(null)
    setSelectedNode(undefined)
  }

  // 处理节点更新
  const handleAINodeUpdate = (updatedNode: LegalNodeData) => {
    updateNode(updatedNode.id, updatedNode)
  }

  // 处理模板加载
  const handleLoadTemplate = (templateId: string) => {
    loadTemplate(templateId)
    setShowTemplatePanel(false)
  }

  // 处理工作台导出
  const handleExportWorkspace = () => {
    const data = exportWorkspace()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `workspace-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 处理工作台导入
  const handleImportWorkspace = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const data = e.target?.result as string
          importWorkspace(data)
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }



  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 工具栏 */}
      <div className="h-16 bg-card border-b border-border flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-foreground">
            法律智能工作台
          </h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            案件: CASE-2024-001 - 商事仲裁案件
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              showNodePalette
                ? "bg-primary text-primary-foreground"
                : "bg-background border border-border hover:bg-muted"
            )}
            onClick={() => setShowNodePalette(!showNodePalette)}
          >
            {showNodePalette ? <PanelLeftClose size={16} /> : <Plus size={16} />}
            节点面板
          </button>

          <button
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              showTemplatePanel
                ? "bg-primary text-primary-foreground"
                : "bg-background border border-border hover:bg-muted"
            )}
            onClick={() => setShowTemplatePanel(!showTemplatePanel)}
          >
            <LayoutTemplate size={16} />
            模板库
          </button>

          <div className="h-6 w-px bg-border mx-2" />

          <button
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-background border border-border hover:bg-muted transition-colors"
            onClick={() => {
              // 自动保存到localStorage（通过Zustand persist中间件）
              console.log('工作台已自动保存')
            }}
          >
            <Save size={16} />
            保存
          </button>

          <button
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-background border border-border hover:bg-muted transition-colors"
            onClick={handleExportWorkspace}
          >
            <Download size={16} />
            导出
          </button>

          <button
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-background border border-border hover:bg-muted transition-colors"
            onClick={handleImportWorkspace}
          >
            <Layers size={16} />
            导入
          </button>

          <div className="h-6 w-px bg-border mx-2" />

          <button
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              showInspector
                ? "bg-primary text-primary-foreground"
                : "bg-background border border-border hover:bg-muted"
            )}
            onClick={() => setShowInspector(!showInspector)}
          >
            {showInspector ? <PanelRightClose size={16} /> : <Settings size={16} />}
            属性面板
          </button>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧面板 */}
        {(showNodePalette || showTemplatePanel) && (
          <div className="w-80 bg-card border-r border-border flex flex-col">
            {/* 面板标签 */}
            <div className="flex border-b border-border">
              {showNodePalette && (
                <button
                  className={cn(
                    "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                    !showTemplatePanel
                      ? "bg-background text-foreground border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => {
                    setShowNodePalette(true)
                    setShowTemplatePanel(false)
                  }}
                >
                  节点工具箱
                </button>
              )}
              {showTemplatePanel && (
                <button
                  className={cn(
                    "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                    showTemplatePanel
                      ? "bg-background text-foreground border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => {
                    setShowTemplatePanel(true)
                    setShowNodePalette(false)
                  }}
                >
                  工作流模板
                </button>
              )}
              <button
                className="p-3 hover:bg-muted transition-colors"
                onClick={() => {
                  setShowNodePalette(false)
                  setShowTemplatePanel(false)
                }}
              >
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>

            {/* 面板内容 */}
            <div className="flex-1 overflow-auto p-4">
              {showNodePalette && !showTemplatePanel && <NodePalette />}
              {showTemplatePanel && <TemplatePanel onLoadTemplate={handleLoadTemplate} />}
            </div>
          </div>
        )}

        {/* 主画布区域 */}
        <div className="flex-1 relative">
          <PlaitBoard
            className="w-full h-full"
            onNodeCreate={handleNodeCreate}
            onNodeUpdate={handleNodeUpdate}
            onNodeDelete={handleNodeDelete}
            onNodeDoubleClick={handleNodeDoubleClick}
          />

          {/* 节点统计 */}
          <div className="absolute top-4 right-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg px-4 py-3 shadow-sm">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-success rounded-full"></div>
                <span className="text-foreground font-medium">节点: {nodes.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-foreground font-medium">连接: {connections.length}</span>
              </div>
              {activeTemplateId && (
                <div className="flex items-center gap-2">
                  <LayoutTemplate size={12} className="text-primary" />
                  <span className="text-xs text-muted-foreground">
                    {templates.find(t => t.id === activeTemplateId)?.name}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* AI助手提示 */}
          <div className="absolute bottom-4 right-4 bg-primary/90 backdrop-blur-sm text-primary-foreground rounded-lg px-4 py-3 shadow-lg max-w-xs">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare size={16} />
              <span className="font-medium text-sm">AI助手已就绪</span>
            </div>
            <p className="text-xs opacity-90">
              双击任意节点开启AI对话，获得智能法律建议和协助
            </p>
          </div>
        </div>

        {/* 右侧属性面板 */}
        {showInspector && (
          <div className="w-80 bg-card border-l border-border">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-foreground">属性面板</h3>
              <button
                className="p-1 hover:bg-muted rounded-md transition-colors"
                onClick={() => setShowInspector(false)}
              >
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>

            <div className="p-4">
              <div className="text-center text-muted-foreground py-8">
                <Settings size={32} className="mx-auto mb-2 opacity-50" />
                <p>选择一个节点查看属性</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI助手对话框 */}
      {selectedNode && (
        <AIAssistant
          node={selectedNode}
          isOpen={showAIDialog}
          onClose={handleCloseAIDialog}
          onNodeUpdate={handleAINodeUpdate}
        />
      )}
    </div>
  )
}

// 节点面板组件
const NodePalette: React.FC = () => {
  const nodeTypes = [
    {
      type: 'document',
      icon: FileText,
      title: '法律文书',
      description: '创建各类法律文书',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-l-blue-500'
    },
    {
      type: 'ai-chat',
      icon: MessageSquare,
      title: 'AI 法律助手',
      description: '智能法律咨询',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-l-green-500'
    },
    {
      type: 'hearing',
      status: 'pending' as any,
      icon: Video,
      title: '庭审环节',
      description: '庭审准备和记录',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-l-red-500'
    },
    {
      type: 'timeline',
      icon: Clock,
      title: '时间节点',
      description: '重要时间管理',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-l-purple-500'
    },
    {
      type: 'collaboration',
      icon: Users,
      title: '协作讨论',
      description: '多方协作沟通',
      color: 'text-primary',
      bgColor: 'bg-primary/5',
      borderColor: 'border-l-primary'
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
          核心节点类型
        </h4>
        <div className="space-y-2">
          {nodeTypes.map(nodeType => {
            const Icon = nodeType.icon
            return (
              <div
                key={nodeType.type}
                className={cn(
                  "flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer transition-all duration-200",
                  "hover:bg-muted hover:translate-x-1 hover:shadow-sm",
                  nodeType.bgColor,
                  nodeType.borderColor,
                  "border-l-4"
                )}
                onClick={() => {
                  console.log('创建节点:', nodeType.type)
                  // TODO: 实际创建节点的逻辑
                }}
              >
                <Icon size={20} className={nodeType.color} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-foreground truncate">
                    {nodeType.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {nodeType.description}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 使用说明 */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <h5 className="text-sm font-medium text-foreground">💡 使用说明</h5>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• 点击节点类型在画布中创建新节点</p>
          <p>• 拖拽节点可以移动位置</p>
          <p>• 连线展示工作流程关系</p>
          <p>• 基于 Plait 框架的真实白板</p>
        </div>
      </div>
    </div>
  )
}

// 模板面板组件
const TemplatePanel: React.FC<{ onLoadTemplate: (templateId: string) => void }> = ({ onLoadTemplate }) => {
  const { templates } = useWorkspaceStore()

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'arbitration':
        return <Video size={20} className="text-blue-600" />
      case 'contract':
        return <FileText size={20} className="text-green-600" />
      case 'ip':
        return <Users size={20} className="text-purple-600" />
      case 'litigation':
        return <MessageSquare size={20} className="text-red-600" />
      default:
        return <LayoutTemplate size={20} className="text-gray-600" />
    }
  }

  const getCategoryName = (category: string) => {
    const names = {
      'arbitration': '商事仲裁',
      'contract': '合同纠纷',
      'ip': '知识产权',
      'litigation': '诉讼案件',
      'custom': '自定义'
    }
    return (names as any)[category] || category
  }

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple':
        return 'text-green-600 bg-green-50'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50'
      case 'complex':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getComplexityText = (complexity: string) => {
    const texts = {
      'simple': '简单',
      'medium': '中等',
      'complex': '复杂'
    }
    return (texts as any)[complexity] || complexity
  }

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
          工作流模板库
        </h4>
        <p className="text-xs text-muted-foreground mb-4">
          选择预定义的法律工作流程模板，快速开始您的案件处理
        </p>
      </div>

      <div className="space-y-4">
        {templates.map(template => (
          <div
            key={template.id}
            className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-all duration-200 cursor-pointer"
            onClick={() => onLoadTemplate(template.id)}
          >
            <div className="flex items-start gap-3 mb-3">
              {getCategoryIcon(template.category)}
              <div className="flex-1 min-w-0">
                <h5 className="font-medium text-sm text-foreground truncate">
                  {template.name}
                </h5>
                <p className="text-xs text-muted-foreground mt-1">
                  {template.description}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">
                  {getCategoryName(template.category)}
                </span>
                <span className={cn(
                  "px-2 py-1 rounded-full font-medium",
                  getComplexityColor(template.complexity)
                )}>
                  {getComplexityText(template.complexity)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock size={12} />
                <span>{template.estimatedDuration}天</span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                <span>{template.nodes.length} 个节点</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <div className="w-1.5 h-1.5 bg-success rounded-full"></div>
                <span>{template.connections.length} 个连接</span>
              </div>
            </div>

            {template.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {template.tags.slice(0, 3).map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded"
                  >
                    {tag}
                  </span>
                ))}
                {template.tags.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{template.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 使用说明 */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <h5 className="text-sm font-medium text-foreground">💡 使用说明</h5>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• 点击模板卡片加载预定义的工作流程</p>
          <p>• 加载后可以根据具体案件调整节点和连接</p>
          <p>• 支持保存自定义模板供团队使用</p>
          <p>• 模板会自动设置合理的时间节点</p>
        </div>
      </div>
    </div>
  )
}

export default LegalWorkspace
