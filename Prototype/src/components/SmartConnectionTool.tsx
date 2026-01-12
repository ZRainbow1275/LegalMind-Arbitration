/**
 * LegalMind 法律工作台 - 智能连接工具
 * 
 * 提供拖拽式连接创建、智能连接建议和连接类型识别
 */

import React, { useState, useRef, useEffect } from 'react'
import { Link, Zap, ArrowRight, Users, FileText, Clock } from 'lucide-react'

// ==================== 类型定义 ====================

interface ConnectionSuggestion {
  id: string
  type: 'workflow' | 'reference' | 'collaboration' | 'dependency' | 'timeline'
  label: string
  description: string
  confidence: number
  icon: React.ReactNode
}

interface SmartConnectionToolProps {
  isActive: boolean
  sourceNodeId?: string
  targetNodeId?: string
  onConnectionCreate?: (sourceId: string, targetId: string, type: string) => void
  onCancel?: () => void
  mousePosition?: { x: number; y: number }
}

// ==================== 连接类型定义 ====================

const CONNECTION_TYPES = [
  {
    type: 'workflow',
    label: '工作流程',
    description: '表示工作流程的先后顺序',
    icon: <ArrowRight className="w-4 h-4" />,
    color: 'blue',
    patterns: ['流程', '步骤', '顺序', '接下来', '然后']
  },
  {
    type: 'reference',
    label: '引用关系',
    description: '文档或信息的引用关系',
    icon: <FileText className="w-4 h-4" />,
    color: 'green',
    patterns: ['引用', '参考', '依据', '证据', '材料']
  },
  {
    type: 'collaboration',
    label: '协作关系',
    description: '人员之间的协作关系',
    icon: <Users className="w-4 h-4" />,
    color: 'purple',
    patterns: ['协作', '合作', '配合', '团队', '共同']
  },
  {
    type: 'dependency',
    label: '依赖关系',
    description: '任务或资源的依赖关系',
    icon: <Link className="w-4 h-4" />,
    color: 'orange',
    patterns: ['依赖', '需要', '基于', '前提', '条件']
  },
  {
    type: 'timeline',
    label: '时间关系',
    description: '时间上的先后关系',
    icon: <Clock className="w-4 h-4" />,
    color: 'red',
    patterns: ['时间', '日期', '期限', '截止', '开始']
  }
]

// ==================== 主组件 ====================

export const SmartConnectionTool: React.FC<SmartConnectionToolProps> = ({
  isActive,
  sourceNodeId,
  targetNodeId,
  onConnectionCreate,
  onCancel,
  mousePosition
}) => {
  const [suggestions, setSuggestions] = useState<ConnectionSuggestion[]>([])
  const [showTypeSelector, setShowTypeSelector] = useState(false)
  const toolRef = useRef<HTMLDivElement>(null)

  // ==================== 智能建议生成 ====================

  useEffect(() => {
    if (sourceNodeId && targetNodeId) {
      generateConnectionSuggestions(sourceNodeId, targetNodeId)
      setShowTypeSelector(true)
    } else {
      setSuggestions([])
      setShowTypeSelector(false)
    }
  }, [sourceNodeId, targetNodeId])

  const generateConnectionSuggestions = (sourceId: string, targetId: string) => {
    // 模拟智能分析，根据节点类型和内容生成连接建议
    const mockSuggestions: ConnectionSuggestion[] = []

    // 基于节点类型的智能建议
    if (sourceId.includes('case') && targetId.includes('person')) {
      mockSuggestions.push({
        id: '1',
        type: 'reference',
        label: '案件当事人',
        description: '此人员是该案件的当事人',
        confidence: 0.9,
        icon: <Users className="w-4 h-4" />
      })
    }

    if (sourceId.includes('document') && targetId.includes('case')) {
      mockSuggestions.push({
        id: '2',
        type: 'reference',
        label: '案件证据',
        description: '此文档是案件的相关证据',
        confidence: 0.85,
        icon: <FileText className="w-4 h-4" />
      })
    }

    if (sourceId.includes('process') && targetId.includes('timeline')) {
      mockSuggestions.push({
        id: '3',
        type: 'workflow',
        label: '流程时间',
        description: '流程步骤对应的时间节点',
        confidence: 0.8,
        icon: <ArrowRight className="w-4 h-4" />
      })
    }

    // 添加通用建议
    CONNECTION_TYPES.forEach((type, index) => {
      if (!mockSuggestions.find(s => s.type === type.type)) {
        mockSuggestions.push({
          id: `general-${index}`,
          type: type.type as any,
          label: type.label,
          description: type.description,
          confidence: 0.6,
          icon: type.icon
        })
      }
    })

    // 按置信度排序
    mockSuggestions.sort((a, b) => b.confidence - a.confidence)
    setSuggestions(mockSuggestions.slice(0, 5)) // 只显示前5个建议
  }

  // ==================== 事件处理 ====================

  const handleCreateConnection = (type: string) => {
    if (sourceNodeId && targetNodeId) {
      onConnectionCreate?.(sourceNodeId, targetNodeId, type)
      setShowTypeSelector(false)
    }
  }

  const handleCancel = () => {
    onCancel?.()
    setShowTypeSelector(false)
  }

  // ==================== 渲染连接类型选择器 ====================

  const renderTypeSelector = () => {
    if (!showTypeSelector || !mousePosition) return null

    return (
      <div
        className="fixed bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50"
        style={{
          left: mousePosition.x + 10,
          top: mousePosition.y - 100,
          minWidth: '280px'
        }}
        ref={toolRef}
      >
        <div className="mb-3">
          <h4 className="font-medium text-gray-900 mb-1">选择连接类型</h4>
          <p className="text-xs text-gray-500">
            从 {sourceNodeId} 连接到 {targetNodeId}
          </p>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              onClick={() => handleCreateConnection(suggestion.type)}
              className="w-full flex items-start gap-3 p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getConnectionTypeColor(suggestion.type)
                }`}>
                {suggestion.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900 text-sm">
                    {suggestion.label}
                  </span>
                  {suggestion.confidence > 0.8 && (
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-yellow-500" />
                      <span className="text-xs text-yellow-600">推荐</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">
                  {suggestion.description}
                </p>
                <div className="mt-1">
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div
                      className="bg-blue-500 h-1 rounded-full transition-all"
                      style={{ width: `${suggestion.confidence * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            取消
          </button>

          <div className="text-xs text-gray-400">
            AI智能建议
          </div>
        </div>
      </div>
    )
  }

  // ==================== 渲染连接预览线 ====================

  const renderConnectionPreview = () => {
    if (!isActive || !sourceNodeId || !mousePosition) return null

    return (
      <div className="fixed inset-0 pointer-events-none z-40">
        <svg className="w-full h-full">
          <defs>
            <marker
              id="arrowhead-preview"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#f97316"
                opacity="0.7"
              />
            </marker>
          </defs>

          <line
            x1="100" // 这里应该是源节点的实际位置
            y1="100"
            x2={mousePosition.x}
            y2={mousePosition.y}
            stroke="#f97316"
            strokeWidth="2"
            strokeDasharray="5,5"
            opacity="0.7"
            markerEnd="url(#arrowhead-preview)"
          />
        </svg>
      </div>
    )
  }

  // ==================== 工具函数 ====================

  const getConnectionTypeColor = (type: string) => {
    const colorMap = {
      workflow: 'bg-blue-100 text-blue-600',
      reference: 'bg-green-100 text-green-600',
      collaboration: 'bg-purple-100 text-purple-600',
      dependency: 'bg-orange-100 text-orange-600',
      timeline: 'bg-red-100 text-red-600'
    }
    return colorMap[type as keyof typeof colorMap] || 'bg-gray-100 text-gray-600'
  }

  // ==================== 渲染 ====================

  if (!isActive) return null

  return (
    <>
      {renderConnectionPreview()}
      {renderTypeSelector()}
    </>
  )
}

export default SmartConnectionTool
