
/**
 * LegalMind 法律工作台 - 流程模板管理组件
 * 
 * 提供庭审流程模板的创建、编辑和应用功能
 */

import React, { useState } from 'react';
import {
  Settings,
  Play,
  Pause,
  Square,
  CheckCircle,
  Circle,
  Edit3,
  Copy,
  Users,
  FileText,
  Calendar
} from 'lucide-react'

// ==================== 类型定义 ====================

interface ProcessStep {
  id: string
  title: string
  description: string
  type: 'preparation' | 'hearing' | 'deliberation' | 'documentation' | 'notification' | 'other'
  status: 'pending' | 'in-progress' | 'completed' | 'skipped' | 'failed'
  estimatedDuration: number // 分钟
  actualDuration?: number
  assignedTo?: string[]
  requiredDocuments?: string[]
  dependencies?: string[] // 依赖的步骤ID
  isOptional: boolean
  isParallel: boolean // 是否可以并行执行
  metadata?: any
}

interface ProcessTemplate {
  id: string
  name: string
  description: string
  type: 'hearing-prep' | 'hearing' | 'deliberation' | 'ruling' | 'execution' | 'custom'
  category: 'commercial' | 'labor' | 'construction' | 'intellectual-property' | 'other'
  steps: ProcessStep[]
  totalEstimatedDuration: number
  isPublic: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  createdBy: string
  usageCount: number
  tags: string[]
  metadata?: any
}

interface ProcessExecution {
  id: string
  templateId: string
  templateName: string
  status: 'not-started' | 'in-progress' | 'paused' | 'completed' | 'cancelled'
  currentStepId?: string
  startedAt?: Date
  completedAt?: Date
  totalDuration?: number
  progress: {
    totalSteps: number
    completedSteps: number
    percentage: number
  }
  stepStatuses: Record<string, ProcessStep['status']>
  executedBy: string
  notes?: string
  metadata?: any
}

interface ProcessTemplateManagerProps {
  templates: ProcessTemplate[]
  executions: ProcessExecution[]
  onTemplateCreate?: (template: Omit<ProcessTemplate, 'id'>) => void
  onTemplateEdit?: (templateId: string, updates: Partial<ProcessTemplate>) => void
  onTemplateDelete?: (templateId: string) => void
  onTemplateExecute?: (templateId: string) => void
  onExecutionUpdate?: (executionId: string, updates: Partial<ProcessExecution>) => void
  className?: string
  readOnly?: boolean
}

// ==================== 流程类型配置 ====================

const PROCESS_TYPES = {
  'hearing-prep': {
    label: '庭审准备',
    icon: <FileText className="w-4 h-4" />,
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50'
  },
  'hearing': {
    label: '庭审进行',
    icon: <Users className="w-4 h-4" />,
    color: 'bg-green-500',
    bgColor: 'bg-green-50'
  },
  'deliberation': {
    label: '合议',
    icon: <Settings className="w-4 h-4" />,
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50'
  },
  'ruling': {
    label: '裁决',
    icon: <CheckCircle className="w-4 h-4" />,
    color: 'bg-red-500',
    bgColor: 'bg-red-50'
  },
  'execution': {
    label: '执行',
    icon: <Play className="w-4 h-4" />,
    color: 'bg-indigo-500',
    bgColor: 'bg-indigo-50'
  },
  'custom': {
    label: '自定义',
    icon: <Settings className="w-4 h-4" />,
    color: 'bg-gray-500',
    bgColor: 'bg-gray-50'
  }
}

const STEP_TYPES = {
  preparation: { label: '准备工作', icon: <FileText className="w-3 h-3" />, color: 'text-blue-600' },
  hearing: { label: '庭审环节', icon: <Users className="w-3 h-3" />, color: 'text-green-600' },
  deliberation: { label: '合议讨论', icon: <Settings className="w-3 h-3" />, color: 'text-purple-600' },
  documentation: { label: '文档处理', icon: <FileText className="w-3 h-3" />, color: 'text-orange-600' },
  notification: { label: '通知送达', icon: <Calendar className="w-3 h-3" />, color: 'text-yellow-600' },
  other: { label: '其他', icon: <Circle className="w-3 h-3" />, color: 'text-gray-600' }
}



// ==================== 主组件 ====================

export const ProcessTemplateManager: React.FC<ProcessTemplateManagerProps> = ({
  templates,
  executions,
  // onTemplateCreate,
  onTemplateEdit,
  // onTemplateDelete,
  onTemplateExecute,
  onExecutionUpdate,
  className = '',
  readOnly = false
}) => {
  const [activeTab, setActiveTab] = useState<'templates' | 'executions'>('templates')
  const [selectedTemplate, setSelectedTemplate] = useState<ProcessTemplate | null>(null)
  const [selectedExecution, setSelectedExecution] = useState<ProcessExecution | null>(null)


  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')

  // ==================== 过滤和排序 ====================

  const filteredTemplates = React.useMemo(() => {
    return templates.filter(template => {
      const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = selectedType === 'all' || template.type === selectedType
      return matchesSearch && matchesType
    })
  }, [templates, searchTerm, selectedType])

  const activeExecutions = executions.filter(exec =>
    exec.status === 'in-progress' || exec.status === 'paused'
  )

  // ==================== 事件处理 ====================

  const handleTemplateSelect = (template: ProcessTemplate) => {
    setSelectedTemplate(template)
    setSelectedExecution(null)
  }

  const handleExecutionSelect = (execution: ProcessExecution) => {
    setSelectedExecution(execution)
    setSelectedTemplate(null)
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} 分钟`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}小时${mins} 分钟` : `${hours} 小时`
  }

  const calculateProgress = (_template: ProcessTemplate, execution?: ProcessExecution) => {
    if (!execution) return 0
    return Math.round((execution.progress.completedSteps / execution.progress.totalSteps) * 100)
  }

  // ==================== 渲染模板网格视图 ====================

  const renderTemplateGridView = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => {
          const processType = PROCESS_TYPES[template.type]
          const isSelected = selectedTemplate?.id === template.id
          const activeExecution = executions.find(exec =>
            exec.templateId === template.id &&
            (exec.status === 'in-progress' || exec.status === 'paused')
          )

          return (
            <div
              key={template.id}
              className={`relative p - 4 border rounded - lg cursor - pointer transition - all hover: shadow - md ${isSelected ? 'ring-2 ring-orange-500 border-orange-200' : 'border-gray-200'
                } ${processType.bgColor} `}
              onClick={() => handleTemplateSelect(template)}
            >
              {/* 模板图标 */}
              <div className={`w - 12 h - 12 rounded - lg flex items - center justify - center mb - 3 ${processType.color} text - white`}>
                {processType.icon}
              </div>

              {/* 模板信息 */}
              <h4 className="font-medium text-gray-900 mb-1">{template.name}</h4>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.description}</p>

              {/* 统计信息 */}
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
                <div>步骤: {template.steps.length}</div>
                <div>时长: {formatDuration(template.totalEstimatedDuration)}</div>
                <div>使用: {template.usageCount}次</div>
                <div>类型: {processType.label}</div>
              </div>

              {/* 执行状态 */}
              {activeExecution && (
                <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-blue-700">执行中</span>
                    <span className="text-blue-600">{calculateProgress(template, activeExecution)}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-1 mt-1">
                    <div
                      className="bg-blue-500 h-1 rounded-full transition-all"
                      style={{ width: `${calculateProgress(template, activeExecution)}% ` }}
                    />
                  </div>
                </div>
              )}

              {/* 标签 */}
              {template.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {template.tags.slice(0, 3).map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      {tag}
                    </span>
                  ))}
                  {template.tags.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      +{template.tags.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {template.isPublic && (
                    <span className="text-xs text-green-600">公开</span>
                  )}
                  {!template.isActive && (
                    <span className="text-xs text-gray-500">已停用</span>
                  )}
                </div>

                {!readOnly && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onTemplateExecute?.(template.id)
                      }}
                      className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                      title="执行模板"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onTemplateEdit?.(template.id, {})
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="编辑模板"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        // 复制模板
                      }}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      title="复制模板"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ==================== 渲染执行列表 ====================

  const renderExecutionList = () => {
    return (
      <div className="space-y-4">
        {executions.map((execution) => {
          const template = templates.find(t => t.id === execution.templateId)
          if (!template) return null

          const processType = PROCESS_TYPES[template.type]
          const isSelected = selectedExecution?.id === execution.id
          const progress = calculateProgress(template, execution)

          return (
            <div
              key={execution.id}
              className={`p - 4 border rounded - lg cursor - pointer transition - all hover: shadow - md ${isSelected ? 'ring-2 ring-orange-500 border-orange-200' : 'border-gray-200'
                } `}
              onClick={() => handleExecutionSelect(execution)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w - 8 h - 8 rounded flex items - center justify - center ${processType.color} text - white`}>
                    {processType.icon}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{execution.templateName}</h4>
                    <p className="text-sm text-gray-600">执行者: {execution.executedBy}</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`inline - flex items - center gap - 1 px - 2 py - 1 rounded - full text - xs ${execution.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                    execution.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                      execution.status === 'completed' ? 'bg-green-100 text-green-700' :
                        execution.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                    } `}>
                    {execution.status === 'in-progress' ? <Play className="w-3 h-3" /> :
                      execution.status === 'paused' ? <Pause className="w-3 h-3" /> :
                        execution.status === 'completed' ? <CheckCircle className="w-3 h-3" /> :
                          execution.status === 'cancelled' ? <Square className="w-3 h-3" /> :
                            <Circle className="w-3 h-3" />}
                    {execution.status === 'in-progress' ? '进行中' :
                      execution.status === 'paused' ? '已暂停' :
                        execution.status === 'completed' ? '已完成' :
                          execution.status === 'cancelled' ? '已取消' : '未开始'}
                  </div>
                </div>
              </div>

              {/* 进度条 */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">
                    进度: {execution.progress.completedSteps} / {execution.progress.totalSteps} 步骤
                  </span>
                  <span className="text-gray-900 font-medium">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h - 2 rounded - full transition - all ${execution.status === 'completed' ? 'bg-green-500' :
                      execution.status === 'in-progress' ? 'bg-blue-500' :
                        execution.status === 'paused' ? 'bg-yellow-500' :
                          'bg-gray-400'
                      } `}
                    style={{ width: `${progress}% ` }}
                  />
                </div>
              </div>

              {/* 时间信息 */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-4">
                  {execution.startedAt && (
                    <span>开始: {execution.startedAt.toLocaleDateString()}</span>
                  )}
                  {execution.completedAt && (
                    <span>完成: {execution.completedAt.toLocaleDateString()}</span>
                  )}
                </div>
                {execution.totalDuration && (
                  <span>用时: {formatDuration(execution.totalDuration)}</span>
                )}
              </div>

              {/* 当前步骤 */}
              {execution.currentStepId && execution.status === 'in-progress' && (
                <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                  <div className="text-xs text-blue-700">
                    当前步骤: {template.steps.find(s => s.id === execution.currentStepId)?.title}
                  </div>
                </div>
              )}

              {/* 操作按钮 */}
              {!readOnly && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                  {execution.status === 'in-progress' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onExecutionUpdate?.(execution.id, { status: 'paused' })
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-yellow-600 hover:text-yellow-700 transition-colors"
                    >
                      <Pause className="w-3 h-3" />
                      暂停
                    </button>
                  )}
                  {execution.status === 'paused' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onExecutionUpdate?.(execution.id, { status: 'in-progress' })
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <Play className="w-3 h-3" />
                      继续
                    </button>
                  )}
                  {(execution.status === 'in-progress' || execution.status === 'paused') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onExecutionUpdate?.(execution.id, { status: 'cancelled' })
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:text-red-700 transition-colors"
                    >
                      <Square className="w-3 h-3" />
                      停止
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // ==================== 渲染 ====================

  return (
    <div className={`bg - white rounded - lg border border - gray - 200 ${className} `}>
      {/* 头部标签栏 */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          <button
            className={`px - 6 py - 3 text - sm font - medium border - b - 2 transition - colors ${activeTab === 'templates'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              } `}
            onClick={() => setActiveTab('templates')}
          >
            流程模板 ({templates.length})
          </button>
          <button
            className={`px - 6 py - 3 text - sm font - medium border - b - 2 transition - colors ${activeTab === 'executions'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              } `}
            onClick={() => setActiveTab('executions')}
          >
            执行记录 ({executions.length})
            {activeExecutions.length > 0 && (
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                {activeExecutions.length} 进行中
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* 工具栏 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* 搜索框 */}
            <div className="relative">
              <input
                type="text"
                placeholder={activeTab === 'templates' ? '搜索模板...' : '搜索执行记录...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 pl-3 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* 类型过滤 */}
            {activeTab === 'templates' && (
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">全部类型</option>
                {Object.entries(PROCESS_TYPES).map(([key, type]) => (
                  <option key={key} value={key}>{type.label}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* 创建模板按钮 */}

          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-4">
        {activeTab === 'templates' && (
          <>
            {filteredTemplates.length > 0 ? (
              renderTemplateGridView()
            ) : (
              <div className="text-center py-12">
                <Settings className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  {templates.length === 0 ? '暂无流程模板' : '没有找到匹配的模板'}
                </h4>
                <p className="text-gray-500 mb-4">
                  {templates.length === 0 ? '创建您的第一个流程模板' : '尝试调整搜索条件'}
                </p>

              </div>
            )}
          </>
        )}

        {activeTab === 'executions' && (
          <>
            {executions.length > 0 ? (
              renderExecutionList()
            ) : (
              <div className="text-center py-12">
                <Play className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">暂无执行记录</h4>
                <p className="text-gray-500">执行流程模板后，记录将显示在这里</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* 详情面板 */}
      {selectedTemplate && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-medium text-gray-900">{selectedTemplate.name}</h4>
              <p className="text-sm text-gray-600">{selectedTemplate.description}</p>
            </div>
            <button
              onClick={() => setSelectedTemplate(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <span className="text-gray-500">类型：</span>
              <span className="text-gray-900">{PROCESS_TYPES[selectedTemplate.type].label}</span>
            </div>
            <div>
              <span className="text-gray-500">步骤数：</span>
              <span className="text-gray-900">{selectedTemplate.steps.length}</span>
            </div>
            <div>
              <span className="text-gray-500">预计时长：</span>
              <span className="text-gray-900">{formatDuration(selectedTemplate.totalEstimatedDuration)}</span>
            </div>
            <div>
              <span className="text-gray-500">使用次数：</span>
              <span className="text-gray-900">{selectedTemplate.usageCount}</span>
            </div>
          </div>

          {/* 步骤列表 */}
          <div className="max-h-40 overflow-y-auto">
            <h5 className="font-medium text-gray-900 mb-2">流程步骤</h5>
            <div className="space-y-2">
              {selectedTemplate.steps.map((step, index) => {
                const stepType = STEP_TYPES[step.type]
                return (
                  <div key={step.id} className="flex items-center gap-3 p-2 bg-white rounded border">
                    <span className="text-xs text-gray-500 w-6">{index + 1}</span>
                    <div className={`${stepType.color} `}>
                      {stepType.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{step.title}</div>
                      <div className="text-xs text-gray-500">{formatDuration(step.estimatedDuration)}</div>
                    </div>
                    {step.isOptional && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">可选</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProcessTemplateManager
