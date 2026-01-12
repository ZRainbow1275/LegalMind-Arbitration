import React, { useState, useRef, useEffect } from 'react'
import {
  MessageSquare,
  FileText,
  Video,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  Loader2,
  User,
  Bot,
  Send,
  Maximize2,
  Sparkles,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { LegalNodeData } from '../types/legal-nodes'

interface FlowNodeProps {
  node: LegalNodeData
  isSelected?: boolean
  isActive?: boolean
  position: { x: number; y: number }
  onSelect?: () => void
  onDoubleClick?: () => void
  onDelete?: () => void
  onUpdateNode?: (updates: Partial<LegalNodeData>) => void
  className?: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
}

const FlowNode: React.FC<FlowNodeProps> = ({
  node,
  isSelected = false,
  isActive = false,
  position,
  onSelect,
  onDoubleClick,

  onUpdateNode,
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showMiniChat, setShowMiniChat] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // 初始化节点的AI对话历史
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: getWelcomeMessage(node.type),
        timestamp: new Date()
      }
      setMessages([welcomeMessage])
    }
  }, [node.type, messages.length])

  // 获取节点类型的欢迎消息
  const getWelcomeMessage = (nodeType: string): string => {
    const welcomeMessages = {
      'document': '📄 准备协助您处理法律文书相关工作',
      'ai-chat': '🤖 我是您的AI法律顾问，随时为您提供专业建议',
      'hearing': '🏛️ 庭审准备就绪，让我们开始制定策略',
      'timeline': '⏰ 时间管理助手已激活，帮您规划重要节点',
      'collaboration': '👥 协作空间已开启，团队沟通更高效'
    }
    return welcomeMessages[nodeType as keyof typeof welcomeMessages] || '✨ AI助手已就绪，开始我们的协作吧'
  }

  // 获取节点图标
  const getNodeIcon = () => {
    const iconProps = { size: 20, className: 'text-white' }
    switch (node.type) {
      case 'document':
        return <FileText {...iconProps} />
      case 'ai-chat':
        return <MessageSquare {...iconProps} />
      case 'hearing':
        return <Video {...iconProps} />
      case 'timeline':
        return <Clock {...iconProps} />
      case 'collaboration':
        return <Users {...iconProps} />
      default:
        return <MessageSquare {...iconProps} />
    }
  }

  // 获取节点主题色
  const getNodeTheme = () => {
    const nodeStyles = {
      'document': {
        primary: 'bg-blue-500',
        secondary: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
        glow: 'shadow-blue-200'
      },
      'ai-chat': {
        primary: 'bg-green-500',
        secondary: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700',
        glow: 'shadow-green-200'
      },
      'hearing': {
        primary: 'bg-red-500',
        secondary: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        glow: 'shadow-red-200'
      },
      'timeline': {
        primary: 'bg-purple-500',
        secondary: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-700',
        glow: 'shadow-purple-200'
      },
      'collaboration': {
        primary: 'bg-orange-500',
        secondary: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-700',
        glow: 'shadow-orange-200'
      }
    }
    const style = nodeStyles[node.type as keyof typeof nodeStyles] || nodeStyles.document;
    return style
  }

  // 获取节点状态
  const getNodeStatus = () => {
    switch (node.status) {
      case 'pending':
        return {
          icon: <Clock size={16} className="text-gray-500" />,
          text: '待处理',
          color: 'text-gray-500',
          bg: 'bg-gray-100'
        }
      case 'in-progress':
        return {
          icon: <Loader2 size={16} className="text-blue-500 animate-spin" />,
          text: '进行中',
          color: 'text-blue-500',
          bg: 'bg-blue-100'
        }
      case 'completed':
        return {
          icon: <CheckCircle size={16} className="text-green-500" />,
          text: '已完成',
          color: 'text-green-500',
          bg: 'bg-green-100'
        }
      case 'cancelled':
        return {
          icon: <AlertCircle size={16} className="text-red-500" />,
          text: '已取消',
          color: 'text-red-500',
          bg: 'bg-red-100'
        }
      default:
        return {
          icon: <Clock size={16} className="text-gray-500" />,
          text: '待处理',
          color: 'text-gray-500',
          bg: 'bg-gray-100'
        }
    }
  }

  // 发送消息
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsProcessing(true)

    // 模拟AI响应
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateAIResponse(node.type),
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiMessage])
      setIsProcessing(false)

      // 更新节点状态
      if (onUpdateNode) {
        onUpdateNode({
          status: 'in-progress',
          updatedAt: new Date()
        })
      }
    }, 1000 + Math.random() * 2000)
  }

  // 生成AI响应
  const generateAIResponse = (nodeType: string): string => {
    const responses = {
      'document': '我已经分析了您的需求，建议采用以下文书结构...',
      'ai-chat': '根据相关法律规定，您的情况可能涉及...',
      'hearing': '庭审策略建议：重点关注以下争议焦点...',
      'timeline': '时间规划已更新，建议优先处理...',
      'collaboration': '团队协作建议：建议分工如下...'
    }
    return responses[nodeType as keyof typeof responses] || '我正在分析您的问题，请稍候...'
  }

  const theme = getNodeTheme()
  const status = getNodeStatus()


  return (
    <div
      className={cn(
        "absolute transition-all duration-300 cursor-pointer group",
        isSelected && "z-30",
        isActive && "z-40",
        className
      )}
      style={{
        left: position.x,
        top: position.y,
        width: isExpanded ? 400 : 300,
        height: isExpanded ? 500 : 200
      }}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
    >
      {/* 主节点容器 */}
      <div
        className={cn(
          "relative bg-white rounded-xl border-2 shadow-lg transition-all duration-300",
          isSelected ? `${theme.border} ${theme.glow} shadow-xl` : "border-gray-200",
          isActive && "animate-pulse",
          "hover:shadow-xl hover:scale-105"
        )}
      >
        {/* 节点头部 */}
        <div className={cn("flex items-center justify-between p-4 rounded-t-xl", theme.primary)}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              {getNodeIcon()}
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">{node.title}</h3>
              <p className="text-white/80 text-xs">{node.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="p-1 hover:bg-white/20 rounded transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                setShowMiniChat(!showMiniChat)
              }}
            >
              <MessageSquare size={16} className="text-white" />
            </button>
            <button
              className="p-1 hover:bg-white/20 rounded transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                setIsExpanded(!isExpanded)
              }}
            >
              <Maximize2 size={16} className="text-white" />
            </button>
          </div>
        </div>

        {/* 节点内容区域 */}
        <div className="p-4 space-y-3">
          {/* 状态指示器 */}
          <div className="flex items-center justify-between">
            <div className={cn("flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium", status.bg)}>
              {status.icon}
              <span className={status.color}>{status.text}</span>
            </div>
            <div className="text-xs text-gray-500">
              {new Date(node.updatedAt).toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>

          {/* 最近对话摘要 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Sparkles size={12} />
              <span>最近对话</span>
            </div>
            {messages.map((msg) => (
              <div key={msg.id} className="flex items-start gap-2 text-xs">
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                  msg.role === 'user' ? "bg-gray-100" : theme.secondary
                )}>
                  {msg.role === 'user' ?
                    <User size={10} className="text-gray-600" /> :
                    <Bot size={10} className={theme.text} />
                  }
                </div>
                <p className="text-gray-700 line-clamp-2 flex-1">
                  {msg.content}
                </p>
              </div>
            ))}
          </div>

          {/* Mini聊天输入框 */}
          {showMiniChat && (
            <div className="border-t pt-3 mt-3">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="输入消息..."
                  className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  disabled={isProcessing}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isProcessing}
                  className={cn(
                    "px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                    inputValue.trim() && !isProcessing
                      ? `${theme.primary} text-white hover:opacity-90`
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  )}
                >
                  {isProcessing ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Send size={12} />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 连接点 */}
        <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-300 rounded-full hover:border-primary transition-colors" />
        <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-300 rounded-full hover:border-primary transition-colors" />

        {/* 活跃状态指示器 */}
        {isActive && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping" />
        )}

        {/* 选中状态指示器 */}
        {isSelected && (
          <div className="absolute -top-2 -left-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
            <CheckCircle size={14} className="text-white" />
          </div>
        )}
      </div>

      {/* 扩展模式的全屏对话界面 */}
      {isExpanded && (
        <div className="absolute top-0 left-0 w-full h-full bg-white rounded-xl border-2 border-primary shadow-2xl z-50">
          {/* 这里可以放置完整的对话界面 */}
          <div className="p-4 text-center text-gray-500">
            <Maximize2 size={32} className="mx-auto mb-2 opacity-50" />
            <p>完整对话界面</p>
            <p className="text-xs mt-1">双击节点打开完整AI助手</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default FlowNode
