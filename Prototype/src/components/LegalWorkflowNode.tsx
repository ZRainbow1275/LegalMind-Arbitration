
import React from 'react'
import {
  FileText,
  MessageSquare,
  Video,
  Clock,
  Users,
  CheckCircle,
  Loader2,


  MoreHorizontal,
  Edit3,
  Eye
} from 'lucide-react'
import { cn } from '../lib/utils'
import { LegalNodeData } from '../types/legal-nodes'

interface LegalWorkflowNodeProps {
  node: LegalNodeData
  isSelected?: boolean
  isActive?: boolean
  position: { x: number; y: number }
  scale?: number // Add scale prop
  onSelect?: () => void
  onDoubleClick?: () => void
  onDelete?: () => void
  onUpdateNode?: (updates: Partial<LegalNodeData>) => void
  onConnectionStart?: (nodeId: string, connectionPoint: 'input' | 'output') => void
  onConnectionEnd?: (nodeId: string, connectionPoint: 'input' | 'output') => void
  isConnecting?: boolean
  connectionPreview?: { from: string; to?: string; point?: 'input' | 'output' } | null
  className?: string
}

const LegalWorkflowNode: React.FC<LegalWorkflowNodeProps> = ({
  node,
  isSelected = false,
  isActive = false,
  scale = 1, // Default scale

  onSelect,
  onDoubleClick,


  onConnectionStart,
  onConnectionEnd,
  isConnecting = false,
  connectionPreview,
  className
}) => {
  // LOD Levels
  const isHighDetail = scale > 0.7;
  const isLowDetail = scale <= 0.4;

  // 获取节点图标
  const getNodeIcon = () => {
    const iconProps = { size: isLowDetail ? 24 : 18, className: 'text-white' }
    switch (node.type) {
      case 'hearing-preparation':
        return <FileText {...iconProps} />
      case 'ai-assistant':
        return <MessageSquare {...iconProps} />
      case 'hearing-process':
        return <Video {...iconProps} />
      case 'evidence-analysis':
        return <Users {...iconProps} />
      case 'decision-draft':
        return <Clock {...iconProps} />
      default:
        return <FileText {...iconProps} />
    }
  }

  // 获取节点主题色 - 现代化专业配色
  const getNodeTheme = () => {
    const themes = {
      'hearing-preparation': {
        primary: 'bg-gradient-to-br from-blue-500 to-blue-600',
        secondary: 'bg-gradient-to-br from-blue-50 to-blue-100',
        border: 'border-blue-300',
        text: 'text-blue-800',
        glow: 'shadow-xl shadow-blue-200/50',
        ring: 'ring-blue-300'
      },
      'ai-assistant': {
        primary: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
        secondary: 'bg-gradient-to-br from-emerald-50 to-emerald-100',
        border: 'border-emerald-300',
        text: 'text-emerald-800',
        glow: 'shadow-xl shadow-emerald-200/50',
        ring: 'ring-emerald-300'
      },
      'hearing-process': {
        primary: 'bg-gradient-to-br from-amber-500 to-amber-600',
        secondary: 'bg-gradient-to-br from-amber-50 to-amber-100',
        border: 'border-amber-300',
        text: 'text-amber-800',
        glow: 'shadow-xl shadow-amber-200/50',
        ring: 'ring-amber-300'
      },
      'evidence-analysis': {
        primary: 'bg-gradient-to-br from-violet-500 to-violet-600',
        secondary: 'bg-gradient-to-br from-violet-50 to-violet-100',
        border: 'border-violet-300',
        text: 'text-violet-800',
        glow: 'shadow-xl shadow-violet-200/50',
        ring: 'ring-violet-300'
      },
      'decision-draft': {
        primary: 'bg-gradient-to-br from-rose-500 to-rose-600',
        secondary: 'bg-gradient-to-br from-rose-50 to-rose-100',
        border: 'border-rose-300',
        text: 'text-rose-800',
        glow: 'shadow-xl shadow-rose-200/50',
        ring: 'ring-rose-300'
      }
    }
    return (themes as any)[node.type] || themes['hearing-preparation']
  }

  // 获取节点状态
  const getNodeStatus = () => {
    switch (node.status) {
      case 'pending':
        return {
          icon: <Clock size={14} className="text-gray-500" />,
          text: '待处理',
          color: 'text-gray-500',
          bg: 'bg-gray-100',
          indicator: 'bg-gray-400'
        }
      case 'in-progress':
        return {
          icon: <Loader2 size={14} className="text-blue-500 animate-spin" />,
          text: '进行中',
          color: 'text-blue-500',
          bg: 'bg-blue-100',
          indicator: 'bg-blue-400 animate-pulse'
        }
      case 'completed':
        return {
          icon: <CheckCircle size={14} className="text-green-500" />,
          text: '已完成',
          color: 'text-green-500',
          bg: 'bg-green-100',
          indicator: 'bg-green-400'
        }

      default:
        return {
          icon: <Clock size={14} className="text-gray-500" />,
          text: '待处理',
          color: 'text-gray-500',
          bg: 'bg-gray-100',
          indicator: 'bg-gray-400'
        }
    }
  }

  // 获取节点类型显示名称
  const getNodeTypeName = () => {
    const names = {
      'hearing-preparation': '庭审准备',
      'ai-assistant': 'AI法律助手',
      'hearing-process': '庭审进行',
      'evidence-analysis': '证据分析',
      'decision-draft': '裁决起草'
    }
    return (names as any)[node.type] || 'AI助手'
  }

  const theme = getNodeTheme()
  const status = getNodeStatus()

  // Low Detail View
  if (isLowDetail) {
    return (
      <div
        className={cn(
          "relative transition-all duration-300 group",
          isSelected && "z-30",
          isActive && "z-40",
          className
        )}
        style={{
          width: 280,
          height: 160
        }}
      >
        <div
          className={cn(
            "relative w-full h-full rounded-2xl border-2 flex items-center justify-center transition-all duration-500",
            "backdrop-blur-sm shadow-lg",
            theme.secondary,
            theme.border,
            isSelected ? `${theme.glow} ring - 4 ${theme.ring} ring - offset - 2` : ""
          )}
          onClick={onSelect}
          onDoubleClick={onDoubleClick}
        >
          <div className={cn("p-4 rounded-xl", theme.primary)}>
            {getNodeIcon()}
          </div>
          {/* 简单的状态指示点 */}
          <div className={cn("absolute top-2 right-2 w-4 h-4 rounded-full border-2 border-white", status.indicator)} />
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "relative transition-all duration-300 group",
        isSelected && "z-30",
        isActive && "z-40",
        className
      )}
      style={{
        width: 280,
        height: 160
      }}
    >
      {/* 主节点容器 - 现代化专业设计 */}
      <div
        className={cn(
          "relative bg-gradient-to-br from-white to-gray-50 rounded-2xl border-2 transition-all duration-500 h-full",
          "backdrop-blur-sm shadow-2xl",
          isSelected ? `${theme.border} ${theme.glow} shadow - 2xl ring - 4 ${theme.ring} ring - offset - 2` : "border-gray-300",
          // {{ AURA: Modify - 移除animate-pulse，避免节点一直闪烁 }}
          "hover:shadow-2xl hover:scale-110 hover:-translate-y-2 hover:rotate-1",
          "hover:border-opacity-80 hover:from-white hover:to-blue-50"
        )}
        style={{
          boxShadow: isSelected
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.9)'
            : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
      >
        {/* 节点头部 - 可拖拽区域 */}
        <div
          className={cn("flex items-center justify-between p-3 rounded-t-xl cursor-move", theme.primary)}
          title="拖拽移动节点"
        >
          <div className="flex items-center gap-2 pointer-events-none">
            <div className="p-1.5 bg-white/20 rounded-lg">
              {getNodeIcon()}
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">{node.title}</h3>
              {isHighDetail && <p className="text-white/80 text-xs">{getNodeTypeName()}</p>}
            </div>
          </div>

          {isHighDetail && (
            <div className="flex items-center gap-1 pointer-events-auto">
              <button
                className="p-1 hover:bg-white/20 rounded transition-colors pointer-events-auto"
                onClick={(e) => {
                  e.stopPropagation()
                  // 触发右侧AI助手关注此节点
                  onSelect?.()
                }}
                title="AI助手关注此节点"
              >
                <MessageSquare size={14} className="text-white" />
              </button>
              <button
                className="p-1 hover:bg-white/20 rounded transition-colors pointer-events-auto"
                onClick={(e) => {
                  e.stopPropagation()
                  // 打开节点编辑界面
                  onDoubleClick?.()
                }}
                title="编辑节点内容"
              >
                <Edit3 size={14} className="text-white" />
              </button>
            </div>
          )}
        </div>

        {/* 节点内容区域 - 可点击区域 */}
        <div
          className="p-3 space-y-3 flex-1 cursor-pointer"
          onClick={onSelect}
          onDoubleClick={onDoubleClick}
        >
          {/* 节点描述 */}
          {isHighDetail && (
            <div className="text-sm text-gray-700 line-clamp-2">
              {node.description}
            </div>
          )}

          {/* 状态和时间信息 */}
          <div className="flex items-center justify-between">
            <div className={cn("flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium", status.bg)}>
              {status.icon}
              <span className={status.color}>{status.text}</span>
            </div>
            {isHighDetail && (
              <div className="text-xs text-gray-500">
                {new Date(node.updatedAt).toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            )}
          </div>

          {/* 进度指示器（如果是进行中状态） */}
          {isHighDetail && node.status === 'in-progress' && (
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: '60%' }}
              />
            </div>
          )}

          {/* 快速操作按钮 */}
          {isHighDetail && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1">
                <button
                  className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition-colors"
                  title="查看详情"
                >
                  <Eye size={12} />
                </button>
                <button
                  className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDoubleClick?.()
                  }}
                  title="编辑内容"
                >
                  <Edit3 size={12} />
                </button>
              </div>
              <button
                className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition-colors"
                title="更多操作"
              >
                <MoreHorizontal size={12} />
              </button>
            </div>
          )}
        </div>

        {/* 智能连接点 */}
        {/* 输出连接点（右侧） */}
        <div
          className={cn(
            "absolute -right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white border-2 rounded-full transition-all duration-200 cursor-pointer z-20",
            isConnecting && connectionPreview?.from === node.id
              ? "border-green-500 bg-green-100 scale-125"
              : "border-gray-300 hover:border-primary hover:scale-110"
          )}
          onMouseDown={(e) => {
            e.stopPropagation()
            onConnectionStart?.(node.id, 'output')
          }}
          onMouseUp={(e) => {
            e.stopPropagation()
            onConnectionEnd?.(node.id, 'output')
          }}
          title="输出连接点 - 拖拽到其他节点建立连接"
        />

        {/* 输入连接点（左侧） */}
        <div
          className={cn(
            "absolute -left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white border-2 rounded-full transition-all duration-200 cursor-pointer z-20",
            isConnecting && connectionPreview?.to === node.id
              ? "border-blue-500 bg-blue-100 scale-125"
              : "border-gray-300 hover:border-primary hover:scale-110"
          )}
          onMouseDown={(e) => {
            e.stopPropagation()
            onConnectionStart?.(node.id, 'input')
          }}
          onMouseUp={(e) => {
            e.stopPropagation()
            onConnectionEnd?.(node.id, 'input')
          }}
          title="输入连接点 - 接收来自其他节点的连接"
        />

        {/* 状态指示器 */}
        <div className={cn("absolute -top-1 -right-1 w-3 h-3 rounded-full", status.indicator)} />

        {/* 选中状态指示器 */}
        {isSelected && (
          <div className="absolute -top-2 -left-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
            <CheckCircle size={14} className="text-white" />
          </div>
        )}

        {/* 活跃状态光环 */}
        {isActive && (
          <div className="absolute inset-0 rounded-xl border-2 border-green-400 animate-ping pointer-events-none" />
        )}
      </div>
    </div>
  )
}

export default LegalWorkflowNode
