import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Sparkles,
  Target,
  Download,
  Share2,
  Settings,
  Minimize2,
  Scale,
  Lightbulb,
  BookOpen
} from 'lucide-react'
import { cn } from '../lib/utils'
import { useWorkspaceStore } from '../stores/workspaceStore'


interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  nodeContext?: string
  confidence?: number
  suggestions?: string[]
}

interface AILegalAdvisorProps {
  className?: string
}

const AILegalAdvisor: React.FC<AILegalAdvisorProps> = ({ className }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [activeMode, setActiveMode] = useState<'general' | 'analysis' | 'strategy' | 'review'>('general')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 从Zustand获取工作流状态
  // 从Zustand获取工作流状态
  const {
    selectedNodeId,
    nodes
  } = useWorkspaceStore()

  // 初始化欢迎消息
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'system',
        content: '👋 欢迎使用AI法律顾问！我是您的专业法律助手，可以为您提供：\n\n• 📋 案件分析和策略建议\n• 📝 法律文书起草指导\n• ⚖️ 法律条文解释和适用\n• 🎯 庭审准备和要点梳理\n• 🤝 协作流程优化建议\n\n请告诉我您需要什么帮助？',
        timestamp: new Date(),
        confidence: 100
      }
      setMessages([welcomeMessage])
    }
  }, [messages.length])



  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 获取节点类型名称
  const getNodeTypeName = useCallback((_type: string) => {
    const capabilities = {
      'document': '法律文书',
      'document-generator': '文书生成工作台',
      'hearing': '庭审环节',
      'dispute-analysis': '争议焦点分析',
      'timeline': '时间节点'
    }
    return capabilities[activeMode as keyof typeof capabilities] || capabilities['document']
  }, [activeMode])

  // 获取节点特定建议
  const getNodeSpecificSuggestions = useCallback((_type: string) => {
    const suggestions = {
      'document': '• 📄 文书结构和格式建议\n• ✍️ 关键条款起草指导\n• 🔍 法律依据和引用规范\n• 📋 文书审查要点',
      'document-generator': '• 🤖 智能文书模板生成\n• 📝 AI辅助条款起草\n• 🎯 个性化文书定制\n• 🔧 批量文书生成',
      'hearing': '• ⚖️ 庭审策略制定\n• 📝 争议焦点梳理\n• 🎤 发言要点准备\n• 📋 证据展示规划',
      'dispute-analysis': '• 🎯 争议要点识别\n• 👥 当事人关系分析\n• 📊 争议焦点可视化\n• 💡 解决方案建议',
      'timeline': '• ⏰ 时间节点规划\n• 📅 关键期限提醒\n• 🔄 流程优化建议\n• ⚠️ 风险点识别'
    }
    return suggestions[activeMode as keyof typeof suggestions] || suggestions['document']
  }, [activeMode])

  // 获取节点建议选项
  const getNodeSuggestions = useCallback((type: string): string[] => {
    const suggestions = {
      'document': ['起草合同条款', '审查文书格式', '法律依据查询', '风险点分析'],
      'document-generator': ['生成文书模板', 'AI起草条款', '定制文书格式', '批量生成文书'],
      'hearing': ['制定庭审策略', '准备争议焦点', '整理关键证据', '模拟庭审对话'],
      'dispute-analysis': ['识别争议焦点', '分析当事人关系', '可视化争议图谱', '制定解决策略'],
      'timeline': ['规划时间节点', '设置提醒事项', '优化工作流程', '识别关键路径']
    }
    return suggestions[type as keyof typeof suggestions] || ['提供专业建议', '分析当前情况', '制定解决方案']
  }, [])

  // 监听选中节点变化，提供上下文建议
  useEffect(() => {
    if (selectedNodeId && nodes.length > 0) {
      const selectedNode = nodes.find(n => n.id === selectedNodeId)
      if (selectedNode) {
        const contextMessage: ChatMessage = {
          id: `context-${selectedNodeId}-${Date.now()}`,
          role: 'assistant',
          content: `🎯 我注意到您选中了"${selectedNode.title}"节点。\n\n基于此节点的类型（${getNodeTypeName(selectedNode.type)}），我可以为您提供：\n\n${getNodeSpecificSuggestions(selectedNode.type)}`,
          timestamp: new Date(),
          nodeContext: selectedNodeId,
          confidence: 95,
          suggestions: getNodeSuggestions(selectedNode.type)
        }

        // 避免重复添加相同节点的上下文消息
        setMessages(prev => {
          const hasRecentContext = prev.some(msg =>
            msg.nodeContext === selectedNodeId &&
            Date.now() - msg.timestamp.getTime() < 30000 // 30秒内
          )
          return hasRecentContext ? prev : [...prev, contextMessage]
        })
      }
    }
  }, [selectedNodeId, nodes, getNodeTypeName, getNodeSpecificSuggestions, getNodeSuggestions])

  // 发送消息
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
      nodeContext: selectedNodeId || undefined
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsProcessing(true)

    // 模拟AI响应
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateAIResponse(userMessage.content, selectedNodeId),
        timestamp: new Date(),
        confidence: 85 + Math.random() * 15,
        suggestions: generateSuggestions(userMessage.content)
      }
      setMessages(prev => [...prev, aiMessage])
      setIsProcessing(false)
    }, 1000 + Math.random() * 2000)
  }

  // 生成AI响应
  const generateAIResponse = (_userInput: string, _nodeId?: string): string => {
    // Use userInput and nodeId to generate response (simulated)
    // console.log('Sending message:', userInput, 'Node ID:', nodeId);
    const responses = [
      '根据您的问题，我建议采用以下法律策略...',
      '基于相关法律条文，这种情况通常需要考虑...',
      '从专业角度分析，您的案件具有以下特点...',
      '建议您重点关注以下几个法律要点...',
      '根据类似案例的处理经验，我建议...'
    ]
    return responses[Math.floor(Math.random() * responses.length)]
  }

  // 生成建议选项
  const generateSuggestions = (_userInput: string): string[] => {
    return ['查看相关法条', '分析类似案例', '制定应对策略', '准备相关文书']
  }

  // Handle suggestion click
  // const handleSuggestionClick = (suggestion: string) => {
  //   setInputValue(suggestion);
  //   // Optionally, send the message immediately or let the user edit it
  //   // handleSendMessage();
  // };

  // 获取模式配置
  const getModeConfig = () => {
    const descriptions = {
      'general': { icon: MessageSquare, label: '通用咨询', color: 'text-blue-500' },
      'analysis': { icon: Target, label: '案件分析', color: 'text-green-500' },
      'strategy': { icon: Lightbulb, label: '策略制定', color: 'text-orange-500' },
      'review': { icon: BookOpen, label: '文书审查', color: 'text-purple-500' }
    }
    return descriptions[activeMode as keyof typeof descriptions] || descriptions['general']
  }

  const modeConfig = getModeConfig()

  if (isMinimized) {
    return (
      <div className={cn("fixed right-4 bottom-4 z-50", className)}>
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-primary text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
        >
          <MessageSquare size={24} />
        </button>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full bg-white border-l border-gray-200", className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Scale size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI法律顾问</h3>
            <p className="text-xs text-gray-600">专业 • 智能 • 可靠</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <Minimize2 size={16} className="text-gray-500" />
          </button>
          <button className="p-1 hover:bg-gray-100 rounded transition-colors">
            <Settings size={16} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* 模式选择 */}
      <div className="flex items-center gap-1 p-3 border-b border-gray-100 bg-gray-50">
        {(['general', 'analysis', 'strategy', 'review'] as const).map((mode) => {
          const config = {
            'general': { icon: MessageSquare, label: '通用', color: 'text-blue-500' },
            'analysis': { icon: Target, label: '分析', color: 'text-green-500' },
            'strategy': { icon: Lightbulb, label: '策略', color: 'text-orange-500' },
            'review': { icon: BookOpen, label: '审查', color: 'text-purple-500' }
          }[mode]

          return (
            <button
              key={mode}
              onClick={() => setActiveMode(mode)}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                activeMode === mode
                  ? "bg-white shadow-sm border border-gray-200"
                  : "hover:bg-white/50"
              )}
            >
              <config.icon size={12} className={activeMode === mode ? config.color : 'text-gray-500'} />
              <span className={activeMode === mode ? 'text-gray-900' : 'text-gray-600'}>
                {config.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3",
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {message.role !== 'user' && (
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                message.role === 'system' ? 'bg-gray-100' : 'bg-primary/10'
              )}>
                {message.role === 'system' ? (
                  <Sparkles size={16} className="text-gray-600" />
                ) : (
                  <Bot size={16} className="text-primary" />
                )}
              </div>
            )}

            <div className={cn(
              "max-w-[80%] rounded-lg p-3 text-sm",
              message.role === 'user'
                ? 'bg-primary text-white'
                : message.role === 'system'
                  ? 'bg-gray-50 text-gray-700 border border-gray-200'
                  : 'bg-white border border-gray-200'
            )}>
              <div className="whitespace-pre-wrap">{message.content}</div>

              {message.confidence && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                  <div className="text-xs text-gray-500">置信度:</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-1">
                    <div
                      className="bg-green-500 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${message.confidence}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500">{message.confidence?.toFixed(0)}%</div>
                </div>
              )}

              {message.suggestions && message.suggestions.length > 0 && (
                <div className="mt-3 space-y-1">
                  <div className="text-xs text-gray-500 mb-2">快速操作:</div>
                  {message.suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => setInputValue(suggestion)}
                      className="block w-full text-left px-2 py-1 text-xs bg-gray-50 hover:bg-gray-100 rounded transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {message.role === 'user' && (
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User size={16} className="text-gray-600" />
              </div>
            )}
          </div>
        ))}

        {isProcessing && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <Bot size={16} className="text-primary" />
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <span className="ml-2">AI正在思考...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={`向AI法律顾问咨询 (${modeConfig.label}模式)...`}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            disabled={isProcessing}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isProcessing}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              inputValue.trim() && !isProcessing
                ? "bg-primary text-white hover:bg-primary/90"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            <Send size={16} />
          </button>
        </div>

        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span>按 Enter 发送</span>
            {selectedNodeId && (
              <span className="flex items-center gap-1">
                <Target size={12} />
                关注节点: {nodes.find(n => n.id === selectedNodeId)?.title}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button className="hover:text-gray-700 transition-colors">
              <Download size={12} />
            </button>
            <button className="hover:text-gray-700 transition-colors">
              <Share2 size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AILegalAdvisor
